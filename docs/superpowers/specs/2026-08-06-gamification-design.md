# Gamification System — Design Document

**Datum:** 2026-08-06  
**Status:** Design Phase (awaiting implementation)  
**Scope:** Lean gamification extension for mitarbeiter-app  

---

## 1. EXECUTIVE SUMMARY

Integriere ein schlankes **Assignment-basiertes Gamification-System** direkt in die bestehende PocketBase-Instanz und mitarbeiter-app. Mitarbeiter können Aufgaben annehmen (mit 8-Stunden-Frist), abschließen, Punkte sammeln, und Prämien im integrierten Shop einlösen. Admin kontrolliert alles (Aufgaben, Prämien, Genehmigungen) im chef-app über GFRoute-geschützte Pages.

**Kernprinzipien:**
- ✅ Keine externe Abhängigkeit (alles in PocketBase + React)
- ✅ Serverseitige Validierung (kein Client-Hack möglich)
- ✅ Atomic Transactions (Race-Condition-sicher)
- ✅ Real-Time Updates via PocketBase Subscriptions
- ✅ Shadcn UI Integration (nahtlos ins bestehende Design)
- ✅ 8-Stunden-Frist für Task-Abschluss
- ✅ Admin genehmigt alle Punkte & Prämien

---

## 2. ARCHITEKTUR-ENTSCHEIDUNGEN

| Entscheidung | Begründung |
|--------------|-----------|
| **Assignment-Model** | Mitarbeiter "nimmt" Aufgabe an → ist exklusiv für ihn 8h → andere sehen sie nicht → Motiviert durch Exclusive Ownership |
| **Serverseitige Hooks** | JavaScript (nicht Go) — einfacher zu maintain, Performance ausreichend, sitzt im Repo |
| **Lazy-Check für Expiry** | Kein Background-Job nötig — beim nächsten Load prüft Hook: expires_at < now → Status "expired" |
| **Atomic Transactions** | Punkte-Gutschrift + Order-Approval sind ONE operation — kein Split möglich |
| **Events für Audit** | Alle Genehmigungen (approvals + rejections) als gam_events — vollständiger Audit-Trail |
| **Real-Time Subscriptions** | Statt Polling — User Points, Assignments, Activity-Feed, System-Status sofort aktuell |
| **Admin-Only Approvals** | Keine automatischen Punkte — Admin genehmigt jede Submission manuell (Quality Control) |
| **Feedback on Rejection** | Bei Ablehnung kann Admin Text-Feedback geben → erscheint im "Verfügbare Aufgaben" Tab + optional in Activity |

---

## 3. DATABASE SCHEMA

### 3.1 Neue Collections (alle mit "gam_"-Präfix)

#### **gam_tasks** (Verfügbare Aufgaben)
```
Feld                    | Typ       | Beschreibung
─────────────────────────────────────────────────────────
id                      | text (PK) | Auto-generated
title                   | text      | Aufgaben-Titel
description             | text      | Ausführliche Beschreibung
points                  | number    | Punkte-Belohnung
category                | text      | z.B. "Reinigung", "Service", "Dokumentation"
tags                    | select    | Multi-select: flexibel
difficulty              | select    | "easy", "medium", "hard"
priority                | select    | "low", "medium", "high"
team_department         | relation  | Wer darf diese Task machen? (Team/Abteilung Filter)
time_limit_minutes      | number    | 480 (default = 8h, in Minuten)
requires_media          | boolean   | Muss Mitarbeiter Foto hochladen?
max_concurrent_assign   | number    | Wie viele gleichzeitig? (optional, default: unbegrenzt)
daily_limit_per_user    | number    | Max. 1x pro Tag pro User (0 = unbegrenzt)
expires_at              | datetime  | Task-Ablaufdatum (wann ist Task nicht mehr verfügbar?)
active                  | boolean   | Ist Task sichtbar?
created_by              | relation  | Ref zu users (Admin der erstellt hat)
created_at, updated_at  | datetime  | Timestamps
```

#### **gam_assignments** (Angenommene Aufgaben)
```
Feld          | Typ       | Beschreibung
──────────────────────────────────────────────
id            | text (PK) | Auto-generated
task_id       | relation  | Ref zu gam_tasks
user_id       | relation  | Ref zu users (Mitarbeiter der annimmt)
assigned_at   | datetime  | Wann angenommen?
expires_at    | datetime  | assigned_at + task.time_limit_minutes
status        | select    | "active", "completed", "rejected", "expired"
rejected_at   | datetime  | Wann abgelehnt? (falls rejected)
created_at    | datetime  | Timestamp

UNIQUE CONSTRAINT: (task_id, user_id) WHERE status='active'
INDEX: (user_id, status, expires_at)
```

