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
import {
  Maximize2, Minimize2, MousePointer, Crosshair, TrendingUp, Minus,
  ArrowRight, Triangle, Square, Ruler, Type, Camera, Trash2, ZoomIn, Timer,
} from 'lucide-react'

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

// ─── Drawing tools definition ───────────────────────────────────────────────

interface ToolDef {
  id: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  group: number
  functional?: boolean
}

const TOOLS: ToolDef[] = [
  { id: 'crosshair', icon: Crosshair,    label: 'Crosshair',        group: 0, functional: true },
  { id: 'cursor',    icon: MousePointer,  label: 'Magnet mode',      group: 0, functional: true },
  { id: 'trendline', icon: TrendingUp,    label: 'Trend Line',       group: 1 },
  { id: 'hline',     icon: Minus,         label: 'Horizontal Line',  group: 1, functional: true },
  { id: 'ray',       icon: ArrowRight,    label: 'Ray',              group: 1 },
  { id: 'fib',       icon: Triangle,      label: 'Fibonacci',        group: 2 },
  { id: 'rect',      icon: Square,        label: 'Rectangle',        group: 2 },
  { id: 'ruler',     icon: Ruler,         label: 'Measure',          group: 3 },
  { id: 'text',      icon: Type,          label: 'Text',             group: 3 },
  { id: 'zoom',      icon: ZoomIn,        label: 'Fit to screen',    group: 4, functional: true },
  { id: 'screenshot', icon: Camera,       label: 'Screenshot',       group: 4, functional: true },
  { id: 'eraser',    icon: Trash2,        label: 'Remove drawings',  group: 4, functional: true },
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
  const userLinesRef = useRef<IPriceLine[]>([])
  const liveCandleRef = useRef<{ time: number; open: number; high: number; low: number } | null>(null)
  const activeToolRef = useRef('crosshair')

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
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(255,255,255,0.15)', labelBackgroundColor: '#1e2027' },
        horzLine: { color: 'rgba(255,255,255,0.15)', labelBackgroundColor: '#1e2027' },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        textColor: '#6b7280',
      },
      timeScale: {
        borderColor: 'rgba(255,255,255,0.08)',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
      },
      handleScroll: true,
      handleScale: true,
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
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
              color: '#3b82f6',
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
      color: c.close >= c.open ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
    }))

    candleSeriesRef.current.setData(candleData)
    volumeSeriesRef.current.setData(volumeData)
    chartRef.current?.timeScale().fitContent()
  }, [candles])

  // ── Real-time price update from SSE stream ────────────────────────────────
  useEffect(() => {
    if (currentPrice <= 0 || !candleSeriesRef.current || !candles?.length) return

    const interval = TF_SECONDS[timeframe]
    const nowSec = Math.floor(Date.now() / 1000)
    const currentCandleTime = Math.floor(nowSec / interval) * interval
    const lastCandle = candles[candles.length - 1]

    // Initialize or advance live candle tracking
    if (!liveCandleRef.current || liveCandleRef.current.time !== currentCandleTime) {
      if (currentCandleTime === lastCandle.time) {
        // Same period as last fetched candle — continue from it
        liveCandleRef.current = {
          time: currentCandleTime,
          open: lastCandle.open,
          high: lastCandle.high,
          low: lastCandle.low,
        }
      } else {
        // New period — start a fresh candle
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
        color: isLong ? 'rgba(34,197,94,0.85)' : 'rgba(239,68,68,0.85)',
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
    } else if (toolId === 'cursor') {
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
    if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
    if (n >= 1) return n.toFixed(2)
    if (n >= 0.1) return n.toFixed(4)
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
      {/* ── Drawing Tools Sidebar ── */}
      <div className="flex flex-col items-center w-10 border-r border-white/[0.06] bg-[#0a0b0e] shrink-0 py-1.5 gap-0.5">
        {TOOLS.map((tool, i) => {
          const Icon = tool.icon
          const showDivider = i > 0 && TOOLS[i - 1].group !== tool.group
          return (
            <div key={tool.id} className="flex flex-col items-center">
              {showDivider && <div className="w-5 h-px bg-white/[0.08] my-1" />}
              <button
                onClick={() => handleToolClick(tool.id)}
                title={tool.label}
                className={cn(
                  'w-8 h-7 flex items-center justify-center rounded transition-colors',
                  activeTool === tool.id
                    ? 'bg-blue-500/20 text-blue-400'
                    : tool.functional
                      ? 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                      : 'text-zinc-600 hover:text-zinc-500 hover:bg-white/[0.03] cursor-default'
                )}
              >
                <Icon className="size-3.5" />
              </button>
            </div>
          )
        })}
      </div>

      {/* ── Chart area ── */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* ── Toolbar ── */}
        <div className="flex items-center gap-1 px-2 border-b border-white/[0.06] shrink-0 h-10">
          {/* Timeframes */}
          <div className="flex items-center gap-0.5">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  'px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors',
                  timeframe === tf
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                )}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-white/10 mx-1" />

          {/* Symbol + Live price + Countdown */}
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-semibold text-white">{symbol}</span>
            <span className="text-zinc-500">·</span>
            <span className={cn(
              'font-semibold tabular-nums',
              priceChange >= 0 ? 'text-green-400' : 'text-red-400'
            )}>
              {fmt(livePrice)}
            </span>
            <span className={cn(
              'text-[10px] tabular-nums',
              priceChangePct >= 0 ? 'text-green-400/70' : 'text-red-400/70'
            )}>
              {priceChangePct >= 0 ? '+' : ''}{priceChangePct.toFixed(2)}%
            </span>

            {/* Countdown to next bar close */}
            <span className="text-zinc-600">·</span>
            <span className="flex items-center gap-1 text-zinc-400 tabular-nums font-mono text-[10px]">
              <Timer className="size-3 text-zinc-500" />
              {countdown}
            </span>

            {/* OHLC display on hover */}
            {display && (
              <span className="text-zinc-500 tabular-nums hidden lg:inline ml-1">
                O <span className="text-zinc-300">{fmt(display.o)}</span>
                {' '}H <span className="text-zinc-300">{fmt(display.h)}</span>
                {' '}L <span className="text-zinc-300">{fmt(display.l)}</span>
                {' '}C <span className={cn(display.pct >= 0 ? 'text-green-400' : 'text-red-400')}>{fmt(display.c)}</span>
                {' '}<span className={cn(display.pct >= 0 ? 'text-green-400/70' : 'text-red-400/70')}>
                  {display.pct >= 0 ? '+' : ''}{display.pct.toFixed(2)}%
                </span>
              </span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2 text-[10px] text-zinc-500">
            <span className="hidden xl:inline">Indicators</span>
            <div
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                currentPrice > 0 ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
              )}
              title={currentPrice > 0 ? 'Live prices' : 'Delayed prices'}
            />
            {onFullscreen && (
              <button
                onClick={onFullscreen}
                title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen (F)'}
                className="p-1 rounded hover:bg-white/10 hover:text-zinc-300 transition-colors"
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
