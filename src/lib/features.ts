/**
 * Build-time feature gates. Workspaces are still in testing, so the on/off switch is not
 * shown in public builds. To try them locally: `VITE_WORKSPACES_TOGGLE=true pnpm build`
 * (or add it to .env.local for `pnpm dev`).
 */
export const WORKSPACES_TOGGLE_VISIBLE = import.meta.env.VITE_WORKSPACES_TOGGLE === 'true';