#### **gam_submissions** (Abschluss mit optional Foto)
```
Feld                | Typ       | Beschreibung
────────────────────────────────────────────────
id                  | text (PK) | Auto-generated
assignment_id       | relation  | Ref zu gam_assignments
task_id             | relation  | Ref zu gam_tasks
user_id             | relation  | Ref zu users
status              | select    | "pending", "approved", "rejected"
media_url           | text      | URL zum Foto (nullable wenn nicht erforderlich)
submission_notes     | text      | Was hat Mitarbeiter gemacht? (optional)
admin_feedback      | text      | Text vom Admin bei Ablehnung (optional)
points_awarded      | number    | Punkte die gutschrieben wurden (nur wenn approved)
created_at          | datetime  | Wann eingereicht?
approved_at         | datetime  | Wann genehmigt? (falls approved)
updated_at          | datetime  | Timestamp
```

#### **gam_rewards** (Prämien-Katalog)
```
Feld                | Typ       | Beschreibung
────────────────────────────────────────────────
id                  | text (PK) | Auto-generated
title               | text      | Prämien-Name
description         | text      | Was ist das? (z.B. "€10 Gutschein")
points_cost         | number    | Kosten in Punkten
category            | text      | z.B. "Gutschein", "Erlebnis"
status              | select    | "draft", "active", "archived"
available_from      | datetime  | Wann verfügbar?
available_until     | datetime  | Bis wann verfügbar?
redemption_type     | select    | "code" | "budget_limit" | "fixed_count"
code_pool           | json      | Array von verfügbaren Codes (falls redemption_type="code")
max_redemptions     | number    | Max. Einlösungen (falls redemption_type="budget_limit"/"fixed_count")
redemptions_count   | number    | Bisher eingelöst
created_by          | relation  | Ref zu users (Admin der erstellt hat)
created_at          | datetime  | Timestamp
updated_at          | datetime  | Timestamp
```

#### **gam_orders** (Eingelöste Prämien)
```
Feld              | Typ       | Beschreibung
──────────────────────────────────────────
id                | text (PK) | Auto-generated
user_id           | relation  | Ref zu users
reward_id         | relation  | Ref zu gam_rewards
status            | select    | "pending_admin", "approved", "rejected"
code_assigned     | text      | Zugewiesener Code (falls verfügbar)
admin_feedback    | text      | Text vom Admin bei Ablehnung
created_at        | datetime  | Wann eingereicht?
approved_at       | datetime  | Wann genehmigt?
updated_at        | datetime  | Timestamp
```

#### **gam_events** (Audit-Trail für Activity-Feed)
```
Feld                | Typ       | Beschreibung
────────────────────────────────────────────────
id                  | text (PK) | Auto-generated
type                | select    | "submission_approved", "submission_rejected", "reward_redeemed", "reward_rejected"
user_id             | relation  | Ref zu users (betroffener Mitarbeiter)
related_task_id     | relation  | Ref zu gam_tasks (optional, bei submission events)
related_reward_id   | relation  | Ref zu gam_rewards (optional, bei reward events)
data                | json      | {points, task_title, reward_title, remaining_points, ...}
created_at          | datetime  | Timestamp

INDEX: (user_id, type, created_at DESC)
```

#### **gam_settings** (Globale Konfiguration)
```
Feld        | Typ       | Beschreibung
─────────────────────────────────────────
id          | text (PK) | Singleton (immer 1 Record)
enabled     | boolean   | System an/aus
updated_by  | relation  | Ref zu users (Admin der geändert hat)
updated_at  | datetime  | Timestamp
```

### 3.2 Erweiterung bestehender Collections

#### **users** Collection
```
+ points | number | Gesamt-Punkte des Mitarbeiters (default: 0)
```

---

## 4. DATA FLOW & WORKFLOWS

### 4.1 Assignment-Flow (Mitarbeiter nimmt Aufgabe an)

```
1. Mitarbeiter öffnet "Verfügbare Aufgaben" Tab
   → Frontend lädt gam_tasks (filtered: active=true, expires_at > now)
   → Zeigt: [Title] [Points] in einfacher Liste

2. Mitarbeiter klickt "Annehmen"
   → Frontend: gam_assignments.create({task_id, user_id})
   
3. Server-Hook (onRecordBeforeCreateRequest):
   ✓ Prüfe: gam_settings.enabled = true?
   ✓ Prüfe: gam_tasks[task_id].active = true && expires_at > now?
   ✓ Prüfe: Existiert bereits assignment mit (task_id, user_id, status='active')?
   ✓ Prüfe: Daily-Limit nicht überschritten? (Wie viele Assignments heute schon?)
   → Falls Fehler: Abort mit aussagekräftiger Meldung

4. Hook setzt automatisch:
   - status = "active"
   - expires_at = now + gam_tasks[task_id].time_limit_minutes (default 8h)

5. Assignment erstellt ✓
   → Mitarbeiter sieht Aufgabe in "Meine Aufgaben" Tab
   → Andere Mitarbeiter sehen Aufgabe NICHT mehr (exklusiv reserviert)
   → Timer startet: "7h 59m verbleibend"

6. (Optional) Mitarbeiter lehnt ab:
   → Frontend: gam_assignments.update({id, status: "rejected"})
   → Hook setzt rejected_at = now
   → Aufgabe wird sofort wieder "Verfügbar" für andere

7. Timer läuft ab (8h verstrichen):
   → Lazy-Check beim nächsten Frontend-Load
   → Hook: Wenn expires_at < now && status='active' → status='expired'
   → Mitarbeiter sieht: "Abgelaufen — 8h Frist verstrichen"
```

