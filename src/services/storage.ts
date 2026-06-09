import type {
  AgentConfig,
  AgentHistoryAttachment,
  AgentHistoryRecord,
  AppState,
  ChatMessage,
  ChatSession,
  PluginSettings
} from '../types'
import { createDefaultAgents, isBuiltInAgentId, isLegacyBuiltInSystemPrompt } from './defaultAgents'
import { createLocalHistoryTitle } from './historyTitles'
import { DEFAULT_STREAM_EXTRA_BODY_TEXT, normalizeAgentExtraBodyText } from './requestBody'

const STATE_KEY = 'state'
export const HISTORY_LIMIT_PER_AGENT = 50
export const DEFAULT_PLUGIN_SETTINGS: PluginSettings = {
  historyEnabled: true,
  historyLimitPerAgent: HISTORY_LIMIT_PER_AGENT,
  historyTitleMode: 'local',
  captionModel: '',
  titleLanguage: 'auto',
  titleMaxLength: 32,
  saveImageAttachments: true,
  nativeOcrEndpoint: 'http://127.0.0.1:8080/ocr'
}
const DEFAULT_AGENT_OPTIONS = {
  runTemplate: 'standard' as const,
  allowVision: true,
  visionDetail: 'auto' as const,
  thinkingProvider: 'auto' as const,
  thinkingMode: 'default' as const,
  thinkingEffort: '' as const,
  thinkingBudgetText: ''
}

function normalizeOutputAction(value: unknown): AgentConfig['outputAction'] {
  return value === 'copy' || value === 'paste' || value === 'show' ? value : 'show'
}

function normalizeVisionDetail(value: unknown): AgentConfig['visionDetail'] {
  return value === 'low' || value === 'high' || value === 'auto' ? value : 'auto'
}

function normalizeThinkingProvider(value: unknown): AgentConfig['thinkingProvider'] {
  return value === 'openai' || value === 'qwen' || value === 'gemini' || value === 'deepseek' || value === 'auto'
    ? value
    : 'auto'
}

function normalizeThinkingMode(value: unknown): AgentConfig['thinkingMode'] {
  return value === 'on' || value === 'off' || value === 'default' ? value : 'default'
}

function normalizeThinkingEffort(value: unknown): AgentConfig['thinkingEffort'] {
  return value === 'none' ||
    value === 'minimal' ||
    value === 'low' ||
    value === 'medium' ||
    value === 'high' ||
    value === 'xhigh' ||
    value === 'max' ||
    value === ''
    ? value
    : ''
}

function cloneAgent(agent: AgentConfig): AgentConfig {
  return { ...agent }
}

function cloneHistoryRecord(record: AgentHistoryRecord): AgentHistoryRecord {
  return {
    ...record,
    attachments: record.attachments.map((attachment) => ({ ...attachment }))
  }
}

function cloneChatSession(session: ChatSession): ChatSession {
  return {
    ...session,
    messages: session.messages.map((message) => ({ ...message }))
  }
}

