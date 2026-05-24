import { createContext, useContext } from 'react'
import { cn } from '@/lib/utils'

const GlassCtx = createContext(false)

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean
}

export function GlassCard({ glass = false, className, children, ...props }: GlassCardProps) {
  return (
    <GlassCtx.Provider value={glass}>
      <div
        className={cn(
          'rounded-xl h-full overflow-hidden',
          glass
            ? 'border border-white/30 bg-white/40 backdrop-blur-md shadow-lg'
            : 'border border-[#EDE7DC] bg-white',
          className
        )}
        {...props}
      >
        {children}
      </div>
    </GlassCtx.Provider>
  )
}

export function GlassCardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const glass = useContext(GlassCtx)
  return (
    <div
      className={cn(
        'px-5 py-3 border-b flex items-center justify-between',
        glass ? 'border-white/20 bg-white/10' : 'border-[#EDE7DC] bg-[#FAF7F2]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function GlassCardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('text-[11px] font-semibold uppercase tracking-wider text-[#706D6A]', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function GlassCardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('text-xs text-[#706D6A]', className)} {...props}>
      {children}
    </div>
  )
}

export function GlassCardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5', className)} {...props}>
      {children}
    </div>
  )
}

export function GlassCardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const glass = useContext(GlassCtx)
  return (
    <div
      className={cn(
        'px-5 py-3 border-t flex items-center justify-end gap-2',
        glass ? 'border-white/20' : 'border-[#EDE7DC]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'default'
}

export function GlassButton({ variant = 'default', className, children, ...props }: GlassButtonProps) {
  return (
    <button
      className={cn(
        'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
        variant === 'primary'
          ? 'bg-[#BA7517] text-white hover:bg-[#9E6312]'
          : 'border border-[#EDE7DC] text-[#706D6A] hover:bg-[#EDE7DC]',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
