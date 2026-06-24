# Updater, Footer, and Startup Design

**Goal**

Add visible app versioning, real GitHub Releases auto-update support, a footer credit line with a Facebook link, and reduce startup jank in the packaged Electron app.

**Scope**

- Surface the current app version inside the UI.
- Add a real updater flow using `electron-updater` with GitHub Releases for `dinhnguyenminhhoang/auto-shutdown`.
- Show user-friendly update status and allow manual check/install actions from the app.
- Add a footer line: `No copyright` and `Được phát triển bởi Đinh Nguyễn Minh Hoàng`, with the name opening Facebook externally.
- Reduce launch jank by avoiding duplicate hidden renderer boot and deferring heavy startup work.

**Architecture**

- Keep timer state separate from app runtime/update state.
- Introduce a main-process updater service that tracks version and update lifecycle.
- Expose app info/update actions through preload IPC.
- Render version, updater state, and footer through small dedicated renderer components.

**Startup Optimization**

- Do not create the tray popup window during startup; create it lazily on first use.
- Delay the first smart rule metrics poll until the app settles.
- Avoid unnecessary startup shortcut rewrites in unpackaged runs.

**Testing**

- Add focused tests for update status labels/footer rendering helpers.
- Verify with `npm test` and `npm run typecheck`.
