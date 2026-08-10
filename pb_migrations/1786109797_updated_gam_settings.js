/// <reference path="../pb_data/types.d.ts" />

// gam_settings muss fuer ALLE authentifizierten User lesbar bleiben.
// Die Mitarbeiter-App liest das `enabled`-Flag (inkl. Realtime-Subscription)
// ueber useGamificationEnabled; GF-only listRule/viewRule fuehrt dort zu 403
// und damit zu dauerhaft deaktivierter Gamification.
// Schreibrechte (updateRule) bleiben unveraendert GF-only.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_gamification_settings")

  unmarshal({
    "listRule": "@request.auth.id != ''",
    "viewRule": "@request.auth.id != ''"
  }, collection)

  return app.save(collection)
})
