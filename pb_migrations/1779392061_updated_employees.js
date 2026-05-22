/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3735627160")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.role = 'gf' || @request.auth.role = 'sl' || id = @request.auth.employee"
  }, collection)

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3735627160")

  // update collection data
  unmarshal({
    "listRule": "@request.auth.role = 'gf' || @request.auth.role = 'sl'"
  }, collection)

  return app.save(collection)
})
