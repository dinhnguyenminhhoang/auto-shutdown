# MyExcel Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone Next.js spreadsheet-style app for one local user with local login, MongoDB persistence, 12 collapsible month sections, and a mobile-friendly rich-text cell editor.

**Architecture:** The app uses Next.js App Router for the UI and route handlers, the official MongoDB driver for persistence, and a signed local session token stored in `localStorage`. Workbook grid logic lives in small pure helpers so row, column, date-cell, and cell-update behavior can be tested before wiring the UI.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, MongoDB Node.js Driver, Tiptap, Vitest, Testing Library

---

### Task 1: Scaffold The Project And Testing Base

**Files:**
- Create: `C:\workspace\personal\myexcel-web\*`
- Create: `C:\workspace\personal\myexcel-web\.env.example`
- Create: `C:\workspace\personal\myexcel-web\vitest.config.ts`
- Create: `C:\workspace\personal\myexcel-web\vitest.setup.ts`
- Modify: `C:\workspace\personal\myexcel-web\package.json`

- [ ] **Step 1: Scaffold the app**

Run:

```powershell
cmd /c npx create-next-app@latest C:\workspace\personal\myexcel-web --ts --tailwind --eslint --app --src-dir --use-npm --import-alias "@/*" --yes
```

Expected: Next.js app is created with `src/app`, `package.json`, and a fresh Git repo.

- [ ] **Step 2: Install the required dependencies**

Run:

```powershell
cmd /c npm install mongodb @tiptap/react @tiptap/starter-kit clsx
cmd /c npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Expected: both install commands exit with code `0`.

- [ ] **Step 3: Add test scripts and a minimal Vitest config**

Update `package.json` scripts so they include:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Create `vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Add environment variable examples**

Create `.env.example`:

```env
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=myexcel
LOCAL_LOGIN_USERNAME=camthu
LOCAL_LOGIN_PASSWORD=123
AUTH_SIGNING_SECRET=replace-with-a-long-random-string
```

- [ ] **Step 5: Verify the scaffold builds before feature work**

Run:

```powershell
cmd /c npm run lint
cmd /c npm run test
```

Expected:
- lint passes
- tests report `No test files found` or pass cleanly if baseline tests already exist

- [ ] **Step 6: Commit the clean scaffold**

Run:

```powershell
git add .
git commit -m "chore: scaffold myexcel web app"
```

### Task 2: Create And Test Auth Helpers First

**Files:**
- Create: `C:\workspace\personal\myexcel-web\src\lib\auth-token.ts`
- Create: `C:\workspace\personal\myexcel-web\src\lib\env.ts`
- Test: `C:\workspace\personal\myexcel-web\src\lib\auth-token.test.ts`

- [ ] **Step 1: Write the failing auth helper tests**

Create `src/lib/auth-token.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { issueSessionToken, validateSessionToken } from "@/lib/auth-token";

describe("auth token helpers", () => {
  it("issues a token that validates successfully", async () => {
    const token = await issueSessionToken("camthu", "secret", 60_000);

    const result = await validateSessionToken(token, "secret");

    expect(result.valid).toBe(true);
    expect(result.username).toBe("camthu");
  });

  it("rejects a token with a bad signature", async () => {
    const token = await issueSessionToken("camthu", "secret", 60_000);
    const tampered = `${token}broken`;

    const result = await validateSessionToken(tampered, "secret");

    expect(result.valid).toBe(false);
  });
});
```

- [ ] **Step 2: Run the auth tests to verify they fail**

Run:

```powershell
cmd /c npm run test -- src/lib/auth-token.test.ts
```

Expected: FAIL because `@/lib/auth-token` does not exist yet.

- [ ] **Step 3: Implement the minimal auth helpers**

Create `src/lib/auth-token.ts`:

```ts
import { createHmac, timingSafeEqual } from "node:crypto";

type SessionPayload = {
  username: string;
  expiresAt: number;
};

function toBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export async function issueSessionToken(username: string, secret: string, ttlMs = 86_400_000) {
  const payload: SessionPayload = {
    username,
    expiresAt: Date.now() + ttlMs,
  };

  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export async function validateSessionToken(token: string, secret: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return { valid: false as const };
  }

  const expected = sign(encodedPayload, secret);
  const validSignature =
    expected.length === signature.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(signature));

  if (!validSignature) {
    return { valid: false as const };
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload)) as SessionPayload;

  if (payload.expiresAt <= Date.now()) {
    return { valid: false as const };
  }

  return { valid: true as const, username: payload.username, expiresAt: payload.expiresAt };
}
```

- [ ] **Step 4: Run the auth tests to verify they pass**

Run:

```powershell
cmd /c npm run test -- src/lib/auth-token.test.ts
```

