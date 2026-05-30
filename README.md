# ZTools AI Agents

A ZTools plugin for reusable AI agents, prompt templates, and provider-specific request options.

## Features

- Built-in agents for Chinese-English translation, writing polish, and bilingual explanation.
- Custom agent CRUD with model selection, prompt templates, streaming mode, and output actions.
- Per-agent request headers and extra OpenAI-compatible request body JSON.
- Optional reasoning display for providers that return `reasoning_content`.
- Dynamic ZTools commands for custom agents.

## Requirements

- ZTools with plugin AI API support.
- At least one AI model configured in ZTools settings.
- Node.js and pnpm for development.

The plugin uses `window.ztools.ai()` and stores its state with `window.ztools.dbStorage`, so agent settings are included in ZTools plugin data sync.

## Development

```bash
pnpm install
pnpm dev
pnpm build
```

During development, import `public/plugin.json` as a ZTools development plugin. The manifest points to `http://localhost:5173` for dev mode.

## Agent Configuration

Use `{{input}}` in the user template to place selected text or typed input. If the template omits `{{input}}`, the input is appended after the template.

Examples:

```json
{"X-Provider-Feature":"on"}
```

```json
{"enable_thinking":true,"temperature":0.2}
```

Provider-specific keys must match the selected model provider's OpenAI-compatible API.

## Packaging

Run `pnpm build`, then import or zip the generated `dist/` directory. Vite copies `public/plugin.json`, `public/logo.png`, and `public/preload/services.js` into `dist/`.

## License

MIT
