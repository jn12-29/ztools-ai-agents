import type { AgentHistoryAttachment, VisualAttachment, VisualAttachmentSource, VisionDetail } from '../types'

export const MAX_VISUAL_ATTACHMENTS = 4
export const MAX_VISUAL_ATTACHMENT_BYTES = 4 * 1024 * 1024

const SUPPORTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const DATA_URL_PATTERN = /^data:([^;,]+);base64,(.+)$/i

interface ParsedDataUrl {
  mimeType: string
  bytes: Uint8Array
}

function createVisualId(prefix: string): string {
  if (crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

function ensureDataUrl(value: string, fallbackMimeType = 'image/png'): string {
  const trimmed = value.trim()
  if (trimmed.startsWith('data:')) return trimmed
  return `data:${fallbackMimeType};base64,${trimmed}`
}

function parseDataUrl(dataUrl: string): ParsedDataUrl {
  const normalized = ensureDataUrl(dataUrl)
  const match = normalized.match(DATA_URL_PATTERN)
  if (!match) {
    throw new Error('图片数据格式无效')
  }

  const mimeType = match[1].toLowerCase()
  if (!SUPPORTED_IMAGE_TYPES.has(mimeType)) {
    throw new Error('仅支持 PNG、JPG、WebP 和 GIF 图片')
  }

  const raw = atob(match[2])
  const bytes = new Uint8Array(raw.length)
  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index)
  }

  if (bytes.byteLength > MAX_VISUAL_ATTACHMENT_BYTES) {
    throw new Error(`单张图片不能超过 ${formatBytes(MAX_VISUAL_ATTACHMENT_BYTES)}`)
  }

  return { mimeType, bytes }
}

function bytesToDataUrl(bytes: Uint8Array, mimeType: string): string {
  let raw = ''
  for (let index = 0; index < bytes.byteLength; index += 1) {
    raw += String.fromCharCode(bytes[index])
  }
  return `data:${mimeType};base64,${btoa(raw)}`
}

export function formatBytes(sizeBytes: number): string {
  if (sizeBytes >= 1024 * 1024) return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`
  if (sizeBytes >= 1024) return `${Math.ceil(sizeBytes / 1024)} KB`
  return `${sizeBytes} B`
}

export function sourceLabel(source: VisualAttachmentSource): string {
  if (source === 'clipboard') return '剪贴板'
  if (source === 'screenshot') return '截图'
  if (source === 'launch') return '命令'
  if (source === 'history') return '历史'
  return '文件'
}

export function createVisualAttachment(
  dataUrl: string,
  source: VisualAttachmentSource,
  name: string
): VisualAttachment {
  const normalizedDataUrl = ensureDataUrl(dataUrl)
  const parsed = parseDataUrl(normalizedDataUrl)

  return {
    id: createVisualId('visual'),
    name: name.trim() || 'Image',
    mimeType: parsed.mimeType,
    sizeBytes: parsed.bytes.byteLength,
    source,
    dataUrl: normalizedDataUrl
  }
}

export function storeHistoryAttachments(attachments: VisualAttachment[]): AgentHistoryAttachment[] {
  return attachments.map((attachment) => {
    const parsed = parseDataUrl(attachment.dataUrl)
    const id = createVisualId('history-image')
    const baseRecord: AgentHistoryAttachment = {
      id,
      name: attachment.name,
      mimeType: parsed.mimeType,
      sizeBytes: parsed.bytes.byteLength,
      source: attachment.source
    }

    if (window.ztools?.db?.postAttachment) {
      try {
        window.ztools.db.postAttachment(id, parsed.bytes, parsed.mimeType)
        return baseRecord
      } catch {
        return { ...baseRecord, dataUrl: attachment.dataUrl }
      }
    }

    return { ...baseRecord, dataUrl: attachment.dataUrl }
  })
}

export function loadHistoryAttachments(attachments: AgentHistoryAttachment[] = []): VisualAttachment[] {
  return attachments
    .map((attachment): VisualAttachment | null => {
      if (attachment.dataUrl) {
        return {
          ...attachment,
          source: 'history' as const,
          dataUrl: attachment.dataUrl
        }
      }

      const bytes = window.ztools?.db?.getAttachment?.(attachment.id)
      if (!bytes) return null

      return {
        ...attachment,
        source: 'history' as const,
        dataUrl: bytesToDataUrl(bytes, attachment.mimeType)
      }
    })
    .filter((attachment): attachment is VisualAttachment => attachment !== null)
}

export function removeHistoryAttachments(records: { attachments?: AgentHistoryAttachment[] }[]): void {
  for (const record of records) {
    for (const attachment of record.attachments || []) {
      if (!attachment.dataUrl) window.ztools?.db?.remove?.(attachment.id)
    }
  }
}

export function visionDetailForRequest(detail: VisionDetail): 'low' | 'high' | undefined {
  if (detail === 'low' || detail === 'high') return detail
  return undefined
}
