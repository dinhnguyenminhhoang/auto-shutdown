# Auto Shutdown VN Website Design

## Goal

Create a polished Next.js product website inside `website/` that helps users understand the desktop app quickly, trust the product, and download the Windows installer with minimal friction.

## Chosen Direction

- Build a standalone Next.js App Router app in `website/`
- Keep it decoupled from the Electron build so it can be moved to a separate repo later
- Use Vietnamese as the primary content language
- Prioritize Windows download while reserving space for macOS and Linux later
- Use GitHub Releases as the download source through a dedicated `/download` page

## Site Structure

- `/` - product landing page with hero, product proof, feature summary, screenshots, trust strip, and direct CTA
- `/features` - deeper walkthrough of timer modes, recurring schedules, smart rules, history, and settings
- `/download` - release-aware download page with current Windows build, version, file size, release date, fallback instructions, and future platform placeholders
- `/faq` - focused FAQ around install, permissions, auto-start, warnings, smart rules, and updates
- `/changelog` - recent release list sourced from GitHub Releases

## Visual Direction

- Dark, desktop-tool aesthetic that matches the application instead of generic startup gradients
- Strong first viewport with product screenshots visible immediately
- Tight sections with constrained content width, not card-stacked marketing fluff
- High-contrast CTAs for download and release notes
- Fully responsive layout with screenshot-first presentation on both desktop and mobile

## Content Priorities

- H1: `Auto Shutdown VN`
- Explain the product in practical terms: shutdown, restart, sleep, lock, sign out, recurring schedules, and smart automation
- Show real screenshots from the desktop app as proof
- Make download effortless and obvious
- Keep support and future roadmap secondary, not in the main conversion path

## SEO

- App Router metadata on every page
- Route-specific titles and descriptions
- `robots.ts` and `sitemap.ts`
- Open Graph and Twitter metadata from static assets
- Clean route structure for indexing and sharing

## Release Data

- Use server-side GitHub Release fetches with caching and graceful fallback
- Extract the Windows installer asset, blockmap presence, version, published date, and notes
- Keep release parsing logic isolated so the web app can later point to another source without rewiring the UI

## Verification

- Verify release parsing with tests
- Verify web app with lint and build
- Run the local Next.js dev server and share the local URL for review
