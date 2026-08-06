/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // 1. gam_tasks collection
  const tasks = new Collection({
    "id": "pbc_gamification_tasks",
    "name": "gam_tasks",
    "type": "base",
    "system": false,
    "createRule": "@request.auth.record.role = 'gf'",
    "listRule": "@request.auth.id != ''",
    "viewRule": "@request.auth.id != ''",
    "updateRule": "@request.auth.record.role = 'gf'",
    "deleteRule": "@request.auth.record.role = 'gf'",
    "fields": [
      {
        "id": "text3208210256",
        "name": "id",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "primaryKey": true,
        "autogeneratePattern": "[a-z0-9]{15}",
        "pattern": "^[a-z0-9]+$",
        "min": 15,
        "max": 15,
        "system": true
      },
      {
        "id": "text4481922135",
        "name": "title",
        "type": "text",
        "required": true,
        "presentable": true,
        "unique": false,
        "hidden": false
      },
      {
        "id": "text6692451783",
        "name": "description",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false
      },
      {
        "id": "number1847562934",
        "name": "points",
        "type": "number",
        "required": true,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "onlyInt": true,
        "min": null,
        "max": null
      },
      {
        "id": "text7314692581",
        "name": "category",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false
      },
      {
        "id": "text8125743691",
        "name": "tags",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false
      },
      {
        "id": "select2943571846",
        "name": "difficulty",
        "type": "select",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "maxSelect": 1,
        "values": ["easy", "medium", "hard"]
      },
      {
        "id": "select3051782649",
        "name": "priority",
        "type": "select",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "maxSelect": 1,
        "values": ["low", "medium", "high"]
      },
      {
        "id": "number2736491580",
        "name": "time_limit_minutes",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "onlyInt": true,
        "min": null,
        "max": null
      },
      {
        "id": "bool4182639507",
        "name": "requires_media",
        "type": "bool",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false
      },
      {
        "id": "number5294617382",
        "name": "daily_limit_per_user",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "onlyInt": true,
        "min": null,
        "max": null
      },
      {
        "id": "date6847291503",
        "name": "expires_at",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false
      },
      {
        "id": "bool7531486290",
        "name": "active",
        "type": "bool",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false
      },
      {
        "id": "relation8602314759",
        "name": "created_by",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "collectionId": "_pb_users_auth_",
        "cascadeDelete": false,
        "minSelect": null,
        "maxSelect": 1
      }
    ],
    "indexes": []
  });
  app.save(tasks);

  // 2. gam_assignments collection
  const assignments = new Collection({
    "id": "pbc_gamification_assignments",
    "name": "gam_assignments",
    "type": "base",
    "system": false,
    "createRule": "@request.auth.id != ''",
    "listRule": "@request.auth.record.role = 'gf' || user_id = @request.auth.id",
    "viewRule": "@request.auth.record.role = 'gf' || user_id = @request.auth.id",
    "updateRule": "@request.auth.record.role = 'gf' || (user_id = @request.auth.id && status = 'active')",
    "deleteRule": "@request.auth.record.role = 'gf'",
    "fields": [
      {
        "id": "text3208210256",
        "name": "id",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "primaryKey": true,
        "autogeneratePattern": "[a-z0-9]{15}",
        "pattern": "^[a-z0-9]+$",
        "min": 15,
        "max": 15,
        "system": true
      },
      {
        "id": "relation9371284560",
        "name": "task_id",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "collectionId": "pbc_gamification_tasks",
        "cascadeDelete": true,
        "minSelect": null,
        "maxSelect": 1
      },
      {
        "id": "relation1047635829",
        "name": "user_id",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "collectionId": "_pb_users_auth_",
        "cascadeDelete": true,
        "minSelect": null,
        "maxSelect": 1
      },
      {
        "id": "select2156738401",
        "name": "status",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "maxSelect": 1,
        "values": ["active", "completed", "rejected", "expired"]
      },
      {
        "id": "date3267849512",
        "name": "expires_at",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false
      },
      {
        "id": "date4378950623",
        "name": "rejected_at",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false
      }
    ],
    "indexes": []
  });
  app.save(assignments);

  // 3. gam_submissions collection
  const submissions = new Collection({
    "id": "pbc_gamification_submissions",
    "name": "gam_submissions",
    "type": "base",
    "system": false,
    "createRule": "@request.auth.id != ''",
    "listRule": "@request.auth.record.role = 'gf' || user_id = @request.auth.id",
    "viewRule": "@request.auth.record.role = 'gf' || user_id = @request.auth.id",
    "updateRule": "@request.auth.record.role = 'gf'",
    "deleteRule": "@request.auth.record.role = 'gf'",
    "fields": [
      {
        "id": "text3208210256",
        "name": "id",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "primaryKey": true,
        "autogeneratePattern": "[a-z0-9]{15}",
        "pattern": "^[a-z0-9]+$",
        "min": 15,
        "max": 15,
        "system": true
      },
      {
        "id": "relation5489061734",
        "name": "assignment_id",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "collectionId": "pbc_gamification_assignments",
        "cascadeDelete": true,
        "minSelect": null,
        "maxSelect": 1
      },
      {
        "id": "relation6590172845",
        "name": "task_id",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "collectionId": "pbc_gamification_tasks",
        "cascadeDelete": false,
        "minSelect": null,
        "maxSelect": 1
      },
      {
        "id": "relation7601283956",
        "name": "user_id",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "collectionId": "_pb_users_auth_",
        "cascadeDelete": true,
        "minSelect": null,
        "maxSelect": 1
      },
      {
        "id": "select8712394067",
        "name": "status",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "maxSelect": 1,
        "values": ["pending", "approved", "rejected"]
      },
      {
        "id": "text9823405178",
        "name": "media_url",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false
      },
      {
        "id": "text1034516289",
        "name": "submission_notes",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false
      },
      {
        "id": "text2145627390",
        "name": "admin_feedback",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false
      },
      {
        "id": "number3256738401",
        "name": "points_awarded",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "onlyInt": true,
        "min": null,
        "max": null
      },
      {
        "id": "date4367849512",
        "name": "approved_at",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false
      }
    ],
    "indexes": []
  });
  app.save(submissions);

  // 4. gam_rewards collection
  const rewards = new Collection({
    "id": "pbc_gamification_rewards",
    "name": "gam_rewards",
    "type": "base",
    "system": false,
    "createRule": "@request.auth.record.role = 'gf'",
    "listRule": "@request.auth.id != ''",
    "viewRule": "@request.auth.id != ''",
    "updateRule": "@request.auth.record.role = 'gf'",
    "deleteRule": "@request.auth.record.role = 'gf'",
    "fields": [
      {
        "id": "text3208210256",
        "name": "id",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "primaryKey": true,
        "autogeneratePattern": "[a-z0-9]{15}",
        "pattern": "^[a-z0-9]+$",
        "min": 15,
        "max": 15,
        "system": true
      },
      {
        "id": "text5478960123",
        "name": "title",
        "type": "text",
        "required": true,
        "presentable": true,
        "unique": false,
        "hidden": false
      },
      {
        "id": "text6589071234",
        "name": "description",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false
      },
      {
        "id": "number7690182345",
        "name": "points_cost",
        "type": "number",
        "required": true,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "onlyInt": true,
        "min": null,
        "max": null
      },
      {
        "id": "text8701293456",
        "name": "category",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false
      },
      {
        "id": "select9812304567",
        "name": "status",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "maxSelect": 1,
        "values": ["draft", "active", "archived"]
      },
      {
        "id": "date1023415678",
        "name": "available_from",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false
      },
      {
        "id": "date2134526789",
        "name": "available_until",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false
      },
      {
        "id": "select3245637890",
        "name": "redemption_type",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "maxSelect": 1,
        "values": ["code", "budget_limit", "fixed_count"]
      },
      {
        "id": "json4356748901",
        "name": "code_pool",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false
      },
      {
        "id": "number5467859012",
        "name": "max_redemptions",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "onlyInt": true,
        "min": null,
        "max": null
      },
      {
        "id": "number6578960123",
        "name": "redemptions_count",
        "type": "number",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "onlyInt": true,
        "min": null,
        "max": null
      },
      {
        "id": "relation7689071234",
        "name": "created_by",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "collectionId": "_pb_users_auth_",
        "cascadeDelete": false,
        "minSelect": null,
        "maxSelect": 1
      }
    ],
    "indexes": []
  });
  app.save(rewards);

  // 5. gam_orders collection
  const orders = new Collection({
    "id": "pbc_gamification_orders",
    "name": "gam_orders",
    "type": "base",
    "system": false,
    "createRule": "@request.auth.id != ''",
    "listRule": "@request.auth.record.role = 'gf' || user_id = @request.auth.id",
    "viewRule": "@request.auth.record.role = 'gf' || user_id = @request.auth.id",
    "updateRule": "@request.auth.record.role = 'gf'",
    "deleteRule": "@request.auth.record.role = 'gf'",
    "fields": [
      {
        "id": "text3208210256",
        "name": "id",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "primaryKey": true,
        "autogeneratePattern": "[a-z0-9]{15}",
        "pattern": "^[a-z0-9]+$",
        "min": 15,
        "max": 15,
        "system": true
      },
      {
        "id": "relation8790182345",
        "name": "user_id",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "collectionId": "_pb_users_auth_",
        "cascadeDelete": true,
        "minSelect": null,
        "maxSelect": 1
      },
      {
        "id": "relation9801293456",
        "name": "reward_id",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "collectionId": "pbc_gamification_rewards",
        "cascadeDelete": true,
        "minSelect": null,
        "maxSelect": 1
      },
      {
        "id": "select1012404567",
        "name": "status",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "maxSelect": 1,
        "values": ["pending_admin", "approved", "rejected"]
      },
      {
        "id": "text2123515678",
        "name": "code_assigned",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false
      },
      {
        "id": "text3234626789",
        "name": "admin_feedback",
        "type": "text",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false
      },
      {
        "id": "date4345737890",
        "name": "approved_at",
        "type": "date",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false
      }
    ],
    "indexes": []
  });
  app.save(orders);

  // 6. gam_events collection (READ-ONLY, no create/update/delete)
  const events = new Collection({
    "id": "pbc_gamification_events",
    "name": "gam_events",
    "type": "base",
    "system": false,
    "createRule": "",
    "listRule": "@request.auth.record.role = 'gf' || user_id = @request.auth.id",
    "viewRule": "@request.auth.record.role = 'gf' || user_id = @request.auth.id",
    "updateRule": "",
    "deleteRule": "",
    "fields": [
      {
        "id": "text3208210256",
        "name": "id",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "primaryKey": true,
        "autogeneratePattern": "[a-z0-9]{15}",
        "pattern": "^[a-z0-9]+$",
        "min": 15,
        "max": 15,
        "system": true
      },
      {
        "id": "select5456848901",
        "name": "type",
        "type": "select",
        "required": true,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "maxSelect": 1,
        "values": ["submission_approved", "submission_rejected", "reward_redeemed", "reward_rejected"]
      },
      {
        "id": "relation6567959012",
        "name": "user_id",
        "type": "relation",
        "required": true,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "collectionId": "_pb_users_auth_",
        "cascadeDelete": true,
        "minSelect": null,
        "maxSelect": 1
      },
      {
        "id": "relation7678060123",
        "name": "related_task_id",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "collectionId": "pbc_gamification_tasks",
        "cascadeDelete": false,
        "minSelect": null,
        "maxSelect": 1
      },
      {
        "id": "relation8789171234",
        "name": "related_reward_id",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "collectionId": "pbc_gamification_rewards",
        "cascadeDelete": false,
        "minSelect": null,
        "maxSelect": 1
      },
      {
        "id": "json9890282345",
        "name": "data",
        "type": "json",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false
      }
    ],
    "indexes": []
  });
  app.save(events);

  // 7. gam_settings collection
  const settings = new Collection({
    "id": "pbc_gamification_settings",
    "name": "gam_settings",
    "type": "base",
    "system": false,
    "createRule": "",
    "listRule": "@request.auth.id != ''",
    "viewRule": "@request.auth.id != ''",
    "updateRule": "@request.auth.record.role = 'gf'",
    "deleteRule": "",
    "fields": [
      {
        "id": "text3208210256",
        "name": "id",
        "type": "text",
        "required": true,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "primaryKey": true,
        "autogeneratePattern": "[a-z0-9]{15}",
        "pattern": "^[a-z0-9]+$",
        "min": 15,
        "max": 15,
        "system": true
      },
      {
        "id": "bool1901393456",
        "name": "enabled",
        "type": "bool",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false
      },
      {
        "id": "relation2012404567",
        "name": "updated_by",
        "type": "relation",
        "required": false,
        "presentable": false,
        "unique": false,
        "hidden": false,
        "collectionId": "_pb_users_auth_",
        "cascadeDelete": false,
        "minSelect": null,
        "maxSelect": 1
      }
    ],
    "indexes": []
  });
  app.save(settings);

  // 8. Add points field to users collection
  const users = app.findCollectionByNameOrId("_pb_users_auth_");
  users.fields.addAt(users.fields.length, new Field({
    "id": "number2123515680",
    "name": "points",
    "type": "number",
    "required": false,
    "presentable": false,
    "unique": false,
    "hidden": false,
    "onlyInt": true,
    "min": null,
    "max": null
  }));
  app.save(users);
}, (app) => {
  // Rollback: Delete all gamification collections
  const collections = [
    "pbc_gamification_tasks",
    "pbc_gamification_assignments",
    "pbc_gamification_submissions",
    "pbc_gamification_rewards",
    "pbc_gamification_orders",
    "pbc_gamification_events",
    "pbc_gamification_settings"
  ];

  collections.forEach((id) => {
    const collection = app.findCollectionByNameOrId(id);
    if (collection) {
      app.delete(collection);
    }
  });

  // Rollback: Remove points field from users
  const users = app.findCollectionByNameOrId("_pb_users_auth_");
  users.fields.removeById("number2123515680");
  app.save(users);
});
