import type { NativeOcrResponse, RunResult, VisualAttachment } from '../types'

function normalizeOcrResponse(response: NativeOcrResponse): NativeOcrResponse {
  return {
    texts: Array.isArray(response.texts) ? response.texts.map((text) => String(text)) : [],
    scores: Array.isArray(response.scores) ? response.scores.map((score) => Number(score)) : [],
    boxes: Array.isArray(response.boxes) ? response.boxes : []
  }
}

function formatSingleResult(attachment: VisualAttachment, response: NativeOcrResponse, includeName: boolean): string {
  const result = normalizeOcrResponse(response)
  const text = result.texts.join('\n').trim()
  if (!includeName) return text
  return [`[${attachment.name}]`, text || '(empty)'].join('\n')
}

export async function runNativeOcr(
  endpoint: string,
  attachments: VisualAttachment[],
  onProgress: (status: string) => void
): Promise<RunResult> {
  if (!window.aiAgentsServices?.runNativeOcr) {
    throw new Error('当前 ZTools preload 未提供本地 OCR 服务')
  }
  if (!endpoint.trim()) {
    throw new Error('请先配置本地 OCR Endpoint')
  }
  if (attachments.length === 0) {
    throw new Error('请先添加要识别的图片')
  }

  const parts: string[] = []
  for (const [index, attachment] of attachments.entries()) {
    onProgress(`识别中 ${index + 1}/${attachments.length}`)
    const response = await window.aiAgentsServices.runNativeOcr(endpoint.trim(), attachment)
    parts.push(formatSingleResult(attachment, response, attachments.length > 1))
  }

  return {
    content: parts.join('\n\n').trim(),
    reasoning: ''
  }
}
