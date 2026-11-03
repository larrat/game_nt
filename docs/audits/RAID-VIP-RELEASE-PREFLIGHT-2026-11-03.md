# Raid/VIP release preflight — 03/11/2026

## Live read-only observations
- Supabase project: `gvtbixbyqayhdwowgqrp`, shared with the publicly deployed frontend.
- Both `verified_raids_enabled` and `vip_point_respec_enabled` were **false** at audit time.
- The migration `071_verified_raid_and_vip_point_respec` is recorded, with private ledgers and server-owned transactions.
- Do not activate either feature before a second isolated Supabase staging project and two disposable authenticated accounts are available.

## Automated synthetic DB checks
The existing `.github/workflows/raid-vip-db-integration.yml` uses PostgreSQL 16 with a synthetic schema. `tests/sql/raid_economy_integrity.sql` covers disabled defaults, A/B ownership, 3-fight Raid stamina debit, no replay, transactional VIP debit and rights-review gates.
This PR adds checks that insufficient VIP credits cannot debit another stat or write a ledger row, and that private tables cannot be read directly by `authenticated`.

## Required before enabling
1. Confirm `npm test`, lint, build and synthetic SQL workflow green.
2. Run `scripts/preflight-raid-vip.sql` read-only against the target to confirm flags, grants and private ledgers.
3. Provision isolated staging, apply reviewed migrations and use `npm run qa:staging` with two disposable accounts.
4. Add positive E2E for a completed 3- and 5-fight Raid and one-point VIP respec; check actual before/after stamina, credits, XP, unique receipts and rollback for failure.
5. Validate UX desktop/mobile, publication commit and logs. Only then deliberately toggle feature flags through an independently reviewed SQL migration.

**No live flags are modified by this work.**
