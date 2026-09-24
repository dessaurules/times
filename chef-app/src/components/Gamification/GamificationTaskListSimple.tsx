import { useState, useEffect } from 'react'
import { pb } from '@/lib/pb'

interface GamTask {
  id: string
  title: string
  points: number
}

export default function GamificationTaskListSimple() {
  const [tasks, setTasks] = useState<GamTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        console.log('Loading gam_tasks...')
        const list = await pb.collection('gam_tasks').getFullList<GamTask>()
        console.log('Loaded:', list.length, 'tasks')
        setTasks(list)
      } catch (err: any) {
        console.error('Error:', err)
        setError(err.message || String(err))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div>Lade...</div>
  if (error) return <div style={{ color: 'red' }}>❌ {error}</div>
  if (tasks.length === 0) return <div>Keine Aufgaben</div>

  return (
    <div>
      <h3>✅ {tasks.length} Aufgaben geladen!</h3>
      <ul>
        {tasks.map(t => <li key={t.id}>{t.title} ({t.points}p)</li>)}
      </ul>
    </div>
  )
}
