/// <reference path="../pb_data/types.d.ts" />

// gam_rewards muss fuer ALLE authentifizierten User lesbar bleiben -
// Mitarbeiter muessen die einloesbaren Praemien sehen koennen.
// Schreibrechte (updateRule/deleteRule) bleiben unveraendert GF-only.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_gamification_rewards")

  unmarshal({
    "listRule": "@request.auth.id != ''",
    "viewRule": "@request.auth.id != ''"
  }, collection)

  return app.save(collection)
})
