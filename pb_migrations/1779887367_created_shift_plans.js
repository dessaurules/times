/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.role = 'gf' || @request.auth.role = 'sl'",
    "deleteRule": "@request.auth.role = 'gf'",
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
        "help": "",
        "hidden": false,
        "id": "date1423088652",
        "max": "",
        "min": "",
        "name": "week_start",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      },
      {
        "help": "",
        "hidden": false,
        "id": "date3224439104",
        "max": "",
        "min": "",
        "name": "week_end",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select2063623452",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "select",
        "values": [
          "draft",
          "published"
        ]
      },
      {
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_",
        "help": "",
        "hidden": false,
        "id": "relation3725765462",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "created_by",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "help": "",
        "hidden": false,
        "id": "bool3059909774",
        "name": "push_notified",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "bool"
      }
    ],
    "id": "pbc_3463994875",
    "indexes": [],
    "listRule": "@request.auth.role = 'gf' || @request.auth.role = 'sl'",
    "name": "shift_plans",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.role = 'gf' || @request.auth.role = 'sl'",
    "viewRule": "@request.auth.role = 'gf' || @request.auth.role = 'sl'"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3463994875");

  return app.delete(collection);
})
