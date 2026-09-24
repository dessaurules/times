#!/usr/bin/env node
/**
 * Fix missing start_date values in users collection.
 * Uses direct SQLite update for reliability.
 */

import Database from 'better-sqlite3'

const db = new Database('./pb_data/data.db')

try {
  // Find users with missing start_date
  const missing = db.prepare(`
    SELECT id, email, first_name, last_name
    FROM users
    WHERE start_date = '' OR start_date IS NULL
  `).all()

  console.log(`Found ${missing.length} users with missing start_date`)

  if (missing.length > 0) {
    // Update them with default value
    const updateStmt = db.prepare(`
      UPDATE users
      SET start_date = '2020-01-01'
      WHERE start_date = '' OR start_date IS NULL
    `)
    const result = updateStmt.run()

    console.log(`Updated ${result.changes} users:`)
    for (const user of missing) {
      console.log(`  ✓ ${user.id} (${user.email}): ${user.first_name} ${user.last_name}`)
    }

    console.log('\nVerifying update:')
    const updated = db.prepare(`
      SELECT id, email, start_date
      FROM users
      WHERE id IN (${missing.map(() => '?').join(',')})
    `).all(...missing.map(u => u.id))

    for (const user of updated) {
      console.log(`  ✓ ${user.email}: start_date = ${user.start_date}`)
    }
  } else {
    console.log('All users have valid start_date values')
  }
} catch (error) {
  console.error('Error:', error.message)
  process.exit(1)
} finally {
  db.close()
}
