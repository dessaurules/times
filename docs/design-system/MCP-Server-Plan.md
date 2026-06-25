# MCP Server für Schicht & Plan - Planungsdokument

**Projekt:** PocketBase Dienstplan-Integration via MCP  
**Datum:** 2026-06-18  
**Status:** Planung (Umsetzung ausstehend)  
**Zweck:** Sichere lokale Verbindung von Claude zu Dienstplan-Daten (DSGVO-konform)

---

## 1. Was ist MCP (Model Context Protocol)?

### Definition
MCP ist ein offenes Protokoll von Anthropic, das Claude ermöglicht, mit externen Systemen zu kommunizieren **ohne** Cloud-Kommunikation.

### Wichtige Punkte
- **Lokal oder Remote:** MCP Server läuft auf deinem PC/Server (nicht in der Cloud)
- **Direkte Verbindung:** Claude Desktop ↔ MCP Server (direkt, nicht über Anthropic)
- **Keine API-Schlüssel:** Keine Geheimisse nach außen
- **Sichere Authentifizierung:** Lokal über Umgebungsvariablen oder lokale Methoden

### Datenschutz-Vorteile
```
Unsicher:
Claude.ai → Anthropic → dein API-Endpoint → PocketBase
(Daten fließen über Anthropic-Server)

Sicher mit MCP:
Claude Desktop → lokaler MCP Server ↔ PocketBase
(Daten bleiben lokal, keine Anthropic dazwischen)
```

---

## 2. Architektur: Wie würde es funktionieren?

### System-Übersicht
```
┌─────────────────────────────────────────────────────────┐
│ Claude Desktop (lokal installiert)                      │
└────────────────┬────────────────────────────────────────┘
                 │ (stdio oder HTTP lokal)
                 ↓
┌─────────────────────────────────────────────────────────┐
│ MCP Server (Node.js oder Python)                        │
│ - Läuft auf deinem PC/Pi                                │
│ - Verbindung zu PocketBase                              │
│ - Definiert "Tools" (Funktionen für Claude)             │
└────────────────┬────────────────────────────────────────┘
                 │ (HTTP oder SDK)
                 ↓
┌─────────────────────────────────────────────────────────┐
│ PocketBase (lokale Datenbank)                           │
│ - shift_plans, shift_entries, employees, etc.           │
└─────────────────────────────────────────────────────────┘
```

### Kommunikationsfluss
1. **Nutzer in Claude Desktop:** "Zeige mir die Schichten für KW 25"
2. **Claude ruft MCP Tool auf:** `get_shifts_for_week(week=25)`
3. **MCP Server:** Fragt PocketBase nach Daten
4. **PocketBase:** Gibt Daten zurück
5. **MCP Server:** Formatiert und gibt an Claude
6. **Claude:** Zeigt Ergebnis zum Nutzer

---

## 3. Was brauchen wir?

### A) Infrastruktur
- ✅ **PocketBase** (bereits vorhanden)
- ✅ **Claude Desktop** (kostenlos, lokal)
- ✅ **Node.js oder Python** (für MCP Server)

### B) MCP Server-Komponenten
```
mcp-server-dienstplan/
├── src/
│   ├── index.ts                    (Entry Point)
│   ├── pb-client.ts                (PocketBase SDK)
│   └── tools/
│       ├── shifts.ts               (Schichten-Tools)
│       ├── employees.ts            (Mitarbeiter-Tools)
│       ├── absences.ts             (Abwesenheits-Tools)
│       └── plans.ts                (Plan-Tools)
├── package.json
├── tsconfig.json
└── .env.example                    (PocketBase-Konfiguration)
```

### C) Claude-Konfiguration
```json
// ~/.claude/settings.json
{
  "mcpServers": {
    "dienstplan": {
      "command": "node",
      "args": ["/Users/ronnybeckmann/Projects/times/mcp-server/dist/index.js"],
      "env": {
        "PB_URL": "http://localhost:8091",
        "PB_ADMIN_EMAIL": "...",
        "PB_ADMIN_PASSWORD": "..."
      }
    }
  }
}
```

---

## 4. Tools: Was würde Claude tun können?

### Lesezugriff (safe)
```
get_shifts_for_week(year: int, week: int) → Array<Shift>
get_employee_shifts(employee_id: string, date_range: string) → Array<Shift>
get_week_summary(year: int, week: int) → object (Zusammenfassung)
get_absences_for_week(year: int, week: int) → Array<Absence>
list_employees() → Array<Employee>
```

