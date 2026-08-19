# Gamification Settings-Seite — Design Document

**Datum:** 2026-08-10  
**Status:** Design Approved  
**Scope:** Neue Admin-Seite zum Ein-/Ausschalten des Gamification-Systems  

---

## 1. EXECUTIVE SUMMARY

Ergänze die bestehende Gamification Admin-Navigation um eine neue Settings-Seite (`/admin/gamification/settings`), auf der Geschäftsführer das Gamification-System per Toggle ein- und ausschalten können. Diese Änderung wird automatisch in der Mitarbeiter-App via Real-Time-Subscription sichtbar.

---

## 2. ANFORDERUNGEN

### Funktional
- ✅ Neue Admin-Route `/admin/gamification/settings` (GFRoute-geschützt)
- ✅ Toggle zum Ein-/Ausschalten von `gam_settings.enabled`
- ✅ Real-Time Updates via PocketBase Subscription
- ✅ Status-Feedback (aktiv/deaktiviert mit Beschreibung)
- ✅ Error Handling für API-Fehler

### Non-Funktional
- ✅ Konsistent mit existierenden Admin-Pages (gleiche Struktur)
- ✅ Responsive Design (Tailwind + shadcn/ui)
- ✅ Keine Breaking Changes für bestehende Funktionalität

---

## 3. ARCHITEKTUR

### Dateistruktur
```
chef-app/src/
├── pages/
│   └── Admin/
│       ├── GameTasks.tsx          (existiert)
│       ├── GameRewards.tsx         (existiert)
│       ├── GameApprovals.tsx       (existiert)
│       └── GameSettings.tsx        (NEU) ← Simple Wrapper
├── components/
│   └── Gamification/
│       └── GamificationSettings.tsx (existiert) ← Logic hier
└── App.tsx                         (update routing)
```

### Komponenten-Hierarchie
```
GameSettings (neue Page)
└── GamificationSettings (existiert, reusable)
    ├── Load gam_settings
    ├── Subscribe to changes
    ├── Toggle UI mit Switch
    └── Status-Feedback
```

### Routing
```
App.tsx
  <GFRoute>
    <Route path="/admin/gamification/tasks" ... />
    <Route path="/admin/gamification/rewards" ... />
    <Route path="/admin/gamification/approvals" ... />
    <Route path="/admin/gamification/settings" element={<GameSettings />} /> ← NEU
  </GFRoute>
```

---

## 4. DATENFLUSS

### Ein/Aus-Schalten
```
1. GF klickt Toggle auf /admin/gamification/settings
2. GamificationSettings.handleToggle() wird aufgerufen
3. pb.collection('gam_settings').update(id, { enabled: !enabled })
4. PocketBase speichert Änderung
5. Real-Time-Hook in GamificationSettings triggert → setState
6. UI aktualisiert sich (Toggle-Status, Status-Text)

7. PARALLEL: Mitarbeiter-App subscribed zu gam_settings
8. useGamificationEnabled() Hook registriert Änderung
9. Gamification-Komponenten in Mitarbeiter-App werden hidden/shown
```

### Error Handling
- API-Fehler beim Update → `setError()` → Benutzer sieht Fehlermeldung
- Keine Netzwerk-Verbindung → `setError()` mit aussagekräftiger Meldung

---

## 5. IMPLEMENTIERUNGS-SCHRITTE

### Step 1: Neue Page erstellen
- Erstelle `chef-app/src/pages/Admin/GameSettings.tsx`
- Wrapper-Pattern: Nur einen h1 + GamificationSettings Komponente

### Step 2: Route hinzufügen
- Import in `chef-app/src/App.tsx`
- Route in GFRoute-Bereich: `<Route path="/admin/gamification/settings" element={<GameSettings />} />`

### Step 3: Testen
- Dev-Server starten
- `/admin/gamification/settings` öffnen
- Toggle betätigen
- Beobachten: gam_settings.enabled ändert sich
- Mitarbeiter-App Check: Gamification-Sichtbarkeit passt sich an

---

## 6. ABHÄNGIGKEITEN

### Existierende Komponenten (keine neuen Dependencies)
- `GamificationSettings` aus `chef-app/src/components/Gamification/GamificationSettings.tsx`
- `useGamificationEnabled` Hook in Mitarbeiter-App (bereits vorhanden)
- PocketBase Collection `gam_settings` (bereits vorhanden)

### Keine neuen NPM-Packages nötig

---

## 7. RISIKEN & MITIGATIONEN

| Risiko | Mitigation |
|--------|-----------|
| Toggle ist doppelt (Settings + einer anderen Seite) | Code-Review: Prüfe auf Duplikate |
| Real-Time-Subscription funktioniert nicht | Fallback: Page-Refresh zeigt Update |
| GFRoute-Guard verhindert Zugriff | Test mit GF-User durchführen |

---

## 8. SUCCESS CRITERIA

- ✅ `/admin/gamification/settings` ist erreichbar (GFRoute-geschützt)
- ✅ Toggle funktioniert: Änderung speichert sich in PocketBase
- ✅ Real-Time-Update funktioniert in derselben Seite
- ✅ Mitarbeiter-App reagiert auf Änderungen (Features werden sichtbar/unsichtbar)
- ✅ Error-Handling zeigt aussagekräftige Fehlermeldungen