Expected: PASS with `2 passed`.

- [ ] **Step 5: Commit the auth helper slice**

Run:

```powershell
git add src/lib/auth-token.ts src/lib/auth-token.test.ts
git commit -m "feat: add local auth token helpers"
```

### Task 3: Create And Test Workbook Helpers Before UI

**Files:**
- Create: `C:\workspace\personal\myexcel-web\src\lib\workbook.ts`
- Create: `C:\workspace\personal\myexcel-web\src\types\workbook.ts`
- Test: `C:\workspace\personal\myexcel-web\src\lib\workbook.test.ts`

- [ ] **Step 1: Write the failing workbook tests**

Create `src/lib/workbook.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { addColumnToMonth, addRowToMonth, createDefaultWorkbook, updateMonthCell } from "@/lib/workbook";

describe("workbook helpers", () => {
  it("creates a 12-month workbook", () => {
    const workbook = createDefaultWorkbook(2026);
    expect(workbook.months).toHaveLength(12);
    expect(workbook.months[0].rows[0][0].kind).toBe("date");
  });

  it("adds a row to a month", () => {
    const workbook = createDefaultWorkbook(2026);
    const next = addRowToMonth(workbook, 1);
    expect(next.months[0].rowCount).toBe(workbook.months[0].rowCount + 1);
  });

  it("adds a column to a month", () => {
    const workbook = createDefaultWorkbook(2026);
    const next = addColumnToMonth(workbook, 1);
    expect(next.months[0].columnCount).toBe(workbook.months[0].columnCount + 1);
  });

  it("updates a rich text cell preview", () => {
    const workbook = createDefaultWorkbook(2026);
    const next = updateMonthCell(workbook, {
      month: 1,
      rowIndex: 1,
      columnIndex: 1,
      content: "<p><strong>Hello</strong></p>",
      previewText: "Hello",
    });

    expect(next.months[0].rows[1][1].previewText).toBe("Hello");
  });
});
```

- [ ] **Step 2: Run the workbook tests to verify they fail**

Run:

```powershell
cmd /c npm run test -- src/lib/workbook.test.ts
```

Expected: FAIL because workbook helpers do not exist yet.

- [ ] **Step 3: Implement the minimal workbook model and helpers**

Create `src/types/workbook.ts`:

```ts
export type CellKind = "date" | "richtext";

export type CellRecord = {
  id: string;
  kind: CellKind;
  content: string;
  previewText: string;
};

export type MonthRecord = {
  month: number;
  rowCount: number;
  columnCount: number;
  rows: CellRecord[][];
};

export type WorkbookRecord = {
  year: number;
  months: MonthRecord[];
  createdAt: string;
  updatedAt: string;
};
```

Create `src/lib/workbook.ts` with exported helpers for:

```ts
createDefaultWorkbook(year: number): WorkbookRecord
addRowToMonth(workbook: WorkbookRecord, month: number): WorkbookRecord
addColumnToMonth(workbook: WorkbookRecord, month: number): WorkbookRecord
updateMonthCell(workbook: WorkbookRecord, input: {
  month: number;
  rowIndex: number;
  columnIndex: number;
  content: string;
  previewText: string;
}): WorkbookRecord
```

Implementation rules:
- Create 12 months.
- Default month size is `8 x 6`.
- `rows[0][0]` is a `date` cell.
- Other cells are `richtext`.
- `A1` must stay a `date` cell even after updates.

- [ ] **Step 4: Run the workbook tests to verify they pass**

Run:

```powershell
cmd /c npm run test -- src/lib/workbook.test.ts
```

Expected: PASS with `4 passed`.

- [ ] **Step 5: Commit the workbook helper slice**

Run:

```powershell
git add src/types/workbook.ts src/lib/workbook.ts src/lib/workbook.test.ts
git commit -m "feat: add workbook domain helpers"
```

### Task 4: Wire MongoDB And Route Handlers

**Files:**
- Create: `C:\workspace\personal\myexcel-web\src\lib\mongodb.ts`
- Create: `C:\workspace\personal\myexcel-web\src\lib\workbook-store.ts`
- Create: `C:\workspace\personal\myexcel-web\src\app\api\auth\login\route.ts`
- Create: `C:\workspace\personal\myexcel-web\src\app\api\auth\validate\route.ts`
- Create: `C:\workspace\personal\myexcel-web\src\app\api\workbook\route.ts`

- [ ] **Step 1: Write a failing store test for default workbook creation**

Create a small test around `ensureWorkbook` that uses an in-memory fake collection boundary, or if that feels too heavy, write a failing unit test for a pure helper that extracts the workbook patch intent from an action payload.

