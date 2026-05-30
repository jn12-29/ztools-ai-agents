import type { AbortablePromise, AgentConfig, RunResult } from '../types'
import { parseAgentRequestConfig } from './jsonConfig'

function renderTemplate(template: string, input: string): string {
  return template.includes('{{input}}') ? template.split('{{input}}').join(input) : `${template}\n\n${input}`
}

export async function runAgent(
  agent: AgentConfig,
  input: string,
  onChunk: (chunk: RunResult) => void,
  onRequest?: (request: AbortablePromise<unknown>) => void
): Promise<RunResult> {
  const { headers, extraBody } = parseAgentRequestConfig(agent.headersText, agent.extraBodyText)
  const messages = [
    {
      role: 'system' as const,
      content: agent.systemPrompt
    },
    {
      role: 'user' as const,
      content: renderTemplate(agent.userTemplate, input)
    }
  ]

  if (agent.stream) {
    let content = ''
    let reasoning = ''
    const request = window.ztools.ai(
      {
        model: agent.model || undefined,
        messages,
        headers,
        extraBody
      },
      (chunk) => {
        content += chunk.content || ''
        reasoning += chunk.reasoning_content || ''
        onChunk({ content, reasoning })
      }
    )
    onRequest?.(request as AbortablePromise<unknown>)
    await request
    return { content, reasoning }
  }

  const request = window.ztools.ai({
    model: agent.model || undefined,
    messages,
    headers,
    extraBody
  })
  onRequest?.(request as AbortablePromise<unknown>)
  const response = await request

  return {
    content: response.content || '',
    reasoning: response.reasoning_content || ''
  }
}
