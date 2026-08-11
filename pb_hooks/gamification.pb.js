/// <reference path="../pb_data/types.d.ts" />

// ─────────────────────────────────────────────────────────────────────────────
// Hook 1: Assignment Creation Validation
// ─────────────────────────────────────────────────────────────────────────────

onRecordCreateRequest((e) => {
  const taskId = String(e.record.get('task_id') ?? '')
  const userId = String(e.record.get('user_id') ?? '')

  // Check: System enabled?
  let settings
  try {
    const settingsRecords = $app.findRecordsByFilter('gam_settings', '', '', 1, 0)
    if (!settingsRecords.length) {
      throw new Error('Gamification system not initialized')
    }
    settings = settingsRecords[0]
  } catch (err) {
    console.error('[gamification:assignment:create] Settings lookup failed:', err)
    throw new Error('Gamification system not available')
  }

  if (!settings.get('enabled')) {
    throw new Error('Gamification system is not enabled')
  }

  // Check: Task active and not expired?
  let task
  try {
    task = $app.findRecordById('gam_tasks', taskId)
  } catch (err) {
    console.error('[gamification:assignment:create] Task not found:', taskId)
    throw new Error('Task not found')
  }

  if (!task.get('active')) {
    throw new Error('Task is not active')
  }

  // Ein leeres expires_at bedeutet "kein Ablaufdatum" — so behandeln es der
  // Frontend-Filter (mitarbeiter-app GamificationTaskList.tsx:34) und der
  // Chef-App-Dialog, wo das Feld optional ist. Ohne diese Unterscheidung wird
  // new Date('') zu Invalid Date und JEDE Aufgabe gilt als abgelaufen.
  const expiresAtRaw = String(task.get('expires_at') ?? '')
  if (expiresAtRaw !== '') {
    const expiresAt = new Date(expiresAtRaw)
    if (isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      throw new Error('Task has expired')
    }
  }

  // Check: No duplicate active assignment?
  try {
    const existing = $app.findRecordsByFilter(
      'gam_assignments',
      `task_id = "${taskId}" && user_id = "${userId}" && status = "active"`,
      '', 1, 0
    )
    if (existing.length > 0) {
      throw new Error('User already has an active assignment for this task')
    }
  } catch (err) {
    if (err.message === 'User already has an active assignment for this task') {
      throw err
    }
    console.error('[gamification:assignment:create] Duplicate check failed:', err)
    throw new Error('Assignment validation failed')
  }

  // Check: Daily limit not exceeded?
  const dailyLimit = task.get('daily_limit_per_user') || 0
  if (dailyLimit > 0) {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const todaysAssignments = $app.findRecordsByFilter(
        'gam_assignments',
        `task_id = "${taskId}" && user_id = "${userId}" && created >= "${today.toISOString()}" && created < "${tomorrow.toISOString()}"`,
        '', 100, 0
      )
      if (todaysAssignments.length >= dailyLimit) {
        throw new Error(`Daily limit (${dailyLimit}) exceeded for this task`)
      }
    } catch (err) {
      if (err.message.includes('Daily limit')) {
        throw err
      }
      console.error('[gamification:assignment:create] Daily limit check failed:', err)
      throw new Error('Assignment validation failed')
    }
  }

  // Auto-set: expires_at = now + task.time_limit_minutes
  const timeLimitMinutes = task.get('time_limit_minutes') || 480
  const expiryTime = new Date()
  expiryTime.setMinutes(expiryTime.getMinutes() + timeLimitMinutes)
  e.record.set('expires_at', expiryTime.toISOString())

  // Auto-set: status = 'active'
  e.record.set('status', 'active')

  console.log(`[gamification:assignment:create] User ${userId} assigned task ${taskId}`)

  // PFLICHT ab PocketBase v0.23: ohne e.next() bricht die Hook-Kette ab, der
  // Record wird nie gespeichert und die API antwortet mit 200 und leerem Body.
  e.next()
}, 'gam_assignments')

