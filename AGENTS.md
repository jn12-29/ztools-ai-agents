# Repository Guidelines

## Project Structure & Module Organization

- `src/App.vue` contains the main ZTools plugin UI.
- `src/services/` contains storage, default agent, feature registration, JSON parsing, and AI request helpers.
- `src/types.ts` holds shared TypeScript interfaces.
- `public/plugin.json` is the ZTools manifest. Keep feature codes aligned with built-in agent IDs.
- `public/preload/services.js` exposes minimal Electron preload helpers to the web UI.

## Build, Test, and Development Commands

- `pnpm install` installs dependencies.
- `pnpm dev` starts Vite for ZTools development plugin mode.
- `pnpm typecheck` runs Vue and TypeScript checks without emitting files.
- `pnpm build` runs type checks and builds the production plugin UI.
- `pnpm preview` serves the production build for local inspection.

## Coding Style & Naming Conventions

- Use Vue 3 Composition API with TypeScript.
- Keep code, comments, identifiers, and annotations in English.
- Use two-space indentation and single quotes in TypeScript and Vue scripts.
- Name interfaces with clear nouns, for example `AgentConfig` and `RunResult`.
- Keep provider-specific request options as JSON strings in agent config, then parse them through `src/services/jsonConfig.ts`.

## Testing Guidelines

There is no dedicated test runner yet. For each change, run `pnpm typecheck` and `pnpm build`. When touching ZTools API usage, manually verify the plugin in ZTools dev mode with at least one configured AI model.

## Commit & Pull Request Guidelines

Use concise Conventional Commit style messages, such as `feat: add custom agent commands` or `fix: validate headers json`. Pull requests should include a short description, verification commands, linked issues when relevant, and screenshots for UI changes.

## Security & Configuration Tips

Do not commit API keys or provider secrets. Custom headers and extra body JSON are stored through `window.ztools.dbStorage`, so treat saved agent configs as syncable user data.
