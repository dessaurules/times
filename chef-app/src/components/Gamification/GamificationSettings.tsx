import { useState, useEffect, useRef } from 'react'
import { pb } from '@/lib/pb'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import type { RecordModel } from 'pocketbase'

interface GamSettings extends RecordModel {
  enabled: boolean
}

export default function GamificationSettings() {
  const [settings, setSettings] = useState<GamSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)

  // Load settings
  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      setLoading(true)
      setError(null)
      let list = await pb.collection('gam_settings').getFullList<RecordModel>({ limit: 1 })

      if (list.length === 0) {
        // Create default settings if none exist
        const newSettings = await pb.collection('gam_settings').create({
          enabled: false,
        })
        setSettings(newSettings as unknown as GamSettings)
      } else {
        setSettings(list[0] as unknown as GamSettings)
      }
    } catch (err) {
      setError(`Fehler beim Laden der Einstellungen: ${err}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Subscribe to real-time updates
  const unsubRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    pb.collection('gam_settings').subscribe('*', async () => {
      await loadSettings()
    }).then(fn => { unsubRef.current = fn })
      .catch(err => console.warn('Real-Time Subscription nicht verfügbar:', err))
    return () => {
      unsubRef.current?.()
      pb.collection('gam_settings').unsubscribe('*')
    }
  }, [])

  async function handleToggle() {
    if (!settings) return

    try {
      setToggling(true)
      setError(null)
      const updated = await pb.collection('gam_settings').update(settings.id, {
        enabled: !settings.enabled,
      })
      setSettings(updated as unknown as GamSettings)
    } catch (err) {
      setError(`Fehler beim Aktualisieren der Einstellungen: ${err}`)
      console.error(err)
    } finally {
      setToggling(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-600">
        Lade Einstellungen…
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-3 rounded-lg">
        Fehler: Einstellungen konnten nicht geladen werden
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-md">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Einstellungen</h2>
        <p className="text-sm text-gray-600 mt-1">Gamification-System konfigurieren</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Settings Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Label className="text-base font-semibold">System aktivieren</Label>
            <p className="text-sm text-gray-600 mt-1">
              Das Gamification-System ist derzeit{' '}
              <span className={settings.enabled ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                {settings.enabled ? 'aktiv' : 'deaktiviert'}
              </span>
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
              settings.enabled ? 'bg-indigo-600' : 'bg-gray-300'
            } ${toggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                settings.enabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Status Text */}
        <div className={`mt-4 px-3 py-2 rounded-lg text-sm ${
          settings.enabled
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {settings.enabled
            ? '✓ System ist aktiv und Mitarbeiter können Aufgaben einreichen und Prämien einlösen'
            : '✗ System ist deaktiviert. Mitarbeiter können keine Aufgaben einreichen.'}
        </div>
      </Card>
    </div>
  )
}
