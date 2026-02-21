'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  HistogramSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
  type IPriceLine,
} from 'lightweight-charts'
import { cn } from '@/lib/utils'
import { useCandles, useTradingData } from '@/lib/hooks'
import { useLivePrice } from '@/lib/price-store'
import { Maximize2, Minimize2, Timer } from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChartPanelProps {
  symbol: string
  accountId?: string
  onFullscreen?: () => void
  isFullscreen?: boolean
}

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'] as const
type Timeframe = typeof TIMEFRAMES[number]

interface BarInfo {
  o: number; h: number; l: number; c: number; pct: number
}

const TF_SECONDS: Record<Timeframe, number> = {
  '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400, '1w': 604800,
}

// ─── TradingView-style SVG Tool Icons ────────────────────────────────────────
// These are exact SVG path recreations of TradingView's drawing tool sidebar icons.
// Each icon is 28×28 viewBox matching TradingView's pixel-exact iconography.

const SvgCrosshair = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 28 28" className={className} fill="none" stroke="currentColor" strokeWidth="1.2">
    <circle cx="14" cy="14" r="6" />
    <line x1="14" y1="4" x2="14" y2="8" />
    <line x1="14" y1="20" x2="14" y2="24" />
    <line x1="4" y1="14" x2="8" y2="14" />
    <line x1="20" y1="14" x2="24" y2="14" />
    <circle cx="14" cy="14" r="1.5" fill="currentColor" stroke="none" />
  </svg>
)

const SvgCursor = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 28 28" className={className} fill="none">
    <path d="M8 7l10 5.5-4.5 1.5-2 4.5L8 7z" fill="currentColor" stroke="currentColor" strokeWidth="0.5" strokeLinejoin="round" />
  </svg>
)

const SvgTrendLine = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 28 28" className={className} fill="none" stroke="currentColor" strokeWidth="1.4">
    <line x1="6" y1="22" x2="22" y2="6" />
    <circle cx="6" cy="22" r="1.5" fill="currentColor" />
    <circle cx="22" cy="6" r="1.5" fill="currentColor" />
  </svg>
)

const SvgHorizontalLine = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 28 28" className={className} fill="none" stroke="currentColor" strokeWidth="1.4">
    <line x1="4" y1="14" x2="24" y2="14" />
    <circle cx="4" cy="14" r="1.2" fill="currentColor" />
  </svg>
)

const SvgHorizontalRay = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 28 28" className={className} fill="none" stroke="currentColor" strokeWidth="1.4">
    <line x1="6" y1="14" x2="24" y2="14" />
    <circle cx="6" cy="14" r="1.5" fill="currentColor" />
    <polyline points="21,11 24,14 21,17" strokeWidth="1.2" fill="none" />
  </svg>
)

const SvgFibRetracement = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 28 28" className={className} fill="none" stroke="currentColor" strokeWidth="1">
    <line x1="5" y1="6" x2="23" y2="6" strokeDasharray="2 1.5" />
    <line x1="5" y1="11" x2="23" y2="11" strokeDasharray="2 1.5" />
    <line x1="5" y1="16.5" x2="23" y2="16.5" />
    <line x1="5" y1="22" x2="23" y2="22" strokeDasharray="2 1.5" />
    <text x="1" y="7.5" fontSize="4" fill="currentColor" stroke="none">0</text>
    <text x="1" y="12.5" fontSize="3.5" fill="currentColor" stroke="none">.38</text>
    <text x="1" y="18" fontSize="3.5" fill="currentColor" stroke="none">.62</text>
    <text x="1" y="23.5" fontSize="4" fill="currentColor" stroke="none">1</text>
  </svg>
)

const SvgRectangle = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 28 28" className={className} fill="none" stroke="currentColor" strokeWidth="1.2">
    <rect x="6" y="8" width="16" height="12" rx="0.5" />
  </svg>
)

const SvgMeasure = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 28 28" className={className} fill="none" stroke="currentColor" strokeWidth="1.2">
    <line x1="6" y1="22" x2="22" y2="6" strokeDasharray="2 2" />
    <line x1="6" y1="22" x2="22" y2="22" strokeWidth="0.8" />
    <line x1="22" y1="22" x2="22" y2="6" strokeWidth="0.8" />
    <circle cx="6" cy="22" r="1.5" fill="currentColor" />
    <circle cx="22" cy="6" r="1.5" fill="currentColor" />
  </svg>
)

const SvgText = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 28 28" className={className} fill="currentColor">
    <text x="8" y="20" fontSize="14" fontWeight="600" fontFamily="Inter, sans-serif">T</text>
  </svg>
)

