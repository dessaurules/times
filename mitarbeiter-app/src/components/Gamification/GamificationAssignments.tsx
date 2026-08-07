import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useAssignments, type Assignment } from '@/hooks/useAssignments'
import { pb } from '@/lib/pb'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Progress } from '../ui/progress'
import { Dialog, DialogHeader, DialogTitle, DialogClose, DialogBody, DialogFooter } from '../ui/dialog'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

const ASSIGNMENT_DURATION_MS = 8 * 60 * 60 * 1000 // 8 hours

export function GamificationAssignments() {
  const { assignments: allAssignments } = useAssignments()
  const [timers, setTimers] = useState<Record<string, number>>({})
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [submissionNotes, setSubmissionNotes] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Filter active assignments only
  const activeAssignments = allAssignments.filter((a) => a.status === 'active')

  // Update timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      const newTimers: Record<string, number> = {}
      for (const assignment of activeAssignments) {
        const expiresAt = new Date(assignment.expires_at).getTime()
        const now = new Date().getTime()
        const remaining = Math.max(0, expiresAt - now)
        newTimers[assignment.id] = remaining
      }
      setTimers(newTimers)
    }, 1000)

    return () => clearInterval(interval)
  }, [activeAssignments])

  const formatTimeRemaining = (ms: number): string => {
    if (ms <= 0) return '0h 0m'
    const hours = Math.floor(ms / (60 * 60 * 1000))
    const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))
    return `${hours}h ${minutes}m`
  }

  const getProgressPercent = (assignmentId: string): number => {
    const timeRemaining = timers[assignmentId] ?? 0
    return Math.max(0, Math.min(100, (timeRemaining / ASSIGNMENT_DURATION_MS) * 100))
  }

  const handleSubmit = async () => {
    if (!selectedAssignment || !pb.authStore.record) {
      return
    }

    // Check if media is required
    if (selectedAssignment.expand?.task_id?.requires_media && !mediaFile) {
      alert('Medienanhang erforderlich')
      return
    }

    setSubmitting(true)
    try {
      let mediaUrl = ''

      // If media file is provided, we would upload it here
      // For now, just store the filename
      if (mediaFile) {
        mediaUrl = mediaFile.name
      }

      await pb.collection('gam_submissions').create({
        assignment_id: selectedAssignment.id,
        task_id: selectedAssignment.task_id,
        user_id: pb.authStore.record.id,
        media_url: mediaUrl,
        submission_notes: submissionNotes,
      })

      setSelectedAssignment(null)
      setSubmissionNotes('')
      setMediaFile(null)
      alert('Aufgabe eingereicht! Admin wird diese bald überprüfen.')
    } catch (err) {
      console.error('[GamificationAssignments] Error submitting:', err)
      alert('Fehler beim Einreichen der Aufgabe')
    } finally {
      setSubmitting(false)
    }
  }

  if (activeAssignments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[#6B7280]">Keine aktiven Aufgaben</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {activeAssignments.map((assignment) => {
          const progressPercent = getProgressPercent(assignment.id)
          const timeRemaining = timers[assignment.id] ?? 0
          const isUrgent = timeRemaining < 1 * 60 * 60 * 1000 // Less than 1 hour

          return (
            <Card key={assignment.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-[#111827]">
                    {assignment.expand?.task_id?.title || 'Untitled Task'}
                  </h3>
                  <Badge variant="default">
                    {assignment.expand?.task_id?.points || 0}
                  </Badge>
                </div>

                <Progress value={progressPercent} className="mb-2" />

                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-[#6B7280]">
                    Verbleibend: {formatTimeRemaining(timeRemaining)}
                  </p>
                  {isUrgent && (
                    <Badge variant="destructive" className="text-xs">
                      {formatTimeRemaining(timeRemaining)} verbleibend
                    </Badge>
                  )}
                </div>

                <Button
                  size="sm"
                  onClick={() => setSelectedAssignment(assignment)}
                  className="w-full"
                >
                  Abschließen
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={!!selectedAssignment} onClose={() => setSelectedAssignment(null)}>
        <DialogHeader>
          <DialogTitle>Aufgabe einreichen</DialogTitle>
          <DialogClose onClose={() => setSelectedAssignment(null)} />
        </DialogHeader>
        <DialogBody>
          {selectedAssignment?.expand?.task_id?.requires_media && (
            <div className="mb-4">
              <Label className="mb-2 block">
                Foto oder Video hochladen
              </Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setMediaFile(e.target.files?.[0] ?? null)}
              />
              {mediaFile && (
                <p className="text-xs text-[#6B7280] mt-1">{mediaFile.name}</p>
              )}
            </div>
          )}

          <div>
            <Label className="mb-2 block">
              Notizen (optional)
            </Label>
            <Textarea
              placeholder="Ergänzende Notizen zur Aufgabe..."
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              className="min-h-24"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setSelectedAssignment(null)}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Wird eingereicht...
              </>
            ) : (
              'Einreichen'
            )}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
