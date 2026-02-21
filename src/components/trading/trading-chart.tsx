'use client'

/**
 * TradingChart — Lightweight Charts v5 candlestick chart
 *
 * PERFORMANCE RULES:
 *   1. chart + series in useRef, NEVER useState
 *   2. Live ticks via series.update() — NEVER setData() on every tick
 *   3. Component never re-renders for a price tick
 *   4. Import with next/dynamic { ssr: false }
 *   5. ResizeObserver for responsive sizing
 */

import { useEffect, useRef, useCallback } from 'react'
import {
  createChart,
  ColorType,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
} from 'lightweight-charts'
import { usePriceStore } from '@/stores/price-store'

// ─── Types ──────────────────────────────────────────────────────────────────

interface TradingChartProps {
  symbol: string
  timeframe?: string
}

interface CurrentCandle {
  time: number
  open: number
  high: number
  low: number
  close: number
}

// ─── Timeframe → seconds ────────────────────────────────────────────────────

const TF_SECONDS: Record<string, number> = {
  '1m':  60,
  '5m':  300,
  '15m': 900,
  '1h':  3600,
  '4h':  14400,
  '1d':  86400,
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function TradingChart({ symbol, timeframe = '1h' }: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const currentCandleRef = useRef<CurrentCandle | null>(null)
  const tfSecondsRef = useRef(TF_SECONDS[timeframe] ?? 3600)

  // ── Create chart ONCE ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0a0a0a' },
        textColor: '#787b86',
        fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#1a1a2e', style: 1 },
        horzLines: { color: '#1a1a2e', style: 1 },
      },
      crosshair: {
        mode: 0, // Normal crosshair
        vertLine: { color: '#555', width: 1, style: 2, labelBackgroundColor: '#2a2a3e' },
        horzLine: { color: '#555', width: 1, style: 2, labelBackgroundColor: '#2a2a3e' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#1a1a2e',
        rightOffset: 5,
        barSpacing: 8,
      },
      rightPriceScale: {
        borderColor: '#1a1a2e',
        scaleMargins: { top: 0.1, bottom: 0.2 },
      },
      handleScroll: { vertTouchDrag: false },
    })

    // Candlestick series (v5 API: chart.addSeries(definition, options))
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    })

    // Volume histogram (overlay at bottom)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#26a69a33',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })

    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    volumeSeriesRef.current = volumeSeries

    // Responsive resize
    const observer = new ResizeObserver(entries => {
      if (!entries[0]) return
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) {
        chart.applyOptions({ width, height })
      }
    })
    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
    }
  }, [])

  // ── Load historical data when symbol/timeframe changes ─────────────────────
  const loadCandles = useCallback(async (sym: string, tf: string) => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return

    try {
      const res = await fetch(`/api/market-data/candles?symbol=${encodeURIComponent(sym)}&timeframe=${tf}&limit=500`)
      if (!res.ok) return

      const data = await res.json()
      if (!data.candles || !Array.isArray(data.candles)) return

      // Set candle data
      const candles: CandlestickData<Time>[] = data.candles.map((c: { time: number; open: number; high: number; low: number; close: number }) => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))

      candleSeriesRef.current.setData(candles)

      // Set volume data
      const volumes = data.candles.map((c: { time: number; open: number; close: number; volume: number }) => ({
        time: c.time as Time,
        value: c.volume,
        color: c.close >= c.open ? '#22c55e33' : '#ef444433',
      }))

      volumeSeriesRef.current.setData(volumes)

      // Fit content with a slight right offset
      chartRef.current?.timeScale().fitContent()

      // Track the last candle for live updates
      const lastCandle = data.candles[data.candles.length - 1]
      if (lastCandle) {
        currentCandleRef.current = {
          time: lastCandle.time,
          open: lastCandle.open,
          high: lastCandle.high,
          low: lastCandle.low,
          close: lastCandle.close,
        }
      }

      tfSecondsRef.current = TF_SECONDS[tf] ?? 3600
    } catch (err) {
      console.error('[TradingChart] Failed to load candles:', err)
    }
  }, [])

  useEffect(() => {
    loadCandles(symbol, timeframe)
  }, [symbol, timeframe, loadCandles])

  // ── Live price streaming — subscribe to Zustand store OUTSIDE React ─────────
  useEffect(() => {
    const unsubscribe = usePriceStore.subscribe(
      (state) => state.prices[symbol],
      (price) => {
        if (!price || !candleSeriesRef.current) return

        const now = Math.floor(Date.now() / 1000)
        const tfSec = tfSecondsRef.current
        const candleTime = Math.floor(now / tfSec) * tfSec

        const current = currentCandleRef.current

        if (current && current.time === candleTime) {
          // Update existing candle
          current.high = Math.max(current.high, price)
          current.low = Math.min(current.low, price)
          current.close = price

          candleSeriesRef.current.update({
            time: current.time as Time,
            open: current.open,
            high: current.high,
            low: current.low,
            close: current.close,
          })
        } else {
          // New candle period
          currentCandleRef.current = {
            time: candleTime,
            open: price,
            high: price,
            low: price,
            close: price,
          }

          candleSeriesRef.current.update({
            time: candleTime as Time,
            open: price,
            high: price,
            low: price,
            close: price,
          })
        }
      }
    )

    return unsubscribe
  }, [symbol])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: 300 }}
    />
  )
}
