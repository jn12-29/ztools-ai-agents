/// <reference types="vite/client" />
/// <reference types="@ztools-center/ztools-api-types" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

interface ZToolsAiOption {
  headers?: Record<string, string>
  extraBody?: Record<string, unknown>
}

interface AiAgentsImagePayload {
  name: string
  mimeType: string
  dataUrl: string
  sizeBytes: number
}

interface AiAgentsNativeOcrResponse {
  texts: string[]
  scores: number[]
  boxes: unknown[]
}

interface Window {
  aiAgentsServices?: {
    version: string
    readClipboardText(): string
    readClipboardImage(): AiAgentsImagePayload | null
    readImageFile(filePath: string): AiAgentsImagePayload
    runNativeOcr(endpoint: string, image: AiAgentsImagePayload): Promise<AiAgentsNativeOcrResponse>
  }
}
