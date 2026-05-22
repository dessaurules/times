/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_786912933")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.role = 'gf'",
    "listRule": "@request.auth.role = 'gf' || @request.auth.role = 'sl' || employee = @request.auth.employee",
    "updateRule": "@request.auth.role = 'gf' || @request.auth.role = 'sl' || (employee = @request.auth.employee && end_time = '')",
    "viewRule": "@request.auth.role = 'gf' || @request.auth.role = 'sl' || employee = @request.auth.employee"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_786912933")

  // update collection data
  unmarshal({
    "deleteRule": "@request.auth.record.role = 'gf'",
    "listRule": "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee = @request.auth.record.employee",
    "updateRule": "@request.auth.record.role = 'gf' || (employee = @request.auth.record.employee && end_time = '')",
    "viewRule": "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee = @request.auth.record.employee"
  }, collection)

  return app.save(collection)
})