### 4.2 Completion & Submission-Flow

```
1. Mitarbeiter sieht "Meine Aufgaben" mit aktiven Assignments
   → Klickt "Abschließen" auf einer Aufgabe

2. Dialog öffnet:
   - Falls gam_tasks[task_id].requires_media = true:
     → Foto-Upload Feld (Datei-Picker)
   - Optional: Text-Feld "Was hast du gemacht?"
   → Button: "Abschließen"

3. Click "Abschließen":
   → Frontend: gam_submissions.create({
       assignment_id,
       task_id,
       user_id,
       media_url (falls Upload),
       submission_notes (optional)
     })

4. Server-Hook (onRecordBeforeCreateRequest):
   ✓ Prüfe: gam_settings.enabled?
   ✓ Prüfe: assignment.status = "active" && assignment.expires_at > now?
   ✓ Prüfe: Wenn requires_media = true → media_url muss vorhanden sein
   → Falls Fehler: Abort

5. Submission erstellt mit status="pending"
   → Hook setzt: status="pending" (wartet auf Admin-Genehmigung)

6. Hook (onRecordAfterCreateSuccess):
   → Markiere assignment.status = "completed"
   → Optional: Notification an Admin "Neue Submission wartet auf Genehmigung"

7. Admin sieht im chef-app "Approval-Übersicht":
   → Submission mit: Mitarbeiter-Name, Task-Title, Foto (falls vorhanden)
   → Buttons: "Genehmigen" oder "Ablehnen"

8. Admin klickt "Genehmigen":
   → Frontend: gam_submissions.update({id, status: "approved"})

9. Server-Hook (onRecordBeforeUpdateRequest) — ATOMIC TRANSACTION:
   ```
   app.runInTransaction((txApp) => {
     const submission = record
     const user = txApp.findRecordById('users', submission.user_id)
     const task = txApp.findRecordById('gam_tasks', submission.task_id)
     
     const points = task.get('points')
     
     // Punkte gutschreiben
     user.set('points', user.get('points') + points)
     txApp.save(user)
     
     // Event erstellen für Activity-Feed
     const event = new Record(txApp.findCollectionByNameOrId('gam_events'))
     event.set('type', 'submission_approved')
     event.set('user_id', submission.user_id)
     event.set('related_task_id', task.id)
     event.set('data', { points, task_title: task.title })
     txApp.save(event)
   })
   ```

10. Mitarbeiter sieht in "Aktivitäten" sofort:
    → "Du hast 50 Punkte verdient für [Task]" ✓ (Real-Time via gam_events Subscription)
    → Sein Punkte-Saldo im Header updatet sich

11. Ablehnung-Flow (Admin lehnt ab):
    → Admin klickt "Ablehnen" + gibt optionales Feedback ein
    → Frontend: gam_submissions.update({id, status: "rejected", admin_feedback: "..."})
    → Hook erstellt gam_events Eintrag (type: "submission_rejected")
    → Mitarbeiter sieht im "Verfügbare Aufgaben" Tab:
      "Ablehnung: [Admin-Feedback]"
    → Optional in Activity-Feed anzeigen (negatives Event)
```

### 4.3 Shop-Flow (Mitarbeiter löst Prämie ein)

```
1. Mitarbeiter sieht "Prämien-Shop" Tab
   → Frontend lädt gam_rewards (filtered: status="active", available_from <= now <= available_until)
   → Zeigt: [Title] [Points-Cost] [Verfügbar/Ausverkauft]
   → Button "Einlösen" (disabled falls user.points < reward.points_cost)

2. Klickt "Einlösen":
   → Frontend: gam_orders.create({user_id, reward_id, status: "pending_admin"})

3. Server-Hook (onRecordBeforeCreateRequest) — PRE-CHECKS:
   ✓ Prüfe: gam_settings.enabled?
   ✓ Prüfe: reward.status = "active" && available_from <= now <= available_until?
   ✓ Prüfe: reward.max_redemptions > 0 && reward.redemptions_count < max? (Budget nicht vorbei?)
   → Falls Fehler: Abort

4. Order erstellt mit status="pending_admin"

5. Admin sieht im chef-app "Orders zur Freigabe":
   → Order mit: Mitarbeiter-Name, Reward-Title, Punkte-Cost
   → Buttons: "Genehmigen" oder "Ablehnen"

6. Admin klickt "Genehmigen":
   → Frontend: gam_orders.update({id, status: "approved"})

7. Server-Hook (onRecordBeforeUpdateRequest) — ATOMIC TRANSACTION:
   ```
   app.runInTransaction((txApp) => {
     const order = record
     const user = txApp.findRecordById('users', order.user_id)
     const reward = txApp.findRecordById('gam_rewards', order.reward_id)
     
     const cost = reward.get('points_cost')
     const userPoints = user.get('points')
     
     // Doppel-Check: Hat User noch genug Punkte?
     if (userPoints < cost) throw new Error('Insufficient points')
     
     // Budget-Check: Noch Platz?
     if (reward.max_redemptions > 0 && reward.redemptions_count >= reward.max_redemptions) {
       throw new Error('Reward limit reached')
     }
     
     // Ziehe Punkte ab
     user.set('points', userPoints - cost)
     txApp.save(user)
     
     // Inkrementiere Redemption-Count
     reward.set('redemptions_count', (reward.redemptions_count || 0) + 1)
     
     // Weise Code zu (falls vorhanden)
     const codePool = reward.get('code_pool') || []
     if (codePool.length > 0) {
       const code = codePool.shift()
       order.set('code_assigned', code)
       reward.set('code_pool', codePool)
     }
     txApp.save(reward)
     
     // Event für Activity-Feed
     const event = new Record(txApp.findCollectionByNameOrId('gam_events'))
     event.set('type', 'reward_redeemed')
     event.set('user_id', order.user_id)
     event.set('related_reward_id', reward.id)
     event.set('data', {
       cost,
       reward_title: reward.title,
       remaining_points: userPoints - cost
     })
     txApp.save(event)
   })
   ```

8. Order wird "approved" ✓
   → Mitarbeiter sieht sofort:
     - Im Shop: "Eingelöst ✓" Badge
     - Code angezeigt (falls verfügbar)
     - Punkte-Saldo im Header sinkt
     - In Activity-Feed: "Du hast [Reward] eingelöst"
```

