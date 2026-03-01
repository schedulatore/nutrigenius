#!/bin/bash
echo "🥗 NutriGenius - Build Script"
echo "=============================="

# Installa dipendenze server
echo "📦 Installazione server..."
cd server && npm install
cd ..

# Installa e builda il client
echo "📦 Installazione e build client..."
cd client && npm install && npm run build
cd ..

# Migrazione database Turso
echo "🗄️ Migrazione database..."
cd database && npm install && node migrate.js
cd ..

echo "✅ Build completata!"