```ts
expect(applyWorkbookAction(workbook, { type: "add-row", month: 1 }).months[0].rowCount).toBe(9);
```

- [ ] **Step 2: Run the store-related tests and verify they fail**

Run:

```powershell
cmd /c npm run test -- src/lib/workbook.test.ts
```

Expected: FAIL because the new action helper is missing.

- [ ] **Step 3: Implement MongoDB and API routes**

Create `src/lib/mongodb.ts`:

```ts
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME;

if (!uri || !dbName) {
  throw new Error("MongoDB environment variables are missing.");
}

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

const clientPromise =
  globalForMongo.mongoClientPromise ?? new MongoClient(uri).connect();

globalForMongo.mongoClientPromise = clientPromise;

export async function getDb() {
  const client = await clientPromise;
  return client.db(dbName);
}
```

Create route handlers that:
- validate the auth token
- load or create the workbook for the current year
- persist workbook changes for `update-cell`, `add-row`, and `add-column`

- [ ] **Step 4: Run the tests and lint after API wiring**

Run:

```powershell
cmd /c npm run test
cmd /c npm run lint
```

Expected: PASS on existing tests and clean lint.

- [ ] **Step 5: Commit the API slice**

Run:

```powershell
git add src/lib/mongodb.ts src/lib/workbook-store.ts src/app/api
git commit -m "feat: add auth and workbook api routes"
```

### Task 5: Build The Login Gate And Workbook UI

**Files:**
- Create: `C:\workspace\personal\myexcel-web\src\components\auth\login-screen.tsx`
- Create: `C:\workspace\personal\myexcel-web\src\components\workbook\workbook-app.tsx`
- Create: `C:\workspace\personal\myexcel-web\src\components\workbook\month-section.tsx`
- Create: `C:\workspace\personal\myexcel-web\src\components\workbook\spreadsheet-grid.tsx`
- Create: `C:\workspace\personal\myexcel-web\src\components\workbook\cell-editor.tsx`
- Modify: `C:\workspace\personal\myexcel-web\src\app\page.tsx`
- Modify: `C:\workspace\personal\myexcel-web\src\app\globals.css`

- [ ] **Step 1: Write a failing component test for the login gate**

Create `src/components/auth/login-screen.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { LoginScreen } from "@/components/auth/login-screen";

it("renders the local login form", () => {
  render(<LoginScreen onSubmit={async () => ({ ok: true })} />);
  expect(screen.getByLabelText(/tài khoản/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/mật khẩu/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the login UI test and verify it fails**

Run:

```powershell
cmd /c npm run test -- src/components/auth/login-screen.test.tsx
```

Expected: FAIL because the component does not exist yet.

- [ ] **Step 3: Implement the login screen and workbook shell**

Build:
- a warm, touch-friendly login card
- a workbook shell that checks `localStorage` on mount
- token validation via `/api/auth/validate`
- a year header and 12 collapsible month sections
- sticky row and column headers
- add row and add column actions in each month header

Use Tiptap in `cell-editor.tsx` with a small toolbar:

```tsx
editor.chain().focus().toggleBold().run()
editor.chain().focus().toggleItalic().run()
editor.chain().focus().toggleBulletList().run()
```

- [ ] **Step 4: Run the login UI test and full test suite**

Run:

```powershell
cmd /c npm run test -- src/components/auth/login-screen.test.tsx
cmd /c npm run test
```

Expected:
- login screen test passes
- full test suite passes

- [ ] **Step 5: Commit the UI slice**

Run:

```powershell
git add src/components src/app/page.tsx src/app/globals.css
git commit -m "feat: add workbook interface and editor"
```

### Task 6: Final Verification And Delivery

**Files:**
- Modify: `C:\workspace\personal\myexcel-web\README.md`

- [ ] **Step 1: Document how to run the app**

Add a README section with:

```md
1. Copy `.env.example` to `.env.local`
2. Fill in MongoDB settings
3. Run `npm install`
4. Run `npm run dev`
5. Login with the configured local username and password
```

- [ ] **Step 2: Run the complete verification suite**

Run:

```powershell
cmd /c npm run test
cmd /c npm run lint
cmd /c npm run build
```

Expected:
- all tests pass
- lint passes
- production build succeeds

- [ ] **Step 3: Smoke-check the app locally**

Run:

```powershell
cmd /c npm run dev
```

Then verify manually:
- login works with `camthu / 123`
- invalid password is rejected
- workbook loads from MongoDB
- a month can collapse and expand
- adding a row persists after refresh
- adding a column persists after refresh
- editing a date cell persists after refresh
- editing a rich text cell persists after refresh

- [ ] **Step 4: Commit the documentation and final polish**

Run:

```powershell
git add README.md
git commit -m "docs: add myexcel web setup notes"
```
