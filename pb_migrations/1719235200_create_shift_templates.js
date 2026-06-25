/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = new Collection({
    "createRule": "@request.auth.role = 'gf'",
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
        "autogeneratePattern": "",
        "help": "Department ID",
        "hidden": false,
        "id": "text_dept_id",
        "max": 15,
        "min": 15,
        "name": "department",
        "pattern": "^[a-z0-9]+$",
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
        "id": "text436356518",
        "max": 50,
        "min": 1,
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
        "max": 5,
        "min": 5,
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
        "max": 5,
        "min": 5,
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
        "max": 20,
        "min": 1,
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
        "min": 0,
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
    "listRule": "@request.auth.role = 'gf' || @request.auth.role = 'sl'",
    "name": "shift_templates",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.role = 'gf'",
    "viewRule": "@request.auth.role = 'gf' || @request.auth.role = 'sl'"
  });

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_1719235200");

  return app.delete(collection);
})
