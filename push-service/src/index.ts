import express from 'express'
import { sendPushToEmployee } from './sender.js'

const app = express()
app.use(express.json())

app.post('/send-push', async (req, res) => {
  const { type, employeeId, status, dateFrom, dateTo, weekLabel } = req.body

  try {
    if (type === 'antrag_status') {
      const approved = status === 'approved'
      await sendPushToEmployee(
        employeeId,
        approved ? 'Antrag genehmigt ✓' : 'Antrag abgelehnt',
        approved
          ? `Dein Urlaubsantrag (${dateFrom} – ${dateTo}) wurde genehmigt. 🎉`
          : `Dein Urlaubsantrag (${dateFrom} – ${dateTo}) wurde leider abgelehnt.`,
      )
    } else if (type === 'dienstplan') {
      await sendPushToEmployee(
        employeeId,
        'Neuer Dienstplan 📅',
        `Dein Dienstplan für ${weekLabel} wurde veröffentlicht.`,
      )
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('[/send-push]', err)
    res.status(500).json({ ok: false })
  }
})

const PORT = Number(process.env.PORT ?? 3456)
app.listen(PORT, () => console.log(`Push-Service läuft auf Port ${PORT}`))

// Cron-Jobs werden in Task 8 hier ergänzt
