#!/bin/bash

PB_URL="http://127.0.0.1:8091"

echo "🔐 Authentifiziere Admin..."

# Versuche mit dem Admin-Benutzer
ADMIN_EMAIL="admin@pb.local"
ADMIN_PASSWORD="admin123456"

AUTH_RESPONSE=$(curl -s -X POST "$PB_URL/api/collections/_pb_users_auth_/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.token // empty')

if [ -z "$TOKEN" ]; then
  echo "❌ Keine gültige Authentifizierung"
  exit 1
fi

echo "✓ Admin authentifiziert"
echo ""
echo "📋 Erstelle Gamification-Collections..."

# Function to create collection
create_collection() {
  local name=$1
  local body=$2

  echo "  → $name"
  RESPONSE=$(curl -s -X POST "$PB_URL/api/collections" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "$body")

  ERROR=$(echo "$RESPONSE" | jq -r '.message // empty')
  if [ ! -z "$ERROR" ]; then
    if [[ "$ERROR" == *"duplicate"* ]] || [[ "$ERROR" == *"already"* ]]; then
      echo "    ⚠ $ERROR"
    else
      echo "    ✗ $ERROR"
    fi
  else
    echo "    ✓"
  fi
}

# 1. gam_tasks
create_collection "gam_tasks" '{
  "id": "pbc_gamification_tasks",
  "name": "gam_tasks",
  "type": "base",
  "system": false,
  "createRule": "@request.auth.record.role = '"'"'gf'"'"'",
  "listRule": "@request.auth.id != '"'"''"'"'",
  "viewRule": "@request.auth.id != '"'"''"'"'",
  "updateRule": "@request.auth.record.role = '"'"'gf'"'"'",
  "deleteRule": "@request.auth.record.role = '"'"'gf'"'"'",
  "fields": [
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
    {"id": "bool7531486290", "name": "active", "type": "bool", "required": false},
    {"id": "relation8602314759", "name": "created_by", "type": "relation", "required": false, "collectionId": "_pb_users_auth_", "maxSelect": 1}
  ]
}'

# 2. gam_rewards
create_collection "gam_rewards" '{
  "id": "pbc_gamification_rewards",
  "name": "gam_rewards",
  "type": "base",
  "system": false,
  "createRule": "@request.auth.record.role = '"'"'gf'"'"'",
  "listRule": "@request.auth.id != '"'"''"'"'",
  "viewRule": "@request.auth.id != '"'"''"'"'",
  "updateRule": "@request.auth.record.role = '"'"'gf'"'"'",
  "deleteRule": "@request.auth.record.role = '"'"'gf'"'"'",
  "fields": [
    {"id": "text_gam_rewards_id", "name": "id", "type": "text", "required": true, "primaryKey": true, "autogeneratePattern": "[a-z0-9]{15}", "pattern": "^[a-z0-9]+$", "min": 15, "max": 15, "system": true},
    {"id": "text5478960123", "name": "title", "type": "text", "required": true},
    {"id": "text6589071234", "name": "description", "type": "text", "required": false},
    {"id": "number7690182345", "name": "points_cost", "type": "number", "required": true, "onlyInt": true},
    {"id": "text8701293456", "name": "category", "type": "text", "required": false},
    {"id": "select9812304567", "name": "status", "type": "select", "required": true, "maxSelect": 1, "values": ["draft", "active", "archived"]},
    {"id": "select3245637890", "name": "redemption_type", "type": "select", "required": true, "maxSelect": 1, "values": ["code", "budget_limit", "fixed_count"]},
    {"id": "number5467859012", "name": "max_redemptions", "type": "number", "required": false, "onlyInt": true},
    {"id": "number6578960123", "name": "redemptions_count", "type": "number", "required": false, "onlyInt": true}
  ]
}'

# 3. gam_submissions
create_collection "gam_submissions" '{
  "id": "pbc_gamification_submissions",
  "name": "gam_submissions",
  "type": "base",
  "system": false,
  "createRule": "@request.auth.id != '"'"''"'"'",
  "listRule": "@request.auth.record.role = '"'"'gf'"'"' || user_id = @request.auth.id",
  "viewRule": "@request.auth.record.role = '"'"'gf'"'"' || user_id = @request.auth.id",
  "updateRule": "@request.auth.record.role = '"'"'gf'"'"'",
  "deleteRule": "@request.auth.record.role = '"'"'gf'"'"'",
  "fields": [
    {"id": "text_gam_submissions_id", "name": "id", "type": "text", "required": true, "primaryKey": true, "autogeneratePattern": "[a-z0-9]{15}", "system": true},
    {"id": "relation6590172845", "name": "task_id", "type": "relation", "required": true, "collectionId": "pbc_gamification_tasks", "maxSelect": 1},
    {"id": "relation7601283956", "name": "user_id", "type": "relation", "required": true, "collectionId": "_pb_users_auth_", "maxSelect": 1},
    {"id": "select8712394067", "name": "status", "type": "select", "required": true, "maxSelect": 1, "values": ["pending", "approved", "rejected"]},
    {"id": "text9823405178", "name": "media_url", "type": "text", "required": false},
    {"id": "text1034516289", "name": "submission_notes", "type": "text", "required": false},
    {"id": "text2145627390", "name": "admin_feedback", "type": "text", "required": false}
  ]
}'

# 4. gam_orders
create_collection "gam_orders" '{
  "id": "pbc_gamification_orders",
  "name": "gam_orders",
  "type": "base",
  "system": false,
  "createRule": "@request.auth.id != '"'"''"'"'",
  "listRule": "@request.auth.record.role = '"'"'gf'"'"' || user_id = @request.auth.id",
  "viewRule": "@request.auth.record.role = '"'"'gf'"'"' || user_id = @request.auth.id",
  "updateRule": "@request.auth.record.role = '"'"'gf'"'"'",
  "deleteRule": "@request.auth.record.role = '"'"'gf'"'"'",
  "fields": [
    {"id": "text_gam_orders_id", "name": "id", "type": "text", "required": true, "primaryKey": true, "autogeneratePattern": "[a-z0-9]{15}", "system": true},
    {"id": "relation8790182345", "name": "user_id", "type": "relation", "required": true, "collectionId": "_pb_users_auth_", "maxSelect": 1},
    {"id": "relation9801293456", "name": "reward_id", "type": "relation", "required": true, "collectionId": "pbc_gamification_rewards", "maxSelect": 1},
    {"id": "select1012404567", "name": "status", "type": "select", "required": true, "maxSelect": 1, "values": ["pending_admin", "approved", "rejected"]},
    {"id": "text2123515678", "name": "code_assigned", "type": "text", "required": false},
    {"id": "text3234626789", "name": "admin_feedback", "type": "text", "required": false}
  ]
}'

# 5. gam_settings
create_collection "gam_settings" '{
  "id": "pbc_gamification_settings",
  "name": "gam_settings",
  "type": "base",
  "system": false,
  "createRule": "",
  "listRule": "@request.auth.id != '"'"''"'"'",
  "viewRule": "@request.auth.id != '"'"''"'"'",
  "updateRule": "@request.auth.record.role = '"'"'gf'"'"'",
  "deleteRule": "",
  "fields": [
    {"id": "text_gam_settings_id", "name": "id", "type": "text", "required": true, "primaryKey": true, "autogeneratePattern": "[a-z0-9]{15}", "system": true},
    {"id": "bool1901393456", "name": "enabled", "type": "bool", "required": false, "defaultValue": false}
  ]
}'

echo ""
echo "✅ Fertig!"
