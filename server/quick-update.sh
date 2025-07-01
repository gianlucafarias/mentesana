#!/bin/bash

echo "⚡ Actualización rápida..."

# Obtener cambios y reiniciar
git pull origin develop && pm2 restart mentesana-server

echo "✅ Listo!"
pm2 status mentesana-server 