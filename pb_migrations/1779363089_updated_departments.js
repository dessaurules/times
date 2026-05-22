/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3865025440")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = 'gf'",
    "deleteRule": "@request.auth.role = 'gf'",
    "updateRule": "@request.auth.role = 'gf'"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3865025440")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.record.role = 'gf'",
    "deleteRule": "@request.auth.record.role = 'gf'",
    "updateRule": "@request.auth.record.role = 'gf'"
  }, collection)

  return app.save(collection)
})
