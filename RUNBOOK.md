# Project Lumina: Operational Runbook

This runbook defines the protocols for managing, securing, and recovering Lumina’s High-Stakes academic platform in production.

---

## 📅 Platform Overview
- **Deployment Ingress**: Google Cloud Run (Region: `asia-southeast1`)
- **Backend Infrastructure**: Express + Node.js (Bundled into CommonJS `dist/server.cjs` via esbuild)
- **Frontend Architecture**: React (Vite-compiled Single Page App inside `/dist`)
- **Main Persistent Stores**: Supercharged PostgreSQL (Supabase / Neon Pooled via PgBouncer) + Firebase Firestore
- **Authentication Engine**: Clerk Identity Providers + Firebase Authentication

---

## 🔄 1. Rollback Playbook (Recovery Time Objective: < 2 Mins)

When a critical bug or regression escapes validation gates and impacts live students:

### Step 1: Rollback via Google Cloud Run (Recommended)
1. Navigate to the Google Cloud Console -> **Cloud Run**.
2. Select the `lumina-prod` service.
3. Choose the **Revisions** tab.
4. Locate the previously stable revision (e.g., `lumina-prod-00042` which had 100% healthy signals).
5. Click **Manage Traffic** and direct 100% of ingress connections to that previous revision. This instantly diverts traffic without rebuilding docker layers.

### Step 2: Automated CLI Rollback
If you have gcloud SDK configured locally:
```bash
# Locate previous revision IDs
gcloud run revisions list --service=lumina-prod --region=asia-southeast1

# Route all traffic back to the safe revision instantly
gcloud run services update-traffic lumina-prod \
  --to-revisions=LUMINA_SAFE_REVISION_ID=100 \
  --region=asia-southeast1
```

### Step 3: Git-Based Code Revert
1. Localize the offending commit and push a hotfix revert to the deployment branch:
   ```bash
   git revert HEAD -m "Revert 'Feat: Add unstable high stakes reward audit'"
   git push origin main
   ```
2. The GitHub Action Pipeline will automatically run Linters, Type check, assemble the bundle, and release a fresh hotfix revision.

---

## 🔑 2. Secrets & Credentials Rotation Protocol

In the event of key exposure, compromise, or standard quarterly audits:

### Database Credentials Audit (Postgres)
1. Go to your database manager (Supabase / Neon Sandbox).
2. Generate a new database password.
3. Fetch the new pooled connections token `DATABASE_URL` and direct connection token `DIRECT_URL`.
4. Go to **Google Cloud Console -> Secret Manager** (or Cloud Run environment configs) and update:
   - `DATABASE_URL` (with pooled query suffix: `?pgbouncer=true&connection_limit=5`)
   - `DIRECT_URL` (direct connection string to Neon)
5. Redeploy or restart the Cloud Run container to recycle connections.

### Clerk Identity Credentials Rotation
1. Log into **Clerk Dashboard -> API Keys**.
2. Click **Rotate Secret Key**.
3. Copy the fresh secret key string.
4. Update Google Secret Manager or Cloud Run configurations under `CLERK_SECRET_KEY`.
5. Simultaneously, update client-side publishable variables under `VITE_CLERK_PUBLISHABLE_KEY` in Cloud Run environment parameters. On next refresh, client apps will swap keys seamlessly.

### Sentry Error Monitoring Rotation
1. Log into Sentry Dashboard -> Settings -> Project Keys (DSN).
2. Click **Revoke** on the old key and **Create New Key**.
3. Update `VITE_SENTRY_DSN` in the production environment settings.
4. The lazy-loaded monitoring core inside `/src/lib/errorMonitor.ts` will pick up the new endpoint without code changes.

---

## 🚨 3. Incident Management & Defibrimport Guidelines

### Incident A: "Postgres Connection Limits Exhausted / Neon Degraded"
* **Symptoms**: UI displays "Health probe degraded", backend API logs show `PrismaClientInitializationError: Connection pool limit reached`.
* **Action Policy**:
  1. Verify the `DATABASE_URL` connection strings in Cloud Run environment parameters. Ensure `?pgbouncer=true` and `connection_limit=5` (or a customized budget) is appended.
  2. Kill idle connections via SQL Editor:
     ```sql
     SELECT pg_terminate_backend(pid) 
     FROM pg_stat_activity 
     WHERE state = 'idle' AND pid <> pg_backend_pid();
     ```
  3. Temporarily scale down idle Cloud Run instances to free up Postgres connections:
     ```bash
     gcloud run services update lumina-prod --max-instances=5 --region=asia-southeast1
     ```

### Incident B: "The Penalty Sweeper Has Failed"
* **Symptoms**: Cron system fails, student penalty sweeper logs "Firebase missing permissions token".
* **Action Policy**:
  1. Access the custom administration manager under `/admin?tab=overview` or `/admin?tab=settings`.
  2. Run the manual "Sweep Missed Deadlines" trigger to initiate retroactive currency reductions.
  3. Validate that standard Firestore Rules allow write authorizations for Admin UIDs.

### Incident C: "AI Oracle API Quotas Exhausted"
* **Symptoms**: AI Score grading fails, returns error code `429 (Too many requests)`.
* **Action Policy**:
  1. Check the Gemini billing credentials inside GCP console.
  2. If the API key is rate-limited, configure a secondary `GEMINI_API_KEY` backup token in Secrets Manager.
  3. Note: The server-side routes (/api/ai) handle rate limits safely via a standard 100 requests/15-min limiter to manage excess traffic.

---

## 🧪 4. Post-Deployment Verification Check (Smoketest)

Immediately after any production release, complete this manual checklist:

1. **Verify Sandbox Heartbeat**:
   - Query the Health API: `https://[prod-domain]/api/health`
   - Confirm payload matches:
     ```json
     {
       "status": "healthy",
       "database": "connected"
     }
     ```
2. **Confirm Authentication Lifecycle**:
   - Access the platform and trigger a test sign-out followed by a login.
3. **Audit Ledger Logs**:
   - Perform a mock conversion under the `/wallet` tab to verify transactions are written to the database successfully.
