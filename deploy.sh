#!/bin/bash
set -e

# ── Konfiguration ─────────────────────────────────────────────
PI_USER="server"
PI_HOST="192.168.178.106"
PI_PATH="/home/server/times"
PB_URL="http://192.168.178.106:8092"

echo "🚀 Schicht & Plan – Deployment Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Schritt 1: Chef-App bauen ──────────────────────────────────
echo ""
echo "📦 Schritt 1: Chef-App bauen..."
cd chef-app
VITE_PB_URL="$PB_URL" npm run build
cd ..

# ── Schritt 2: Mitarbeiter-App bauen ───────────────────────────
echo ""
echo "📦 Schritt 2: Mitarbeiter-App bauen..."
cd mitarbeiter-app
VITE_PB_URL="$PB_URL" npm run build
cd ..

# ── Schritt 3: PocketBase-Binary kopieren ──────────────────────
echo ""
echo "📋 Schritt 3: PocketBase-Binary prüfen..."
if [ ! -f ./pocketbase-linux ]; then
  echo "❌ Fehler: ./pocketbase-linux nicht gefunden!"
  echo "Bitte stelle sicher, dass die Linux-Version heruntergeladen wurde."
  exit 1
fi

# ── Schritt 4: Mit rsync auf Pi übertragen ─────────────────────
echo ""
echo "🔄 Schritt 4: Dateien auf Pi übertragen (rsync)..."

# Chef-App
rsync -av --delete chef-app/dist/ "$PI_USER@$PI_HOST:$PI_PATH/chef-app/dist/"

# Mitarbeiter-App
rsync -av --delete mitarbeiter-app/dist/ "$PI_USER@$PI_HOST:$PI_PATH/mitarbeiter-app/dist/"

# Push-Service (Quellcode)
rsync -av --delete --exclude node_modules --exclude .env push-service/ "$PI_USER@$PI_HOST:$PI_PATH/push-service/"

# PocketBase Binary (Linux ARM Version)
rsync -av pocketbase-linux "$PI_USER@$PI_HOST:$PI_PATH/pocketbase"
ssh "$PI_USER@$PI_HOST" "chmod +x $PI_PATH/pocketbase"

# PocketBase Migrations
rsync -av pb_migrations/ "$PI_USER@$PI_HOST:$PI_PATH/pb_migrations/"

# PocketBase Hooks
rsync -av pb_hooks/ "$PI_USER@$PI_HOST:$PI_PATH/pb_hooks/"

# Serve.mjs
rsync -av serve.mjs "$PI_USER@$PI_HOST:$PI_PATH/"

# ── Schritt 5: SSH – npm install im push-service ───────────────
echo ""
echo "📥 Schritt 5: npm install im push-service (Pi)..."
ssh "$PI_USER@$PI_HOST" "cd $PI_PATH/push-service && npm install"

# ── Schritt 6: SSH – logs/ Verzeichnis anlegen ──────────────────
echo ""
echo "📁 Schritt 6: logs/ Verzeichnis anlegen (Pi)..."
ssh "$PI_USER@$PI_HOST" "mkdir -p $PI_PATH/logs"

# ── Schritt 7: SSH – Systemd-Services anlegen ──────────────────
echo ""
echo "🔧 Schritt 7: Systemd-Services anlegen (Pi)..."

ssh "$PI_USER@$PI_HOST" << 'EOSSH'
  PI_PATH="/home/server/times"
  NVM_VERSION="v22.22.2"
  NVM_DIR="/home/server/.nvm"

  # times-pb.service
  sudo tee /etc/systemd/system/times-pb.service > /dev/null << 'EOF'
[Unit]
Description=Schicht & Plan – PocketBase
After=network.target

[Service]
Type=simple
User=server
WorkingDirectory=/home/server/times
ExecStart=/home/server/times/pocketbase serve --http=0.0.0.0:8092 --dir ./pb_data --migrationsDir ./pb_migrations --hooksDir ./pb_hooks
Restart=always
RestartSec=5
StandardOutput=append:/home/server/times/logs/pb.log
StandardError=append:/home/server/times/logs/pb.log

[Install]
WantedBy=multi-user.target
EOF

  # times-serve.service
  sudo tee /etc/systemd/system/times-serve.service > /dev/null << 'EOF'
[Unit]
Description=Schicht & Plan – Static Server (Chef + Mitarbeiter)
After=network.target times-pb.service
Requires=times-pb.service

[Service]
Type=simple
User=server
WorkingDirectory=/home/server/times
Environment=PATH=/home/server/.nvm/versions/node/v22.22.2/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
Environment=PORT=4173
ExecStart=/home/server/.nvm/versions/node/v22.22.2/bin/node serve.mjs
Restart=always
RestartSec=5
StandardOutput=append:/home/server/times/logs/serve.log
StandardError=append:/home/server/times/logs/serve.log

[Install]
WantedBy=multi-user.target
EOF

  # times-push.service
  sudo tee /etc/systemd/system/times-push.service > /dev/null << 'EOF'
[Unit]
Description=Schicht & Plan – Push-Service
After=network.target times-pb.service
Requires=times-pb.service

[Service]
Type=simple
User=server
WorkingDirectory=/home/server/times/push-service
Environment=PATH=/home/server/.nvm/versions/node/v22.22.2/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
EnvironmentFile=/home/server/times/.env
ExecStart=/home/server/.nvm/versions/node/v22.22.2/bin/node src/index.ts
Restart=always
RestartSec=5
StandardOutput=append:/home/server/times/logs/push.log
StandardError=append:/home/server/times/logs/push.log

[Install]
WantedBy=multi-user.target
EOF

  # Systemd neu laden
  sudo systemctl daemon-reload
  echo "✅ Systemd-Services angelegt"
EOSSH

# ── Schritt 8: SSH – Services aktivieren und starten ──────────
echo ""
echo "🚀 Schritt 8: Services aktivieren und starten (Pi)..."
ssh "$PI_USER@$PI_HOST" << 'EOSSH'
  # Aktivieren (Auto-Start on boot)
  sudo systemctl enable times-pb times-serve times-push

  # Starten
  sudo systemctl start times-pb
  sleep 2
  sudo systemctl start times-serve
  sudo systemctl start times-push

  # Status anzeigen
  echo ""
  echo "📊 Service-Status:"
  systemctl status times-pb times-serve times-push || true
EOSSH

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment abgeschlossen!"
echo ""
echo "📍 URLs:"
echo "   Chef-App:        http://192.168.178.106:4173"
echo "   Mitarbeiter-App: http://192.168.178.106:4174"
echo "   PocketBase Admin: http://192.168.178.106:8092/_/"
echo ""
echo "🔍 Logs:"
echo "   ssh server@192.168.178.106 \"tail -f /home/server/times/logs/*.log\""
echo ""
echo "⚠️  TODO:"
echo "   1. .env auf Pi mit echten Werten befüllen:"
echo "      ssh server@192.168.178.106 \"nano /home/server/times/.env\""
echo "   2. PocketBase Admin-Passwort ändern"
echo "   3. VAPID-Keys für Push-Notifications konfigurieren"
