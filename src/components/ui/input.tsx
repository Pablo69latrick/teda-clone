import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

// ─── Numeric input with +/- buttons (for trade form) ─
interface NumericInputProps extends Omit<InputProps, 'onChange'> {
  value: number | string
  onChange: (value: string) => void
  onIncrement?: () => void
  onDecrement?: () => void
  showControls?: boolean
}

const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  ({ value, onChange, onIncrement, onDecrement, showControls = true, className, ...props }, ref) => {
    return (
      <div className="relative flex items-center">
        {showControls && onDecrement && (
          <button
            type="button"
            onClick={onDecrement}
            className="absolute left-2 z-10 text-muted-foreground hover:text-foreground text-base leading-none select-none"
          >
            −
          </button>
        )}
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={cn(
            'w-full bg-transparent text-center text-sm text-foreground focus:outline-none',
            showControls && 'px-6',
            className
          )}
          {...props}
        />
        {showControls && onIncrement && (
          <button
            type="button"
            onClick={onIncrement}
            className="absolute right-2 z-10 text-muted-foreground hover:text-foreground text-base leading-none select-none"
          >
            +
          </button>
        )}
      </div>
    )
  }
)
NumericInput.displayName = 'NumericInput'

export { Input, NumericInput }
