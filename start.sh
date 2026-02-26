#!/bin/bash

# Script para iniciar la app rápidamente

echo "🚀 Iniciando Gastos Compartidos App..."
echo ""

# Verifica si está en la carpeta correcta
if [ ! -f "package.json" ]; then
    echo "❌ Error: Debes estar en la carpeta /GastosApp"
    exit 1
fi

# Verifica si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# Inicia la app
echo "✅ Iniciando servidor..."
npm start