### 4.4 System Enable/Disable Flow

```
1. Admin geht zu chef-app → Einstellungen → Gamification
   → Toggle: "Gamification-System aktivieren"

2. Click Toggle ON/OFF:
   → Frontend: gam_settings.update({id, enabled: true/false, updated_by: me})

3. Real-Time Subscription auf mitarbeiter-app:
   → Hook: pb.collection('gam_settings').subscribe('*', (e) => {
       const enabled = e.record.get('enabled')
       setGamificationEnabled(enabled)
     })

4. Falls enabled = false:
   → Diamant-Symbol im Header verschwindet sofort
   → "Gamification deaktiviert" Nachricht zeigen
   → Alle gam_* API-Calls blockiert (Server-Side API-Rules)

5. Falls enabled = true:
   → Diamant-Symbol reappears
   → Alles normal
```

---

## 5. POCKETBASE KRITISCHE PUNKTE

### 5.1 Race Conditions & Exclusive Locks

**Problem:** Zwei Mitarbeiter klicken gleichzeitig "Annehmen" auf gleicher Task.

**Lösung:**
- ✅ Unique Constraint: `gam_assignments` → `(task_id, user_id) WHERE status='active'`
- ✅ Pre-Hook Validation: Vor Insert → Abfrage ob bereits assignment existiert
- ✅ Atomare DB-Operation (PocketBase SQLite garantiert Atomarität)

### 5.2 Transaktionen für Punkte (Atomic)

**Problem:** User hat 100 Punkte, Prämie kostet 100. Zwischen "Check" und "Abzug" ändert sich der Wert.

**Lösung:**
- ✅ `e.app.runInTransaction((txApp) => {...})` (PocketBase v0.23+)
- ✅ Check Punkte + Update User + Update Order + Event-Create = ONE atomic operation
- ✅ Falls irgendetwas fehlschlägt → ROLLBACK

### 5.3 API-Rules sind streng

```
gam_tasks:
  createRule: "@request.auth.record.role = 'gf'"
  readRule: "@request.auth.id != ''"
  updateRule: "@request.auth.record.role = 'gf'"
  deleteRule: "@request.auth.record.role = 'gf'"

gam_assignments:
  createRule: "@request.auth.id != ''"
  readRule: "@request.auth.record.role = 'gf' || user_id = @request.auth.id"
  updateRule: "@request.auth.record.role = 'gf' || (user_id = @request.auth.id && status = 'active')"
  deleteRule: "@request.auth.record.role = 'gf'"

gam_submissions:
  createRule: "@request.auth.id != ''"
  readRule: "@request.auth.record.role = 'gf' || user_id = @request.auth.id"
  updateRule: "@request.auth.record.role = 'gf'"  # NUR GF kann approven/reject
  deleteRule: "@request.auth.record.role = 'gf'"

gam_orders:
  createRule: "@request.auth.id != ''"
  readRule: "@request.auth.record.role = 'gf' || user_id = @request.auth.id"
  updateRule: "@request.auth.record.role = 'gf'"  # NUR GF kann approven/reject
  deleteRule: "@request.auth.record.role = 'gf'"

gam_settings:
  readRule: "@request.auth.id != ''"
  updateRule: "@request.auth.record.role = 'gf'"
```

### 5.4 Hooks sind idempotent & logged

- ✅ Alle Hooks mit `console.error()` bei Fehlern
- ✅ Tagging: `[gamification:assignment:create]`, `[gamification:points:award]`, etc.
- ✅ Keine rekursiven Hooks (nur AfterSuccess für externe Effects)
- ✅ Externe Operations (Push) NUR nach Transaction commit