const SvgFitScreen = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 28 28" className={className} fill="none" stroke="currentColor" strokeWidth="1.2">
    <polyline points="8,4 4,4 4,8" />
    <polyline points="20,4 24,4 24,8" />
    <polyline points="8,24 4,24 4,20" />
    <polyline points="20,24 24,24 24,20" />
    <line x1="4" y1="14" x2="24" y2="14" strokeWidth="0.8" strokeDasharray="1.5 1.5" />
  </svg>
)

const SvgCamera = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 28 28" className={className} fill="none" stroke="currentColor" strokeWidth="1.2">
    <path d="M4 10a1 1 0 011-1h3l1.5-2h9L20 9h3a1 1 0 011 1v10a1 1 0 01-1 1H5a1 1 0 01-1-1V10z" />
    <circle cx="14" cy="15" r="4" />
  </svg>
)

const SvgEraser = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 28 28" className={className} fill="none" stroke="currentColor" strokeWidth="1.2">
    <path d="M16.5 5l6.5 6.5-10.5 10.5H7l-2-2 11.5-15z" />
    <line x1="12" y1="9" x2="20" y2="17" strokeWidth="0.8" />
    <line x1="5" y1="22" x2="23" y2="22" strokeWidth="1" />
  </svg>
)

const SvgMagnet = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 28 28" className={className} fill="none" stroke="currentColor" strokeWidth="1.2">
    <path d="M8 4v6a6 6 0 0012 0V4" />
    <rect x="6" y="4" width="4" height="3" rx="0.5" fill="currentColor" />
    <rect x="18" y="4" width="4" height="3" rx="0.5" fill="currentColor" />
    <line x1="8" y1="12" x2="20" y2="12" strokeWidth="0.6" strokeDasharray="1 1" />
  </svg>
)

// ─── Drawing tools definition ───────────────────────────────────────────────

interface ToolDef {
  id: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  group: number
  functional?: boolean
}

const TOOLS: ToolDef[] = [
  { id: 'crosshair', icon: SvgCrosshair,      label: 'Crosshair',          group: 0, functional: true },
  { id: 'cursor',    icon: SvgCursor,          label: 'Cursor',             group: 0, functional: true },
  { id: 'magnet',    icon: SvgMagnet,          label: 'Magnet Mode',        group: 0, functional: true },
  { id: 'trendline', icon: SvgTrendLine,       label: 'Trend Line',         group: 1 },
  { id: 'hline',     icon: SvgHorizontalLine,  label: 'Horizontal Line',    group: 1, functional: true },
  { id: 'ray',       icon: SvgHorizontalRay,   label: 'Horizontal Ray',     group: 1 },
  { id: 'fib',       icon: SvgFibRetracement,  label: 'Fib Retracement',    group: 2 },
  { id: 'rect',      icon: SvgRectangle,       label: 'Rectangle',          group: 2 },
  { id: 'ruler',     icon: SvgMeasure,         label: 'Measure',            group: 3 },
  { id: 'text',      icon: SvgText,            label: 'Text',               group: 3 },
  { id: 'zoom',      icon: SvgFitScreen,       label: 'Fit Content',        group: 4, functional: true },
  { id: 'screenshot', icon: SvgCamera,         label: 'Snapshot',           group: 4, functional: true },
  { id: 'eraser',    icon: SvgEraser,          label: 'Remove Drawings',    group: 4, functional: true },
]

// ─── Component ──────────────────────────────────────────────────────────────

