# Déploiement sur VPS avec un nom de domaine

Ce guide met le jeu en ligne sur ton VPS, derrière un nom de domaine en HTTPS.
Le serveur Express sert à la fois le build statique (`dist/`) **et** l'API des
high scores (SQLite) — un seul service à faire tourner.

Hypothèses : VPS Ubuntu/Debian, accès `sudo`, et tu possèdes déjà un nom de
domaine (ex. chez OVH, Namecheap, Cloudflare…). Adapte les chemins/noms.

Validé pour **Ubuntu 24.04** (le cas ici). Connexion : `ssh root@IP_DU_VPS`.

---

## 0. Spécificités Hostinger (à lire en premier)

Deux choses propres à Hostinger en plus du guide générique :

1. **Pare-feu Hostinger (hPanel)** — Hostinger a son propre pare-feu, *en plus*
   de `ufw`. Va dans **hPanel → VPS → Pare-feu** et autorise les ports **80** et
   **443** (HTTP/HTTPS) et **22** (SSH). Sinon le domaine restera injoignable
   même si tout est bien configuré côté serveur.

2. **DNS** — deux cas :
   - *Domaine acheté chez Hostinger* : **hPanel → Domaines → Zone DNS**, ajoute
     l'enregistrement **A** (étape 1 ci-dessous).
   - *Domaine ailleurs* : soit tu mets l'enregistrement A chez ton registrar
     actuel, soit tu pointes les serveurs de noms (NS) vers Hostinger.

Le reste (Node, systemd, Caddy) est identique au guide générique ci-dessous.

---

## 1. DNS : pointer le domaine vers le VPS

Chez ton registrar, crée un enregistrement **A** :

| Type | Nom            | Valeur            |
|------|----------------|-------------------|
| A    | `@` (ou `jeu`) | `IP.DU.TON.VPS`   |

- `@` → `tondomaine.com`
- `jeu` → `jeu.tondomaine.com`

La propagation prend de quelques minutes à ~1 h. Vérifie avec :

```bash
dig +short tondomaine.com
```

Tu dois voir l'IP de ton VPS.

---

## 2. Préparer le VPS

```bash
# Outils de build (better-sqlite3 est un module natif → compilation à l'install)
sudo apt update
sudo apt install -y git build-essential python3

# Node 20 (si pas déjà installé)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # doit afficher v20.x
```

## 3. Récupérer le projet et builder

```bash
# Place le projet (ex. /opt/fruitrush)
sudo git clone <URL_DE_TON_REPO> /opt/fruitrush
cd /opt/fruitrush

npm ci            # installe les deps (compile better-sqlite3)
npm run build     # génère dist/
```

Test manuel rapide :

```bash
PORT=3001 npm start
# ouvre http://IP.DU.TON.VPS:3001 dans un navigateur — le jeu doit s'afficher
# Ctrl+C pour arrêter
```

> La base SQLite se crée automatiquement dans `/opt/fruitrush/server/data/scores.db`.
> Ce dossier est persistant : **ne le supprime pas** lors des mises à jour.

---

## 4. Faire tourner le serveur en permanence (systemd)

Crée `/etc/systemd/system/fruitrush.service` :

```ini
[Unit]
Description=Fruit Rush (jeu + API high scores)
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/fruitrush
ExecStart=/usr/bin/node server/index.js
Environment=NODE_ENV=production
Environment=PORT=3001
Restart=always
RestartSec=3
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

Le service tourne en `www-data` : donne-lui les droits sur le dossier de données.

```bash
sudo chown -R www-data:www-data /opt/fruitrush/server/data
sudo systemctl daemon-reload
sudo systemctl enable --now fruitrush
sudo systemctl status fruitrush   # doit être "active (running)"
```

Logs en direct : `journalctl -u fruitrush -f`

---

## 5. Reverse proxy + HTTPS automatique (Caddy)

Caddy obtient et renouvelle le certificat Let's Encrypt tout seul — config minimale.

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Édite `/etc/caddy/Caddyfile` :

```caddyfile
tondomaine.com {
    reverse_proxy localhost:3001
}
```

```bash
sudo systemctl reload caddy
```

C'est tout : Caddy ouvre 80/443, génère le certificat HTTPS, et proxifie vers
le serveur Node. Ouvre **https://tondomaine.com** 🎉

> **Pare-feu** : si `ufw` est actif, autorise le web :
> `sudo ufw allow 80,443/tcp`
> (le port 3001 reste interne, pas besoin de l'ouvrir.)

---

## 6. Mettre à jour le jeu plus tard

```bash
cd /opt/fruitrush
sudo git pull
sudo -u www-data npm ci
sudo -u www-data npm run build
sudo systemctl restart fruitrush
```

Les scores dans `server/data/scores.db` sont conservés.

---

## Alternative à Caddy : Nginx + Certbot

Si tu préfères Nginx : proxy `location / { proxy_pass http://localhost:3001; }`
sur un `server_name tondomaine.com;`, puis `sudo certbot --nginx -d tondomaine.com`
pour le HTTPS.

## Sauvegarde des scores

```bash
# Copie cohérente de la base (mode WAL) :
sudo -u www-data sqlite3 /opt/fruitrush/server/data/scores.db ".backup '/tmp/scores-backup.db'"
```
