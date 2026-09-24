#!/bin/bash

cd /Users/ronnybeckmann/Projects/times

echo "🔧 Wende Gamification-Migration manuell an..."
echo ""

sqlite3 pb_data/data.db << 'SQLEOF'

-- 1. Erstelle gam_tasks Collection
INSERT INTO _collections (id, name, type, system, created, updated, createRule, listRule, viewRule, updateRule, deleteRule, fields)
VALUES (
  'pbc_gamification_tasks',
  'gam_tasks',
  'base',
  0,
  datetime('now'),
  datetime('now'),
  "@request.auth.record.role = 'gf'",
  "@request.auth.id != ''",
  "@request.auth.id != ''",
  "@request.auth.record.role = 'gf'",
  "@request.auth.record.role = 'gf'",
  json('[
    {"id": "text_gam_tasks_id", "name": "id", "type": "text", "required": true, "primaryKey": true, "autogeneratePattern": "[a-z0-9]{15}", "pattern": "^[a-z0-9]+$", "min": 15, "max": 15, "system": true},
    {"id": "text4481922135", "name": "title", "type": "text", "required": true},
    {"id": "text6692451783", "name": "description", "type": "text", "required": false},
    {"id": "number1847562934", "name": "points", "type": "number", "required": true, "onlyInt": true},
    {"id": "text7314692581", "name": "category", "type": "text", "required": false},
    {"id": "text8125743691", "name": "tags", "type": "text", "required": false},
    {"id": "select2943571846", "name": "difficulty", "type": "select", "required": false, "maxSelect": 1, "values": ["easy", "medium", "hard"]},
    {"id": "select3051782649", "name": "priority", "type": "select", "required": false, "maxSelect": 1, "values": ["low", "medium", "high"]},
    {"id": "number2736491580", "name": "time_limit_minutes", "type": "number", "required": false, "onlyInt": true, "defaultValue": 480},
    {"id": "bool4182639507", "name": "requires_media", "type": "bool", "required": false},
    {"id": "number5294617382", "name": "daily_limit_per_user", "type": "number", "required": false, "onlyInt": true},
    {"id": "date6847291503", "name": "expires_at", "type": "date", "required": false},
    {"id": "bool7531486290", "name": "active", "type": "bool", "required": false}
  ])'
) ON CONFLICT DO NOTHING;

-- 2. Erstelle gam_rewards Collection
INSERT INTO _collections (id, name, type, system, created, updated, createRule, listRule, viewRule, updateRule, deleteRule, fields)
VALUES (
  'pbc_gamification_rewards',
  'gam_rewards',
  'base',
  0,
  datetime('now'),
  datetime('now'),
  "@request.auth.record.role = 'gf'",
  "@request.auth.id != ''",
  "@request.auth.id != ''",
  "@request.auth.record.role = 'gf'",
  "@request.auth.record.role = 'gf'",
  json('[
    {"id": "text_gam_rewards_id", "name": "id", "type": "text", "required": true, "primaryKey": true, "autogeneratePattern": "[a-z0-9]{15}", "system": true},
    {"id": "text5478960123", "name": "title", "type": "text", "required": true},
    {"id": "text6589071234", "name": "description", "type": "text", "required": false},
    {"id": "number7690182345", "name": "points_cost", "type": "number", "required": true, "onlyInt": true},
    {"id": "text8701293456", "name": "category", "type": "text", "required": false},
    {"id": "select9812304567", "name": "status", "type": "select", "required": true, "maxSelect": 1, "values": ["draft", "active", "archived"]},
    {"id": "select3245637890", "name": "redemption_type", "type": "select", "required": true, "maxSelect": 1, "values": ["code", "budget_limit", "fixed_count"]},
    {"id": "number5467859012", "name": "max_redemptions", "type": "number", "required": false, "onlyInt": true},
    {"id": "number6578960123", "name": "redemptions_count", "type": "number", "required": false, "onlyInt": true}
  ])'
) ON CONFLICT DO NOTHING;