export function ChartPanel({ symbol, accountId, onFullscreen, isFullscreen }: ChartPanelProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('1h')
  const [barInfo, setBarInfo] = useState<BarInfo | null>(null)
  const [countdown, setCountdown] = useState('')
  const [activeTool, setActiveTool] = useState('crosshair')

  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const priceLinesRef = useRef<Map<string, IPriceLine>>(new Map())
  const currentPriceLineRef = useRef<IPriceLine | null>(null)
  const userLinesRef = useRef<IPriceLine[]>([])
  const liveCandleRef = useRef<{ time: number; open: number; high: number; low: number } | null>(null)
  const activeToolRef = useRef('crosshair')
  const prevPriceRef = useRef(0)

  const { data: candles } = useCandles(symbol, timeframe)
  const { data: tradingData } = useTradingData(accountId)

  // Live price from external store (updates every ~500ms via SSE, no auth needed)
  const currentPrice = useLivePrice(symbol)

  // Open positions for price lines
  const openPositionsForSymbol = useMemo(
    () => (tradingData?.positions ?? []).filter(p => p.status === 'open' && p.symbol === symbol),
    [tradingData?.positions, symbol]
  )

  // ── Countdown timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      const ms = TF_SECONDS[timeframe] * 1000
      const remaining = ms - (Date.now() % ms)
      const totalSec = Math.ceil(remaining / 1000)
      const h = Math.floor(totalSec / 3600)
      const m = Math.floor((totalSec % 3600) / 60)
      const s = totalSec % 60

      if (h > 0) {
        setCountdown(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
      } else {
        setCountdown(`${m}:${String(s).padStart(2, '0')}`)
      }
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [timeframe])

  // ── Create chart on mount ─────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const chart = createChart(el, {
      width: el.clientWidth,
      height: el.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#0d0f13' },
        textColor: '#6b7280',
        fontFamily: 'Inter, -apple-system, sans-serif',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(255,255,255,0.15)', labelBackgroundColor: '#1e2027' },
        horzLine: { color: 'rgba(255,255,255,0.15)', labelBackgroundColor: '#1e2027' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        textColor: '#6b7280',
        entireTextOnly: true,
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.06)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
      },
      handleScroll: true,
      handleScale: true,
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderUpColor: '#26a69a',
      borderDownColor: '#ef5350',
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    })

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: 'rgba(100,116,139,0.35)',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
      borderVisible: false,
    })

    // Crosshair → OHLC bar info
    chart.subscribeCrosshairMove(param => {
      const data = param.seriesData.get(candleSeries) as CandlestickData | undefined
      if (data) {
        const { open, high, low, close } = data
        const pct = open > 0 ? ((close - open) / open) * 100 : 0
        setBarInfo({ o: open, h: high, l: low, c: close, pct })
      } else {
        setBarInfo(null)
      }
    })

    // Click → horizontal line tool
    chart.subscribeClick(param => {
      if (activeToolRef.current === 'hline' && param.point && candleSeriesRef.current) {
        try {
          const price = candleSeriesRef.current.coordinateToPrice(param.point.y)
          if (price !== null && price > 0) {
            const line = candleSeriesRef.current.createPriceLine({
              price,
              color: '#2962ff',
              lineWidth: 1,
              lineStyle: LineStyle.Solid,
              axisLabelVisible: true,
              title: '',
            })
            userLinesRef.current.push(line)
          }
        } catch { /* coordinate conversion may fail */ }
      }
    })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    volumeSeriesRef.current = volumeSeries

    // ResizeObserver
    const ro = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) chart.resize(entry.contentRect.width, entry.contentRect.height)
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
      currentPriceLineRef.current = null
    }
  }, [])

  // ── Load candles whenever data changes ──────────────────────────────────────
  useEffect(() => {
    if (!candles || !candleSeriesRef.current || !volumeSeriesRef.current) return

    // Reset live candle tracking on data refresh
    liveCandleRef.current = null

    const candleData: CandlestickData[] = candles.map(c => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }))

    const volumeData = candles.map(c => ({
      time: c.time as Time,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(38,166,154,0.25)' : 'rgba(239,83,80,0.25)',
    }))

    candleSeriesRef.current.setData(candleData)
    volumeSeriesRef.current.setData(volumeData)
    chartRef.current?.timeScale().fitContent()
  }, [candles])

  // ── Real-time price update + current price line ─────────────────────────────
  useEffect(() => {
    if (currentPrice <= 0 || !candleSeriesRef.current || !candles?.length) return

    const interval = TF_SECONDS[timeframe]
    const nowSec = Math.floor(Date.now() / 1000)
    const currentCandleTime = Math.floor(nowSec / interval) * interval
    const lastCandle = candles[candles.length - 1]

    // Initialize or advance live candle tracking
    if (!liveCandleRef.current || liveCandleRef.current.time !== currentCandleTime) {
      if (currentCandleTime === lastCandle.time) {
        liveCandleRef.current = {
          time: currentCandleTime,
          open: lastCandle.open,
          high: lastCandle.high,
          low: lastCandle.low,
        }
      } else {
        liveCandleRef.current = {
          time: currentCandleTime,
          open: currentPrice,
          high: currentPrice,
          low: currentPrice,
        }
      }
    }

    // Update running high/low
    liveCandleRef.current.high = Math.max(liveCandleRef.current.high, currentPrice)
    liveCandleRef.current.low = Math.min(liveCandleRef.current.low, currentPrice)

    // Push real-time tick to the chart
    candleSeriesRef.current.update({
      time: currentCandleTime as Time,
      open: liveCandleRef.current.open,
      high: liveCandleRef.current.high,
      low: liveCandleRef.current.low,
      close: currentPrice,
    })

    // ── Current price horizontal line (TradingView-style) ─────────────────
    // This is the dashed line at the current price level with colored label
    const isUp = currentPrice >= prevPriceRef.current && prevPriceRef.current > 0
    const lineColor = (prevPriceRef.current === 0 || currentPrice === prevPriceRef.current)
      ? '#2962ff'
      : isUp ? '#26a69a' : '#ef5350'

    try {
      // Remove old price line and create new one (for color changes)
      if (currentPriceLineRef.current) {
        candleSeriesRef.current.removePriceLine(currentPriceLineRef.current)
      }
      currentPriceLineRef.current = candleSeriesRef.current.createPriceLine({
        price: currentPrice,
        color: lineColor,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: '',
      })
    } catch { /* series may have been destroyed */ }

    prevPriceRef.current = currentPrice
  }, [currentPrice, candles, timeframe])

  // ── Position price lines ────────────────────────────────────────────────────
  useEffect(() => {
    const series = candleSeriesRef.current
    if (!series) return

    priceLinesRef.current.forEach(line => {
      try { series.removePriceLine(line) } catch { /* series may have been destroyed */ }
    })
    priceLinesRef.current.clear()

    openPositionsForSymbol.forEach(pos => {
      const isLong = pos.direction === 'long'
      const line = series.createPriceLine({
        price: pos.entry_price,
        color: isLong ? 'rgba(38,166,154,0.85)' : 'rgba(239,83,80,0.85)',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `${isLong ? '▲' : '▼'} ${pos.quantity}×${pos.leverage}`,
      })
      priceLinesRef.current.set(pos.id, line)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPositionsForSymbol.map(p => `${p.id}:${p.entry_price}`).join(',')])

  // ── Tool handling ───────────────────────────────────────────────────────────
  const handleToolClick = useCallback((toolId: string) => {
    setActiveTool(toolId)
    activeToolRef.current = toolId

    if (toolId === 'crosshair') {
      chartRef.current?.applyOptions({ crosshair: { mode: CrosshairMode.Normal } })
    } else if (toolId === 'magnet') {
      chartRef.current?.applyOptions({ crosshair: { mode: CrosshairMode.Magnet } })
    } else if (toolId === 'zoom') {
      chartRef.current?.timeScale().fitContent()
      setActiveTool('crosshair')
      activeToolRef.current = 'crosshair'
    } else if (toolId === 'screenshot') {
      try {
        const canvas = chartRef.current?.takeScreenshot()
        if (canvas) {
          const link = document.createElement('a')
          link.download = `chart-${symbol}-${timeframe}.png`
          link.href = canvas.toDataURL('image/png')
          link.click()
        }
      } catch { /* ignore */ }
      setActiveTool('crosshair')
      activeToolRef.current = 'crosshair'
    } else if (toolId === 'eraser') {
      userLinesRef.current.forEach(line => {
        try { candleSeriesRef.current?.removePriceLine(line) } catch { /* */ }
      })
      userLinesRef.current = []
      setActiveTool('crosshair')
      activeToolRef.current = 'crosshair'
    }
  }, [symbol, timeframe])

  // ── Price display values ────────────────────────────────────────────────────
  const latestCandle = candles?.[candles.length - 1]
  const livePrice = currentPrice > 0 ? currentPrice : (latestCandle?.close ?? 0)
  const prevClose = candles?.[candles.length - 2]?.close ?? (latestCandle?.open ?? livePrice)
  const priceChange = livePrice - prevClose
  const priceChangePct = prevClose > 0 ? (priceChange / prevClose) * 100 : 0

  const fmt = useCallback((n: number) => {
    if (n >= 1000) return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    if (n >= 1) return n.toFixed(2)
    if (n >= 0.01) return n.toFixed(4)
    return n.toFixed(5)
  }, [])

  const display = barInfo ?? (latestCandle
    ? {
        o: latestCandle.open,
        h: Math.max(latestCandle.high, livePrice || 0),
        l: livePrice > 0 ? Math.min(latestCandle.low, livePrice) : latestCandle.low,
        c: livePrice || latestCandle.close,
        pct: priceChangePct,
      }
    : null)

  return (
    <div className="flex h-full bg-[#0d0f13]">
      {/* ── TradingView-style Drawing Tools Sidebar ── */}
      <div className="flex flex-col items-center w-[38px] border-r border-white/[0.06] bg-[#0d0f13] shrink-0 py-1 gap-0">
        {TOOLS.map((tool, i) => {
          const Icon = tool.icon
          const showDivider = i > 0 && TOOLS[i - 1].group !== tool.group
          return (
            <div key={tool.id} className="flex flex-col items-center w-full">
              {showDivider && <div className="w-[22px] h-px bg-white/[0.06] my-[3px]" />}
              <button
                onClick={() => handleToolClick(tool.id)}
                title={tool.label}
                className={cn(
                  'w-[34px] h-[28px] flex items-center justify-center rounded-[3px] transition-colors relative',
                  activeTool === tool.id
                    ? 'bg-[#2962ff]/15 text-[#2962ff]'
                    : tool.functional
                      ? 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-white/[0.04]'
                      : 'text-[#787b86]/60 hover:text-[#787b86] hover:bg-white/[0.03]'
                )}
              >
                <Icon className="w-[18px] h-[18px]" />
                {/* Small triangle indicator for tools with sub-menus (non-functional) */}
                {!tool.functional && (
                  <span className="absolute bottom-[2px] right-[3px] w-0 h-0 border-l-[2.5px] border-l-transparent border-t-[2.5px] border-t-[#787b86]/40 border-r-0" />
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* ── Chart area ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* ── Toolbar ── */}
        <div className="flex items-center gap-1 px-2 border-b border-white/[0.06] shrink-0 h-[38px]">
          {/* Timeframes */}
          <div className="flex items-center gap-0">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  'px-1.5 py-0.5 rounded-[3px] text-[11px] font-medium transition-colors',
                  timeframe === tf
                    ? 'bg-[#2962ff]/15 text-[#2962ff]'
                    : 'text-[#787b86] hover:text-[#d1d4dc] hover:bg-white/[0.04]'
                )}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-white/[0.08] mx-1" />

          {/* Symbol + Live price + Countdown */}
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-semibold text-[#d1d4dc]">{symbol}</span>

            {/* Live price with colored background like TradingView */}
            <span className={cn(
              'font-semibold tabular-nums px-1 py-[1px] rounded-[2px]',
              priceChange >= 0
                ? 'text-[#26a69a] bg-[#26a69a]/10'
                : 'text-[#ef5350] bg-[#ef5350]/10'
            )}>
              {fmt(livePrice)}
            </span>
            <span className={cn(
              'text-[10px] tabular-nums font-medium',
              priceChangePct >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]'
            )}>
              {priceChangePct >= 0 ? '+' : ''}{priceChangePct.toFixed(2)}%
            </span>

            {/* Countdown to next bar close */}
            <span className="text-[#363a45]">·</span>
            <span className="flex items-center gap-1 text-[#787b86] tabular-nums font-mono text-[10px]">
              <Timer className="size-3 text-[#787b86]/60" />
              {countdown}
            </span>

            {/* OHLC display on hover */}
            {display && (
              <span className="text-[#787b86] tabular-nums hidden lg:inline ml-1">
                O <span className="text-[#d1d4dc]">{fmt(display.o)}</span>
                {' '}H <span className="text-[#d1d4dc]">{fmt(display.h)}</span>
                {' '}L <span className="text-[#d1d4dc]">{fmt(display.l)}</span>
                {' '}C <span className={cn(display.pct >= 0 ? 'text-[#26a69a]' : 'text-[#ef5350]')}>{fmt(display.c)}</span>
                {' '}<span className={cn(display.pct >= 0 ? 'text-[#26a69a]/70' : 'text-[#ef5350]/70')}>
                  {display.pct >= 0 ? '+' : ''}{display.pct.toFixed(2)}%
                </span>
              </span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 text-[10px] text-[#787b86]">
            <span className="hidden xl:inline text-[#787b86]/60">Indicators</span>
            <div
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                currentPrice > 0 ? 'bg-[#26a69a] animate-pulse' : 'bg-yellow-500'
              )}
              title={currentPrice > 0 ? 'Live prices' : 'Delayed prices'}
            />
            {onFullscreen && (
              <button
                onClick={onFullscreen}
                title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen (F)'}
                className="p-1 rounded hover:bg-white/[0.06] hover:text-[#d1d4dc] transition-colors"
              >
                {isFullscreen
                  ? <Minimize2 className="size-3.5" />
                  : <Maximize2 className="size-3.5" />
                }
              </button>
            )}
          </div>
        </div>

        {/* ── Chart canvas ── */}
        <div
          ref={containerRef}
          className="flex-1 w-full min-h-0"
        />
      </div>
    </div>
  )
}
