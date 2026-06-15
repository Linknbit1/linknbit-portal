// Modules that are not yet production-ready (Projects, Clients, Tasks, Reports,
// ClickUp). They are visible while running `pnpm dev` and automatically hidden in
// any production build (`pnpm build` / Vercel), where `import.meta.env.DEV` is false.
export const showWipFeatures = import.meta.env.DEV