### 5.5 Indexes für Performance

```
gam_assignments: INDEX (user_id, status, expires_at)
gam_events: INDEX (user_id, created_at DESC)
gam_submissions: INDEX (user_id, status, created_at DESC)
gam_orders: INDEX (user_id, status, created_at DESC)
```

---

## 6. SERVER-SIDE HOOKS (pb_hooks/gamification.pb.js)

### 6.1 Assignment-Creation Hook

```javascript
/// <reference path="../pb_data/types.d.ts" />

onRecordBeforeCreateRequest((e) => {
  if (e.record.collection.name !== 'gam_assignments') return
  
  // 1. System enabled?
  const settings = $app.findRecordsByFilter('gam_settings', '', '', 1, 0)[0]
  if (!settings || !settings.get('enabled')) {
    throw new Error('[gamification:assignment:create] System disabled')
  }
  
  const taskId = e.record.get('task_id')
  const userId = e.record.get('user_id')
  
  // 2. Task existiert und aktiv?
  const task = $app.findRecordById('gam_tasks', taskId)
  if (!task || !task.get('active') || new Date(task.get('expires_at')) < new Date()) {
    throw new Error('[gamification:assignment:create] Task not available')
  }
  
  // 3. Duplicate-Check: Active assignment schon vorhanden?
  const existing = $app.findRecordsByFilter(
    'gam_assignments',
    `task_id = '${taskId}' && user_id = '${userId}' && status = 'active'`,
    '', 1, 0
  )
  if (existing.length > 0) {
    throw new Error('[gamification:assignment:create] Already assigned')
  }
  
  // 4. Daily-Limit prüfen?
  if (task.get('daily_limit_per_user') > 0) {
    const today = new Date().toISOString().split('T')[0]
    const todayCount = $app.findRecordsByFilter(
      'gam_assignments',
      `user_id = '${userId}' && task_id = '${taskId}' && created_at >= '${today}T00:00:00Z' && status != 'rejected'`,
      '', 100, 0
    ).length
    
    if (todayCount >= task.get('daily_limit_per_user')) {
      throw new Error(`[gamification:assignment:create] Daily limit (${task.get('daily_limit_per_user')}x/day) reached`)
    }
  }
  
  // 5. Setze expires_at automatisch
  const timeLimitMs = (task.get('time_limit_minutes') || 480) * 60 * 1000
  const expiresAt = new Date(Date.now() + timeLimitMs).toISOString()
  
  e.record.set('expires_at', expiresAt)
  e.record.set('status', 'active')
  e.record.set('assigned_at', new Date().toISOString())
  
  console.log(`[gamification:assignment:create] User ${userId} assigned task ${taskId}, expires ${expiresAt}`)
}, 'gam_assignments')
```

### 6.2 Submission-Creation Hook

```javascript
onRecordBeforeCreateRequest((e) => {
  if (e.record.collection.name !== 'gam_submissions') return
  
  const settings = $app.findRecordsByFilter('gam_settings', '', '', 1, 0)[0]
  if (!settings || !settings.get('enabled')) {
    throw new Error('[gamification:submission:create] System disabled')
  }
  
  const assignmentId = e.record.get('assignment_id')
  const assignment = $app.findRecordById('gam_assignments', assignmentId)
  
  // 1. Assignment aktiv?
  if (!assignment || assignment.get('status') !== 'active') {
    throw new Error('[gamification:submission:create] Assignment not active')
  }
  
  // 2. Nicht abgelaufen?
  const expiresAt = new Date(assignment.get('expires_at'))
  if (expiresAt < new Date()) {
    throw new Error('[gamification:submission:create] Assignment expired')
  }
  
  // 3. Media erforderlich?
  const task = $app.findRecordById('gam_tasks', assignment.get('task_id'))
  if (task.get('requires_media') && !e.record.get('media_url')) {
    throw new Error('[gamification:submission:create] Media required for this task')
  }
  
  e.record.set('status', 'pending')
  console.log(`[gamification:submission:create] Submission created for assignment ${assignmentId}`)
}, 'gam_submissions')

onRecordAfterCreateSuccess((e) => {
  if (e.record.collection.name !== 'gam_submissions') return
  
  // Markiere Assignment als completed
  const assignmentId = e.record.get('assignment_id')
  const assignment = $app.findRecordById('gam_assignments', assignmentId)
  assignment.set('status', 'completed')
  $app.save(assignment)
  
  console.log(`[gamification:submission:create] Assignment ${assignmentId} marked completed`)
}, 'gam_submissions')
```

### 6.3 Submission-Approval Hook (Points Award — ATOMIC)

