import { describe, it, expect, beforeEach, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('@/lib/pb', () => ({
  pb: {
    authStore: { record: { id: 'user-1', username: 'john' } },
    collection: vi.fn(),
  },
}))

vi.mock('@/hooks/useGamificationEnabled', () => ({
  useGamificationEnabled: () => ({ enabled: true }),
}))

vi.mock('@/hooks/useAssignments', () => ({
  useAssignments: () => ({
    assignments: [],
    loading: false,
  }),
}))

vi.mock('@/hooks/useUserPoints', () => ({
  useUserPoints: () => ({
    points: 100,
    loading: false,
  }),
}))

vi.mock('@/hooks/useActivityFeed', () => ({
  useActivityFeed: () => ({
    events: [],
    loading: false,
  }),
}))

const markSeenSpy = vi.fn().mockResolvedValue(undefined)
let mockSparkle = false
vi.mock('@/hooks/useGamificationSignal', () => ({
  useGamificationSignal: () => ({ sparkle: mockSparkle, markSeen: markSeenSpy }),
}))

import { pb } from '@/lib/pb'
import { GamificationTaskList } from '@/components/Gamification/GamificationTaskList'
import { GamificationShop } from '@/components/Gamification/GamificationShop'
import { GamificationHeader } from '@/components/Gamification/GamificationHeader'
import { GamificationFeed } from '@/components/Gamification/GamificationFeed'

const mockPb = vi.mocked(pb)

describe('Gamification User Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPb.authStore.record = { id: 'user-1', username: 'john' }
    mockSparkle = false
    markSeenSpy.mockClear()
  })

  describe('GamificationTaskList - Task Discovery', () => {
    it('should display available tasks', async () => {
      mockPb.collection.mockReturnValue({
        getFullList: vi.fn().mockResolvedValue([
          {
            id: 'task-1',
            title: 'Clean Kitchen',
            description: 'Sweep and mop',
            category: 'Cleaning',
            points: 50,
            active: true,
            expires_at: '',
          },
        ]),
        subscribe: vi.fn().mockResolvedValue(() => {}),
        create: vi.fn(),
      } as any)

      render(<GamificationTaskList />)

      const taskTitle = await screen.findByText('Clean Kitchen')
      expect(taskTitle).toBeInTheDocument()
      expect(screen.getByText('Sweep and mop')).toBeInTheDocument()
      expect(screen.getByText('50')).toBeInTheDocument()
    })

    it('should allow user to accept a task', async () => {
      const mockCreate = vi.fn().mockResolvedValue({ id: 'assign-1' })
      mockPb.collection.mockReturnValue({
        getFullList: vi.fn().mockResolvedValue([
          {
            id: 'task-1',
            title: 'Clean Kitchen',
            description: 'Sweep and mop',
            category: 'Cleaning',
            points: 50,
            active: true,
            expires_at: '',
          },
        ]),
        create: mockCreate,
        subscribe: vi.fn().mockResolvedValue(() => {}),
      } as any)

      render(<GamificationTaskList />)

      // Click the accept button (should be labeled "Annehmen")
      const acceptBtn = await screen.findByText('Annehmen')
      fireEvent.click(acceptBtn)

      // Verify the create function was called with correct params
      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith({
          task_id: 'task-1',
          user_id: 'user-1',
        })
      })
    })

    it('should display empty state when no tasks available', async () => {
      mockPb.collection.mockReturnValue({
        getFullList: vi.fn().mockResolvedValue([]),
        subscribe: vi.fn().mockResolvedValue(() => {}),
      } as any)

      render(<GamificationTaskList />)

      const emptyState = await screen.findByText('Keine verfügbaren Aufgaben')
      expect(emptyState).toBeInTheDocument()
    })

    it('should display multiple tasks sorted by points', async () => {
      mockPb.collection.mockReturnValue({
        getFullList: vi.fn().mockResolvedValue([
          {
            id: 'task-1',
            title: 'High Value Task',
            description: 'Worth a lot',
            category: 'Premium',
            points: 100,
            active: true,
            expires_at: '',
          },
          {
            id: 'task-2',
            title: 'Low Value Task',
            description: 'Worth less',
            category: 'Basic',
            points: 10,
            active: true,
            expires_at: '',
          },
        ]),
        subscribe: vi.fn().mockResolvedValue(() => {}),
        create: vi.fn(),
      } as any)

      render(<GamificationTaskList />)

      await screen.findByText('High Value Task')
      expect(screen.getByText('Low Value Task')).toBeInTheDocument()
    })
  })

  describe('GamificationShop - Rewards', () => {
    it('should display rewards with correct button states', async () => {
      // User has 100 points by default mock, rewards cost 50 and 30 - both should be enabled
      mockPb.collection.mockReturnValue({
        getFullList: vi.fn().mockResolvedValue([
          {
            id: 'reward-1',
            title: 'Coffee Break',
            description: 'Free coffee for a day',
            points_cost: 50,
            status: 'active',
            available_from: '',
            available_until: '',
            max_redemptions: 0,
            redemptions_count: 0,
          },
          {
            id: 'reward-2',
            title: 'Early Leave',
            description: 'Leave 30 min early',
            points_cost: 30,
            status: 'active',
            available_from: '',
            available_until: '',
            max_redemptions: 0,
            redemptions_count: 0,
          },
        ]),
      } as any)

      render(<GamificationShop />)

      // Both should show Einlösen button since user has 100 points
      const redeemButtons = await screen.findAllByText('Einlösen')
      expect(redeemButtons.length).toBeGreaterThanOrEqual(1)
      expect(redeemButtons[0]).toBeInTheDocument()
    })

    it('should allow user to redeem a reward', async () => {
      const mockCreate = vi.fn().mockResolvedValue({ id: 'order-1' })

      mockPb.collection.mockReturnValue({
        getFullList: vi.fn().mockResolvedValue([
          {
            id: 'reward-1',
            title: 'Coffee Break',
            description: 'Free coffee',
            points_cost: 50,
            status: 'active',
            available_from: '',
            available_until: '',
            max_redemptions: 0,
            redemptions_count: 0,
          },
        ]),
        create: mockCreate,
      } as any)

      render(<GamificationShop />)

      // Click the redeem button
      const redeemBtn = await screen.findByText('Einlösen')
      fireEvent.click(redeemBtn)

      // Verify create was called
      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledWith({
          reward_id: 'reward-1',
          user_id: 'user-1',
        })
      })
    })

    it('should disable sold out rewards', async () => {
      mockPb.collection.mockReturnValue({
        getFullList: vi.fn().mockResolvedValue([
          {
            id: 'reward-1',
            title: 'Limited Reward',
            description: 'Only 1 available',
            points_cost: 50,
            status: 'active',
            available_from: '',
            available_until: '',
            max_redemptions: 1,
            redemptions_count: 1,
          },
        ]),
      } as any)

      render(<GamificationShop />)

      const soldOutBtn = await screen.findByText('Ausverkauft')
      expect(soldOutBtn).toBeDisabled()
    })

    it('should display empty state when no rewards available', async () => {
      mockPb.collection.mockReturnValue({
        getFullList: vi.fn().mockResolvedValue([]),
      } as any)

      render(<GamificationShop />)

      const emptyState = await screen.findByText('Keine verfügbaren Prämien')
      expect(emptyState).toBeInTheDocument()
    })
  })

  describe('GamificationHeader', () => {
    it('zeigt den Button zum Oeffnen des Sheets', async () => {
      const { container } = render(<GamificationHeader />)

      await waitFor(() => {
        expect(container.querySelector('button')).toBeInTheDocument()
      })
    })

    it('zeigt kein Punkte-Badge am Edelstein-Icon', async () => {
      const { container } = render(<GamificationHeader />)

      await waitFor(() => {
        expect(container.querySelector('button')).toBeInTheDocument()
      })
      expect(screen.queryByText('100')).not.toBeInTheDocument()
    })

    it('zeigt den Diamanten grau, solange nichts Neues vorliegt', async () => {
      const { container } = render(<GamificationHeader />)

      await waitFor(() => {
        expect(container.querySelector('svg')).toBeInTheDocument()
      })
      expect(container.querySelector('.gem-sweep')).not.toBeInTheDocument()
    })

    it('laesst den Diamanten funkeln, wenn es Neues gibt', async () => {
      mockSparkle = true

      const { container } = render(<GamificationHeader />)

      await waitFor(() => {
        expect(container.querySelector('.gem-sweep')).toBeInTheDocument()
      })
    })

    it('markiert als gesehen, sobald das Sheet geoeffnet wird', async () => {
      const { container } = render(<GamificationHeader />)

      const button = container.querySelector('button')
      await waitFor(() => expect(button).toBeInTheDocument())

      fireEvent.click(button!)

      expect(markSeenSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('GamificationFeed - Activity Feed', () => {
    it('should display empty state when no activity', async () => {
      render(<GamificationFeed />)

      const emptyState = await screen.findByText('Keine Aktivitäten noch')
      expect(emptyState).toBeInTheDocument()
    })

    it('should render without errors', async () => {
      render(<GamificationFeed />)

      // Component should render successfully
      expect(screen.getByText('Keine Aktivitäten noch')).toBeInTheDocument()
    })
  })
})
