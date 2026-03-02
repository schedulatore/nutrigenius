# NutriGenius v2

## Novita v2
- Profilo completamente modificabile (peso, altezza, obiettivo, budget, ecc)
- Alimenti custom (crea i tuoi alimenti con nome, kcal, proteine, carbs, grassi)
- Diario editabile (modifica/elimina ogni voce inserita)
- Spesa: aggiungi/modifica/elimina articoli manualmente
- Chef AI: link a ricette reali su Giallozafferano, Cucchiaio d'Argento, Fattoincasa
- Coach AI: risposte piu ricche con link e consigli personalizzati
- 10 sfide con categorie e tracking progressi
- 7 badge sbloccabili
- Fix freeze popup (rimosso autoFocus problematico)
- Light mode: contrasti corretti, testo leggibile
- Dark/Light toggle visibile su mobile (nella sidebar)
- Toast notifications per feedback visivo
- Selezione porzione quando aggiungi un alimento
- Design premium con animazioni e micro-interazioni

## Deploy (tutto da browser)

### 1. Turso (turso.tech)
- Registrati → Create Database → nome: nutrigenius
- Copia Database URL e Auth Token

### 2. GitHub
- Sostituisci i file nel repo con quelli nuovi
- Commit e push

### 3. Render (render.com)
- Il deploy parte automaticamente dal push
- Verifica env vars: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN

### Migrazione DB
La migrazione v2 aggiunge le nuove colonne/tabelle automaticamente senza perdere dati.
