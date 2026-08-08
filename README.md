# Expense Tracker ARS

Proyecto nuevo (separado de event-scheduler) para registrar gastos en pesos argentinos y enviar cierre mensual por Telegram.

## Estructura
- client: React + Vite
- server: Express + PostgreSQL

## Requisitos
- Node.js 20+
- PostgreSQL accesible por DATABASE_URL

## Configuracion backend
1. Copiar server/.env.example a server/.env
2. Completar variables:
   - PORT
   - CLIENT_ORIGIN
   - DATABASE_URL
   - TELEGRAM_BOT_TOKEN
   - TELEGRAM_CHAT_ID (uno o varios separados por coma)
   - CRON_SECRET

## Ejecutar backend
```bash
cd server
npm install
npm run dev
```

## Ejecutar frontend
```bash
cd client
npm install
npm run dev
```

## Endpoint cierre mensual
- URL: POST /api/monthly-report
- Header requerido: x-cron-secret: <CRON_SECRET>
- Comportamiento: calcula mes anterior en America/Argentina/Buenos_Aires, arma total general y total por persona, y envia Telegram.

## Comportamiento mensual de la app
- Los gastos NO se borran al iniciar un nuevo mes.
- La app mantiene historico completo en `expenses`.
- La vista por defecto muestra solo el mes actual (por eso puede arrancar en cero al cambiar de mes).
- Desde el selector de mes (`YYYY-MM`) se puede consultar cualquier mes anterior.
- Los totales en pantalla (general y por persona) corresponden siempre al mes seleccionado.

## Endpoints de consulta mensual
- `GET /api/expenses`
   - Sin query: devuelve gastos del mes actual.
   - Con query: `GET /api/expenses?month=YYYY-MM` devuelve gastos del mes indicado.
- `GET /api/expenses/summary`
   - Sin query: resumen del mes actual.
   - Con query: `GET /api/expenses/summary?month=YYYY-MM` devuelve total general y total por persona de ese mes.

## Programacion mensual
La ejecucion mensual se resuelve con GitHub Actions (ver seccion de workflow mas abajo),
no con un cron externo manual.

## Deploy (Render + Netlify)

### 1) Backend en Render
1. Crear un nuevo Web Service apuntando a este repo/carpeta.
2. Configurar:
    - Root Directory: `server`
    - Build Command: `npm install`
    - Start Command: `npm start`
3. Configurar variables en Render:
    - `DATABASE_URL`
    - `TELEGRAM_BOT_TOKEN`
    - `TELEGRAM_CHAT_ID`
    - `CRON_SECRET`
    - `CLIENT_ORIGIN` (URL publica de Netlify)
    - `PORT` (opcional, Render lo inyecta)
4. Verificar: `GET /api/health` debe responder `{ ok: true }`.

### 2) Frontend en Netlify
1. Crear un nuevo sitio desde el repo.
2. Configurar:
    - Base directory: `client`
    - Build command: `npm run build`
    - Publish directory: `client/dist`
3. Variable de entorno en Netlify:
    - `VITE_API_URL=https://TU-BACKEND-RENDER.onrender.com/api`
4. Deploy y validacion:
    - Confirmar alta/listado/edicion/borrado de gastos desde la UI.

### 3) Workflow mensual (igual al proyecto anterior)
Este proyecto usa el mismo patron del otro repo: GitHub Actions dispara el endpoint mensual protegido por secret.

Crear archivo `.github/workflows/monthly-expense-report.yml` con este contenido:

```yaml
name: Monthly Expense Report

on:
   schedule:
      - cron: '7 3 1 * *'   # 03:07 UTC = 00:07 Argentina, dia 1
   workflow_dispatch:

jobs:
   send-monthly-report:
      runs-on: ubuntu-latest
      timeout-minutes: 15

      steps:
         - name: Wake up Render
            run: |
               echo "Despertando servidor..."
               curl --silent --max-time 60 --retry 3 --retry-delay 10 \
                  "${{ secrets.RENDER_APP_URL }}/api/health" || true
               echo "Servidor despertado"

         - name: Wait 5 minutes
            run: sleep 300

         - name: Send monthly report
            run: |
               curl --fail --max-time 60 --retry 2 --retry-delay 10 \
                  -X POST \
                  -H "x-cron-secret: ${{ secrets.CRON_SECRET }}" \
                  "${{ secrets.RENDER_APP_URL }}/api/monthly-report"
```

### 4) Secrets de GitHub necesarios
En Settings > Secrets and variables > Actions:
- `RENDER_APP_URL` (ejemplo: `https://tu-backend.onrender.com`)
- `CRON_SECRET` (mismo valor que en Render)

### 5) Prueba manual del workflow
1. Ir a Actions > Monthly Expense Report.
2. Ejecutar `Run workflow`.
3. Verificar:
    - Respuesta exitosa del paso `Send monthly report`.
    - Mensaje recibido en Telegram con total general y total por persona.
