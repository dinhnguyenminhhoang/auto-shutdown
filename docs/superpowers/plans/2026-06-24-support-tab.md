# Support Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated support tab to the Electron app menu with bundled QR and copyable bank transfer details.

**Architecture:** Extract the support screen into a focused renderer component so it can be rendered independently in tests and reused cleanly from `App.tsx`. Keep support data in a small shared module and wire copy interactions in `App.tsx`.

**Tech Stack:** Electron, React, TypeScript, Node test runner, React server rendering

---

### Task 1: Prepare support component test path

**Files:**
- Modify: `tsconfig.test.json`
- Create: `tests/support-tab-content.test.ts`

- [ ] Include the renderer support component in the test TypeScript compilation.
- [ ] Add a static render test that checks support message, bank name, account number, account holder, and copy actions.

### Task 2: Implement support UI

**Files:**
- Create: `src/shared/support-info.ts`
- Create: `src/renderer/src/components/support-tab-content.tsx`
- Modify: `src/renderer/src/App.tsx`
- Create: `src/renderer/src/assets/support-qr.png`

- [ ] Add a shared source of truth for support text and bank details.
- [ ] Build a dedicated support tab component with QR image and labeled fields.
- [ ] Add copy handlers and temporary copied-state feedback in `App.tsx`.
- [ ] Add the new `Ung ho` tab to the header label, menu, and main content switch.

### Task 3: Verify the change

**Files:**
- Test: `tests/support-tab-content.test.ts`

- [ ] Run `cmd /c npm test` and confirm all tests pass.
- [ ] Run `cmd /c npm run typecheck` and confirm no type errors remain.
