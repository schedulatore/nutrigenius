# 🥗 NutriGenius

Piattaforma web per gestione dieta, spesa e nutrizione.

**Stack:** React + Vite | Express.js | Turso (SQLite cloud) | JWT Auth

---

## 🚀 Deploy Online (tutto da browser!)

### Passo 1: Crea Database Turso
1. Vai su **https://turso.tech** → registrati con GitHub
2. Dalla dashboard Turso, clicca **"Create Database"**
3. Nome: `nutrigenius` → Regione: più vicina a te → **Create**
4. Clicca sul database creato → vai su **"Settings"** o **"Connect"**
5. Copia il **Database URL** (tipo `libsql://nutrigenius-tuonome.turso.io`)
6. Clicca **"Generate Token"** → copia il **Auth Token**

### Passo 2: Carica su GitHub
1. Vai su **https://github.com** → login
2. Clicca **"+"** in alto a destra → **"New repository"**
3. Nome: `nutrigenius` → **Create repository**
4. Dalla pagina del repo, clicca **"uploading an existing file"**
5. **Trascina TUTTI i file e cartelle** dallo zip decompresso
6. Clicca **"Commit changes"**

### Passo 3: Deploy su Render
1. Vai su **https://render.com** → registrati con GitHub
2. Clicca **"New"** → **"Web Service"**
3. Connetti il repository `nutrigenius`
4. Render legge il file `render.yaml` automaticamente
5. Vai su **"Environment"** e aggiungi:

| Variabile | Valore |
|-----------|--------|
| `TURSO_DATABASE_URL` | Il URL copiato da Turso (passo 1) |
| `TURSO_AUTH_TOKEN` | Il token copiato da Turso (passo 1) |

(JWT_SECRET e NODE_ENV vengono generati automaticamente dal render.yaml)

6. Clicca **"Create Web Service"**
7. Aspetta 3-5 minuti → il tuo sito sarà su `https://nutrigenius.onrender.com`

### Fatto! 🎉

---

## ✨ Funzionalità

- 🔐 Registrazione e login con JWT
- 🥗 Piano dieta personalizzato (BMR/TDEE/macro)
- 📔 Diario alimentare con tracking
- 🛒 Lista spesa automatica con budget
- 👨‍🍳 Chef AI (ricette dagli ingredienti)
- 🧠 Coach virtuale
- 🏆 Gamification (XP, badge, streak)
- 🌙 Dark/Light mode
- 📱 Mobile responsive