```javascript
onRecordBeforeUpdateRequest((e) => {
  if (e.record.collection.name !== 'gam_submissions') return
  
  const newStatus = e.record.get('status')
  if (newStatus !== 'approved' && newStatus !== 'rejected') return
  
  if (newStatus === 'approved') {
    const settings = $app.findRecordsByFilter('gam_settings', '', '', 1, 0)[0]
    if (!settings || !settings.get('enabled')) {
      throw new Error('[gamification:submission:approve] System disabled')
    }
    
    // ATOMIC TRANSACTION
    $app.runInTransaction((txApp) => {
      const submission = e.record
      const userId = submission.get('user_id')
      const taskId = submission.get('task_id')
      
      const user = txApp.findRecordById('users', userId)
      const task = txApp.findRecordById('gam_tasks', taskId)
      
      const points = task.get('points')
      
      // Award points
      user.set('points', (user.get('points') || 0) + points)
      txApp.save(user)
      
      submission.set('points_awarded', points)
      submission.set('approved_at', new Date().toISOString())
      
      // Create event for activity feed
      const event = new Record(txApp.findCollectionByNameOrId('gam_events'))
      event.set('type', 'submission_approved')
      event.set('user_id', userId)
      event.set('related_task_id', taskId)
      event.set('data', {
        points,
        task_title: task.get('title')
      })
      txApp.save(event)
      
      console.log(`[gamification:submission:approve] User ${userId} awarded ${points} points for task ${taskId}`)
    })
  }
  
  if (newStatus === 'rejected') {
    // Create rejection event
    const submission = e.record
    const event = new Record($app.findCollectionByNameOrId('gam_events'))
    event.set('type', 'submission_rejected')
    event.set('user_id', submission.get('user_id'))
    event.set('related_task_id', submission.get('task_id'))
    event.set('data', {
      feedback: submission.get('admin_feedback') || ''
    })
    $app.save(event)
  }
}, 'gam_submissions')
```

### 6.4 Order-Approval Hook (Points Deduction — ATOMIC)

```javascript
onRecordBeforeUpdateRequest((e) => {
  if (e.record.collection.name !== 'gam_orders') return
  
  const newStatus = e.record.get('status')
  if (newStatus !== 'approved' && newStatus !== 'rejected') return
  
  if (newStatus === 'approved') {
    const settings = $app.findRecordsByFilter('gam_settings', '', '', 1, 0)[0]
    if (!settings || !settings.get('enabled')) {
      throw new Error('[gamification:order:approve] System disabled')
    }
    
    // ATOMIC TRANSACTION
    $app.runInTransaction((txApp) => {
      const order = e.record
      const userId = order.get('user_id')
      const rewardId = order.get('reward_id')
      
      const user = txApp.findRecordById('users', userId)
      const reward = txApp.findRecordById('gam_rewards', rewardId)
      
      const cost = reward.get('points_cost')
      const userPoints = user.get('points') || 0
      
      // Double-check: Enough points?
      if (userPoints < cost) {
        throw new Error('[gamification:order:approve] Insufficient points')
      }
      
      // Budget check
      const maxRedemptions = reward.get('max_redemptions') || 0
      const currentRedemptions = reward.get('redemptions_count') || 0
      if (maxRedemptions > 0 && currentRedemptions >= maxRedemptions) {
        throw new Error('[gamification:order:approve] Reward limit reached')
      }
      
      // Deduct points
      user.set('points', userPoints - cost)
      txApp.save(user)
      
      // Increment redemption count
      reward.set('redemptions_count', currentRedemptions + 1)
      
      // Assign code if available
      const codePool = reward.get('code_pool') || []
      if (codePool.length > 0) {
        const code = codePool.shift()
        order.set('code_assigned', code)
        reward.set('code_pool', codePool)
      }
      txApp.save(reward)
      
      order.set('approved_at', new Date().toISOString())
      
      // Create event
      const event = new Record(txApp.findCollectionByNameOrId('gam_events'))
      event.set('type', 'reward_redeemed')
      event.set('user_id', userId)
      event.set('related_reward_id', rewardId)
      event.set('data', {
        cost,
        reward_title: reward.get('title'),
        remaining_points: userPoints - cost
      })
      txApp.save(event)
      
      console.log(`[gamification:order:approve] User ${userId} redeemed reward ${rewardId}, cost ${cost} points`)
    })
  }
  
  if (newStatus === 'rejected') {
    const order = e.record
    const event = new Record($app.findCollectionByNameOrId('gam_events'))
    event.set('type', 'reward_rejected')
    event.set('user_id', order.get('user_id'))
    event.set('related_reward_id', order.get('reward_id'))
    event.set('data', {
      feedback: order.get('admin_feedback') || ''
    })
    $app.save(event)
  }
}, 'gam_orders')
```

---

## 7. FRONTEND INTEGRATION

### 7.1 Chef-App (Admin-Seite)

**Neue GFRoute-geschützte Pages:**
```
/admin/gamification
  ├─ /tasks          → Task-Verwaltung (CRUD)
  ├─ /rewards        → Reward-Shop-Verwaltung
  └─ /approvals      → Submissions & Orders Genehmigung
/einstellungen/gamification → Enable/Disable Switch
```

**Neue Komponenten:**
```
chef-app/src/components/Gamification/
  ├─ GamificationTaskList.tsx
  ├─ GamificationRewardList.tsx
  ├─ GamificationApprovals.tsx
  └─ GamificationSettings.tsx

chef-app/src/pages/Admin/
  ├─ GameTasks.tsx
  ├─ GameRewards.tsx
  ├─ GameApprovals.tsx
```