### Schreibzugriff (mit Kontrolle)
```
create_shift(employee_id, date, start_time, end_time, color) → Shift
update_shift(shift_id, fields) → Shift
delete_shift(shift_id) → void
create_absence(employee_id, date_from, date_to, type) → Absence
publish_plan(plan_id) → void
```

### Analysezugriff
```
analyze_week_coverage(year: int, week: int) → Report
find_schedule_conflicts(year: int, week: int) → Array<Conflict>
suggest_shift_assignments() → Array<Suggestion>
```

---

## 5. Sicherheit & Best Practices

### Authentifizierung
| Methode | Sicherheit | Komplexität |
|---------|-----------|------------|
| **Lokale Env-Variablen** | ⭐⭐⭐⭐ | Gering |
| **PocketBase JWT in .env** | ⭐⭐⭐⭐ | Gering |
| **OAuth2 (PocketBase-Auth)** | ⭐⭐⭐⭐⭐ | Mittel |
| **API-Keys in MCP Config** | ⭐⭐⭐ | Gering |

**Empfehlung:** Lokale `.env` mit PocketBase Admin-Credentials (sind bereits lokal, nicht in der Cloud)

### Datenschutz-Checklist
- ✅ Keine Daten in die Cloud
- ✅ Keine API-Schlüssel mit Claude.ai teilen
- ✅ MCP Server läuft lokal oder auf eigenem Server
- ✅ PocketBase-Credentials nur lokal
- ✅ Audit-Logs für Claude-Zugriff (optional)
- ✅ Nur notwendige Tools freigeben (Prinzip der minimalen Berechtigung)

### Feuer-und-Vergessenszenarien
```
"Claude könnte versehentlich alle Schichten löschen?"
→ Tools mit Bestätigungen schreiben
→ Nur Entwürfe (draft) verändern, nie published

"MCP Server könnte gehackt werden?"
→ Läuft lokal auf deinem PC/Pi
→ Zugriff nur vom Claude Desktop
→ PB-Credentials sind lokal verschlüsselt (.env)
```

---

## 6. Implementierungs-Optionen

### Option A: MCP SDK (von Anthropic, offiziell)
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

const server = new Server({
  name: "dienstplan-mcp",
  version: "1.0.0",
})

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_shifts_for_week",
      description: "Get all shifts for a specific week",
      inputSchema: { /* ... */ }
    }
  ]
}))
```

**Vorteile:**
- ✅ Offiziell von Anthropic
- ✅ Best Practices included
- ✅ Type-safe (TypeScript)
- ✅ Gute Dokumentation

**Nachteile:**
- Noch relativ neu (SDK reift)

**Link:** https://github.com/anthropics/mcp

### Option B: Fertige MCP-Server (Community)
Es gibt bereits fertige Server:
- `mcp-server-postgres` (für Datenbanken)
- `mcp-server-filesystem` (für Dateien)
- `mcp-server-github` (für GitHub)

**Für PocketBase:** Kein offizieller Server, müssten wir selbst schreiben

### Option C: Python-Alternative
```python
from mcp.server import Server
from mcp.types import Tool

server = Server("dienstplan-mcp")

@server.tool()
def get_shifts_for_week(year: int, week: int):
    """Get all shifts for a specific week"""
    # PocketBase SDK calls
    return shifts
```

**Vorteil:** Einfacher, wenn Python bekannter ist

---

## 7. Anforderungen für die Umsetzung

### Voraussetzungen
- ✅ PocketBase läuft (bereits vorhanden)
- ✅ Claude Desktop installiert (kostenlos)
- ✅ Node.js oder Python (bereits auf Pi/PC)
- ✅ Git (für Versionskontrolle)

### Entwickler-Tools
```bash
# MCP SDK installieren
npm install @modelcontextprotocol/sdk

# PocketBase SDK
npm install pocketbase

# TypeScript (optional aber empfohlen)
npm install typescript ts-node

# Testing
npm install jest
```

### Entwicklungs-Timeline
```
Phase 1: Setup & Basics (2-3 Stunden)
├── MCP Server Struktur aufsetzen
├── PocketBase-Verbindung testen
└── 2-3 einfache Tools (get_shifts, list_employees)

Phase 2: Kern-Tools (4-6 Stunden)
├── Alle Lesezugriff-Tools
├── Error Handling
└── Tests

