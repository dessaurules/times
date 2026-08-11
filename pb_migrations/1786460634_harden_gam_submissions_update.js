/// <reference path="../pb_data/types.d.ts" />

// SICHERHEIT: gam_submissions.updateRule war `@request.auth.id != ''` — jeder
// angemeldete Nutzer durfte jede Einreichung aendern, also auch den eigenen
// `status` auf 'approved' setzen. Der Approval-Hook vergibt daraufhin Punkte
// (pb_hooks/gamification.pb.js, Hook 3), womit sich jeder Mitarbeiter beliebig
// viele Punkte selbst gutschreiben koennte.
//
// Bisher fiel das nicht auf, weil dem Hook `e.next()` fehlte und das Update
// nie gespeichert wurde. Mit dem Hook-Fix wird die Luecke ausnutzbar, deshalb
// wird die Rule hier zuerst geschlossen.
//
// CLAUDE.md haelt die Absicht fest: "Approve: GF-only (role = 'gf')".
// `gam_orders` nutzt diese Regel bereits.
// Der Mitarbeiter-Flow braucht kein Update: GamificationAssignments.tsx:76
// erstellt Einreichungen nur (createRule bleibt `@request.auth.id != ''`).
migrate((app) => {
  const collection = app.findCollectionByNameOrId('gam_submissions')
  unmarshal({ updateRule: "@request.auth.role = 'gf'" }, collection)
  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId('gam_submissions')
  unmarshal({ updateRule: "@request.auth.id != ''" }, collection)
  return app.save(collection)
})
