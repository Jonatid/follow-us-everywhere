# Operational Runbook

This runbook captures low-priority operational procedures that should be owned by the deployment/operator team rather than redesigned in the application.

## Admin 2FA recovery/reset

Implemented in code as an operator-only script:

```bash
cd backend
ADMIN_EMAIL=admin@example.com npm run reset:admin-2fa
# or: npm run reset:admin-2fa -- admin@example.com
```

What it does:

- Clears the admin's encrypted TOTP secret, enrollment timestamp, last verified TOTP step, and hashed backup codes.
- Sets `totp_enabled` to `FALSE`, which forces normal 2FA enrollment after the next successful password login.
- Increments `token_version`, invalidating existing admin JWTs.

Operational controls:

- Run only after out-of-band identity verification of the admin requesting recovery.
- Record the requester, approver, command time, and affected admin email in the incident/change log.
- Prefer rotating the admin password first if account compromise is suspected.
- Monitor logs for the next admin login and 2FA enrollment completion.

## QR analytics retention and cleanup

Implemented in code as a scheduled cleanup script:

```bash
cd backend
QR_ANALYTICS_RETENTION_DAYS=180 npm run cleanup:qr-analytics
```

Default retention is 180 days when `QR_ANALYTICS_RETENTION_DAYS` is unset or invalid. Schedule this command daily during low-traffic hours. The script deletes `qr_scans` rows whose `scanned_at` timestamp is older than the retention window.

Recommended monitoring:

- Alert if cleanup fails or deletes an unexpectedly large row count.
- Track `qr_scans` table size, index bloat, and slow analytics queries.
- Review retention length with privacy/business stakeholders before lowering or extending it.

## Database backup strategy

Documented operationally; no backup automation is embedded in this repository.

Recommended baseline:

- Use managed PostgreSQL automated backups with point-in-time recovery enabled for production.
- Keep at least 7 daily backups and 4 weekly backups, or match the organization's recovery policy if stricter.
- Encrypt backups at rest and restrict restore permissions to production operators.
- Test a restore into a non-production environment at least quarterly.
- Capture recovery objectives: target RPO of 24 hours or better and target RTO of 4 hours or better unless the business sets stricter targets.

Recommended monitoring:

- Alert on failed scheduled backups, disabled PITR, storage capacity pressure, and replication lag if replicas are used.
- Log and review all manual backup exports and restore operations.

## Object-storage backup strategy

Documented operationally. Business documents and logos may be stored in Cloudflare R2/S3-compatible storage when configured, or on local disk as a fallback/local mode.

Recommended baseline for object storage:

- Enable bucket versioning or provider-equivalent object retention where available.
- Replicate production buckets to a separate bucket/account/region when the storage provider supports it.
- Apply lifecycle rules that preserve deleted/replaced objects long enough to recover operational mistakes.
- Periodically reconcile database `storage_path` records against bucket object listings.

Recommended baseline for local uploads:

- Avoid local-only uploads on ephemeral or autoscaled hosts.
- If local disk is used, mount durable storage and include `backend/uploads` in filesystem snapshots.
- Test restoring both the database row and corresponding file/object together.

Recommended monitoring:

- Alert on object upload/delete failures, bucket replication failures, unusual delete volume, and backup snapshot failures.
- Track orphaned database rows and orphaned bucket objects during reconciliation.

## PostgreSQL connection pool tuning

Implemented in code through explicit `pg.Pool` configuration for both `DATABASE_URL` and discrete `DB_*` connection modes.

Environment variables:

| Variable | Default | Purpose |
| --- | ---: | --- |
| `PG_POOL_MAX` | `20` | Maximum open clients per backend process. |
| `PG_POOL_MIN` | `0` | Minimum clients retained by the pool. |
| `PG_IDLE_TIMEOUT_MS` | `30000` | Time before idle clients are closed. |
| `PG_CONNECTION_TIMEOUT_MS` | `2000` | Time to wait for a new connection before failing. |
| `PG_MAX_USES` | `7500` | Number of uses before a client is recycled. |
| `PG_ALLOW_EXIT_ON_IDLE` | `false` | Allows Node to exit while clients are idle, mainly for scripts/tests. |

Tuning guidance:

- Size `PG_POOL_MAX` as: floor((database max connections - reserved admin/maintenance connections) / maximum concurrently running backend instances).
- Keep script/worker processes in that calculation because they create their own pools.
- Lower `PG_POOL_MAX` before scaling horizontally to avoid exhausting database connections.
- Monitor active connections, waiting queries, pool timeout errors, and database CPU/IO saturation.
