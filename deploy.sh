#!/bin/bash
set -e

# ── Konfiguration ─────────────────────────────────────────────
PI_USER="server"
PI_HOST="192.168.178.106"
PI_PATH="/home/server/times"
BRANCH="feature/chefapp-phase2"

echo "🚀 Schicht & Plan – Deployment Script (Git-basiert)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── Schritt 1: Lokal validieren ────────────────────────────────
echo ""
echo "📦 Schritt 1: Lokal bauen (Validierung)..."
cd chef-app
npm run build > /dev/null 2>&1
cd ..
cd mitarbeiter-app
npm run build > /dev/null 2>&1
cd ..
echo "✅ Beide Apps bauen erfolgreich"

# ── Schritt 2: Git push ────────────────────────────────────────
echo ""
echo "📤 Schritt 2: Code auf GitHub pushen..."
git push origin "$BRANCH" > /dev/null 2>&1
echo "✅ Gepushed auf origin/$BRANCH"

# ── Schritt 3: Remote Deployment ───────────────────────────────
echo ""
echo "🚀 Schritt 3: Remote Deployment (auf Pi)..."

ssh "$PI_USER@$PI_HOST" << 'REMOTESCRIPT'
  set -e

  PI_PATH="/home/server/times"
  BRANCH="feature/chefapp-phase2"

  cd "$PI_PATH"

  # 3a. Git pull
  echo "  📥 git pull..."
  git pull origin "$BRANCH" > /dev/null 2>&1

  # 3b. Root dependencies (express, compression für serve.mjs)
  echo "  📥 npm ci (root)..."
  npm ci > /dev/null 2>&1

  # 3c. Push-Service dependencies
  echo "  📥 npm ci (push-service)..."
  cd "$PI_PATH/push-service"
  npm ci > /dev/null 2>&1
  cd "$PI_PATH"

  # 3d. Chef-App bauen
  echo "  🔨 Baue chef-app..."
  cd "$PI_PATH/chef-app"
  VITE_PB_URL="http://127.0.0.1:8092" npm run build > /dev/null 2>&1
  cd "$PI_PATH"

  # 3e. Mitarbeiter-App bauen
  echo "  🔨 Baue mitarbeiter-app..."
  cd "$PI_PATH/mitarbeiter-app"
  VITE_PB_URL="http://127.0.0.1:8092" npm run build > /dev/null 2>&1
  cd "$PI_PATH"

  # 3f. PocketBase binary (falls fehlend)
  if [ ! -f "$PI_PATH/pocketbase" ]; then
    echo "  📥 Lade PocketBase binary herunter..."
    TMPDIR=$(mktemp -d)
    cd "$TMPDIR"
    wget -q https://github.com/pocketbase/pocketbase/releases/download/v0.38.1/pocketbase_0.38.1_linux_arm64.zip
    unzip -q pocketbase_0.38.1_linux_arm64.zip pocketbase
    mv pocketbase "$PI_PATH/pocketbase"
    chmod +x "$PI_PATH/pocketbase"
    cd "$PI_PATH"
    rm -rf "$TMPDIR"
  fi

  # 3g. Verzeichnisse sicherstellen
  echo "  📁 Verzeichnisse erstellen..."
  mkdir -p "$PI_PATH/logs" "$PI_PATH/pb_data" "$PI_PATH/pb_hooks"

  # 3h. .env falls nicht vorhanden
  if [ ! -f "$PI_PATH/.env" ]; then
    echo "  ⚙️  .env aus Vorlage kopieren..."
    cp "$PI_PATH/.env.production.example" "$PI_PATH/.env"
  fi

  # 3i. Systemd-Services
  echo "  🔧 Systemd-Services aktualisieren..."

  sudo tee /etc/systemd/system/times-pb.service > /dev/null << 'PBSERVICE'
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
PBSERVICE

  sudo tee /etc/systemd/system/times-serve.service > /dev/null << 'SERVESERVICE'
[Unit]
Description=Schicht & Plan – Static Server (Chef + Mitarbeiter)
After=network.target

[Service]
Type=simple
User=server
WorkingDirectory=/home/server/times
Environment=PATH=/home/server/.nvm/versions/node/v22.22.2/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=/home/server/.nvm/versions/node/v22.22.2/bin/node serve.mjs
Restart=always
RestartSec=5
StandardOutput=append:/home/server/times/logs/serve.log
StandardError=append:/home/server/times/logs/serve.log

[Install]
WantedBy=multi-user.target
SERVESERVICE

  sudo tee /etc/systemd/system/times-push.service > /dev/null << 'PUSHSERVICE'
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
ExecStart=/home/server/.nvm/versions/node/v22.22.2/bin/npx tsx src/index.ts
Restart=always
RestartSec=5
StandardOutput=append:/home/server/times/logs/push.log
StandardError=append:/home/server/times/logs/push.log

[Install]
WantedBy=multi-user.target
PUSHSERVICE

  # 3j. Services neu laden + starten
  echo "  🔄 Systemd daemon-reload..."
  sudo systemctl daemon-reload

  echo "  🚀 Services aktivieren + starten..."
  sudo systemctl enable times-pb times-serve times-push
  sudo systemctl restart times-pb times-serve times-push

  sleep 2

  echo "  📊 Service-Status:"
  systemctl status times-pb times-serve times-push || true

REMOTESCRIPT

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment abgeschlossen!"
echo ""
echo "📍 URLs:"
echo "   Chef-App:        http://192.168.178.106:3001"
echo "   Mitarbeiter-App: http://192.168.178.106:3002"
echo "   PocketBase Admin: http://192.168.178.106:8092/_/"
echo ""
echo "🔍 Logs auf Pi:"
echo "   ssh server@192.168.178.106 \"tail -f /home/server/times/logs/*.log\""
echo ""
echo "🌐 Lokaler Browser (SSH-Tunnel):"
echo "   ssh -L 3001:localhost:3001 server@192.168.178.106"
echo "   Dann: http://localhost:3001"
