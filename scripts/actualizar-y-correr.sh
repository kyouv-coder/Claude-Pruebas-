#!/usr/bin/env bash
# Trae lo último de la rama de trabajo, instala dependencias, aplica
# migraciones pendientes, regenera el cliente de Prisma, corta cualquier
# servidor de desarrollo viejo que haya quedado colgado en el puerto 3000,
# y levanta el servidor. Un solo comando para no tener que acordarse de
# los pasos sueltos cada vez.
set -euo pipefail

cd "$(dirname "$0")/.."

BRANCH="claude/trabajo-eficiente-8suz5i"

echo "==> Trayendo lo último de $BRANCH"
git pull origin "$BRANCH"

echo "==> Instalando dependencias"
npm install

echo "==> Aplicando migraciones pendientes"
npx prisma migrate deploy

echo "==> Regenerando el cliente de Prisma"
npx prisma generate

echo "==> Cortando cualquier servidor de desarrollo viejo que haya quedado corriendo"
pkill -f "next dev" 2>/dev/null || true
sleep 1

echo "==> Levantando el servidor"
npm run dev
