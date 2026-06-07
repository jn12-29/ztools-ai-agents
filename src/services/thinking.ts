import type { AgentConfig, ThinkingEffort, ThinkingMode, ThinkingProvider } from '../types'

export interface SelectOption<T extends string> {
  value: T
  label: string
}

const DEFAULT_MODE_OPTIONS: SelectOption<ThinkingMode>[] = [
  { value: 'default', label: '默认' },
  { value: 'on', label: '开启' },
  { value: 'off', label: '关闭' }
]

const OPENAI_EFFORT_OPTIONS: SelectOption<ThinkingEffort>[] = [
  { value: '', label: '默认' },
  { value: 'none', label: 'None' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'xhigh', label: 'XHigh' }
]

const OPENAI_GPT_5_1_EFFORT_OPTIONS: SelectOption<ThinkingEffort>[] = [
  { value: '', label: '默认' },
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
]

const OPENAI_GPT_5_EFFORT_OPTIONS: SelectOption<ThinkingEffort>[] = [
  { value: '', label: '默认' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
]

const OPENAI_LEGACY_REASONING_EFFORT_OPTIONS: SelectOption<ThinkingEffort>[] = [
  { value: '', label: '默认' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
]

const OPENAI_GPT_5_PRO_EFFORT_OPTIONS: SelectOption<ThinkingEffort>[] = [
  { value: '', label: '默认' },
  { value: 'high', label: 'High' }
]

const DEEPSEEK_EFFORT_OPTIONS: SelectOption<ThinkingEffort>[] = [
  { value: '', label: '默认' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'xhigh', label: 'XHigh' },
  { value: 'max', label: 'Max' }
]

const GEMINI_EFFORT_OPTIONS: SelectOption<ThinkingEffort>[] = [
  { value: '', label: '默认' },
  { value: 'none', label: 'None' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
]

export const THINKING_PROVIDER_OPTIONS: SelectOption<ThinkingProvider>[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'openai', label: 'OpenAI / GPT' },
  { value: 'qwen', label: 'Qwen' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'deepseek', label: 'DeepSeek' }
]

const DEFAULT_MODEL_THINKING_PROVIDER: ThinkingProvider = 'openai'

function normalizedModelId(model: string): string {
  return model.trim().toLowerCase()
}

export function inferThinkingProvider(model: string): ThinkingProvider {
  const normalized = normalizedModelId(model)

  if (!normalized) return DEFAULT_MODEL_THINKING_PROVIDER
  if (normalized.includes('deepseek')) return 'deepseek'
  if (normalized.includes('qwen') || normalized.includes('qwq') || normalized.includes('qvq')) return 'qwen'
  if (normalized.includes('gemini')) return 'gemini'
  if (
    normalized.includes('gpt') ||
    normalized.startsWith('o1') ||
    normalized.startsWith('o3') ||
    normalized.startsWith('o4') ||
    normalized.startsWith('codex')
  ) {
    return 'openai'
  }

  return 'auto'
}

export function resolveThinkingProvider(provider: ThinkingProvider, model: string): ThinkingProvider {
  if (provider !== 'auto') return provider
  return inferThinkingProvider(model)
}

export function getThinkingModeOptions(): SelectOption<ThinkingMode>[] {
  return DEFAULT_MODE_OPTIONS
}

export function getThinkingEffortOptions(provider: ThinkingProvider, model: string): SelectOption<ThinkingEffort>[] {
  const resolvedProvider = resolveThinkingProvider(provider, model)

  if (resolvedProvider === 'openai') {
    return getOpenAiEffortOptions(model)
  }

  if (resolvedProvider === 'deepseek') return DEEPSEEK_EFFORT_OPTIONS
  if (resolvedProvider === 'gemini') return GEMINI_EFFORT_OPTIONS
  return [{ value: '', label: '默认' }]
}

function getOpenAiEffortOptions(model: string): SelectOption<ThinkingEffort>[] {
  const normalized = normalizedModelId(model)
  if (!normalized) return OPENAI_EFFORT_OPTIONS
  if (normalized.includes('gpt-5-pro')) return OPENAI_GPT_5_PRO_EFFORT_OPTIONS
  if (normalized.includes('gpt-5.1') && !normalized.includes('codex-max')) return OPENAI_GPT_5_1_EFFORT_OPTIONS
  if (normalized.startsWith('gpt-5') && !normalized.includes('codex-max')) return OPENAI_GPT_5_EFFORT_OPTIONS
  if (
    normalized.startsWith('o1') ||
    normalized.startsWith('o3') ||
    normalized.startsWith('o4')
  ) {
    return OPENAI_LEGACY_REASONING_EFFORT_OPTIONS
  }

  return OPENAI_EFFORT_OPTIONS
}

export function supportsThinkingEffort(provider: ThinkingProvider, model: string): boolean {
  const resolvedProvider = resolveThinkingProvider(provider, model)
  return resolvedProvider === 'openai' || resolvedProvider === 'deepseek' || resolvedProvider === 'gemini'
}

export function supportsThinkingMode(provider: ThinkingProvider, model: string): boolean {
  const resolvedProvider = resolveThinkingProvider(provider, model)
  return resolvedProvider === 'openai' || resolvedProvider === 'qwen' || resolvedProvider === 'gemini' || resolvedProvider === 'deepseek'
}

export function supportsThinkingBudget(provider: ThinkingProvider, model: string): boolean {
  const resolvedProvider = resolveThinkingProvider(provider, model)
  return resolvedProvider === 'qwen' || resolvedProvider === 'gemini'
}

function resolveSupportedEffort(provider: ThinkingProvider, model: string, effort: ThinkingEffort): ThinkingEffort {
  if (!effort) return ''
  return getThinkingEffortOptions(provider, model).some((option) => option.value === effort) ? effort : ''
}

export function parseThinkingBudgetText(text: string): number | undefined {
  const trimmed = text.trim()
  if (!trimmed) return undefined

  if (!/^-?\d+$/.test(trimmed)) {
    throw new Error('Thinking budget 必须是整数')
  }

  return Number.parseInt(trimmed, 10)
}

function withExtraBody(extraBody?: Record<string, unknown>): Record<string, unknown> {
  return extraBody ? { ...extraBody } : {}
}

function copyObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  return { ...(value as Record<string, unknown>) }
}

function removeNestedThinkingConfig(container: Record<string, unknown>, key: string): void {
  const nested = copyObject(container[key])
  if (!nested) return

  delete nested.thinking_config

  if (Object.keys(nested).length === 0) {
    delete container[key]
  } else {
    container[key] = nested
  }
}

function removeThinkingKeys(extraBody: Record<string, unknown>): void {
  delete extraBody.enable_thinking
  delete extraBody.thinking_budget
  delete extraBody.reasoning_effort
  delete extraBody.thinking

  removeNestedThinkingConfig(extraBody, 'google')

  const geminiExtraBody = copyObject(extraBody.extra_body)
  if (geminiExtraBody) {
    removeNestedThinkingConfig(geminiExtraBody, 'google')
    delete geminiExtraBody.thinking_config

    if (Object.keys(geminiExtraBody).length === 0) {
      delete extraBody.extra_body
    } else {
      extraBody.extra_body = geminiExtraBody
    }
  }
}

function mergeGeminiProviderConfig(
  extraBody: Record<string, unknown>,
  thinkingConfig: Record<string, unknown>
): void {
  const geminiExtraBody = copyObject(extraBody.extra_body) || {}
  const googleConfig = copyObject(geminiExtraBody.google) || {}
  googleConfig.thinking_config = thinkingConfig
  geminiExtraBody.google = googleConfig
  extraBody.extra_body = geminiExtraBody
}

function mergeGeminiThinkingConfig(
  extraBody: Record<string, unknown>,
  mode: ThinkingMode,
  effort: ThinkingEffort,
  budget: number | undefined
): void {
  if (budget !== undefined) {
    mergeGeminiProviderConfig(extraBody, { thinking_budget: budget })
    return
  }

  if (mode === 'off') {
    mergeGeminiProviderConfig(extraBody, { thinking_budget: 0 })
    return
  }

  if (mode === 'on') {
    extraBody.reasoning_effort = effort || 'low'
  } else if (effort) {
    extraBody.reasoning_effort = effort
  }
}

export function applyThinkingConfig(
  agent: AgentConfig,
  extraBody?: Record<string, unknown>
): Record<string, unknown> | undefined {
  const provider = resolveThinkingProvider(agent.thinkingProvider, agent.model)
  if (provider === 'auto') {
    if (agent.thinkingMode !== 'off') return extraBody

    const merged = withExtraBody(extraBody)
    removeThinkingKeys(merged)
    return Object.keys(merged).length > 0 ? merged : undefined
  }

  const effort = resolveSupportedEffort(agent.thinkingProvider, agent.model, agent.thinkingEffort)
  const usesBudget = supportsThinkingBudget(agent.thinkingProvider, agent.model) && agent.thinkingMode !== 'off'
  const hasThinkingOverride =
    agent.thinkingMode !== 'default' || Boolean(effort) || (usesBudget && Boolean(agent.thinkingBudgetText.trim()))

  if (!hasThinkingOverride) return extraBody

  const budget = usesBudget ? parseThinkingBudgetText(agent.thinkingBudgetText) : undefined
  if (provider === 'qwen' && budget !== undefined && budget <= 0) {
    throw new Error('Qwen thinking budget 必须是正整数')
  }

  if (provider === 'gemini' && budget !== undefined && budget < -1) {
    throw new Error('Gemini thinking budget 不能小于 -1')
  }

  const merged = withExtraBody(extraBody)

  removeThinkingKeys(merged)

  if (provider === 'openai') {
    if (agent.thinkingMode === 'on') {
      merged.reasoning_effort = effort || 'medium'
    } else if (agent.thinkingMode !== 'off' && effort) {
      merged.reasoning_effort = effort
    }
  }

  if (provider === 'deepseek') {
    if (agent.thinkingMode === 'on') merged.thinking = { type: 'enabled' }
    if (agent.thinkingMode === 'off') merged.thinking = { type: 'disabled' }
    if (agent.thinkingMode !== 'off' && effort) {
      merged.reasoning_effort = effort === 'max' || effort === 'xhigh' ? 'max' : 'high'
    }
  }

  if (provider === 'qwen') {
    if (agent.thinkingMode === 'on' || budget !== undefined) merged.enable_thinking = true
    if (agent.thinkingMode === 'off') merged.enable_thinking = false
    if (budget !== undefined) merged.thinking_budget = budget
  }

  if (provider === 'gemini') {
    mergeGeminiThinkingConfig(merged, agent.thinkingMode, effort, budget)
  }

  return Object.keys(merged).length > 0 ? merged : undefined
}
