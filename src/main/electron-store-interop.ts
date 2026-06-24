/**
 * Resolves the electron-store constructor from an import/require.
 * Handles the ESM/CJS interop where the default export may be nested inside a default property.
 */
export function resolveElectronStoreConstructor<T>(importedModule: unknown): T {
  if (
    importedModule &&
    typeof importedModule === 'object' &&
    'default' in importedModule &&
    importedModule.default !== null
  ) {
    return importedModule.default as T
  }
  return importedModule as T
}
