import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn('bg-white rounded-2xl border border-[#E5E7EB] shadow-sm h-full overflow-hidden', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-5 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('text-xs text-[#6B7280]', className)} {...props}>
      {children}
    </div>
  )
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-5 py-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2', className)}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'default'
}

export function CardButton({ variant = 'default', className, children, ...props }: CardButtonProps) {
  return (
    <button
      className={cn(
        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
        variant === 'primary'
          ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA]'
          : 'border border-[#E5E7EB] text-[#6B7280] hover:bg-[#E5E7EB]',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
