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

function headerValueToString(key: string, value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  throw new Error(`Headers ${key} 必须是 string、number 或 boolean`)
}

export function parseAgentRequestConfig(
  headersText: string,
  extraBodyText: string
): ValidationResult {
  const rawHeaders = parseJsonObject(headersText, 'Headers')
  const extraBody = parseJsonObject(extraBodyText, 'Extra body')
  if (extraBody && 'stream' in extraBody && typeof extraBody.stream !== 'boolean') {
    throw new Error('Extra body stream 必须是 boolean')
  }
  const headers = rawHeaders
    ? Object.fromEntries(
        Object.entries(rawHeaders).map(([key, value]) => [key, headerValueToString(key, value)])
      )
    : undefined

  return { headers, extraBody }
}
