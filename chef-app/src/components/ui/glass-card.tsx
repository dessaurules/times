import { cn } from '@/lib/utils'

export function GlassCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/30 bg-white/40 backdrop-blur-md shadow-lg',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