Phase 3: Schreib-Tools & Sicherheit (4-6 Stunden)
├── Schreib-Operationen
├── Authentifizierung
├── Validierung & Limits
└── Sicherheitstests

Phase 4: Dokumentation & Claude Setup (2-3 Stunden)
├── MCP Server dokumentieren
├── Claude Desktop konfigurieren
├── Benutzer-Dokumentation
└── Use-Case-Beispiele
```

**Gesamtaufwand:** ~12-18 Stunden (an mehreren Tagen verteilt)

---

## 8. Offizielle Ressourcen von Anthropic

### Dokumentation
1. **MCP Protokoll-Spezifikation**
   - Link: https://modelcontextprotocol.io/
   - Erklärt das Protokoll komplett
   - Beispiel-Server

2. **MCP SDK für Node.js**
   - Link: https://github.com/anthropics/mcp
   - TypeScript
   - Best Practices

3. **Claude Desktop Setup**
   - Link: https://claude.ai/download
   - Dokumentation: Includes MCP-Anleitung
   - Settings/Tools-Konfiguration

### Beispiel-Projekte von Anthropic
- `mcp-server-filesystem` (liest/schreibt Dateien)
- `mcp-server-git` (Git-Integration)
- `mcp-server-memory` (Persistente Notizen)

**Diese können als Vorlagen für unseren Server dienen!**

---

## 9. Risiken & Lösungen

| Risiko | Wahrscheinlichkeit | Lösung |
|--------|------------------|--------|
| Claude löscht alle Schichten | Niedrig | Draft-only Mode, Bestätigungen |
| MCP Server crasht | Mittel | Auto-restart, Monitoring |
| PocketBase-Verbindung bricht | Mittel | Reconnect-Logik, Timeouts |
| Performance-Probleme | Niedrig | Caching, Rate-Limiting |
| Datenverlust | Sehr niedrig | PB hat Backups, MCP ist read-only default |

---

## 10. Nächste Schritte (wenn wir starten)

### 1. Vorbereitung
- [ ] MCP SDK installieren
- [ ] PocketBase SDK testen
- [ ] Erste Tool-Definition schreiben

### 2. Entwicklung
- [ ] MCP Server Grundgerüst
- [ ] PocketBase-Client
- [ ] Lesezugriff-Tools testen
- [ ] Schreibzugriff implementieren

### 3. Integration
- [ ] Claude Desktop konfigurieren
- [ ] Mit echten Daten testen
- [ ] Sicherheits-Review

### 4. Deployment
- [ ] MCP Server als Service starten
- [ ] Dokumentation finalisieren
- [ ] Du kannst es dann nutzen!

---

## 11. FAQ

**Q: Ist MCP sicher?**  
A: Ja! Daten bleiben lokal, keine Cloud-Kommunikation. MCP ist vom Anthropic-Team designed mit Security im Fokus.

**Q: Kann Claude meine Daten an Anthropic senden?**  
A: Nein. Mit MCP lokal = Claude Desktop ↔ dein Server. Keine Anthropic-Server dazwischen.

**Q: Was wenn Claude einen Fehler macht?**  
A: Tools können Validierung haben. Kritische Operationen können Bestätigungen brauchen.

**Q: Kann ich es auf dem Pi laufen lassen?**  
A: Ja! MCP Server auf Pi, Claude Desktop auf deinem PC. Das ist sogar ideal.

**Q: Brauche ich einen API-Schlüssel?**  
A: Nein! Nur PocketBase-Admin-Credentials lokal (wie du sie ohnehin hast).

**Q: Kann ich MCP Server mit anderen Tools nutzen?**  
A: Ja! Andere Anwendungen können sich auch mit dem MCP Server verbinden (z.B. andere LLMs).

---

## Zusammenfassung

**Was wir bauen würden:**
- Ein **MCP Server** (Node.js/Python), der auf PocketBase zugreift
- **Tools** für Claude (Lesezugriff, Schreiben, Analyse)
- **Claude Desktop Integration** über lokale Config

**Sicherheits-Eigenschaften:**
- ✅ Daten bleiben lokal
- ✅ Keine API-Schlüssel in die Cloud
- ✅ DSGVO-konform
- ✅ Alle Credentials lokal

**Aufwand:** ~12-18 Stunden Entwicklung

**Status:** Planung abgeschlossen, warten auf GO-Signal zur Umsetzung

---

**Nächster Schritt:** Wenn du bereit bist, können wir den Plan in mehreren Phasen umsetzen. Fang wir mit Phase 1 (Setup) an? 🚀
