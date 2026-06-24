# Support Tab Design

**Goal**

Add a dedicated `Ung ho` tab in the main menu so users can optionally support the app with a QR code and bank transfer details.

**Scope**

- Add one new tab in the existing menu flow.
- Show a short support message, QR image, bank name, account number, and account holder name.
- Add quick copy actions for account number and account holder name.
- Keep all data bundled locally in the app with no network dependency.

**UI Notes**

- Match the current dark UI and menu structure.
- Keep the layout compact and centered.
- Use clear labels and avoid long paragraphs.

**Testing**

- Add a renderer-safe static render test for the support component content.
- Verify integration with existing app build types through `npm test` and `npm run typecheck`.
