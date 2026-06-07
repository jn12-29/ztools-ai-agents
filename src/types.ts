export type OutputAction = 'show' | 'copy' | 'paste'
export type HistoryTitleMode = 'local' | 'ai' | 'off'
export type TitleLanguage = 'auto' | 'zh' | 'en'
export type ThinkingMode = 'default' | 'on' | 'off'
export type ThinkingProvider = 'auto' | 'openai' | 'qwen' | 'gemini' | 'deepseek'
export type ThinkingEffort = '' | 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'
export type VisionDetail = 'auto' | 'low' | 'high'
export type VisualAttachmentSource = 'file' | 'clipboard' | 'screenshot' | 'launch' | 'history'
export type AgentRunTemplate = 'standard' | 'chat' | 'nativeOcr'
export type ChatMessageRole = 'user' | 'assistant'

export interface AgentConfig {
  id: string
  name: string
  description: string
  runTemplate: AgentRunTemplate
  model: string
  systemPrompt: string
  userTemplate: string
  stream: boolean
  showReasoning: boolean
  allowVision: boolean
  visionDetail: VisionDetail
  thinkingProvider: ThinkingProvider
  thinkingMode: ThinkingMode
  thinkingEffort: ThinkingEffort
  thinkingBudgetText: string
  outputAction: OutputAction
  headersText: string
  extraBodyText: string
  featureEnabled: boolean
  builtIn: boolean
}

export interface AgentDraft {
  name: string
  description: string
  runTemplate: AgentRunTemplate
  model: string
  systemPrompt: string
  userTemplate: string
  stream: boolean
  showReasoning: boolean
  allowVision: boolean
  visionDetail: VisionDetail
  thinkingProvider: ThinkingProvider
  thinkingMode: ThinkingMode
  thinkingEffort: ThinkingEffort
  thinkingBudgetText: string
  outputAction: OutputAction
  headersText: string
  extraBodyText: string
  featureEnabled: boolean
}

export interface AppState {
  agents: AgentConfig[]
  activeAgentId: string
  history: AgentHistoryRecord[]
  chatSessions: ChatSession[]
  settings: PluginSettings
}

export interface PluginSettings {
  historyEnabled: boolean
  historyLimitPerAgent: number
  historyTitleMode: HistoryTitleMode
  captionModel: string
  titleLanguage: TitleLanguage
  titleMaxLength: number
  saveImageAttachments: boolean
  nativeOcrEndpoint: string
}

export interface AgentHistoryRecord {
  id: string
  agentId: string
  title: string
  input: string
  output: string
  reasoning: string
  attachments: AgentHistoryAttachment[]
  createdAt: number
}

export interface AgentHistoryAttachment {
  id: string
  name: string
  mimeType: string
  sizeBytes: number
  source: VisualAttachmentSource
  dataUrl?: string
}

export interface VisualAttachment extends AgentHistoryAttachment {
  dataUrl: string
}

export interface ChatSession {
  id: string
  agentId: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

export interface ChatMessage {
  id: string
  role: ChatMessageRole
  content: string
  reasoning: string
  createdAt: number
}

export interface NativeOcrResponse {
  texts: string[]
  scores: number[]
  boxes: unknown[]
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
