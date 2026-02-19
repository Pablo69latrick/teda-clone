import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary/10 text-primary',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground',
        outline:
          'border-border text-foreground',
        destructive:
          'border-transparent bg-destructive/10 text-destructive',
        profit:
          'border-profit/20 bg-profit/10 text-profit',
        loss:
          'border-loss/20 bg-loss/10 text-loss',
        active:
          'border-profit/20 bg-profit/10 text-profit',
        breached:
          'border-loss/20 bg-loss/10 text-loss',
        passed:
          'border-chart-2/20 bg-chart-2/10 text-chart-2',
        funded:
          'border-chart-1/20 bg-chart-1/10 text-chart-1',
        muted:
          'border-border bg-muted text-muted-foreground',
        long:
          'border-profit/20 bg-profit/10 text-profit',
        short:
          'border-loss/20 bg-loss/10 text-loss',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
