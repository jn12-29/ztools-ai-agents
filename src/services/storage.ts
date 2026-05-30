import type { AgentConfig, AppState } from '../types'
import { createDefaultAgents, isBuiltInAgentId } from './defaultAgents'

const STATE_KEY = 'state'

function cloneAgent(agent: AgentConfig): AgentConfig {
  return { ...agent }
}

function mergeDefaults(savedAgents: AgentConfig[]): AgentConfig[] {
  const defaults = createDefaultAgents()
  const byId = new Map(savedAgents.map((agent) => [agent.id, agent]))

  const builtIns = defaults.map((agent) => ({
    ...agent,
    ...(byId.get(agent.id) || {}),
    builtIn: true
  }))

  const custom = savedAgents
    .filter((agent) => !isBuiltInAgentId(agent.id))
    .map((agent) => ({ ...agent, builtIn: false }))

  return [...builtIns, ...custom]
}

export function createInitialState(): AppState {
  const agents = createDefaultAgents()
  return {
    agents,
    activeAgentId: agents[0]?.id || ''
  }
}

export function loadState(): AppState {
  const fallback = createInitialState()
  try {
    const saved = window.ztools?.dbStorage?.getItem<AppState>(STATE_KEY)
    if (!saved || !Array.isArray(saved.agents)) return fallback

    const agents = mergeDefaults(saved.agents)
    const activeAgentId = agents.some((agent) => agent.id === saved.activeAgentId)
      ? saved.activeAgentId
      : agents[0]?.id || ''

    return {
      agents,
      activeAgentId
    }
  } catch {
    return fallback
  }
}

export function saveState(state: AppState): void {
  const payload: AppState = {
    agents: state.agents.map(cloneAgent),
    activeAgentId: state.activeAgentId
  }
  window.ztools?.dbStorage?.setItem(STATE_KEY, payload)
}
