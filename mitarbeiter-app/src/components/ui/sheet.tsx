import * as React from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

function Sheet({ open, onOpenChange, children }: SheetProps) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  return createPortal(
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        />
      )}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-lg transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {children}
      </div>
    </>,
    document.body
  )
}

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]', className)} {...props} />
}

function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold text-[#111827]', className)} {...props} />
}

function SheetClose({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  return (
    <button onClick={() => onOpenChange(false)} className="text-[#6B7280] hover:text-[#111827] transition-colors">
      <X size={20} />
    </button>
  )
}

function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex-1 overflow-y-auto px-5 py-4', className)} {...props} />
}

function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex justify-end gap-2 px-5 py-4 border-t border-[#E5E7EB]', className)} {...props} />
  )
}

export { Sheet, SheetHeader, SheetTitle, SheetClose, SheetBody, SheetFooter }
