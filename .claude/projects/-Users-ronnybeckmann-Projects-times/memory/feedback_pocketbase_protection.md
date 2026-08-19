---
name: pocketbase_data_protection
description: Absolute protection rule for PocketBase data — never overwrite or delete
metadata:
  type: feedback
---

# PocketBase Data Protection — ABSOLUTE RULE

**Rule:** NIEMALS PocketBase-Daten überschreiben oder löschen.

**Why:** Datenverlust ist katastrophal. Produktions-Daten sind heilig.

**How to apply:** 
- ✅ Migrations: NUR neue Collections/Fields HINZUFÜGEN
- ✅ Schema-Changes: Additive only, NEVER destructive
- ✅ Rollbacks: Vorsichtig — Daten-Rollbacks vermeiden
- ❌ Never run DELETE, UPDATE, DROP on existing data
- ❌ Never override user data, settings, or configuration
- ❌ Never truncate tables
- ❌ Never modify existing collection rules without explicit approval

**Consequence:** If I ever risk data, STOP immediately and ask user for approval.
