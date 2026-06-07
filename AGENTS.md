# Repository Guidelines

Agents can install project-local dependencies and tooling with `uv` and `npm`, provided they do not modify global/system environments or install packages outside the repository.


## Project Structure & Module Organization

- `src/App.vue` contains the main ZTools plugin UI.
- `src/services/` contains storage, default agent, feature registration, JSON parsing, and AI request helpers.
- `src/types.ts` holds shared TypeScript interfaces.
- `public/plugin.json` is the ZTools manifest. Keep feature codes aligned with built-in agent IDs.
- `public/preload/services.js` exposes minimal Electron preload helpers to the web UI.

## Build, Test, and Development Commands

- `pnpm install` installs dependencies.
- `pnpm dev` starts Vite for ZTools development plugin mode on `127.0.0.1:5187`.
- `pnpm typecheck` runs Vue and TypeScript checks without emitting files.
- `pnpm build` runs type checks and builds the production plugin UI.
- `pnpm preview` serves the production build for local inspection.

`public/plugin.json` must keep `development.main` aligned with the `pnpm dev` port. The current port is fixed with `--strictPort`; do not switch back to the template default `5173`.

## Coding Style & Naming Conventions

- Use Vue 3 Composition API with TypeScript.
- Keep code, comments, identifiers, and annotations in English.
- Use two-space indentation and single quotes in TypeScript and Vue scripts.
- Name interfaces with clear nouns, for example `AgentConfig` and `RunResult`.
- Keep provider-specific request options as JSON strings in agent config, then parse them through `src/services/jsonConfig.ts`.

## Testing Guidelines

There is no dedicated test runner yet. For each change, run `pnpm typecheck` and `pnpm build`. When touching ZTools API usage, manually verify the plugin in ZTools dev mode with at least one configured AI model.

## Runtime Contract

- Requires a ZTools host whose plugin AI API accepts `headers` and `extraBody`.
- Built-in features are static manifest entries: `manager`, `translate`, `polish`, `explain`, `vision`, `screenshot`, `ocr`, `chat`, and `native-ocr`.
- Custom agent features are dynamic and use `agent-<agentId>` codes.
- Persisted plugin state uses `window.ztools.dbStorage` key `state`; do not persist transient text or image input drafts.
- Plugin-level settings are stored in the same `state` payload.
- Completed run history persists title, input, output, returned reasoning, optional image attachment metadata, and timestamp per agent, capped by the plugin-level history limit.
- Chat-template agents persist multi-turn chat sessions in the same `state` payload, capped by the plugin-level history limit per agent.
- AI history-title generation is a separate non-streaming metadata request using the plugin-level caption model. It must not use the active Agent prompt, request body JSON, or thinking controls.
- Completed image attachments should be stored in `window.ztools.db` attachments when available; avoid putting base64 images in `dbStorage.state` except as a non-ZTools fallback.
- Image input uses OpenAI-compatible `image_url` content parts and depends on ZTools host/model vision support. Text-only runs keep string message content.
- Each run supports up to 4 PNG/JPG/WebP/GIF images, 4 MB max per image.
- Native OCR uses the plugin-level `nativeOcrEndpoint`, defaults to `http://127.0.0.1:8080/ocr`, posts multipart field `file` through `public/preload/services.js`, and must not call VLM / `window.ztools.ai()` for text extraction.
- In Run view, plain Enter triggers the active agent; Shift+Enter remains available for textarea newlines.
- Extra Body JSON is the source of truth for request-body fields and plugin request controls. The stream and thinking controls update this JSON instead of applying hidden runtime overrides.
- The Extra Body textarea edits a UI draft. Save validates and persists the draft, Reset discards it, and agent runs are blocked while the active Extra Body draft has unsaved changes.
- `stream` in Extra Body JSON must be boolean when present. `stream: true` uses the streaming callback path; `stream: false` or a missing `stream` value uses the non-streaming request path. The plugin removes `stream` before passing `extraBody` to `window.ztools.ai()`.
- Thinking controls are optional persisted agent config shortcuts. They materialize provider-specific fields in Extra Body JSON; missing thinking fields mean no provider thinking override.
- New custom agents and reset non-native-OCR built-ins default to Extra Body JSON `{"stream":true}`, `thinkingMode: 'default'`, and no thinking fields.
- Agents with an empty `model` follow the ZTools default model. ZTools does not expose that default model ID to the plugin, so thinking provider auto-detection falls back to OpenAI / GPT until the user selects a concrete model or manual thinking API.
- Built-in default prompts treat input and visible image text as source content, not instructions.
- New custom agents start with a defensive generic prompt, but edited custom prompts remain fully user-controlled.
- Keep `src/env.d.ts`, `README.md`, and host API assumptions in sync when AI option fields change.
- Keep `public/plugin.json`, built-in agent IDs, and the built-in feature-code contract in sync when adding or renaming built-in agents.

## Commit & Pull Request Guidelines

Use concise Conventional Commit style messages, such as `feat: add custom agent commands` or `fix: validate headers json`. Pull requests should include a short description, verification commands, linked issues when relevant, and screenshots for UI changes.

## Security & Configuration Tips

Do not commit API keys or provider secrets. Custom headers, extra body JSON, and run history are stored through `window.ztools.dbStorage` / `window.ztools.db`, so treat saved agent configs, history, and image attachments as syncable user data.
