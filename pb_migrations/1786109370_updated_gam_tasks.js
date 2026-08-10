/// <reference path="../pb_data/types.d.ts" />

// gam_tasks muss fuer ALLE authentifizierten User lesbar bleiben -
// Mitarbeiter muessen die verfuegbaren Aufgaben sehen koennen.
// Schreibrechte (updateRule/deleteRule) bleiben unveraendert GF-only.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_gamification_tasks")

  unmarshal({
    "listRule": "@request.auth.id != ''",
    "viewRule": "@request.auth.id != ''"
  }, collection)

  return app.save(collection)
})
