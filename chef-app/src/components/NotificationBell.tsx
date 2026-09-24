import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { pb } from '../lib/pb'
import { useAuthStore } from '../stores/auth'
import type { Notification } from '@shared/types'
import { cn } from '@/lib/utils'

const TYPE_LABEL: Record<string, string> = {
  absence_request:  'Neuer Antrag',
  absence_approved: 'Genehmigt',
  absence_rejected: 'Abgelehnt',
  general:          'Hinweis',
}

function notifTarget(n: Notification): string {
  switch (n.type) {
    case 'absence_request': return '/'           // Dashboard → Anträge-Panel
    case 'absence_approved':
    case 'absence_rejected': return '/abwesenheiten'
    default: return '/'
  }
}

export default function NotificationBell() {
  const user     = useAuthStore(s => s.user)
  const navigate = useNavigate()

  const [items, setItems]   = useState<Notification[]>([])
  const [open,  setOpen]    = useState(false)
  const [pos,   setPos]     = useState({ top: 0, left: 0 })
  const buttonRef           = useRef<HTMLButtonElement>(null)
  const panelRef            = useRef<HTMLDivElement>(null)
  const unsubRef            = useRef<(() => void) | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    try {
      const list = await pb.collection('notifications').getFullList<Notification>({
        filter:     `user = "${user.id}"`,
        sort:       '-created',
        requestKey: null,
      })
      setItems(list)
    } catch {}
  }, [user])

  useEffect(() => {
    load()
    if (!user) return
    pb.collection('notifications').subscribe<Notification>('*', (e) => {
      if (e.record.user !== user.id) return
      if (e.action === 'create') {
        setItems(prev => [e.record, ...prev])
      } else if (e.action === 'update') {
        setItems(prev => prev.map(n => n.id === e.record.id ? e.record : n))
      } else if (e.action === 'delete') {
        setItems(prev => prev.filter(n => n.id !== e.record.id))
      }
    }, { requestKey: null }).then(fn => { unsubRef.current = fn })
    return () => {
      unsubRef.current?.()
      pb.collection('notifications').unsubscribe('*')
    }
  }, [user, load])

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

  function handleToggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 8, left: Math.max(8, rect.right - 320) })
    }
    setOpen(v => !v)
  }

  async function handleClick(n: Notification) {
    if (!n.read) {
      try {
        await pb.collection('notifications').update(n.id, { read: true }, { requestKey: null })
        setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
      } catch {}
    }
    setOpen(false)
    navigate(notifTarget(n))
  }

  async function markAllRead() {
    const unread = items.filter(n => !n.read)
    await Promise.all(
      unread.map(n =>
        pb.collection('notifications').update(n.id, { read: true }, { requestKey: null }).catch(() => {})
      )
    )
    setItems(prev => prev.map(n => ({ ...n, read: true })))
  }

  const unreadCount = items.filter(n => !n.read).length

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="relative flex items-center justify-center w-7 h-7 rounded-md hover:bg-[rgba(79,70,229,0.08)] text-[#6B7280] hover:text-[#4F46E5] transition-colors"
        title="Benachrichtigungen"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center text-[9px] font-bold text-white bg-red-500 rounded-full px-0.5 leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="w-80 bg-white rounded-xl border border-[#E5E7EB] shadow-xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB]">
            <span className="text-sm font-semibold text-[#111827]">Benachrichtigungen</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-[#4F46E5] hover:underline">
                Alle gelesen
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#6B7280]">
              Keine Benachrichtigungen
            </div>
          ) : (
            <ul className="max-h-[320px] overflow-y-auto divide-y divide-[#F3F4F6]">
              {items.map(n => (
                <li
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    'px-4 py-3 cursor-pointer hover:bg-[#F3F4F6] transition-colors',
                    !n.read && 'bg-[rgba(79,70,229,0.05)]',
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={cn(
                      'mt-1.5 w-1.5 h-1.5 rounded-full shrink-0',
                      n.read ? 'bg-transparent' : 'bg-[#4F46E5]',
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-[#111827] truncate">{n.title}</div>
                      <div className="text-xs text-[#6B7280] mt-0.5 line-clamp-2">{n.message}</div>
                      <div className="text-[10px] text-[#9CA3AF] mt-1">
                        {n.created ? format(new Date(n.created), 'dd.MM. HH:mm', { locale: de }) : ''}
                        {' · '}
                        {TYPE_LABEL[n.type] ?? n.type}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
