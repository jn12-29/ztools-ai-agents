import type { AgentConfig, ThinkingEffort } from '../types'
import { parseAgentRequestConfig } from './jsonConfig'
import {
  applyThinkingConfig,
  resolveThinkingEffort,
  resolveThinkingProvider
} from './thinking'

export const DEFAULT_STREAM_EXTRA_BODY_TEXT = '{\n  "stream": true\n}'

function formatJsonObject(value: Record<string, unknown>): string {
  return JSON.stringify(value, null, 2)
}

function parseExtraBodyText(text: unknown): Record<string, unknown> | undefined {
  if (typeof text !== 'string') return undefined
  return parseAgentRequestConfig('', text).extraBody
}

function copyObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

function readSupportedEffort(agent: AgentConfig, value: unknown): ThinkingEffort {
  if (typeof value !== 'string') return ''
  return resolveThinkingEffort(agent.thinkingProvider, agent.model, value as ThinkingEffort)
}

function readGeminiBudget(extraBody: Record<string, unknown>): number | undefined {
  const nestedExtraBody = copyObject(extraBody.extra_body)
  const googleConfig = copyObject(nestedExtraBody?.google)
  const thinkingConfig = copyObject(googleConfig?.thinking_config) || copyObject(nestedExtraBody?.thinking_config)
  const budget = thinkingConfig?.thinking_budget
  return typeof budget === 'number' ? budget : undefined
}

function syncThinkingControlsFromExtraBody(agent: AgentConfig, extraBody: Record<string, unknown>): void {
  const provider = resolveThinkingProvider(agent.thinkingProvider, agent.model)
  const effort = readSupportedEffort(agent, extraBody.reasoning_effort)
  agent.thinkingMode = 'default'
  agent.thinkingEffort = ''
  agent.thinkingBudgetText = ''

  if (provider === 'qwen') {
    if (typeof extraBody.enable_thinking === 'boolean') {
      agent.thinkingMode = extraBody.enable_thinking ? 'on' : 'off'
    }
    if (typeof extraBody.thinking_budget === 'number') {
      agent.thinkingMode = 'on'
      agent.thinkingBudgetText = String(extraBody.thinking_budget)
    }
    return
  }

  if (provider === 'gemini') {
    const budget = readGeminiBudget(extraBody)
    if (budget !== undefined) {
      agent.thinkingMode = budget === 0 ? 'off' : 'on'
      agent.thinkingBudgetText = String(budget)
      return
    }
    if (effort) {
      agent.thinkingMode = 'default'
      agent.thinkingEffort = effort
    }
    return
  }

  if (provider === 'deepseek') {
    const thinking = copyObject(extraBody.thinking)
    if (thinking?.type === 'enabled') agent.thinkingMode = 'on'
    if (thinking?.type === 'disabled') agent.thinkingMode = 'off'
    if (effort) agent.thinkingEffort = effort
    return
  }

  if (provider === 'openai' && effort) {
    agent.thinkingMode = 'default'
    agent.thinkingEffort = effort
  }
}

export function buildExtraBodyFromAgentControls(agent: AgentConfig): Record<string, unknown> {
  const baseExtraBody = parseExtraBodyText(agent.extraBodyText) || {}
  const thinkingExtraBody = applyThinkingConfig(agent, baseExtraBody, true)
  const extraBody = thinkingExtraBody ? { ...thinkingExtraBody } : {}
  extraBody.stream = agent.stream
  return extraBody
}

export function syncAgentExtraBodyTextFromControls(agent: AgentConfig): void {
  if (agent.runTemplate === 'nativeOcr') return
  agent.extraBodyText = formatJsonObject(buildExtraBodyFromAgentControls(agent))
}

export function normalizeAgentExtraBodyText(agent: AgentConfig): AgentConfig {
  if (agent.runTemplate === 'nativeOcr') return agent
  const currentText = typeof agent.extraBodyText === 'string' ? agent.extraBodyText : ''
  agent.extraBodyText = currentText

  try {
    syncAgentControlsFromExtraBodyText(agent)
  } catch {
    agent.extraBodyText = currentText
  }
  return agent
}

export function syncAgentControlsFromExtraBodyText(agent: AgentConfig): void {
  if (agent.runTemplate === 'nativeOcr') return
  const extraBody = parseExtraBodyText(agent.extraBodyText) || {}
  agent.stream = extraBody.stream === true
  syncThinkingControlsFromExtraBody(agent, extraBody)
}
