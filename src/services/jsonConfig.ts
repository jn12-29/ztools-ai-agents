import type { ValidationResult } from '../types'

function parseJsonObject(text: string, label: string): Record<string, unknown> | undefined {
  const trimmed = text.trim()
  if (!trimmed) return undefined

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`${label} JSON 格式错误：${message}`)
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`${label} 必须是 JSON object`)
  }

  return parsed as Record<string, unknown>
}

export function parseAgentRequestConfig(
  headersText: string,
  extraBodyText: string
): ValidationResult {
  const rawHeaders = parseJsonObject(headersText, 'Headers')
  const extraBody = parseJsonObject(extraBodyText, 'Extra body')
  const headers = rawHeaders
    ? Object.fromEntries(
        Object.entries(rawHeaders).map(([key, value]) => [key, String(value)])
      )
    : undefined

  return { headers, extraBody }
}
