/**
 * Zod validation schemas for all API inputs.
 *
 * Every POST handler in engine-write MUST parse its body through
 * the corresponding schema before touching the DB.
 */

import { z } from 'zod'

// ─── Reusable atoms ────────────────────────────────────────────────────────

const uuid = z.string().uuid('Must be a valid UUID')
const positiveNumber = z.number().positive('Must be a positive number').finite('Must be a finite number')
const nonNegativeNumber = z.number().nonnegative().finite()

// ─── engine/orders ─────────────────────────────────────────────────────────

export const PlaceOrderSchema = z.object({
  account_id: uuid,
  symbol: z.string().min(1, 'Symbol is required').max(20),
  direction: z.enum(['long', 'short'], { message: 'direction must be long or short' }),
  order_type: z.enum(['market', 'limit', 'stop', 'stop_limit'], { message: 'Invalid order type' }),
  quantity: positiveNumber.refine(v => v >= 0.0001, 'Minimum quantity is 0.0001'),
  leverage: z.number().int().min(1).max(500).default(1),
  margin_mode: z.enum(['cross', 'isolated']).default('cross'),
  price: positiveNumber.optional(),
  sl_price: positiveNumber.optional(),
  tp_price: positiveNumber.optional(),
}).refine(
  data => data.order_type === 'market' || data.price !== undefined,
  { message: 'Price required for limit/stop orders', path: ['price'] }
)

export type PlaceOrderInput = z.infer<typeof PlaceOrderSchema>

// ─── engine/close-position ─────────────────────────────────────────────────

export const ClosePositionSchema = z.object({
  position_id: uuid,
})

export type ClosePositionInput = z.infer<typeof ClosePositionSchema>

// ─── engine/partial-close ──────────────────────────────────────────────────

export const PartialCloseSchema = z.object({
  position_id: uuid,
  quantity: positiveNumber,
})

export type PartialCloseInput = z.infer<typeof PartialCloseSchema>

// ─── engine/cancel-order ───────────────────────────────────────────────────

export const CancelOrderSchema = z.object({
  order_id: uuid,
})

export type CancelOrderInput = z.infer<typeof CancelOrderSchema>

// ─── engine/request-payout ─────────────────────────────────────────────────

export const RequestPayoutSchema = z.object({
  account_id: uuid,
  amount: positiveNumber,
  method: z.enum(['crypto', 'bank', 'paypal']).default('crypto'),
  wallet_address: z.string().min(10, 'Valid wallet address required').optional(),
}).refine(
  data => data.method !== 'crypto' || (data.wallet_address !== undefined && data.wallet_address.length >= 10),
  { message: 'Valid wallet address required for crypto payouts', path: ['wallet_address'] }
)

export type RequestPayoutInput = z.infer<typeof RequestPayoutSchema>

// ─── engine/modify-sltp ────────────────────────────────────────────────────

export const ModifySLTPSchema = z.object({
  position_id: uuid,
  sl_price: positiveNumber.optional().nullable(),   // null = remove SL
  tp_price: positiveNumber.optional().nullable(),   // null = remove TP
}).refine(
  data => data.sl_price !== undefined || data.tp_price !== undefined,
  { message: 'At least one of sl_price or tp_price must be provided' }
)

export type ModifySLTPInput = z.infer<typeof ModifySLTPSchema>

// ─── engine/purchase-challenge ─────────────────────────────────────────────

export const PurchaseChallengeSchema = z.object({
  template_id: uuid,
})

export type PurchaseChallengeInput = z.infer<typeof PurchaseChallengeSchema>

// ─── Helper: format Zod errors into a user-friendly string ─────────────────

export function formatZodErrors(error: z.ZodError): string {
  return error.issues
    .map(issue => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ')
}
