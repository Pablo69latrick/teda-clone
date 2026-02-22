'use client'

import { Toaster as Sonner } from 'sonner'

export function Toaster() {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        className: 'border border-border bg-card text-foreground shadow-lg',
        duration: 4000,
      }}
      richColors
      closeButton
    />
  )
}