// ─────────────────────────────────────────────────────────────────────────────
// Hook 1b: Assignment Creation Success (no-op, but can log if needed)
// ─────────────────────────────────────────────────────────────────────────────

onRecordAfterCreateSuccess((e) => {
  const userId = String(e.record.get('user_id') ?? '')
  const taskId = String(e.record.get('task_id') ?? '')
  console.log(`[gamification:assignment:create] Assignment created: ${e.record.id} (User: ${userId}, Task: ${taskId})`)
}, 'gam_assignments')

// ─────────────────────────────────────────────────────────────────────────────
// Hook 2: Submission Creation Validation
// ─────────────────────────────────────────────────────────────────────────────

onRecordCreateRequest((e) => {
  const assignmentId = String(e.record.get('assignment_id') ?? '')

  // Check: System enabled?
  let settings
  try {
    const settingsRecords = $app.findRecordsByFilter('gam_settings', '', '', 1, 0)
    if (!settingsRecords.length) {
      throw new Error('Gamification system not initialized')
    }
    settings = settingsRecords[0]
  } catch (err) {
    console.error('[gamification:submission:create] Settings lookup failed:', err)
    throw new Error('Gamification system not available')
  }

  if (!settings.get('enabled')) {
    throw new Error('Gamification system is not enabled')
  }

  // Check: Assignment exists, status='active'?
  let assignment
  try {
    assignment = $app.findRecordById('gam_assignments', assignmentId)
  } catch (err) {
    console.error('[gamification:submission:create] Assignment not found:', assignmentId)
    throw new Error('Assignment not found')
  }

  const assignmentStatus = String(assignment.get('status') ?? '')
  if (assignmentStatus !== 'active') {
    throw new Error('Assignment is not active')
  }

  // Check: Not expired?
  const expiresAt = new Date(String(assignment.get('expires_at') ?? ''))
  if (isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    throw new Error('Assignment has expired')
  }

  // Check: Media required?
  const taskId = String(assignment.get('task_id') ?? '')
  let task
  try {
    task = $app.findRecordById('gam_tasks', taskId)
  } catch (err) {
    console.error('[gamification:submission:create] Task not found:', taskId)
    throw new Error('Task not found')
  }

  if (task.get('requires_media')) {
    const mediaUrl = String(e.record.get('media_url') ?? '').trim()
    if (!mediaUrl) {
      throw new Error('Media is required for this task')
    }
  }

  // Auto-set: status = 'pending'
  e.record.set('status', 'pending')

  // Auto-set: task_id and user_id from assignment
  e.record.set('task_id', taskId)
  const userId = String(assignment.get('user_id') ?? '')
  e.record.set('user_id', userId)

  console.log(`[gamification:submission:create] Submission pending for assignment ${assignmentId}`)
}, 'gam_submissions')

// ─────────────────────────────────────────────────────────────────────────────
// Hook 2b: Submission Creation Success - Mark assignment as completed
// ─────────────────────────────────────────────────────────────────────────────

onRecordAfterCreateSuccess((e) => {
  const assignmentId = String(e.record.get('assignment_id') ?? '')

  try {
    const assignment = $app.findRecordById('gam_assignments', assignmentId)
    assignment.set('status', 'completed')
    $app.save(assignment)
    console.log(`[gamification:submission:create] Assignment ${assignmentId} marked completed`)
  } catch (err) {
    console.error('[gamification:submission:create] Failed to mark assignment completed:', err)
    // Don't throw - submission is already created, just log the error
  }
}, 'gam_submissions')

// ─────────────────────────────────────────────────────────────────────────────
// Hook 3: Submission Approval (Atomic Transaction)
// ─────────────────────────────────────────────────────────────────────────────

