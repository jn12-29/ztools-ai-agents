import type { AgentConfig } from '../types'

const FEATURE_PREFIX = 'agent-'

export function featureCodeForAgent(agent: AgentConfig): string {
  return `${FEATURE_PREFIX}${agent.id}`
}

function commandText(agent: AgentConfig): string[] {
  const normalized = agent.name.trim()
  const commands = new Set<string>()
  if (normalized) {
    commands.add(normalized)
    commands.add(`AI ${normalized}`)
  }
  commands.add(agent.id)
  return Array.from(commands)
}

export function registerAgentFeatures(agents: AgentConfig[]): void {
  const current = window.ztools?.getFeatures?.() || []
  const expectedCodes = new Set<string>()

  for (const agent of agents) {
    if (agent.builtIn || !agent.featureEnabled) continue

    const code = featureCodeForAgent(agent)
    expectedCodes.add(code)
    window.ztools.setFeature({
      code,
      explain: agent.description || agent.name,
      icon: 'logo.png',
      cmds: [
        ...commandText(agent),
        {
          type: 'over',
          label: agent.name
        }
      ]
    })
  }

  for (const feature of current) {
    if (typeof feature.code !== 'string') continue
    if (feature.code.startsWith(FEATURE_PREFIX) && !expectedCodes.has(feature.code)) {
      window.ztools.removeFeature(feature.code)
    }
  }
}

export function findAgentByFeatureCode(agents: AgentConfig[], code: string): AgentConfig | null {
  if (!code.startsWith(FEATURE_PREFIX)) return null
  const agentId = code.slice(FEATURE_PREFIX.length)
  return agents.find((agent) => agent.id === agentId) || null
}
