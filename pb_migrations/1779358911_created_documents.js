/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.record.role = 'gf'",
    "deleteRule": "@request.auth.record.role = 'gf'",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "help": "",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "cascadeDelete": true,
        "collectionId": "pbc_3735627160",
        "help": "",
        "hidden": false,
        "id": "relation1570731425",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "employee",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text1579384326",
        "max": 0,
        "min": 0,
        "name": "name",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select2363381545",
        "maxSelect": 1,
        "name": "type",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "vertrag",
          "lohnschein",
          "au_schein",
          "sonstiges"
        ]
      },
      {
        "help": "",
        "hidden": false,
        "id": "file2359244304",
        "maxSelect": 1,
        "maxSize": 20971520,
        "mimeTypes": [
          "application/pdf",
          "image/jpeg",
          "image/png"
        ],
        "name": "file",
        "presentable": false,
        "protected": false,
        "required": true,
        "system": false,
        "thumbs": null,
        "type": "file"
      },
      {
        "help": "",
        "hidden": false,
        "id": "date2862495610",
        "max": "",
        "min": "",
        "name": "date",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      },
      {
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_",
        "help": "",
        "hidden": false,
        "id": "relation3823579430",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "uploaded_by",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      }
    ],
    "id": "pbc_3332084752",
    "indexes": [],
    "listRule": "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee = @request.auth.record.employee",
    "name": "documents",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.record.role = 'gf'",
    "viewRule": "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee = @request.auth.record.employee"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3332084752");

  return app.delete(collection);
})
