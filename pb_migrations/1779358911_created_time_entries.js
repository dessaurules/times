/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.id != ''",
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
        "help": "",
        "hidden": false,
        "id": "date1345189255",
        "max": "",
        "min": "",
        "name": "start_time",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "date"
      },
      {
        "help": "",
        "hidden": false,
        "id": "date1096160257",
        "max": "",
        "min": "",
        "name": "end_time",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "date"
      },
      {
        "help": "",
        "hidden": false,
        "id": "number3644524550",
        "max": null,
        "min": null,
        "name": "break_minutes",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text3485334036",
        "max": 0,
        "min": 0,
        "name": "note",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "cascadeDelete": false,
        "collectionId": "_pb_users_auth_",
        "help": "",
        "hidden": false,
        "id": "relation2237538998",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "corrected_by",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      }
    ],
    "id": "pbc_786912933",
    "indexes": [],
    "listRule": "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee = @request.auth.record.employee",
    "name": "time_entries",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.record.role = 'gf' || (employee = @request.auth.record.employee && end_time = '')",
    "viewRule": "@request.auth.record.role = 'gf' || @request.auth.record.role = 'sl' || employee = @request.auth.record.employee"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_786912933");

  return app.delete(collection);
})
