import type { AbortablePromise, AgentConfig, ChatMessage, RunResult, VisualAttachment } from '../types'
import { parseAgentRequestConfig } from './jsonConfig'
import { visionDetailForRequest } from './visualAttachments'

function renderTemplate(template: string, input: string): string {
  return template.includes('{{input}}') ? template.split('{{input}}').join(input) : `${template}\n\n${input}`
}

type UserContentPart =
  | {
      type: 'text'
      text: string
    }
  | {
      type: 'image_url'
      image_url: {
        url: string
        detail?: 'low' | 'high'
      }
    }

type AiRequestMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string | UserContentPart[]
}

function buildUserContent(agent: AgentConfig, input: string, attachments: VisualAttachment[]): string | UserContentPart[] {
  const text = renderTemplate(agent.userTemplate, input)
  if (attachments.length === 0) return text

  const detail = visionDetailForRequest(agent.visionDetail)
  const parts: UserContentPart[] = []
  parts.push({
    type: 'text',
    text: text.trim() || 'Please process the attached image(s) according to the system prompt.'
  })

  for (const attachment of attachments) {
    parts.push({
      type: 'image_url',
      image_url: {
        url: attachment.dataUrl,
        ...(detail ? { detail } : {})
      }
    })
  }

  return parts
}

function shouldStream(extraBody: Record<string, unknown> | undefined): boolean {
  return extraBody?.stream === true
}

function extraBodyForRequest(extraBody: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!extraBody) return undefined
  const requestExtraBody = { ...extraBody }
  delete requestExtraBody.stream
  return Object.keys(requestExtraBody).length > 0 ? requestExtraBody : undefined
}

async function runCompletion(
  agent: AgentConfig,
  messages: AiRequestMessage[],
  onChunk: (chunk: RunResult) => void,
  onRequest?: (request: AbortablePromise<unknown>) => void
): Promise<RunResult> {
  const { headers, extraBody } = parseAgentRequestConfig(agent.headersText, agent.extraBodyText)
  const stream = shouldStream(extraBody)
  const requestExtraBody = extraBodyForRequest(extraBody)

  if (stream) {
    let content = ''
    let reasoning = ''
    const request = window.ztools.ai(
      {
        model: agent.model || undefined,
        messages: messages as unknown as ZToolsAiMessage[],
        headers,
        extraBody: requestExtraBody
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
    messages: messages as unknown as ZToolsAiMessage[],
    headers,
    extraBody: requestExtraBody
  })
  onRequest?.(request as AbortablePromise<unknown>)
  const response = await request

  return {
    content: response.content || '',
    reasoning: response.reasoning_content || ''
  }
}

export async function runAgent(
  agent: AgentConfig,
  input: string,
  attachments: VisualAttachment[],
  onChunk: (chunk: RunResult) => void,
  onRequest?: (request: AbortablePromise<unknown>) => void
): Promise<RunResult> {
  if (attachments.length > 0 && !agent.allowVision) {
    throw new Error('当前 Agent 未开启图片输入')
  }

  return runCompletion(
    agent,
    [
      {
        role: 'system',
        content: agent.systemPrompt
      },
      {
        role: 'user',
        content: buildUserContent(agent, input, attachments)
      }
    ],
    onChunk,
    onRequest
  )
}

export async function runChatAgent(
  agent: AgentConfig,
  previousMessages: ChatMessage[],
  input: string,
  attachments: VisualAttachment[],
  onChunk: (chunk: RunResult) => void,
  onRequest?: (request: AbortablePromise<unknown>) => void
): Promise<RunResult> {
  if (attachments.length > 0 && !agent.allowVision) {
    throw new Error('当前 Agent 未开启图片输入')
  }

  const messages: AiRequestMessage[] = [
    {
      role: 'system',
      content: agent.systemPrompt
    },
    ...previousMessages
      .filter((message) => message.content.trim())
      .map((message): AiRequestMessage => ({
        role: message.role,
        content: message.content
      })),
    {
      role: 'user',
      content: buildUserContent(agent, input, attachments)
    }
  ]

  return runCompletion(agent, messages, onChunk, onRequest)
}
