import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/lib/pb', () => ({
  pb: {
    authStore: { record: { id: 'admin-1', role: 'gf' } },
    collection: vi.fn(),
  },
}))

import { pb } from '@/lib/pb'
import GamificationTaskList from '@/components/Gamification/GamificationTaskList'
import GamificationApprovals from '@/components/Gamification/GamificationApprovals'

const mockPb = vi.mocked(pb)

describe('Gamification Admin Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPb.authStore.record = { id: 'admin-1', role: 'gf' }
  })

  describe('GameTasks - Task Management', () => {
    it('should load and display task list', async () => {
      const mockGetFullList = vi.fn().mockResolvedValue([
        {
          id: 'task-1',
          title: 'Clean Kitchen',
          description: 'Clean and organize the kitchen',
          points: 50,
          category: 'Cleaning',
          difficulty: 'easy',
          requires_media: false,
          daily_limit_per_user: 1,
          expires_at: '',
          created: '2026-08-07T00:00:00Z',
          updated: '2026-08-07T00:00:00Z',
        },
      ])

      mockPb.collection.mockReturnValue({
        getFullList: mockGetFullList,
        subscribe: vi.fn().mockResolvedValue(() => {}),
        unsubscribe: vi.fn(),
        create: vi.fn(),
      } as any)

      render(<GamificationTaskList />)

      const taskTitle = await screen.findByText('Clean Kitchen')
      expect(taskTitle).toBeInTheDocument()
    })

    it('should create a new task and call create with form data', async () => {
      const mockCreate = vi.fn().mockResolvedValue({ id: 'task-2' })
      const mockGetFullList = vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]) // After creation

      mockPb.collection.mockReturnValue({
        getFullList: mockGetFullList,
        create: mockCreate,
        subscribe: vi.fn().mockResolvedValue(() => {}),
        unsubscribe: vi.fn(),
      } as any)

      const user = userEvent.setup()
      render(<GamificationTaskList />)

      // Click "Neue Aufgabe" button
      const createBtn = await screen.findByText('Neue Aufgabe')
      await user.click(createBtn)

      // Fill title field
      const titleField = screen.getByPlaceholderText('z.B. Schicht angeboten')
      await user.type(titleField, 'Test Task')

      // Click "Erstellen" button
      const submitBtn = await screen.findByText('Erstellen')
      await user.click(submitBtn)

      // Verify the create function was called
      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Test Task' })
        )
      })
    })

    it('should display tasks with correct difficulty badges', async () => {
      mockPb.collection.mockReturnValue({
        getFullList: vi.fn().mockResolvedValue([
          {
            id: 'task-1',
            title: 'Easy Task',
            description: 'An easy task',
            points: 10,
            category: 'General',
            difficulty: 'easy',
            requires_media: false,
            daily_limit_per_user: 0,
            expires_at: '',
            created: '2026-08-07T00:00:00Z',
            updated: '2026-08-07T00:00:00Z',
          },
          {
            id: 'task-2',
            title: 'Hard Task',
            description: 'A hard task',
            points: 100,
            category: 'General',
            difficulty: 'hard',
            requires_media: true,
            daily_limit_per_user: 0,
            expires_at: '',
            created: '2026-08-07T00:00:00Z',
            updated: '2026-08-07T00:00:00Z',
          },
        ]),
        subscribe: vi.fn().mockResolvedValue(() => {}),
        unsubscribe: vi.fn(),
        create: vi.fn(),
      } as any)

      render(<GamificationTaskList />)

      await screen.findByText('Easy Task')
      expect(screen.getByText('Einfach')).toBeInTheDocument()
      expect(screen.getByText('Schwer')).toBeInTheDocument()
    })
  })

  describe('GameApprovals - Submission & Order Management', () => {
    it('should load and display pending submissions', async () => {
      mockPb.collection.mockImplementation((collectionName: string) => {
        if (collectionName === 'gam_submissions') {
          return {
            getFullList: vi.fn().mockResolvedValue([
              {
                id: 'sub-1',
                user_id: 'user-1',
                task_id: 'task-1',
                media_url: 'photo.jpg',
                submission_notes: 'I completed the task',
                admin_feedback: '',
                status: 'pending',
                created: '2026-08-07T10:00:00Z',
                updated: '2026-08-07T10:00:00Z',
                expand: {
                  user_id: { id: 'user-1', username: 'john', name: 'John Doe' },
                  task_id: { id: 'task-1', title: 'Clean Kitchen' },
                },
              },
            ]),
            subscribe: vi.fn().mockResolvedValue(() => {}),
            update: vi.fn(),
            unsubscribe: vi.fn(),
          }
        }
        if (collectionName === 'gam_orders') {
          return {
            getFullList: vi.fn().mockResolvedValue([]),
            subscribe: vi.fn().mockResolvedValue(() => {}),
            unsubscribe: vi.fn(),
          }
        }
        return {}
      }) as any

      render(<GamificationApprovals />)

      const userName = await screen.findByText('john')
      expect(userName).toBeInTheDocument()
      expect(screen.getByText('Clean Kitchen')).toBeInTheDocument()
    })

    it('should approve a pending submission', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ id: 'sub-1' })
      const mockGetFullList = vi.fn().mockResolvedValue([
        {
          id: 'sub-1',
          user_id: 'user-1',
          task_id: 'task-1',
          media_url: 'photo.jpg',
          submission_notes: 'I completed the task',
          admin_feedback: '',
          status: 'pending',
          created: '2026-08-07T10:00:00Z',
          updated: '2026-08-07T10:00:00Z',
          expand: {
            user_id: { id: 'user-1', username: 'john', name: 'John Doe' },
            task_id: { id: 'task-1', title: 'Clean Kitchen' },
          },
        },
      ])

      mockPb.collection.mockImplementation((collectionName: string) => {
        if (collectionName === 'gam_submissions') {
          return {
            getFullList: mockGetFullList,
            subscribe: vi.fn().mockResolvedValue(() => {}),
            update: mockUpdate,
            unsubscribe: vi.fn(),
          }
        }
        if (collectionName === 'gam_orders') {
          return {
            getFullList: vi.fn().mockResolvedValue([]),
            subscribe: vi.fn().mockResolvedValue(() => {}),
            unsubscribe: vi.fn(),
          }
        }
        return {}
      }) as any

      const user = userEvent.setup()
      render(<GamificationApprovals />)

      // Click the review button
      const reviewBtn = await screen.findByText('Überprüfen')
      await user.click(reviewBtn)

      // Click the approve button
      const approveBtn = await screen.findByText('Genehmigen')
      await user.click(approveBtn)

      // Verify the update was called with 'approved' status
      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          'sub-1',
          expect.objectContaining({ status: 'approved' })
        )
      })
    })

    it('should reject an order and update status', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ id: 'order-1' })

      mockPb.collection.mockImplementation((collectionName: string) => {
        if (collectionName === 'gam_submissions') {
          return {
            getFullList: vi.fn().mockResolvedValue([]),
            subscribe: vi.fn().mockResolvedValue(() => {}),
            unsubscribe: vi.fn(),
          }
        }
        if (collectionName === 'gam_orders') {
          return {
            getFullList: vi.fn().mockResolvedValue([
              {
                id: 'order-1',
                user_id: 'user-1',
                reward_id: 'reward-1',
                admin_feedback: '',
                status: 'pending_admin',
                created: '2026-08-07T10:00:00Z',
                updated: '2026-08-07T10:00:00Z',
                expand: {
                  user_id: { id: 'user-1', username: 'john', name: 'John Doe' },
                  reward_id: { id: 'reward-1', title: 'Coffee', points_cost: 50 },
                },
              },
            ]),
            subscribe: vi.fn().mockResolvedValue(() => {}),
            update: mockUpdate,
            unsubscribe: vi.fn(),
          }
        }
        return {}
      }) as any

      const user = userEvent.setup()
      render(<GamificationApprovals />)

      // Wait for orders tab to be visible with count
      const ordersTab = await screen.findByText(/Bestellungen \(1\)/)
      await user.click(ordersTab)

      // Click the review button
      const reviewBtn = await screen.findByText('Überprüfen')
      await user.click(reviewBtn)

      // Click reject button
      const rejectBtn = await screen.findByText('Ablehnen')
      await user.click(rejectBtn)

      // Verify the update was called with 'rejected' status
      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          'order-1',
          expect.objectContaining({
            status: 'rejected',
          })
        )
      })
    })

    it('should display submission and order counts in tabs', async () => {
      mockPb.collection.mockImplementation((collectionName: string) => {
        if (collectionName === 'gam_submissions') {
          return {
            getFullList: vi.fn().mockResolvedValue([
              {
                id: 'sub-1',
                user_id: 'user-1',
                task_id: 'task-1',
                media_url: '',
                submission_notes: '',
                admin_feedback: '',
                status: 'pending',
                created: '2026-08-07T10:00:00Z',
                updated: '2026-08-07T10:00:00Z',
                expand: {
                  user_id: { id: 'user-1', username: 'john', name: 'John' },
                  task_id: { id: 'task-1', title: 'Task' },
                },
              },
              {
                id: 'sub-2',
                user_id: 'user-2',
                task_id: 'task-2',
                media_url: '',
                submission_notes: '',
                admin_feedback: '',
                status: 'pending',
                created: '2026-08-07T11:00:00Z',
                updated: '2026-08-07T11:00:00Z',
                expand: {
                  user_id: { id: 'user-2', username: 'jane', name: 'Jane' },
                  task_id: { id: 'task-2', title: 'Task 2' },
                },
              },
            ]),
            subscribe: vi.fn().mockResolvedValue(() => {}),
            unsubscribe: vi.fn(),
          }
        }
        if (collectionName === 'gam_orders') {
          return {
            getFullList: vi.fn().mockResolvedValue([
              {
                id: 'order-1',
                user_id: 'user-1',
                reward_id: 'reward-1',
                admin_feedback: '',
                status: 'pending_admin',
                created: '2026-08-07T10:00:00Z',
                updated: '2026-08-07T10:00:00Z',
                expand: {
                  user_id: { id: 'user-1', username: 'john', name: 'John' },
                  reward_id: { id: 'reward-1', title: 'Reward', points_cost: 50 },
                },
              },
            ]),
            subscribe: vi.fn().mockResolvedValue(() => {}),
            unsubscribe: vi.fn(),
          }
        }
        return {}
      }) as any

      render(<GamificationApprovals />)

      // Check that both tabs display counts
      await waitFor(() => {
        expect(screen.getByText(/Einreichungen \(2\)/)).toBeInTheDocument()
      })

      await waitFor(() => {
        expect(screen.getByText(/Bestellungen \(1\)/)).toBeInTheDocument()
      })
    })
  })
})
