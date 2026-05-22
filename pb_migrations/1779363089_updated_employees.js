/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3735627160")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = 'gf'",
    "deleteRule": "@request.auth.role = 'gf'",
    "listRule": "@request.auth.role = 'gf' || @request.auth.role = 'sl'",
    "updateRule": "@request.auth.role = 'gf'",
    "viewRule": "@request.auth.role = 'gf' || @request.auth.role = 'sl' || id = @request.auth.employee"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3735627160")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.record.role = 'gf'",
    "deleteRule": "@request.auth.record.role = 'gf'",
    "listRule": "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl'",
    "updateRule": "@request.auth.record.role = 'gf'",
    "viewRule": "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || id = @request.auth.record.employee"
  }, collection)

  return app.save(collection)
})