onRecordUpdateRequest((e) => {
  // Get the new status from the request body
  const newStatus = String(e.requestInfo().body.status ?? '')

  // Only process when status changes to 'approved' or 'rejected'
  if (!newStatus || (newStatus !== 'approved' && newStatus !== 'rejected')) {
    return
  }

  // Fetch the old record to check the current status
  let oldRecord
  try {
    oldRecord = $app.findRecordById('gam_submissions', e.record.id)
  } catch (err) {
    console.error('[gamification:submission:approve] Could not fetch old record:', err)
    return
  }

  const oldStatus = String(oldRecord.get('status') ?? '')

  // Only process if status actually changed
  if (oldStatus === newStatus) {
    return
  }

  if (newStatus === 'approved') {
    // ATOMIC TRANSACTION for approval
    $app.runInTransaction((txApp) => {
      // Check: System enabled?
      let settings
      try {
        const settingsRecords = txApp.findRecordsByFilter('gam_settings', '', '', 1, 0)
        if (!settingsRecords.length) {
          throw new Error('Gamification system not initialized')
        }
        settings = settingsRecords[0]
      } catch (err) {
        console.error('[gamification:submission:approve] Settings lookup failed:', err)
        throw new Error('Gamification system not available')
      }

      if (!settings.get('enabled')) {
        throw new Error('Gamification system is not enabled')
      }

      // Get user & task from DB
      const userId = String(e.record.get('user_id') ?? '')
      const taskId = String(e.record.get('task_id') ?? '')

      let user
      try {
        user = txApp.findRecordById('users', userId)
      } catch (err) {
        console.error('[gamification:submission:approve] User not found:', userId)
        throw new Error('User not found')
      }

      let task
      try {
        task = txApp.findRecordById('gam_tasks', taskId)
      } catch (err) {
        console.error('[gamification:submission:approve] Task not found:', taskId)
        throw new Error('Task not found')
      }

      // Calculate points and update user
      const points = task.get('points') || 0
      const currentPoints = user.get('points') || 0
      user.set('points', currentPoints + points)

      // Set submission fields
      e.record.set('points_awarded', points)
      e.record.set('approved_at', new Date().toISOString())

      // Create event record
      const event = new Record(txApp.findCollectionByNameOrId('gam_events'))
      event.set('type', 'submission_approved')
      event.set('user_id', userId)
      event.set('related_task_id', taskId)
      const taskTitle = String(task.get('title') ?? '')
      event.set('data', JSON.stringify({
        points,
        task_title: taskTitle,
      }))

      // Save all changes in transaction
      txApp.save(user)
      txApp.save(event)
      txApp.save(e.record)

      console.log(`[gamification:submission:approve] User ${userId} awarded ${points} points for task ${taskId}`)
    })
  } else if (newStatus === 'rejected') {
    // Rejection - create event, no points operation
    try {
      const event = new Record($app.findCollectionByNameOrId('gam_events'))
      const userId = String(e.record.get('user_id') ?? '')
      const taskId = String(e.record.get('task_id') ?? '')
      const adminFeedback = String(e.record.get('admin_feedback') ?? '')

      event.set('type', 'submission_rejected')
      event.set('user_id', userId)
      event.set('related_task_id', taskId)
      event.set('data', JSON.stringify({
        feedback: adminFeedback,
      }))

      $app.save(event)
      console.log(`[gamification:submission:approve] Submission ${e.record.id} rejected`)
    } catch (err) {
      console.error('[gamification:submission:approve] Failed to create rejection event:', err)
      throw new Error('Failed to process rejection')
    }
  }
}, 'gam_submissions')

// ─────────────────────────────────────────────────────────────────────────────
// Hook 4: Order Approval (Atomic Transaction)
// ─────────────────────────────────────────────────────────────────────────────

