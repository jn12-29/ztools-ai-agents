export type OutputAction = 'show' | 'copy' | 'paste'

export interface AgentConfig {
  id: string
  name: string
  description: string
  model: string
  systemPrompt: string
  userTemplate: string
  stream: boolean
  showReasoning: boolean
  outputAction: OutputAction
  headersText: string
  extraBodyText: string
  featureEnabled: boolean
  builtIn: boolean
}

export interface AgentDraft {
  name: string
  description: string
  model: string
  systemPrompt: string
  userTemplate: string
  stream: boolean
  showReasoning: boolean
  outputAction: OutputAction
  headersText: string
  extraBodyText: string
  featureEnabled: boolean
}

export interface AppState {
  agents: AgentConfig[]
  activeAgentId: string
}

export interface AiModel {
  id: string
  label: string
  description: string
  icon: string
  cost: number
}

export interface LaunchAction<T = unknown> {
  code: string
  type: string
  payload: T
  option?: unknown
  from?: string
}

export interface RunResult {
  content: string
  reasoning: string
}

export interface ValidationResult {
  headers?: Record<string, string>
  extraBody?: Record<string, unknown>
}

export type AbortablePromise<T> = Promise<T> & {
  abort(): void
}
