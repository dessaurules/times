import * as XLSX from 'xlsx'

export interface BerichtRow {
  name:               string
  abteilung:          string
  soll:               number
  ist:                number
  differenz:          number
  ueberst_kumuliert:  number
  urlaub_genommen:    number
  urlaub_gesamt:      number
  krank:              number
}

export function toExcel(rows: BerichtRow[], filename: string, monat: string): void {
  const headers = [
    'Mitarbeiter', 'Abteilung', 'Soll (h)', 'Ist (h)', 'Differenz (h)',
    'Überstd. kum. (h)', 'Urlaub gen.', 'Urlaub ges.', 'Krank (Tage)',
  ]
  const data = [
    headers,
    ...rows.map(r => [
      r.name, r.abteilung, r.soll, r.ist, r.differenz,
      r.ueberst_kumuliert, r.urlaub_genommen, r.urlaub_gesamt, r.krank,
    ]),
  ]
  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, monat)
  XLSX.writeFile(wb, filename)
}

export function toCsv(rows: BerichtRow[], filename: string): void {
  const header = 'Mitarbeiter;Abteilung;Soll;Ist;Differenz;Überstd.;Urlaub gen.;Urlaub ges.;Krank\n'
  const body = rows.map(r =>
    [
      r.name, r.abteilung, r.soll, r.ist, r.differenz,
      r.ueberst_kumuliert, r.urlaub_genommen, r.urlaub_gesamt, r.krank,
    ].join(';'),
  ).join('\n')
  const blob = new Blob(['﻿' + header + body], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
