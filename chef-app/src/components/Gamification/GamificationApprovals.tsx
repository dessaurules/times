import { useState, useEffect, useRef } from 'react'
import { pb } from '@/lib/pb'
import { Button } from '@/components/ui/button'
import { Dialog, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface User {
  id: string
  username: string
  name: string
}

interface GamTask {
  id: string
  title: string
}

interface GamReward {
  id: string
  title: string
  points_cost: number
}

interface GamSubmission {
  id: string
  user_id: string
  task_id: string
  media_url: string
  submission_notes: string
  admin_feedback: string
  status: string
  created: string
  updated: string
  expand?: {
    user_id?: User
    task_id?: GamTask
  }
}

interface GamOrder {
  id: string
  user_id: string
  reward_id: string
  admin_feedback: string
  status: string
  created: string
  updated: string
  expand?: {
    user_id?: User
    reward_id?: GamReward
  }
}

type ActiveTab = 'submissions' | 'orders'

export default function GamificationApprovals() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('submissions')
  const [submissions, setSubmissions] = useState<GamSubmission[]>([])
  const [orders, setOrders] = useState<GamOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialog state for approval
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<GamSubmission | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<GamOrder | null>(null)
  const [adminFeedback, setAdminFeedback] = useState('')
  const [approvalLoading, setApprovalLoading] = useState(false)

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)

      const [subList, ordList] = await Promise.all([
        pb.collection('gam_submissions').getFullList<GamSubmission>({
          filter: 'status = "pending"',
          expand: 'user_id,task_id',
        }),
        pb.collection('gam_orders').getFullList<GamOrder>({
          filter: 'status = "pending_admin"',
          expand: 'user_id,reward_id',
        }),
      ])

      setSubmissions(subList)
      setOrders(ordList)
    } catch (err) {
      setError(`Fehler beim Laden der Genehmigungen: ${err}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Subscribe to real-time updates (delayed to avoid race condition)
  const unsubRef1 = useRef<(() => void) | null>(null)
  const unsubRef2 = useRef<(() => void) | null>(null)
  useEffect(() => {
    const timer = setTimeout(() => {
      pb.collection('gam_submissions').subscribe('*', (e) => {
        if (e.action === 'delete') {
          setSubmissions(s => s.filter(sub => sub.id !== e.record.id))
        } else if (e.record.status === 'pending') {
          setSubmissions(s => {
            const idx = s.findIndex(sub => sub.id === e.record.id)
            if (idx >= 0) s[idx] = e.record as unknown as GamSubmission
            else s.push(e.record as unknown as GamSubmission)
            return [...s]
          })
        } else {
          setSubmissions(s => s.filter(sub => sub.id !== e.record.id))
        }
      }, { requestKey: null }).then(fn => { unsubRef1.current = fn })
        .catch(err => console.warn('Real-Time Subscription nicht verfügbar:', err))
      pb.collection('gam_orders').subscribe('*', (e) => {
        if (e.action === 'delete') {
          setOrders(o => o.filter(ord => ord.id !== e.record.id))
        } else if (e.record.status === 'pending_admin') {
          setOrders(o => {
            const idx = o.findIndex(ord => ord.id === e.record.id)
            if (idx >= 0) o[idx] = e.record as unknown as GamOrder
            else o.push(e.record as unknown as GamOrder)
            return [...o]
          })
        } else {
          setOrders(o => o.filter(ord => ord.id !== e.record.id))
        }
      }, { requestKey: null }).then(fn => { unsubRef2.current = fn })
        .catch(err => console.warn('Real-Time Subscription nicht verfügbar:', err))
    }, 100)

    return () => {
      clearTimeout(timer)
      unsubRef1.current?.()
      unsubRef2.current?.()
      pb.collection('gam_submissions').unsubscribe('*')
      pb.collection('gam_orders').unsubscribe('*')
    }
  }, [])

  async function handleApprove() {
    try {
      setApprovalLoading(true)
      if (selectedSubmission) {
        await pb.collection('gam_submissions').update(selectedSubmission.id, {
          status: 'approved',
        })
      } else if (selectedOrder) {
        await pb.collection('gam_orders').update(selectedOrder.id, {
          status: 'approved',
        })
      }
      setApprovalDialogOpen(false)
      setAdminFeedback('')
      setSelectedSubmission(null)
      setSelectedOrder(null)
      await loadData()
    } catch (err) {
      setError(`Fehler beim Genehmigen: ${err}`)
      console.error(err)
    } finally {
      setApprovalLoading(false)
    }
  }

  async function handleReject() {
    try {
      setApprovalLoading(true)
      if (selectedSubmission) {
        await pb.collection('gam_submissions').update(selectedSubmission.id, {
          status: 'rejected',
          admin_feedback: adminFeedback,
        })
      } else if (selectedOrder) {
        await pb.collection('gam_orders').update(selectedOrder.id, {
          status: 'rejected',
          admin_feedback: adminFeedback,
        })
      }
      setApprovalDialogOpen(false)
      setAdminFeedback('')
      setSelectedSubmission(null)
      setSelectedOrder(null)
      await loadData()
    } catch (err) {
      setError(`Fehler beim Ablehnen: ${err}`)
      console.error(err)
    } finally {
      setApprovalLoading(false)
    }
  }

  function openSubmissionReview(submission: GamSubmission) {
    setSelectedSubmission(submission)
    setSelectedOrder(null)
    setAdminFeedback(submission.admin_feedback || '')
    setApprovalDialogOpen(true)
  }

  function openOrderReview(order: GamOrder) {
    setSelectedOrder(order)
    setSelectedSubmission(null)
    setAdminFeedback(order.admin_feedback || '')
    setApprovalDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Genehmigungen</h2>
        <p className="text-sm text-gray-600 mt-1">Überprüfen und genehmigen Sie Aufgaben-Einreichungen und Prämien-Bestellungen</p>
      </div>

      {/* Error Message - nur wenn keine Daten vorhanden sind */}
      {error && submissions.length === 0 && orders.length === 0 && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8 text-gray-600">
          Lade Genehmigungen…
        </div>
      )}

      {/* Tabs */}
      {!loading && (
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)} className="space-y-6">
          <TabsList>
            <TabsTrigger value="submissions">
              Einreichungen ({submissions.length})
            </TabsTrigger>
            <TabsTrigger value="orders">
              Bestellungen ({orders.length})
            </TabsTrigger>
          </TabsList>

          {/* Submissions Tab */}
          <TabsContent value="submissions">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Mitarbeiter</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Aufgabe</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Eingereicht am</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-600 text-sm">
                        Keine ausstehenden Einreichungen
                      </td>
                    </tr>
                  ) : (
                    submissions.map((submission) => (
                      <tr key={submission.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {submission.expand?.user_id?.username || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {submission.expand?.task_id?.title || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(submission.created).toLocaleDateString('de-DE')}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openSubmissionReview(submission)}
                          >
                            Überprüfen
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Mitarbeiter</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Prämie</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Kosten</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-600 text-sm">
                        Keine ausstehenden Bestellungen
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {order.expand?.user_id?.username || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {order.expand?.reward_id?.title || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {order.expand?.reward_id?.points_cost || 0}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openOrderReview(order)}
                          >
                            Überprüfen
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Approval Dialog */}
      <Dialog open={approvalDialogOpen} onClose={() => { if (!approvalLoading) setApprovalDialogOpen(false) }}>
        <DialogHeader>
          <DialogTitle>
            {selectedSubmission ? 'Einreichung überprüfen' : 'Bestellung überprüfen'}
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            {/* Submission Details */}
            {selectedSubmission && (
              <>
                {/* Media */}
                {selectedSubmission.media_url && (
                  <div>
                    <Label>Eingereichte Medien</Label>
                    <img
                      src={selectedSubmission.media_url}
                      alt="Eingereichte Medien"
                      className="w-full max-h-64 object-cover rounded-lg mt-2"
                    />
                  </div>
                )}

                {/* Submission Notes */}
                {selectedSubmission.submission_notes && (
                  <div>
                    <Label>Notizen des Mitarbeiters</Label>
                    <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 mt-1">
                      {selectedSubmission.submission_notes}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Admin Feedback */}
            <div>
              <Label htmlFor="admin-feedback">Admin-Feedback</Label>
              <textarea
                id="admin-feedback"
                value={adminFeedback}
                onChange={(e) => setAdminFeedback(e.target.value)}
                placeholder="Ihr Feedback für den Mitarbeiter (bei Ablehnung erforderlich)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setApprovalDialogOpen(false)}
              disabled={approvalLoading}
            >
              Abbrechen
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              disabled={approvalLoading}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              {approvalLoading ? 'Wird verarbeitet…' : 'Ablehnen'}
            </Button>
            <Button
              size="sm"
              onClick={handleApprove}
              disabled={approvalLoading}
            >
              {approvalLoading ? 'Wird verarbeitet…' : 'Genehmigen'}
            </Button>
          </div>
        </DialogBody>
      </Dialog>
    </div>
  )
}
