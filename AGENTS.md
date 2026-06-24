# Repository Instructions

This repository uses additional agent instructions stored in `.agents/`.

Before making changes, read `.agents/overview.md` if it exists.

General rules:

- Preserve existing logic unless the user explicitly asks to change it.
- Make minimal, safe changes.
- Do not refactor unrelated code.
- Follow the existing folder structure, naming conventions, and coding style.
- Ask before installing new dependencies.
- Prefer Windows PowerShell commands when suggesting terminal commands.
- If `.codegraph/` exists, use CodeGraph before grep/find/manual file reading when locating or understanding code.
- After changes, run the available validation command if practical, such as lint, typecheck, or tests.
