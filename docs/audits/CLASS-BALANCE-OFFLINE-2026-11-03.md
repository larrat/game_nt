# Offline class balance diagnostics — 03/11/2026

## Purpose
Use the existing UI engine-derived stats to compare the four 10-point classes under reproducible 1v1 conditions. Inspired by the independent simulators in Shinobi Way and Shinobi Auto-Battler; all code here is original.

### Run
```bash
node scripts/run-class-balance.mjs
node scripts/run-class-balance.mjs --samples=500 --level=10 --json
npm test
```

The output is explicitly labelled `OFFLINE_APPROXIMATION_NOT_SERVER_COMBAT`. It compares 4×4 pairs with a seeded neutral proxy duel model (strongest attack channel, mitigated defense, RNG dodge/critical/variance and alternating turns). The actual SQL combat protocol may use **different timing, elemental bonuses, status effects, cooldowns and NPC stats**.

### What it is and isn't
- **Yes:** quick regression signal when starting class budgets or UI-derived stats change; candidate matchup imbalance alerts; deterministic reproducibility; no cost or network.
- **No:** proof that classes are balanced in real PvE/PvP; damage authority; a source of loot/XP/ryous; a substitute for server integration.
- **Never:** connect this module to gameplay reward or client-side victory decisions.

### Acceptance before gameplay changes
1. Confirm SQL function parity with the client-derived stat data using fixed fixtures.
2. Add an isolated-server combat scenario runner using seeded data, server-authorized character sessions and a separate staging project.
3. Compare win-rate distributions by class, level, enemy and element; keep result receipts.
4. Review significant deltas before touching live formulas, inventory or XP.