onRecordUpdateRequest((e) => {
  // Get the new status from the request body
  const newStatus = String(e.requestInfo().body.status ?? '')

  // Only process when status changes to 'approved' or 'rejected'
  if (!newStatus || (newStatus !== 'approved' && newStatus !== 'rejected')) {
    return
  }

  // Fetch the old record to check the current status
  let oldRecord
  try {
    oldRecord = $app.findRecordById('gam_orders', e.record.id)
  } catch (err) {
    console.error('[gamification:order:approve] Could not fetch old record:', err)
    return
  }

  const oldStatus = String(oldRecord.get('status') ?? '')

  // Only process if status actually changed
  if (oldStatus === newStatus) {
    return
  }

  if (newStatus === 'approved') {
    // ATOMIC TRANSACTION for approval
    $app.runInTransaction((txApp) => {
      // Check: System enabled?
      let settings
      try {
        const settingsRecords = txApp.findRecordsByFilter('gam_settings', '', '', 1, 0)
        if (!settingsRecords.length) {
          throw new Error('Gamification system not initialized')
        }
        settings = settingsRecords[0]
      } catch (err) {
        console.error('[gamification:order:approve] Settings lookup failed:', err)
        throw new Error('Gamification system not available')
      }

      if (!settings.get('enabled')) {
        throw new Error('Gamification system is not enabled')
      }

      // Get user & reward from DB
      const userId = String(e.record.get('user_id') ?? '')
      const rewardId = String(e.record.get('reward_id') ?? '')

      let user
      try {
        user = txApp.findRecordById('users', userId)
      } catch (err) {
        console.error('[gamification:order:approve] User not found:', userId)
        throw new Error('User not found')
      }

      let reward
      try {
        reward = txApp.findRecordById('gam_rewards', rewardId)
      } catch (err) {
        console.error('[gamification:order:approve] Reward not found:', rewardId)
        throw new Error('Reward not found')
      }

      // Calculate costs and validate
      const cost = reward.get('points_cost') || 0
      const userPoints = user.get('points') || 0

      // Double-check: userPoints >= cost?
      if (userPoints < cost) {
        throw new Error('Insufficient points')
      }

      // Check budget: max_redemptions > 0 && redemptions_count >= max_redemptions?
      const maxRedemptions = reward.get('max_redemptions') || 0
      const redemptionsCount = reward.get('redemptions_count') || 0
      if (maxRedemptions > 0 && redemptionsCount >= maxRedemptions) {
        throw new Error('Reward limit reached')
      }

      // UPDATE user.points -= cost
      user.set('points', userPoints - cost)

      // UPDATE reward.redemptions_count += 1
      reward.set('redemptions_count', redemptionsCount + 1)

      // Handle code_pool if exists
      const codePool = reward.get('code_pool')
      if (codePool && Array.isArray(codePool) && codePool.length > 0) {
        const code = codePool.shift()
        e.record.set('code_assigned', code)
        reward.set('code_pool', codePool)
      }

      // Set order.approved_at
      e.record.set('approved_at', new Date().toISOString())

      // Create event record
      const event = new Record(txApp.findCollectionByNameOrId('gam_events'))
      event.set('type', 'reward_redeemed')
      event.set('user_id', userId)
      event.set('related_reward_id', rewardId)
      const rewardTitle = String(reward.get('title') ?? '')
      const remainingPoints = userPoints - cost
      event.set('data', JSON.stringify({
        cost,
        reward_title: rewardTitle,
        remaining_points: remainingPoints,
      }))

      // Save all changes in transaction
      txApp.save(user)
      txApp.save(reward)
      txApp.save(event)
      txApp.save(e.record)

      console.log(`[gamification:order:approve] User ${userId} redeemed reward ${rewardId}, cost ${cost} points`)
    })
  } else if (newStatus === 'rejected') {
    // Rejection - create event
    try {
      const event = new Record($app.findCollectionByNameOrId('gam_events'))
      const userId = String(e.record.get('user_id') ?? '')
      const rewardId = String(e.record.get('reward_id') ?? '')
      const adminFeedback = String(e.record.get('admin_feedback') ?? '')

      event.set('type', 'reward_rejected')
      event.set('user_id', userId)
      event.set('related_reward_id', rewardId)
      event.set('data', JSON.stringify({
        feedback: adminFeedback,
      }))

      $app.save(event)
      console.log(`[gamification:order:approve] Order ${e.record.id} rejected`)
    } catch (err) {
      console.error('[gamification:order:approve] Failed to create rejection event:', err)
      throw new Error('Failed to process rejection')
    }
  }
}, 'gam_orders')
