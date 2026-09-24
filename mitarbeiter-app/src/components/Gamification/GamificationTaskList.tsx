import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useGamificationEnabled } from '@/hooks/useGamificationEnabled'
import { pb } from '@/lib/pb'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'

interface Task {
  id: string
  title: string
  description: string
  category?: string
  points: number
  active: boolean
  expires_at: string
}

export function GamificationTaskList() {
  const { enabled } = useGamificationEnabled()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [assigningId, setAssigningId] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

    const loadTasks = async () => {
      try {
        const records = await pb.collection('gam_tasks').getFullList({
          filter: 'active = true && (expires_at = "" || expires_at > @now)',
          sort: '-points',
        })
        setTasks(records as unknown as Task[])
      } catch (err) {
        console.error('[GamificationTaskList] Error loading tasks:', err)
        setTasks([])
      } finally {
        setLoading(false)
      }
    }

    loadTasks()
  }, [enabled])

  const handleAccept = async (taskId: string) => {
    if (!pb.authStore.record) {
      alert('User not authenticated')
      return
    }

    setAssigningId(taskId)
    try {
      await pb.collection('gam_assignments').create({
        task_id: taskId,
        user_id: pb.authStore.record.id,
      })
      // Reload tasks after accepting
      const records = await pb.collection('gam_tasks').getFullList({
        filter: 'active = true && (expires_at = "" || expires_at > @now)',
        sort: '-points',
      })
      setTasks(records as unknown as Task[])
    } catch (err) {
      console.error('[GamificationTaskList] Error accepting task:', err)
      alert('Fehler beim Akzeptieren der Aufgabe')
    } finally {
      setAssigningId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[#4F46E5]" />
      </div>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[#6B7280]">Keine verfügbaren Aufgaben</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <Card key={task.id} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[#111827]">{task.title}</h3>
                  {task.category && (
                    <Badge variant="secondary" className="text-xs">
                      {task.category}
                    </Badge>
                  )}
                </div>
              </div>
              <Badge variant="default">{task.points}</Badge>
            </div>
            <p className="text-sm text-[#6B7280] mb-3">{task.description}</p>
            <Button
              size="sm"
              onClick={() => handleAccept(task.id)}
              disabled={assigningId === task.id}
              className="w-full"
            >
              {assigningId === task.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Wird akzeptiert...
                </>
              ) : (
                'Annehmen'
              )}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
