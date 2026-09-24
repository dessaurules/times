/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users")

  // add field
  collection.fields.add(new Field({
    "hidden": false,
    "id": "date1786719834",
    "max": "",
    "min": "",
    "name": "gam_seen_at",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "date"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("users")

  // remove field
  collection.fields.removeById("date1786719834")

  return app.save(collection)
})
