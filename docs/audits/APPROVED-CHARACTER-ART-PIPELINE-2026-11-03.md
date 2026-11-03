# Approved character artwork pipeline — 03/11/2026

## Purpose
Local, reproducible processing of **explicitly authorized** character portraits. Reference media and remote URLs are never auto-published. This complements, but does not replace, the pending PR #117 that contains three individually verified local copies.

### Inventory and limits
- 188 characters are currently in the SQL catalog; 184 base portrait URLs were external at audit time.
- The reference dataset is `data/reference/initial-characters.json`, **not** an approval manifest.
- The publication manifest `data/approved-character-art.json` intentionally starts with **zero** approved entries.
- This tool does not synthesize missing source detail or claim that CSS upscaling is genuine HD.

### Workflow
1. Confirm a source file is authorized for redistribution and transformation, including public GitHub/Vercel use. Store proof outside the public repo or refer to a non-sensitive internal docket.
2. Put an authorized file in `assets/approved-character-art/` (no files are automatically imported there).
3. Add an entry with `characterId` from the canonical catalog, a stable `variantId`, a `sourcePath`, `approved: true`, `rightsBasis`, and `rightsEvidence`.
4. Run `node scripts/prepare-character-art.mjs` to validate and dry-run. Any missing source or resolution under 512px on the shorter side fails.
5. After review, run `ART_PUBLICATION_APPROVED=YES_ART_PUBLICATION_APPROVED node scripts/prepare-character-art.mjs --write`; this creates WebP at most 1024px wide/high, **without enlargement**, under `public/images/characters/`.
6. Only after preview QA, separately map the generated public URL to its correct character/variant. No automatic SQL updates or remote uploads are performed.

### Guarantees
- Unknown character IDs, unsafe paths, duplicate outputs, missing approval metadata, missing files and small sources are rejected.
- No network calls, database writes, catalog mutation or publishing in default mode.
- Every output name is deterministic. No guessing via filename similarities.
- Tests: `tests/characterArtPipeline.test.js`; CI: `npm test`, lint, build.

### Remaining work
The 181 external portraits not matched in PR #117 require individually verified local sources. UX review must check 320/390/768/1440px. Actual publication requires rights evidence and tests in preview; this helper alone does not complete the art backlog.
