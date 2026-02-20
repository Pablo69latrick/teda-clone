/**
 * Pure risk-calculation functions for the order form.
 *
 * Every function is stateless (no hooks, no API calls).
 * All math happens client-side for instant reactivity.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

export const FEE_RATE = 0.0007 // 0.07% per side (0.14% round-trip)
export const RISK_PRESETS = [0.25, 0.5, 1, 2, 3] as const
export const RR_PRESETS = [1, 2, 3, 5] as const

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChallengeConstraints {
  dailyLossLimit: number   // e.g. 0.05 = 5%
  maxDrawdown: number      // e.g. 0.10 = 10%
  currentDailyLoss: number // e.g. 0.03 = 3%
  currentDrawdown: number  // e.g. 0.04 = 4%
}

export interface RiskCalcResult {
  slPrice: number
  tpPrice: number
  quantity: number
  riskAmount: number       // $ at risk (after fees)
  rewardAmount: number     // $ potential reward
  riskPercent: number      // actual risk % after rounding
  roundTripFees: number    // estimated total fees (open + close)
  maxAllowedRiskPercent: number
  isOverLimit: boolean     // true if requested risk exceeds challenge budget
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max)
}

function roundDown(v: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.floor(v * factor) / factor
}

function roundTo(v: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(v * factor) / factor
}

// ─── Core calculations ───────────────────────────────────────────────────────

/**
 * Maximum risk % the trader can take without breaching challenge rules.
 * Takes the more restrictive of daily-loss and drawdown budgets.
 */
export function calcMaxAllowedRiskPercent(
  constraints: ChallengeConstraints | null,
  startingBalance: number,
  equity: number
): number {
  if (!constraints || equity <= 0) return 100

  const dailyBudget =
    (constraints.dailyLossLimit - constraints.currentDailyLoss) * startingBalance
  const drawdownBudget =
    (constraints.maxDrawdown - constraints.currentDrawdown) * startingBalance

  const maxRiskAmount = Math.min(dailyBudget, drawdownBudget)
  if (maxRiskAmount <= 0) return 0

  return clamp((maxRiskAmount / equity) * 100, 0, 100)
}

/**
 * Optimal lot size given a risk %, entry price, SL price, and leverage.
 *
 * Formula: qty = riskAmount / (slDistance × leverage)
 * With fee correction: adjusted for round-trip fees (entry + exit).
 */
export function calcLotSizeFromRisk(
  equity: number,
  riskPercent: number,
  entryPrice: number,
  slPrice: number,
  leverage: number,
  qtyDecimals: number,
  minOrderSize: number
): number {
  if (equity <= 0 || riskPercent <= 0 || entryPrice <= 0 || leverage <= 0) return minOrderSize

  const slDistance = Math.abs(entryPrice - slPrice)
  if (slDistance <= 0) return minOrderSize

  const riskAmount = equity * (riskPercent / 100)

  // First pass: raw quantity
  const rawQty = riskAmount / (slDistance * leverage)

  // Fee correction (one iteration is sufficient — fees are small relative to risk)
  const estimatedFees = rawQty * entryPrice * FEE_RATE * 2
  const adjustedQty = (riskAmount - estimatedFees) / (slDistance * leverage)

  const result = roundDown(Math.max(adjustedQty, 0), qtyDecimals)
  return Math.max(result, minOrderSize)
}

/**
 * SL price from a risk % and lot size.
 */
export function calcSlFromRisk(
  equity: number,
  riskPercent: number,
  quantity: number,
  entryPrice: number,
  leverage: number,
  direction: 'long' | 'short',
  priceDecimals: number
): number {
  if (equity <= 0 || quantity <= 0 || leverage <= 0 || entryPrice <= 0) return 0

  const riskAmount = equity * (riskPercent / 100)
  const slDistance = riskAmount / (quantity * leverage)

  const slPrice = direction === 'long'
    ? entryPrice - slDistance
    : entryPrice + slDistance

  return roundTo(Math.max(0, slPrice), priceDecimals)
}

/**
 * TP price from SL price and R:R ratio.
 */
export function calcTpFromSlAndRR(
  entryPrice: number,
  slPrice: number,
  rrRatio: number,
  direction: 'long' | 'short',
  priceDecimals: number
): number {
  const slDistance = Math.abs(entryPrice - slPrice)
  const tpDistance = slDistance * rrRatio

  const tpPrice = direction === 'long'
    ? entryPrice + tpDistance
    : entryPrice - tpDistance

  return roundTo(Math.max(0, tpPrice), priceDecimals)
}

