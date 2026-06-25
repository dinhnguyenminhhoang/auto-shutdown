# Auto Shutdown VN Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Next.js website inside `website/` that markets the Electron app and provides a clean Windows download experience.

**Architecture:** Use a multi-page App Router structure with server-rendered release data, reusable page sections, static screenshot assets, and SEO metadata from file conventions and page exports.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4, GitHub Releases API.

---

### Task 1: Prepare the website workspace

**Files:**
- Modify: `website/package.json`
- Modify: `website/src/app/layout.tsx`
- Modify: `website/src/app/globals.css`
- Create: `website/public/screenshots/*`
- Create: `website/public/brand/*`

- [ ] Add the project structure needed for a marketing website without coupling it to Electron
- [ ] Move/copy the application icon and screenshots into the web app's static assets
- [ ] Replace the generated layout and global styling with the site shell foundation

### Task 2: Add release data parsing with tests

**Files:**
- Create: `website/src/lib/github-releases.ts`
- Create: `website/tests/github-releases.test.ts`
- Create: `website/tsconfig.tests.json`
- Modify: `website/package.json`

- [ ] Write failing tests for parsing GitHub release payloads into download-ready website data
- [ ] Implement the minimal parsing and fallback helpers
- [ ] Add a test script for the website package

### Task 3: Build shared website content and UI sections

**Files:**
- Create: `website/src/lib/site-content.ts`
- Create: `website/src/components/site-header.tsx`
- Create: `website/src/components/site-footer.tsx`
- Create: `website/src/components/hero.tsx`
- Create: `website/src/components/feature-grid.tsx`
- Create: `website/src/components/screenshot-showcase.tsx`
- Create: `website/src/components/download-panel.tsx`
- Create: `website/src/components/faq-list.tsx`
- Create: `website/src/components/changelog-list.tsx`

- [ ] Encode the product copy, features, FAQs, and navigation into structured content
- [ ] Create responsive presentation components around that content
- [ ] Keep the design conversion-focused and screenshot-led

### Task 4: Build the App Router pages and SEO routes

**Files:**
- Modify: `website/src/app/page.tsx`
- Create: `website/src/app/features/page.tsx`
- Create: `website/src/app/download/page.tsx`
- Create: `website/src/app/faq/page.tsx`
- Create: `website/src/app/changelog/page.tsx`
- Create: `website/src/app/robots.ts`
- Create: `website/src/app/sitemap.ts`
- Create: `website/src/app/opengraph-image.png`
- Create: `website/src/app/favicon.ico`

- [ ] Create all public pages with page-level metadata
- [ ] Add robots and sitemap generation
- [ ] Hook release data into the download and changelog pages

### Task 5: Verify and run

**Files:**
- Modify: `website/README.md`

- [ ] Run website tests
- [ ] Run website lint
- [ ] Run website build
- [ ] Start the local Next.js dev server and capture the review URL
- [ ] Document how to run and later detach the `website/` app
