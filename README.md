# ZTools AI Agents

A ZTools plugin for reusable AI agents, prompt templates, and provider-specific request options.

## Features

- Built-in agents for Chinese-English translation, writing polish, and bilingual explanation.
- Custom agent CRUD with model selection, prompt templates, streaming mode, and output actions.
- Per-agent request headers and extra OpenAI-compatible request body JSON.
- Optional reasoning display for providers that return `reasoning_content`.
- Dynamic ZTools commands for custom agents.

## Requirements

- ZTools with plugin AI API support for `headers` and `extraBody` in `window.ztools.ai()`.
- At least one AI model configured in ZTools settings.
- Node.js and pnpm for development.

The plugin uses `window.ztools.ai()` and stores its state with `window.ztools.dbStorage`, so agent settings are included in ZTools plugin data sync.
The current text input is not persisted.

## Development

```bash
pnpm install
pnpm dev
pnpm build
```

During development, import `public/plugin.json` as a ZTools development plugin. The manifest points to `http://127.0.0.1:5187` for dev mode.
Port `5187` is fixed with `--strictPort`; if it is occupied, stop the conflicting process before running `pnpm dev`.

## Runtime Contract

- Built-in feature codes are `manager`, `translate`, `polish`, and `explain`.
- Custom agents register dynamic feature codes as `agent-<agentId>`.
- Agent configs are stored in `window.ztools.dbStorage` under the `state` key.
- `headers` are parsed from JSON and converted to string values.
- `extraBody` is merged into the OpenAI-compatible chat completion request, while the host keeps control of `model`, `messages`, `stream`, and `tools`.

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

## Verification

```bash
pnpm typecheck
pnpm build
```

For dev server checks, run `pnpm dev` and open `http://127.0.0.1:5187`.

## License

MIT
