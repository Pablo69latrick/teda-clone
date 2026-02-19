'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
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
import { Maximize2, Minimize2 } from 'lucide-react'

interface ChartPanelProps {
  symbol: string
  accountId?: string
  onFullscreen?: () => void
  isFullscreen?: boolean
}

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'] as const
type Timeframe = typeof TIMEFRAMES[number]

// OHLC bar info shown in toolbar on crosshair hover
interface BarInfo {
  o: number; h: number; l: number; c: number; pct: number
}

export function ChartPanel({ symbol, accountId, onFullscreen, isFullscreen }: ChartPanelProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('1h')
  const [barInfo, setBarInfo] = useState<BarInfo | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const priceLinesRef = useRef<Map<string, IPriceLine>>(new Map())

  const { data: candles } = useCandles(symbol, timeframe)
  const { data: tradingData } = useTradingData(accountId)

  // Open positions for the current symbol
  const openPositionsForSymbol = (tradingData?.positions ?? []).filter(
    p => p.status === 'open' && p.symbol === symbol
  )

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

    // Candlestick series (v5 API: chart.addSeries(SeriesDefinition, options))
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    })

    // Volume histogram (in a pane below, uses priceScaleId)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: 'rgba(100,116,139,0.35)',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
      borderVisible: false,
    })

    // Crosshair subscription → update OHLC bar info
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

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    volumeSeriesRef.current = volumeSeries

    // ── ResizeObserver ──────────────────────────────────────────────────────
    const ro = new ResizeObserver(entries => {
      const entry = entries[0]
      if (entry) {
        chart.resize(entry.contentRect.width, entry.contentRect.height)
      }
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
    }
  }, [])   // run once

  // ── Load candles whenever symbol/timeframe changes ────────────────────────
  useEffect(() => {
    if (!candles || !candleSeriesRef.current || !volumeSeriesRef.current) return

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

  // ── Position price lines ──────────────────────────────────────────────────
  useEffect(() => {
    const series = candleSeriesRef.current
    if (!series) return

    // Remove all existing price lines
    priceLinesRef.current.forEach(line => {
      try { series.removePriceLine(line) } catch { /* series may have been destroyed */ }
    })
    priceLinesRef.current.clear()

    // Add a dashed line for each open position on this symbol
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

  // Latest close for the last bar display
  const latestCandle = candles?.[candles.length - 1]
  const latestClose = latestCandle?.close ?? 0
  const prevCandle = candles?.[candles.length - 2]
  const prevClose = prevCandle?.close ?? latestClose
  const priceChange = latestClose - prevClose
  const priceChangePct = prevClose > 0 ? (priceChange / prevClose) * 100 : 0

  const fmt = useCallback((n: number) => {
    if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 1 })
    if (n >= 1) return n.toFixed(2)
    if (n >= 0.1) return n.toFixed(4)
    return n.toFixed(5)
  }, [])

  const display = barInfo ?? (latestCandle
    ? { o: latestCandle.open, h: latestCandle.high, l: latestCandle.low, c: latestCandle.close, pct: priceChangePct }
    : null)

  return (
    <div className="flex flex-col h-full bg-[#0d0f13]">
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

        {/* Symbol + OHLC display */}
        <div className="flex items-center gap-2 text-[11px]">
          <span className="font-semibold text-white">{symbol}</span>
          <span className="text-zinc-500">·</span>
          <span className={cn(
            'font-semibold tabular-nums',
            priceChange >= 0 ? 'text-green-400' : 'text-red-400'
          )}>
            {fmt(latestClose)}
          </span>
          <span className={cn(
            'text-[10px] tabular-nums',
            priceChangePct >= 0 ? 'text-green-400/70' : 'text-red-400/70'
          )}>
            {priceChangePct >= 0 ? '+' : ''}{priceChangePct.toFixed(2)}%
          </span>

          {display && (
            <span className="text-zinc-500 tabular-nums hidden lg:inline">
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
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="Live" />
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
  )
}