function createStoredId(): string {
  if (crypto.randomUUID) return crypto.randomUUID()
  return `history-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function clampInteger(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.trunc(parsed)))
}

export function normalizePluginSettings(settings: unknown): PluginSettings {
  const value = settings && typeof settings === 'object' ? (settings as Partial<PluginSettings>) : {}
  return {
    historyEnabled: typeof value.historyEnabled === 'boolean' ? value.historyEnabled : DEFAULT_PLUGIN_SETTINGS.historyEnabled,
    historyLimitPerAgent: clampInteger(
      value.historyLimitPerAgent,
      DEFAULT_PLUGIN_SETTINGS.historyLimitPerAgent,
      1,
      200
    ),
    historyTitleMode:
      value.historyTitleMode === 'ai' || value.historyTitleMode === 'off' || value.historyTitleMode === 'local'
        ? value.historyTitleMode
        : DEFAULT_PLUGIN_SETTINGS.historyTitleMode,
    captionModel: typeof value.captionModel === 'string' ? value.captionModel : DEFAULT_PLUGIN_SETTINGS.captionModel,
    titleLanguage:
      value.titleLanguage === 'zh' || value.titleLanguage === 'en' || value.titleLanguage === 'auto'
        ? value.titleLanguage
        : DEFAULT_PLUGIN_SETTINGS.titleLanguage,
    titleMaxLength: clampInteger(value.titleMaxLength, DEFAULT_PLUGIN_SETTINGS.titleMaxLength, 8, 80),
    saveImageAttachments:
      typeof value.saveImageAttachments === 'boolean'
        ? value.saveImageAttachments
        : DEFAULT_PLUGIN_SETTINGS.saveImageAttachments,
    nativeOcrEndpoint:
      typeof value.nativeOcrEndpoint === 'string' && value.nativeOcrEndpoint.trim()
        ? value.nativeOcrEndpoint.trim()
        : DEFAULT_PLUGIN_SETTINGS.nativeOcrEndpoint
  }
}

function normalizeAgent(agent: AgentConfig): AgentConfig {
  const hasSavedExtraBodyText = typeof agent.extraBodyText === 'string'
  const normalized = {
    ...DEFAULT_AGENT_OPTIONS,
    ...agent
  }
  const builtInById = typeof normalized.id === 'string' && isBuiltInAgentId(normalized.id)
  if (
    normalized.runTemplate !== 'chat' &&
    normalized.runTemplate !== 'nativeOcr' &&
    normalized.runTemplate !== 'standard'
  ) {
    normalized.runTemplate = 'standard'
  }

  if (typeof normalized.stream !== 'boolean') {
    normalized.stream = normalized.runTemplate === 'nativeOcr' ? false : true
  }
  if (typeof normalized.builtIn !== 'boolean') normalized.builtIn = builtInById
  if (typeof normalized.allowVision !== 'boolean') normalized.allowVision = true
  if (typeof normalized.showReasoning !== 'boolean') normalized.showReasoning = false
  if (typeof normalized.featureEnabled !== 'boolean') normalized.featureEnabled = !builtInById
  normalized.outputAction = normalizeOutputAction(normalized.outputAction)
  normalized.visionDetail = normalizeVisionDetail(normalized.visionDetail)
  normalized.thinkingProvider = normalizeThinkingProvider(normalized.thinkingProvider)
  normalized.thinkingMode = normalizeThinkingMode(normalized.thinkingMode)
  normalized.thinkingEffort = normalizeThinkingEffort(normalized.thinkingEffort)
  if (typeof normalized.headersText !== 'string') normalized.headersText = ''
  if (!hasSavedExtraBodyText) normalized.extraBodyText = normalized.stream ? DEFAULT_STREAM_EXTRA_BODY_TEXT : ''
  if (typeof normalized.thinkingBudgetText !== 'string') normalized.thinkingBudgetText = ''

  return normalizeAgentExtraBodyText(normalized)
}

function normalizeChatMessage(message: unknown): ChatMessage | null {
  if (!message || typeof message !== 'object') return null
  const value = message as Partial<ChatMessage>
  if (value.role !== 'user' && value.role !== 'assistant') return null

  return {
    id: typeof value.id === 'string' && value.id ? value.id : createStoredId(),
    role: value.role,
    content: typeof value.content === 'string' ? value.content : '',
    reasoning: typeof value.reasoning === 'string' ? value.reasoning : '',
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : Date.now()
  }
}

function normalizeChatSession(session: unknown): ChatSession | null {
  if (!session || typeof session !== 'object') return null
  const value = session as Partial<ChatSession>
  const messages = Array.isArray(value.messages)
    ? value.messages.map(normalizeChatMessage).filter((message): message is ChatMessage => message !== null)
    : []

  return {
    id: typeof value.id === 'string' && value.id ? value.id : createStoredId(),
    agentId: typeof value.agentId === 'string' ? value.agentId : '',
    title: typeof value.title === 'string' ? value.title : '',
    messages,
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : Date.now(),
    updatedAt: typeof value.updatedAt === 'number' ? value.updatedAt : Date.now()
  }
}

function mergeDefaults(savedAgents: AgentConfig[]): AgentConfig[] {
  const defaults = createDefaultAgents()
  const byId = new Map(savedAgents.map((agent) => [agent.id, normalizeAgent(agent)]))

  const builtIns = defaults.map((agent) => {
    const saved = byId.get(agent.id)
    if (!saved) return { ...agent, builtIn: true }

    return {
      ...agent,
      ...saved,
      systemPrompt:
        typeof saved.systemPrompt === 'string' && !isLegacyBuiltInSystemPrompt(agent.id, saved.systemPrompt)
          ? saved.systemPrompt
          : agent.systemPrompt,
      builtIn: true
    }
  })

  const custom = savedAgents
    .filter((agent) => !isBuiltInAgentId(agent.id))
    .map((agent) => ({ ...normalizeAgent(agent), builtIn: false }))

  return [...builtIns, ...custom]
}

function normalizeHistoryRecord(record: unknown): AgentHistoryRecord | null {
  if (!record || typeof record !== 'object') return null
  const value = record as Partial<AgentHistoryRecord>
  const attachments = Array.isArray(value.attachments)
    ? value.attachments
        .map((attachment): AgentHistoryAttachment | null => {
          if (!attachment || typeof attachment !== 'object') return null
          const image = attachment as Partial<AgentHistoryRecord['attachments'][number]>
          const normalized: AgentHistoryAttachment = {
            id: typeof image.id === 'string' && image.id ? image.id : createStoredId(),
            name: typeof image.name === 'string' && image.name ? image.name : 'Image',
            mimeType: typeof image.mimeType === 'string' && image.mimeType ? image.mimeType : 'image/png',
            sizeBytes: typeof image.sizeBytes === 'number' ? image.sizeBytes : 0,
            source:
              image.source === 'file' ||
              image.source === 'clipboard' ||
              image.source === 'screenshot' ||
              image.source === 'launch' ||
              image.source === 'history'
                ? image.source
                : 'history',
          }
          if (typeof image.dataUrl === 'string') normalized.dataUrl = image.dataUrl
          return normalized
        })
        .filter((attachment): attachment is AgentHistoryRecord['attachments'][number] => attachment !== null)
    : []

  return {
    id: typeof value.id === 'string' && value.id ? value.id : createStoredId(),
    agentId: typeof value.agentId === 'string' ? value.agentId : '',
    title:
      typeof value.title === 'string'
        ? value.title
        : createLocalHistoryTitle(value.input || '', value.output || '', attachments, '', DEFAULT_PLUGIN_SETTINGS),
    input: typeof value.input === 'string' ? value.input : '',
    output: typeof value.output === 'string' ? value.output : '',
    reasoning: typeof value.reasoning === 'string' ? value.reasoning : '',
    attachments,
    createdAt: typeof value.createdAt === 'number' ? value.createdAt : Date.now()
  }
}

function pruneHistory(history: AgentHistoryRecord[], agents: AgentConfig[], limit: number): AgentHistoryRecord[] {
  const agentIds = new Set(agents.map((agent) => agent.id))
  const counts = new Map<string, number>()

  return [...history]
    .filter((record) => agentIds.has(record.agentId))
    .sort((left, right) => right.createdAt - left.createdAt)
    .filter((record) => {
      const count = counts.get(record.agentId) || 0
      if (count >= limit) return false
      counts.set(record.agentId, count + 1)
      return true
    })
}

function pruneChatSessions(sessions: ChatSession[], agents: AgentConfig[], limit: number): ChatSession[] {
  const agentIds = new Set(agents.map((agent) => agent.id))
  const counts = new Map<string, number>()

  return [...sessions]
    .filter((session) => agentIds.has(session.agentId))
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .filter((session) => {
      const count = counts.get(session.agentId) || 0
      if (count >= limit) return false
      counts.set(session.agentId, count + 1)
      return true
    })
}

export function createInitialState(): AppState {
  const agents = createDefaultAgents()
  return {
    agents,
    activeAgentId: agents[0]?.id || '',
    history: [],
    chatSessions: [],
    settings: { ...DEFAULT_PLUGIN_SETTINGS }
  }
}

export function loadState(): AppState {
  const fallback = createInitialState()
  try {
    const saved = window.ztools?.dbStorage?.getItem<AppState>(STATE_KEY)
    if (!saved || !Array.isArray(saved.agents)) return fallback

    const settings = normalizePluginSettings(saved.settings)
    const agents = mergeDefaults(saved.agents)
    const activeAgentId = agents.some((agent) => agent.id === saved.activeAgentId)
      ? saved.activeAgentId
      : agents[0]?.id || ''

    const history = Array.isArray(saved.history)
      ? pruneHistory(
          saved.history.map(normalizeHistoryRecord).filter((record): record is AgentHistoryRecord => record !== null),
          agents,
          settings.historyLimitPerAgent
        )
      : []
    const chatSessions = Array.isArray(saved.chatSessions)
      ? pruneChatSessions(
          saved.chatSessions
            .map(normalizeChatSession)
            .filter((session): session is ChatSession => session !== null),
          agents,
          settings.historyLimitPerAgent
        )
      : []

    return { agents, activeAgentId, history, chatSessions, settings }
  } catch {
    return fallback
  }
}

export function saveState(state: AppState): void {
  const agents = state.agents.map(cloneAgent)
  const settings = normalizePluginSettings(state.settings)
  const payload: AppState = {
    agents,
    activeAgentId: state.activeAgentId,
    history: pruneHistory(state.history.map(cloneHistoryRecord), agents, settings.historyLimitPerAgent),
    chatSessions: pruneChatSessions(state.chatSessions.map(cloneChatSession), agents, settings.historyLimitPerAgent),
    settings
  }
  window.ztools?.dbStorage?.setItem(STATE_KEY, payload)
}
