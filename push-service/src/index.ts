import express from 'express'
import cron from 'node-cron'
import { sendPushToEmployee } from './sender.js'
import { checkEinstempel } from './jobs/einstempel.js'
import { checkAusstempel } from './jobs/ausstempel.js'
import { sendMorgenErinnerung } from './jobs/morgen.js'

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

cron.schedule('*/5 * * * *', () => {
  checkEinstempel().catch(console.error)
  checkAusstempel().catch(console.error)
})

cron.schedule('0 18 * * *', () => {
  sendMorgenErinnerung().catch(console.error)
}, { timezone: 'Europe/Berlin' })

console.log('Cron-Jobs registriert: */5 Min (Stempel) + 18:00 Uhr (Morgen)')
