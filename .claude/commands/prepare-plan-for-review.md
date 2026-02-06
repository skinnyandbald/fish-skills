---
name: prepare-plan-for-review
description: Generate a copyable multi-model peer review prompt with plan file path filled in
argument-hint: "[path/to/plan.md]"
---

# Generate Plan Peer Review Prompt

## Resolve the plan file

If `$ARGUMENTS` contains a file path (or multiple), resolve each to its **absolute path** using the filesystem. If no argument was provided, ask which plan file(s) to review.

Verify the file(s) exist. If a path is relative, resolve it to absolute.

## Output

Output the following prompt template as a single fenced code block (triple backticks) with the `<FILE PATH TO PLAN>` placeholder replaced by the actual absolute path(s). If multiple plan files were provided, list them all in the Plan section.

The user will copy this prompt and paste it into Cursor's multi-model agent flow. Make sure the code block is complete and self-contained.

```
You are an AI development consultant specializing in Test-Driven Development implementation for T3 Stack applications. Conduct a comprehensive end-to-end TDD implementation analysis of this proposed plan:

**ANALYSIS SCOPE:**
- Backend: tRPC procedures, Prisma database operations, Auth.js authentication flows
- Frontend: React Server Components, Client Components, form validation with Zod
- Integration: End-to-end type safety, API contract validation

**REQUIRED DELIVERABLES:**
1. **Test Coverage Assessment** (30-40% of analysis):
   - Unit tests: tRPC procedures, utility functions, validation schemas
   - Integration tests: Database operations with Prisma, auth flows
   - E2E tests: Complete user journeys using Playwright/Cypress
   - Coverage gaps with specific file/function references

2. **TDD Cycle Compliance Review** (25-30% of analysis):
   - Red phase: Failing tests written first with clear assertions
   - Green phase: Minimal code to pass tests
   - Refactor phase: Code improvement while maintaining test pass
   - Evidence of proper cycle adherence per feature

3. **T3 Stack Best Practices Validation** (25-30% of analysis):
   - TypeScript strict mode compliance (no 'any' types)
   - Server Component usage prioritized over Client Components
   - tRPC end-to-end type safety implementation
   - Zod schema validation in both client and server
   - Prisma schema and migration best practices

4. **Actionable Recommendations** (15-20% of analysis):
   - Specific code examples for missing tests
   - Implementation steps for TDD cycle improvements
   - Technology-specific optimization suggestions

**ANALYSIS FORMAT:**
- Use TypeScript code examples with T3 Stack patterns
- Reference specific files: `src/server/api/routers/*.ts`, `src/app/*/page.tsx`
- Include test file examples: `__tests__/*`, `*.test.ts`
- Provide before/after code comparisons where applicable
- DO NOT test the actual implemented codebase, you're purely giving feedback on the proposed plan

Plan: <FILE PATH TO PLAN>

**SUCCESS CRITERIA:**
- 90%+ test coverage on critical paths
- Complete Red-Green-Refactor cycle evidence
- Zero TypeScript 'any' types in production code
- End-to-end type safety from database to UI
```

After outputting the code block, tell the user it's ready to copy into Cursor.