**Funktionalität:**
- Task-CRUD: Title, Points, Category, Tags, Difficulty, Priority, Ablaufdatum, Daily-Limit, requires_media
- Reward-CRUD: Title, Points-Cost, Category, available_from/until, Redemption-Type, Code-Pool Upload (CSV)
- Approvals: 2 Tabs (Submissions + Orders), Filter, Batch-Approve/Reject, Text-Feedback
- Settings: Toggle Enable/Disable (Real-Time Subscription auf gam_settings)

### 7.2 Mitarbeiter-App (User-Seite)

**Gamification Modal/Sheet (kein neuer Route):**
```
Header: Diamant-Icon (Lucide Gem) oben rechts
  ├─ Click → öffnet Bottom-Sheet mit 4 Tabs:
  │  ├─ "Verfügbare Aufgaben" (List: Title, Points, "Annehmen" Button)
  │  ├─ "Meine Aufgaben" (Active Assignments mit 8h-Timer, "Abschließen" Button)
  │  ├─ "Prämien-Shop" (List: Title, Points-Cost, "Einlösen" Button)
  │  └─ "Aktivitäten" (Activity-Feed mit positiven Events)
```

**Neue Komponenten:**
```
mitarbeiter-app/src/components/Gamification/
  ├─ GamificationSheet.tsx       (Main Sheet Container)
  ├─ GamificationTaskList.tsx    (Tab 1)
  ├─ GamificationAssignments.tsx (Tab 2, mit Live Timer)
  ├─ GamificationShop.tsx        (Tab 3)
  ├─ GamificationFeed.tsx        (Tab 4)
  └─ GamificationHeader.tsx      (Diamant-Icon im Header)

mitarbeiter-app/src/hooks/
  ├─ useGamificationEnabled.ts   (Real-Time: gam_settings.enabled)
  ├─ useUserPoints.ts            (Real-Time: users.points)
  ├─ useAssignments.ts           (Real-Time: gam_assignments)
  └─ useActivityFeed.ts          (Real-Time: gam_events)
```

**Funktionalität:**
- Header: Diamant-Icon mit aktuellem Punkte-Saldo, verschwindet wenn System disabled
- Tab 1: Einfache Liste (Title + Points), "Annehmen" Button
- Tab 2: Aktive Assignments mit Live-Countdown Timer (8h), "Abschließen" Button
- "Abschließen" Flow: Wenn requires_media → Foto-Upload, optional Text, Submit
- Tab 3: Filterable Shop-Liste, "Einlösen" Button (disabled falls insufficient points)
- Tab 4: Activity-Feed mit Events (approvals, redemptions), Real-Time Updates
- System deaktiviert: Icon verschwindet, Routes blockiert

### 7.3 Styling & UX

- ✅ Alle shadcn/ui Komponenten (Sheet, Dialog, Button, Card, Tabs, AlertDialog)
- ✅ Indigo-Theme mit Dark/Light-Mode (bestehende CSS-Variablen)
- ✅ Responsive: Mobile-first (Bottom-Sheet auf Mobile)
- ✅ Animations: Smooth Transitions, Timer-Blink bei wenig Zeit (z.B. < 1h)
- ✅ Loading-States: Skeleton Screens während Subscriptions laden
- ✅ Error-Handling: Toast-Notifications bei Validierungsfehlern

---

## 8. REAL-TIME SUBSCRIPTIONS

### 8.1 Mitarbeiter-App Subscriptions

```typescript
// useGamificationEnabled.ts
useEffect(() => {
  const unsubscribe = pb.collection('gam_settings')
    .subscribe('*', (e) => {
      setEnabled(e.record.get('enabled'))
    })
  return () => unsubscribe()
}, [])

// useUserPoints.ts
useEffect(() => {
  const unsubscribe = pb.collection('users')
    .subscribe(pb.authStore.record.id, (e) => {
      setPoints(e.record.get('points') || 0)
    })
  return () => unsubscribe()
}, [])

// useAssignments.ts
useEffect(() => {
  const filter = `user_id = "${pb.authStore.record.id}" && status != "rejected"`
  const unsubscribe = pb.collection('gam_assignments')
    .subscribe('*', (e) => {
      if (e.record.get('user_id') === pb.authStore.record.id) {
        updateAssignments(e.record)
      }
    }, { requestKey: filter })
  return () => unsubscribe()
}, [])

// useActivityFeed.ts
useEffect(() => {
  const types = ['submission_approved', 'reward_redeemed']
  const unsubscribe = pb.collection('gam_events')
    .subscribe('*', (e) => {
      if (e.record.get('user_id') === pb.authStore.record.id && 
          types.includes(e.record.get('type'))) {
        addEventToFeed(e.record)
      }
    })
  return () => unsubscribe()
}, [])
```

### 8.2 Chef-App Subscriptions (Admin)

