#!/bin/bash
echo "🥗 NutriGenius - Build"
echo "======================"

echo "📦 Server..."
cd server && npm install && cd ..

echo "📦 Client..."
cd client && npm install && npm run build && cd ..

echo "🗄️ Database..."
cd database && npm install && node migrate.js && cd ..

echo "✅ Done!"