/**
 * Implied risk % given a quantity and SL price.
 */
export function calcRiskPercentFromQtyAndSl(
  equity: number,
  quantity: number,
  entryPrice: number,
  slPrice: number,
  leverage: number
): number {
  if (equity <= 0) return 0
  const slDistance = Math.abs(entryPrice - slPrice)
  const riskAmount = slDistance * quantity * leverage
  return (riskAmount / equity) * 100
}

/**
 * Full risk calculation result — the orchestrator.
 *
 * Given risk %, R:R ratio, and instrument params, returns
 * SL, TP, quantity, $ risk, $ reward, fees, and limit checks.
 */
export function calcFullRiskResult(
  equity: number,
  startingBalance: number,
  entryPrice: number,
  leverage: number,
  direction: 'long' | 'short',
  riskPercent: number,
  rrRatio: number,
  priceDecimals: number,
  qtyDecimals: number,
  minOrderSize: number,
  constraints: ChallengeConstraints | null
): RiskCalcResult {
  const maxAllowed = calcMaxAllowedRiskPercent(constraints, startingBalance, equity)

  // Step 1: Compute SL distance from risk %
  // We need an initial quantity estimate to get SL. Use a large qty placeholder first.
  // Actually, SL distance depends on qty, which depends on SL. We solve iteratively:

  // Initial approach: assume SL is X% away from entry, where X is derived from risk/leverage
  // riskAmount = slDist × qty × leverage
  // margin = qty × entryPrice / leverage
  // Let's derive SL from risk%: riskAmount = equity × riskPercent/100
  // If we set SL at a "natural" distance: slDist = riskAmount / (maxAffordableQty × leverage)
  // maxAffordableQty for this risk = riskAmount / entryPrice (unleveraged notional)
  // So slDist_natural = riskAmount / ((riskAmount / entryPrice) × leverage) = entryPrice / leverage
  // This gives a natural SL distance that scales with leverage.

  const riskAmount = equity * (riskPercent / 100)

  // SL distance = entryPrice / leverage (natural 1R move = liquidation distance)
  // But to be more useful, we set SL at a tighter level: entryPrice / (leverage × 2)
  // giving the trader 2× the room before liquidation.
  // Actually, the simplest approach: compute the SL such that with the max qty we can afford,
  // losing exactly riskAmount.

  // Better approach: SL = entry ± (riskPercent% of entry / leverage)
  // This means: slDistance = entryPrice × (riskPercent / 100) / leverage
  const slDistanceNatural = (entryPrice * riskPercent) / (100 * leverage)

  const slPrice = direction === 'long'
    ? roundTo(entryPrice - slDistanceNatural, priceDecimals)
    : roundTo(entryPrice + slDistanceNatural, priceDecimals)

  // Step 2: Compute quantity from risk + SL
  const quantity = calcLotSizeFromRisk(
    equity, riskPercent, entryPrice, slPrice, leverage, qtyDecimals, minOrderSize
  )

  // Step 3: TP from SL + R:R
  const tpPrice = calcTpFromSlAndRR(entryPrice, slPrice, rrRatio, direction, priceDecimals)

  // Step 4: Dollar amounts
  const actualSlDist = Math.abs(entryPrice - slPrice)
  const actualTpDist = Math.abs(entryPrice - tpPrice)
  const actualRiskAmount = actualSlDist * quantity * leverage
  const rewardAmount = actualTpDist * quantity * leverage
  const roundTripFees = quantity * entryPrice * FEE_RATE * 2

  // Step 5: Actual risk % (may differ due to qty rounding)
  const actualRiskPercent = equity > 0 ? (actualRiskAmount / equity) * 100 : 0

  return {
    slPrice,
    tpPrice,
    quantity,
    riskAmount: actualRiskAmount,
    rewardAmount,
    riskPercent: actualRiskPercent,
    roundTripFees,
    maxAllowedRiskPercent: maxAllowed,
    isOverLimit: actualRiskPercent > maxAllowed,
  }
}

/**
 * Risk color class for Tailwind.
 */
export function getRiskColor(riskPercent: number): string {
  if (riskPercent <= 0) return 'text-muted-foreground'
  if (riskPercent < 1) return 'text-profit'
  if (riskPercent <= 3) return 'text-amber-400'
  return 'text-loss'
}
