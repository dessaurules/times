/// <reference path="../pb_data/types.d.ts" />

// Die gam_* Collections nutzten die PocketBase-v0.22-Syntax
// `@request.auth.record.role`. Ab v0.23 existiert die `.record`-Zwischenstufe
// nicht mehr: der Ausdruck resolviert zu NULL, matcht nie, und PocketBase
// antwortet mit 404 "sql: no rows in result set" statt 403.
// Alle uebrigen Collections dieses Projekts nutzen bereits `@request.auth.role`.
const RULES = {
  gam_tasks: {
    updateRule: "@request.auth.role = 'gf'",
    deleteRule: "@request.auth.role = 'gf'",
  },
  gam_assignments: {
    listRule: "@request.auth.role = 'gf' || user_id = @request.auth.id",
    viewRule: "@request.auth.role = 'gf' || user_id = @request.auth.id",
    updateRule: "@request.auth.role = 'gf' || (user_id = @request.auth.id && status = 'active')",
    deleteRule: "@request.auth.role = 'gf'",
  },
  gam_submissions: {
    listRule: "@request.auth.role = 'gf' || user_id = @request.auth.id",
    viewRule: "@request.auth.role = 'gf' || user_id = @request.auth.id",
    deleteRule: "@request.auth.role = 'gf'",
  },
  gam_rewards: {
    updateRule: "@request.auth.role = 'gf'",
    deleteRule: "@request.auth.role = 'gf'",
  },
  gam_orders: {
    listRule: "@request.auth.role = 'gf' || user_id = @request.auth.id",
    viewRule: "@request.auth.role = 'gf' || user_id = @request.auth.id",
    updateRule: "@request.auth.role = 'gf'",
    deleteRule: "@request.auth.role = 'gf'",
  },
  gam_settings: {
    createRule: "@request.auth.role = 'gf'",
    updateRule: "@request.auth.role = 'gf'",
  },
}

migrate((app) => {
  for (const [name, rules] of Object.entries(RULES)) {
    const collection = app.findCollectionByNameOrId(name)
    unmarshal(rules, collection)
    app.save(collection)
  }
}, (app) => {
  for (const [name, rules] of Object.entries(RULES)) {
    const collection = app.findCollectionByNameOrId(name)
    const reverted = {}
    for (const [key, value] of Object.entries(rules)) {
      reverted[key] = value.replaceAll('@request.auth.role', '@request.auth.record.role')
    }
    unmarshal(reverted, collection)
    app.save(collection)
  }
})
