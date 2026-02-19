import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*=size-])]:size-4 shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-[0.98]',
        destructive:
          'bg-destructive text-white shadow-xs hover:bg-destructive/90 active:scale-[0.98]',
        outline:
          'border border-border bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 active:scale-[0.98]',
        ghost:
          'hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
        link:
          'text-primary underline-offset-4 hover:underline',
        // Trading-specific
        long:
          'bg-profit text-white shadow-xs hover:bg-profit/90 active:scale-[0.98] font-semibold',
        short:
          'bg-loss text-white shadow-xs hover:bg-loss/90 active:scale-[0.98] font-semibold',
        primary_gradient:
          'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-xs hover:from-primary/90 hover:to-primary/70 hover:shadow-md hover:shadow-primary/20 active:scale-[0.98]',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm:      'h-8 rounded-md gap-1.5 px-3 text-xs',
        lg:      'h-10 rounded-md px-6',
        xl:      'h-11 rounded-md px-8 text-base',
        icon:    'size-9',
        icon_sm: 'size-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
