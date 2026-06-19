import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:     'border-transparent bg-[#4F46E5] text-white',
        secondary:   'border-transparent bg-[#F3F4F6] text-[#6B7280]',
        destructive: 'border-transparent bg-red-600 text-white',
        outline:     'border-[#E5E7EB] text-[#111827]',
        success:     'border-transparent bg-green-100 text-green-800',
        warning:     'border-transparent bg-amber-100 text-amber-800',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
