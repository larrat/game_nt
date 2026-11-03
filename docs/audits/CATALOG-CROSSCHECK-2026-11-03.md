# Catalog audit — GAME_NT × open-source references (03/11/2026)

## Verified baseline (read-only connected database)
- 188 canonical characters, 222 avatar rows, 57 playable jutsu records, 15 NPCs.
- 15/15 NPCs have a valid, matching canonical character name and ID.
- 0 orphan avatars, 0 orphan NPCs, 0 invalid jutsu costs, 0 characters without a base avatar.
- 184/188 canonical characters still use external base-avatar URLs.
- The separate observed reference dataset has 184 character definitions, 191 variants, and only **3** local reference files recorded. Reference files are not approved assets.

## New checks
```bash
node scripts/validate-reference-catalog.mjs
npm test
```
The reference checker audits identity consistency, duplicate assets, base/variant correspondence and source location **without publishing files**. The operator may run `scripts/audit-playable-catalog.sql` in the SQL editor; it executes `BEGIN READ ONLY` and returns aggregated counts, not player data.

## Safe content expansion steps
1. Deduplicate reference-only techniques and identify canonical stable IDs, source, name, class, element, clan, rank, attribute gates, learning costs, chakra cost, cooldown, effects and variants.
2. Document and review the rights/provenance separately from mechanical balancing.
3. Validate constraints offline using fixtures; create a forward-only migration for the approved gameplay subset.
4. Verify RPC-level authorization, costs and XP/reward behavior in a separate staging project and with two disposable accounts.
5. Enable content progressively after QA, with rollback plan. Never import 719 reference jutsus as immediately learnable actions.
