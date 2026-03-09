Now I have the full context of all three files. Let me produce the review as specified.

---

### Score: 7/10
Solid plan with sound rationale, but contains a math error in the risk section, underspecifies the anonymization scope, and misses several file-level update points that will cause implementation rework.

### Critical Issues

**1. Math error in risk section (plan line 163): "Going from 90→103" should be "96→103"**

The plan's own Changes section correctly states "Total: 96 → 103" (line 94), but the Risks section says "90→103 in one session (via two changes)." If the intent is to count the cumulative v2→v4 delta (90→96→103 across both the recently committed v3 and this proposed v4), that should be stated explicitly: "Going from 90→103 across v3+v4 in one session." The "via two changes" phrasing implies only the v4 delta, which is 7 points from 96, not 13 from 90. Either correct the number or clarify the scope.

**Fix:** Change to "Going from 96→103 (v3→v4)" or "Going from 90→103 across v2→v4 in one session (via four total new items across v3 and v4)."

**2. No mention of updating the rubric version header and preamble**

`scoring-rubric.md:1` currently reads `# CLAUDE.md Scoring Rubric (v3)` and line 3 describes v3-specific additions ("Adds section coherence and agent compliance phrasing checks"). Step 1 ("add 2 items, update category totals, scale tiers, add signals/flags") omits updating:
- The `(v3)` → `(v4)` in the title
- The preamble text describing what changed

If the implementer follows the plan literally, the file will claim to be v3 while containing v4 content. This will confuse any future auditor or contributor reading the version history.

**Fix:** Add to step 1: "Update version header to v4 and revise preamble to describe the new items."

### Major Issues

**3. Potential scoring overlap between "Quality gates workflow" (4pts) and "Bug fix process" (5pts)**

Both involve ordered step sequences. A file with a quality gates workflow that includes a testing step could score partial credit on both items for the same content. The plan defines quality gates as "plan→implement→test→review→simplify→ship" — the "test" step overlaps conceptually with the TDD-based bug fix process.

The rubric text in the plan table helps ("Canonical step sequence from implementation through review/validation to commit" vs "TDD-based steps: write failing test → verify fail → fix → verify pass"), but the distinction should be made sharper. Consider adding explicit exclusion language: "Quality gates scores the overall development workflow lifecycle, not the TDD cycle within a single fix."

**Fix:** Add a disambiguation note to the Quality gates "What to Look For" column: "Scores the overarching development lifecycle, not the TDD fix cycle (scored separately under Bug fix process)."

**4. Elite example header and description not called out for updating**

`elite-example.md:1-3` currently reads: "This is a reference example of a high-scoring CLAUDE.md (88/96)." Since step 2 is a "full rewrite," this would presumably be replaced, but the plan doesn't specify what the new header should say. The annotated scoring section ("What Makes This Elite") also needs completely new structure to cover 103 points across all categories including the two new items. The plan says "Per-check scoring matching rubric exactly" but doesn't enumerate how the annotation will map to the expanded categories — particularly how the two new items (quality gates and code-vs-prompt) will be annotated.

**Fix:** Add to step 2: "Update header to reflect new score and v4 total. Rewrite 'What Makes This Elite' annotation section with per-check breakdown against all v4 categories."

### Minor Issues

**5. Anonymization rules don't address team/person names or URLs**

The rules cover project name, specific tools (Beads, Prisma, Sentry, Inngest), and paths. Production CLAUDE.md files often contain team-specific URLs (internal docs, Slack channels, CI dashboards), team member names in examples, or company-specific domain references. The plan should include a catch-all rule: "Remove or genericize any URLs, team names, or company-specific references not already covered."

**6. "CLI task tracker" generalization may lose instructive value**

The plan says to generalize Beads to "CLI task tracker" with commands like `task ready`, `task close`. This is fine structurally, but the original likely has a CRITICAL warning about task state management (the plan mentions the task management section is "(CRITICAL)"). Ensure the generalization preserves the urgency pattern — the CRITICAL marker and the specific footgun it warns about — not just the commands.

**7. Tier threshold rounding is correct but should be documented**

The plan shows scaled thresholds and notes "~1.073x". Good. The actual rounding choices (e.g., 21×1.073=22.53→23, 43×1.073=46.14→46) should be briefly documented in the rubric as a comment so future maintainers understand why the numbers are what they are.

**8. "Positive signals" and "Red flags" additions are incomplete**

The plan adds two positive signals and one red flag. Consider also adding:
- **Positive signal:** Explicit enforcement mechanism labels (e.g., "enforced by CI", "enforced by pre-commit hook")
- **Red flag:** Quality gates defined but not connected to specific tools or commands (ceremony without substance)

### Missing

- **No rollback plan.** If the v4 rubric or new elite example causes scoring issues in production audits, how do you revert? The implementation order should note that the commit should be atomic (all 3 files in one commit) so a single `git revert` undoes everything.

- **No validation against a second production file.** The plan validates the new rubric only against the source file (which scores ~99/103). Scoring a second, different production CLAUDE.md against v4 would verify the new items don't inadvertently penalize good files that lack these patterns. The plan should add a step: "Score the current elite example (placeholder) against v4 to verify backward-compatible scoring."

- **No discussion of the SKILL.md Phase 5 "Compare to reference" option.** When the elite example is rewritten, the comparison flow in Phase 5 step 3 (`read references/elite-example.md`) still works, but the user-facing description of what they'll see changes significantly. Should the offer text be updated?

- **The rubric's "Research Basis" section (lines 118-129) may need a note** acknowledging that quality gates and code-vs-prompt separation aren't directly from the ETH Zurich study but from production observation. Currently the rubric implies all items are research-informed.

### Questions

1. **Was v3 already deployed to production audits?** If audits exist with v3 scores, changing to v4 means those scores aren't directly comparable. Is there a versioning strategy for audit reports (e.g., "scored against rubric v3")?

2. **What's the source file's actual line count?** The current elite example is ~150 lines and scores 19/19 on Architecture (under 200 lines). If the production source is longer, anonymization might push it over the conciseness threshold, creating an ironic situation where the elite example loses points on the rubric it's meant to exemplify.

3. **Is the `(distil/IDI)` reference in the plan scope intentional?** If the plan itself is stored in the repo (it appears to be at `agents/counselors/1773040944000-audit-rubric-v4-elite-rewr/prompt.md`), this leaks the source project identity. Should the plan be cleaned or excluded from the repo?

`★ Insight ─────────────────────────────────────`
**Rubric design principle at play:** When an example has "gravitational pull" on agent behavior beyond what the rubric formally scores, you have two options — remove the example patterns or add rubric items. This plan correctly identifies that removing patterns degrades the example's instructive value, so adding rubric items is the right call. This is a common pattern in any scoring system: the reference implementation implicitly defines the standard, so the formal rubric must match or the reference becomes a shadow rubric.

**Anonymization tension:** The more you anonymize, the less instructive the example becomes. The plan navigates this well by keeping non-identifying tools (Sentry, Inngest) while genericizing project-specific ones (Beads). The key test: could someone reconstruct the source project from the anonymized example? If yes, anonymization failed. If the example feels too generic to be useful, it's over-anonymized.
`─────────────────────────────────────────────────`
