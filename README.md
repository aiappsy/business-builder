
# Business Builder MVP

A full-stack monorepo for building businesses using a multi-agent AI pipeline.

## Structure
- `/api/server`: Node.js Express API (Google Cloud Run ready)
- `/app/web`: React + Vite Frontend
- `/app/desktop-tauri`: Tauri Desktop wrapper
- `/app/mobile-capacitor`: Capacitor Mobile wrapper

## Setup
1. **Prerequisites**: Node.js 18+, Google Cloud Project with Firestore & Cloud Storage enabled.
2. **Environment**: Create `.env` in `/api/server`:
   ```env
   GEMINI_API_KEY=your_key
   GCP_PROJECT_ID=your_project_id
   PORT=8080
   ```
3. **Install**: Run `npm run install:all` in the root.
4. **Dev**: `npm run dev` from root.

## Deployment
### Cloud Run
1. `cd api/server`
2. `gcloud builds submit --tag gcr.io/PROJECT_ID/business-builder-api`
3. `gcloud run deploy business-builder-api --image gcr.io/PROJECT_ID/business-builder-api --platform managed --set-env-vars="GEMINI_API_KEY=...,GCP_PROJECT_ID=..."`

### Tauri (Desktop)
1. `npm run tauri:build`

### Capacitor (Mobile)
1. `npm run build:app`
2. `npm run cap:sync`
3. `npm run cap:open:android`
