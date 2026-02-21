'use client'

/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  BLOCK 2 — Trading Header Bar                           ║
 * ║                                                         ║
 * ║  This block is the TradingView NATIVE header toolbar.   ║
 * ║  It is rendered INSIDE the TradingView iframe and       ║
 * ║  configured via trading-chart.tsx widget options:        ║
 * ║                                                         ║
 * ║    hide_top_toolbar: false  → header visible             ║
 * ║    hide_side_toolbar: false → sidebar visible (Block 1)  ║
 * ║                                                         ║
 * ║  Native features provided by TradingView:               ║
 * ║  • Timeframe selector (1m, 5m, 15m, 1H, 4H, D, W, M)  ║
 * ║  • Chart type (candles, line, bars, etc.)               ║
 * ║  • Indicators (RSI, MACD, MA, Bollinger, etc.)          ║
 * ║  • Compare symbols                                      ║
 * ║  • Screenshot / Save image                              ║
 * ║  • Undo / Redo                                          ║
 * ║                                                         ║
 * ║  To customise which features appear, edit the            ║
 * ║  enabled_features / disabled_features arrays in          ║
 * ║  trading-chart.tsx.                                      ║
 * ╚══════════════════════════════════════════════════════════╝
 */

/**
 * Configuration for the native TradingView header.
 * Modify these arrays in trading-chart.tsx to control which
 * buttons appear in the native header toolbar.
 */
export const HEADER_ENABLED_FEATURES = [
  'use_localstorage_for_settings',
  'save_chart_properties_to_local_storage',
  'header_in_fullscreen_mode',
] as const

export const HEADER_DISABLED_FEATURES = [
  'header_symbol_search',    // hide symbol search (we use our watchlist)
  'header_compare',          // hide compare button
  'display_market_status',   // hide market status indicator
] as const
