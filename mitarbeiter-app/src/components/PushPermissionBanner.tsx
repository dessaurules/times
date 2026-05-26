import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { useAuthStore } from '../stores/auth'
import { subscribePush } from '../lib/push'

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches

export default function PushPermissionBanner() {
  const user = useAuthStore(s => s.user)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!('Notification' in window) && !(isIOS && !isInStandaloneMode)) return
    if ('Notification' in window && Notification.permission !== 'default') return
    setShow(true)
  }, [])

  if (!show) return null

  async function handleAllow() {
    if (!user?.employee) return
    const ok = await subscribePush(user.employee)
    setShow(false)
    if (!ok) console.warn('Push-Subscription fehlgeschlagen')
  }

  return (
    <div className="mx-4 mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-start gap-3">
      <Bell size={16} className="text-indigo-500 mt-0.5 shrink-0" />
      <div className="flex-1">
        {isIOS && !isInStandaloneMode ? (
          <p className="text-xs text-indigo-700">
            Füge diese App zum Homescreen hinzu um Push-Benachrichtigungen zu erhalten.
          </p>
        ) : (
          <>
            <p className="text-xs font-semibold text-indigo-800">Benachrichtigungen aktivieren</p>
            <p className="text-xs text-indigo-600 mt-0.5">
              Erhalte Erinnerungen für Schichten, Dienstpläne und Antragsantworten.
            </p>
            <button
              onClick={handleAllow}
              className="mt-2 text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1 rounded-lg transition-colors"
            >
              Jetzt aktivieren
            </button>
          </>
        )}
      </div>
      <button onClick={() => setShow(false)} className="text-indigo-300 hover:text-indigo-500">
        <X size={14} />
      </button>
    </div>
  )
}