-- 3. Erstelle gam_submissions Collection
INSERT INTO _collections (id, name, type, system, created, updated, createRule, listRule, viewRule, updateRule, deleteRule, fields)
VALUES (
  'pbc_gamification_submissions',
  'gam_submissions',
  'base',
  0,
  datetime('now'),
  datetime('now'),
  "@request.auth.id != ''",
  "@request.auth.record.role = 'gf' || user_id = @request.auth.id",
  "@request.auth.record.role = 'gf' || user_id = @request.auth.id",
  "@request.auth.record.role = 'gf'",
  "@request.auth.record.role = 'gf'",
  json('[
    {"id": "text_gam_submissions_id", "name": "id", "type": "text", "required": true, "primaryKey": true, "autogeneratePattern": "[a-z0-9]{15}", "system": true},
    {"id": "relation6590172845", "name": "task_id", "type": "relation", "required": true, "collectionId": "pbc_gamification_tasks", "maxSelect": 1},
    {"id": "relation7601283956", "name": "user_id", "type": "relation", "required": true, "collectionId": "_pb_users_auth_", "maxSelect": 1},
    {"id": "select8712394067", "name": "status", "type": "select", "required": true, "maxSelect": 1, "values": ["pending", "approved", "rejected"]},
    {"id": "text9823405178", "name": "media_url", "type": "text", "required": false},
    {"id": "text1034516289", "name": "submission_notes", "type": "text", "required": false},
    {"id": "text2145627390", "name": "admin_feedback", "type": "text", "required": false}
  ])'
) ON CONFLICT DO NOTHING;

-- 4. Erstelle gam_orders Collection
INSERT INTO _collections (id, name, type, system, created, updated, createRule, listRule, viewRule, updateRule, deleteRule, fields)
VALUES (
  'pbc_gamification_orders',
  'gam_orders',
  'base',
  0,
  datetime('now'),
  datetime('now'),
  "@request.auth.id != ''",
  "@request.auth.record.role = 'gf' || user_id = @request.auth.id",
  "@request.auth.record.role = 'gf' || user_id = @request.auth.id",
  "@request.auth.record.role = 'gf'",
  "@request.auth.record.role = 'gf'",
  json('[
    {"id": "text_gam_orders_id", "name": "id", "type": "text", "required": true, "primaryKey": true, "autogeneratePattern": "[a-z0-9]{15}", "system": true},
    {"id": "relation8790182345", "name": "user_id", "type": "relation", "required": true, "collectionId": "_pb_users_auth_", "maxSelect": 1},
    {"id": "relation9801293456", "name": "reward_id", "type": "relation", "required": true, "collectionId": "pbc_gamification_rewards", "maxSelect": 1},
    {"id": "select1012404567", "name": "status", "type": "select", "required": true, "maxSelect": 1, "values": ["pending_admin", "approved", "rejected"]},
    {"id": "text2123515678", "name": "code_assigned", "type": "text", "required": false},
    {"id": "text3234626789", "name": "admin_feedback", "type": "text", "required": false}
  ])'
) ON CONFLICT DO NOTHING;

-- 5. Erstelle gam_settings Collection
INSERT INTO _collections (id, name, type, system, created, updated, createRule, listRule, viewRule, updateRule, deleteRule, fields)
VALUES (
  'pbc_gamification_settings',
  'gam_settings',
  'base',
  0,
  datetime('now'),
  datetime('now'),
  "",
  "@request.auth.id != ''",
  "@request.auth.id != ''",
  "@request.auth.record.role = 'gf'",
  "",
  json('[
    {"id": "text_gam_settings_id", "name": "id", "type": "text", "required": true, "primaryKey": true, "autogeneratePattern": "[a-z0-9]{15}", "system": true},
    {"id": "bool1901393456", "name": "enabled", "type": "bool", "required": false, "defaultValue": false}
  ])'
) ON CONFLICT DO NOTHING;

SELECT COUNT(*) as created_collections FROM _collections WHERE name LIKE 'gam_%';
SQLEOF

echo "✓ Migration angewendet"
echo ""
echo "🔄 Starte PocketBase neu..."

pkill -f "pocketbase serve"
sleep 2

./pocketbase serve --http="127.0.0.1:8091" > /tmp/pb.log 2>&1 &
sleep 3

echo "✅ Fertig!"
