# Updater, Footer, and Startup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add GitHub Releases auto-update support, visible app version/update state, a footer credit link, and smoother startup behavior.

**Architecture:** Create a dedicated updater service in the main process and expose it to the renderer through new IPC methods alongside a compact shared app-info model. Split renderer display into small components so footer/version/update UI can be tested without pulling in the whole app.

**Tech Stack:** Electron, electron-updater, React, TypeScript, Node test runner

---

### Task 1: Add test coverage for app info rendering helpers

**Files:**
- Create: `src/shared/app-runtime.ts`
- Create: `tests/app-runtime.test.ts`
- Modify: `tsconfig.test.json`

- [ ] Add shared app runtime/update state types and a pure label helper.
- [ ] Add a focused test that proves each important updater state renders the expected label.

### Task 2: Implement updater service and IPC surface

**Files:**
- Create: `src/main/app-updater.ts`
- Modify: `src/main/index.ts`
- Modify: `src/main/ipc.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/preload/index.d.ts`
- Modify: `src/shared/app-types.ts`
- Modify: `src/renderer/src/web-mock.ts`
- Modify: `electron-builder.yml`
- Modify: `dev-app-update.yml`

- [ ] Add a main-process updater service using GitHub Releases config.
- [ ] Broadcast app info/update state changes to renderer and expose actions for check/install/open external links.
- [ ] Configure publish metadata for GitHub Releases.
- [ ] Keep dev/web mock behavior safe when the real updater is unavailable.

### Task 3: Add renderer UI for version, updater state, and footer

**Files:**
- Create: `src/renderer/src/components/app-footer.tsx`
- Modify: `src/renderer/src/App.tsx`

- [ ] Show the current version in the app shell.
- [ ] Add updater status with manual check/install affordance.
- [ ] Add the footer credit line with external Facebook open behavior.

### Task 4: Reduce startup jank

**Files:**
- Modify: `src/main/index.ts`
- Modify: `src/main/smart-rule-service.ts`

- [ ] Lazily create the tray popup window instead of loading a hidden second renderer during startup.
- [ ] Delay the first heavy smart-rule metrics poll until the app has settled.

### Task 5: Verify the change

**Files:**
- Test: `tests/app-runtime.test.ts`

- [ ] Run `cmd /c npm test` and confirm all tests pass.
- [ ] Run `cmd /c npm run typecheck` and confirm no type errors remain.
