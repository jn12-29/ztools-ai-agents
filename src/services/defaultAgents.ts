import type { AgentConfig } from '../types'

export const DEFAULT_AGENT_IDS = ['translate', 'polish', 'explain'] as const

export function createDefaultAgents(): AgentConfig[] {
  return [
    {
      id: 'translate',
      name: '中英文翻译',
      description: '在中文和英文之间自然互译，保留格式和专业术语。',
      model: '',
      systemPrompt:
        'You are a professional Chinese-English translator. Translate the user input between Chinese and English. Preserve structure, terminology, code, URLs, and formatting. Return only the translation.',
      userTemplate: '{{input}}',
      stream: true,
      showReasoning: false,
      outputAction: 'show',
      headersText: '',
      extraBodyText: '',
      featureEnabled: false,
      builtIn: true
    },
    {
      id: 'polish',
      name: '润色转写',
      description: '润色文本，提升清晰度、语气和表达质量。',
      model: '',
      systemPrompt:
        'You are a careful writing editor. Rewrite the user input to be clear, concise, and polished while preserving the original meaning. Keep the original language unless the user asks otherwise. Return only the rewritten text.',
      userTemplate: '{{input}}',
      stream: true,
      showReasoning: false,
      outputAction: 'show',
      headersText: '',
      extraBodyText: '',
      featureEnabled: false,
      builtIn: true
    },
    {
      id: 'explain',
      name: '中英文解读',
      description: '解释中文或英文内容，提炼含义、背景和注意点。',
      model: '',
      systemPrompt:
        'You are a bilingual reading assistant. Explain the user input in Chinese. Cover the main idea, key terms, context, and any nuance that may be easy to miss. Be accurate and concise.',
      userTemplate: '{{input}}',
      stream: true,
      showReasoning: false,
      outputAction: 'show',
      headersText: '',
      extraBodyText: '',
      featureEnabled: false,
      builtIn: true
    }
  ]
}

export function isBuiltInAgentId(id: string): boolean {
  return DEFAULT_AGENT_IDS.includes(id as (typeof DEFAULT_AGENT_IDS)[number])
}
