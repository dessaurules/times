/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "user.role = 'gf'",
    "deleteRule": "user.role = 'gf'",
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
        "cascadeDelete": false,
        "collectionId": "pbc_3735627160",
        "help": "",
        "hidden": false,
        "id": "relation1570731425",
        "maxSelect": 1,
        "minSelect": 1,
        "name": "department",
        "presentable": false,
        "required": true,
        "system": false,
        "type": "relation"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text436356518",
        "max": 0,
        "min": 0,
        "name": "name",
        "pattern": "",
        "presentable": true,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text2289731978",
        "max": 0,
        "min": 0,
        "name": "start_time",
        "pattern": "^([0-1][0-9]|2[0-3]):[0-5][0-9]$",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text1234567890",
        "max": 0,
        "min": 0,
        "name": "end_time",
        "pattern": "^([0-1][0-9]|2[0-3]):[0-5][0-9]$",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text9876543210",
        "max": 0,
        "min": 0,
        "name": "color",
        "pattern": "^(blue|green|amber|purple|rose)$",
        "presentable": false,
        "primaryKey": false,
        "required": true,
        "system": false,
        "type": "text"
      },
      {
        "help": "",
        "hidden": false,
        "id": "number111645041",
        "max": null,
        "min": null,
        "name": "sort_order",
        "onlyInt": true,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      }
    ],
    "id": "pbc_1719235200",
    "indexes": [
      "CREATE UNIQUE INDEX idx_shift_templates_dept_name ON shift_templates (department, name)"
    ],
    "listRule": null,
    "name": "shift_templates",
    "system": false,
    "type": "base",
    "updateRule": "user.role = 'gf'",
    "viewRule": null
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1719235200");

  return app.delete(collection);
})