```typescript
// useSubmissionApprovals.ts
const unsubscribe = pb.collection('gam_submissions')
  .subscribe('*', (e) => {
    if (e.record.get('status') === 'pending') {
      addOrUpdateSubmission(e.record)
    }
  })

// useOrderApprovals.ts
const unsubscribe = pb.collection('gam_orders')
  .subscribe('*', (e) => {
    if (e.record.get('status') === 'pending_admin') {
      addOrUpdateOrder(e.record)
    }
  })
```

---

## 9. ERROR HANDLING & EDGE CASES

| Szenario | Handling |
|----------|----------|
| **Duplikat-Assignment** | User versucht Task anzunehmen, die schon angenommen ist → Hook-Error "Already assigned" → Toast-Fehler |
| **Timer abgelaufen** | Lazy-Check beim nächsten Load → Status "expired" → "Abgelaufen" Badge |
| **Submission ohne Foto** | Wenn requires_media=true → Pre-Hook Error → Validierungsmeldung |
| **Ablehnung mit Feedback** | Admin lehnt ab → gam_events + gam_submissions.admin_feedback → im Tab sichtbar |
| **Insufficient Points** | User klickt "Einlösen", hat aber nicht genug → Button disabled + Server-Check → "Nicht genug Punkte" |
| **Concurrent Redemption** | 2 User lösen letzten Code gleichzeitig ein → 1. gewinnt, 2. bekommt "Limit reached" |
| **System disabled** | gam_settings.enabled=false → Diamant verschwindet, API-Calls blockiert |
| **Transaction Rollback** | Punkte-Abzug schlägt fehl (z.B. points-update wirft Fehler) → GANZER Flow zurückgerollt → keine Order erstellt |
| **Hook Error** | Jeder Hook-Fehler wird geloggt mit `[gamification:XYZ]` Tag → Admin kann PocketBase Logs prüfen |

---

## 10. DEPLOYMENT & SETUP

### 10.1 Migrations-Reihenfolge

```
1. users Collection erweitern: + points (number)
2. Neue Collections erstellen:
   - gam_tasks
   - gam_assignments
   - gam_submissions
   - gam_rewards
   - gam_orders
   - gam_events
   - gam_settings
3. API-Rules setzen pro Collection (siehe Abschnitt 5.3)
4. Indexes erstellen (performance)
5. pb_hooks/gamification.pb.js deployieren mit allen Hooks
6. Initial gam_settings Record: enabled=false
7. Test-Daten erstellen (1-2 Tasks + Rewards zum Testen)
```

### 10.2 PocketBase Version

- ✅ Benötigt **v0.23+** (für `runInTransaction`)
- ✅ Konfiguration: `--hooksPool=15` (default, ausreichend für dieses System)

### 10.3 Frontend-Build

```bash
# chef-app
npm run build  # TypeScript-Check + Vite build

# mitarbeiter-app
npm run build
```

### 10.4 Testing Checklist

- [ ] Task annehmen → Assignment erstellt, Timer läuft
- [ ] Task ablehnen → Assignment rejected, Task wieder verfügbar
- [ ] 8h verstreichen → Lazy-Check markiert als "expired"
- [ ] Submission mit Foto → pending, Admin kann genehmigen
- [ ] Admin genehmigt → Punkte gewährt, Event in Activity-Feed
- [ ] Prämie einlösen → Order pending, Admin genehmigt
- [ ] Points deducted → User sieht niedriger Saldo
- [ ] System disabled → Diamant verschwindet, API-Calls blockiert
- [ ] Concurrent Requests → keine Race-Conditions (beide können nicht gleiche Task assignen)

---

## 11. FUTURE EXTENSIONS (nicht in MVP)

- [ ] Leaderboards (Weekly/Monthly)
- [ ] Badge-System (Achievements)
- [ ] Daily Challenge-Bonuses
- [ ] Team-Competitions
- [ ] Detailed Analytics Dashboard
- [ ] External Reward Integration (externe Shop-APIs)
- [ ] Push-Notifications bei Approvals
- [ ] Email-Digests mit Punkte-Summary

---

## 12. GLOSSAR

| Begriff | Definition |
|---------|-----------|
| **Assignment** | Wenn Mitarbeiter eine Task annimmt → exklusiv reserviert für 8h |
| **Submission** | Wenn Mitarbeiter Task abschließt (optional mit Foto) → wartet auf Admin-Genehmigung |
| **Order** | Wenn Mitarbeiter Prämie einlösen möchte → wartet auf Admin-Genehmigung |
| **gam_events** | Audit-Trail aller wichtigen Events (approvals, rejections, redemptions) |
| **Activity-Feed** | Für Mitarbeiter sichtbar: nur positive Events (approvals, redemptions) |
| **Lazy-Check** | Beim nächsten API-Call prüft Hook serverseitig die Bedingungen (z.B. Timer abgelaufen) |
| **Atomic Transaction** | Alles-oder-Nichts-Operation: Punkte-Check + Abzug + Event-Create = ONE operation |

---

**Status:** ✅ Design Complete  
**Next Step:** Implementation Plan (writing-plans skill)  
**Last Updated:** 2026-08-06
