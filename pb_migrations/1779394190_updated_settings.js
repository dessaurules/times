/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_2769025244")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.id != ''",
    "viewRule": "@request.auth.id != ''"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_2769025244")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.role = 'gf' || @request.auth.role = 'sl'",
    "viewRule": "@request.auth.role = 'gf' || @request.auth.role = 'sl'"
  }, collection)

  return app.save(collection)
})
