# Schicht & Plan

HR-Verwaltungs-App für Gastronomie/Hotellerie.

## Schnellstart

### 1. PocketBase starten

```bash
./pocketbase serve --http="127.0.0.1:8091"
```

### 2. Admin-Account anlegen

Browser öffnen: http://127.0.0.1:8091/_/
- E-Mail: admin@example.com
- Passwort: Admin1234! (danach ändern)

### 3. Schema einrichten

```bash
node scripts/setup-pb.mjs
```

### 4. GF-Nutzer anlegen

PocketBase Admin UI → Collections → users → New record:
- email: admin@example.com
- password: Test1234!
- role: gf
- name: Admin

### 5. Chef-App starten

```bash
cd chef-app
cp .env.example .env
npm install
npm run dev
```
