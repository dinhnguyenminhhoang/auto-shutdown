# MyExcel Web Design

## Goal

Create a new standalone Next.js project at `C:\workspace\personal\myexcel-web` that behaves like a lightweight yearly spreadsheet for one local user. The app must support a mobile-friendly and tablet-friendly editing flow, keep data in MongoDB, and provide a local login gate that remembers the session between visits.

## Product Shape

- Single-user web app.
- One yearly workbook view containing 12 month sections.
- Each month can be expanded or collapsed independently.
- Each month renders a spreadsheet-style grid:
  - top header uses column letters
  - left rail uses row numbers
  - cells are editable
- The first cell of every month (`A1`) is always a date field.
- Users can add rows and columns.
- Rich text editing is available for normal cells with bold, italic, and bullet list support.

## Architecture

### Frontend

- Use `Next.js` App Router with client components for the interactive workbook shell.
- Keep the first row and first column sticky for easier navigation on touch devices.
- Use a stacked mobile layout:
  - login screen
  - workbook toolbar
  - collapsible month sections
  - cell editor drawer/modal for focused editing
- Use Tiptap in a dedicated editor surface instead of forcing inline rich text editing inside the grid. This keeps the grid fast and touch-friendly.

### Backend

- Use Next.js route handlers under `src/app/api/*`.
- Protect write and read APIs with a lightweight local token validation flow.
- Use the official MongoDB Node.js driver with a cached `MongoClient`.

### Authentication

- Login is local-only and fixed to username `camthu` and password `123`.
- Credentials are validated on the server against environment variables.
- On successful login, the server returns a signed session token with an expiry.
- The client stores that token in `localStorage`.
- On each visit, the client reads the token from `localStorage`, calls a validation API, and only opens the workbook if the token is still valid.
- If validation fails, the app clears the token and shows the login screen.

## Data Model

Use one workbook document per year.

```ts
type CellKind = "date" | "richtext";

type CellRecord = {
  id: string;
  kind: CellKind;
  content: string;
  previewText: string;
};

type MonthRecord = {
  month: number;
  rowCount: number;
  columnCount: number;
  rows: CellRecord[][];
};

type WorkbookRecord = {
  year: number;
  months: MonthRecord[];
  createdAt: string;
  updatedAt: string;
};
```

Design choice:

- `A1` is stored as `kind: "date"` and edited with a native date input.
- All other cells use `kind: "richtext"` and store HTML plus a plain-text preview.
- MongoDB updates can mutate the workbook in memory and persist the updated month. That is acceptable because this is a one-user app with modest document size.

## Key UX Decisions

- Default workbook year is the current year.
- Each month starts with a practical default size such as 8 rows and 6 columns.
- `A1` defaults to the first day of that month in the current workbook year.
- Selecting a normal cell opens a bottom drawer on phones and a side panel on larger screens.
- Cell tiles show a compact preview, not the full rich text renderer, to keep the grid readable.
- Add row and add column actions live in the month header, so users do not need to hunt for them.

## API Surface

- `POST /api/auth/login`
  - input: username, password
  - output: signed token and expiry
- `POST /api/auth/validate`
  - input: token
  - output: valid or invalid
- `GET /api/workbook?year=YYYY`
  - returns existing workbook or creates a default one
- `PATCH /api/workbook`
  - supports actions:
    - update cell
    - add row
    - add column

## Error Handling

- Invalid or expired token returns `401`.
- MongoDB connection or persistence errors return `500` with a short friendly message.
- The UI shows inline save status and disables repeated actions during writes.
- If saving fails, the client keeps local editor state and lets the user retry.

## Testing Strategy

- Unit-test workbook helper functions:
  - default workbook generation
  - month creation
  - add row
  - add column
  - update cell
  - protect `A1` as a date cell
- Unit-test auth token helpers:
  - issue token
  - validate token
  - reject expired or tampered token
- Run lint, tests, and production build as completion gates.

## Initial Scope Guardrails

- No multi-user support.
- No formula engine.
- No Excel import/export.
- No collaborative editing.
- No drag-fill behavior.

This keeps the first version fast, stable, and easy to use on phone and tablet.
