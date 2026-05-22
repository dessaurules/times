/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_1747969721")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.role = 'gf' || employee = @request.auth.employee",
    "deleteRule": "@request.auth.role = 'gf' || employee = @request.auth.employee",
    "listRule": "@request.auth.role = 'gf' || @request.auth.role = 'sl' || employee = @request.auth.employee",
    "updateRule": "@request.auth.role = 'gf' || employee = @request.auth.employee",
    "viewRule": "@request.auth.role = 'gf' || @request.auth.role = 'sl' || employee = @request.auth.employee"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1747969721")

  // update collection data
  unmarshal({
    "createRule": "@request.auth.record.role = 'gf' || employee = @request.auth.record.employee",
    "deleteRule": "@request.auth.record.role = 'gf' || employee = @request.auth.record.employee",
    "listRule": "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee = @request.auth.record.employee",
    "updateRule": "@request.auth.record.role = 'gf' || employee = @request.auth.record.employee",
    "viewRule": "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee = @request.auth.record.employee"
  }, collection)

  return app.save(collection)
})
