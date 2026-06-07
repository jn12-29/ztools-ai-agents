const fs = require('fs')
const http = require('http')
const https = require('https')
const path = require('path')
const { clipboard } = require('electron')

const IMAGE_MIME_TYPES = {
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp'
}

function imagePayloadFromDataUrl(dataUrl, name) {
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(dataUrl)
  if (!match) return null

  return {
    name,
    mimeType: match[1].toLowerCase(),
    dataUrl,
    sizeBytes: Buffer.byteLength(match[2], 'base64')
  }
}

function imagePayloadFromFile(filePath) {
  const mimeType = IMAGE_MIME_TYPES[path.extname(filePath).toLowerCase()]
  if (!mimeType) throw new Error('仅支持 PNG、JPG、WebP 和 GIF 图片')

  const buffer = fs.readFileSync(filePath)
  return {
    name: path.basename(filePath),
    mimeType,
    dataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`,
    sizeBytes: buffer.byteLength
  }
}

function parseDataUrl(dataUrl) {
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(dataUrl)
  if (!match) throw new Error('图片数据格式无效')
  return {
    mimeType: match[1].toLowerCase(),
    buffer: Buffer.from(match[2], 'base64')
  }
}

function requestJson(url, body, headers) {
  return new Promise((resolve, reject) => {
    const target = new URL(url)
    const client = target.protocol === 'https:' ? https : http
    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      reject(new Error('OCR Endpoint 仅支持 HTTP/HTTPS'))
      return
    }

    const request = client.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port,
        path: `${target.pathname}${target.search}`,
        method: 'POST',
        headers: {
          ...headers,
          'Content-Length': body.byteLength
        },
        timeout: 120000
      },
      (response) => {
        const chunks = []
        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`OCR 服务返回 ${response.statusCode || 'unknown'}: ${text}`))
            return
          }

          try {
            resolve(JSON.parse(text))
          } catch {
            reject(new Error('OCR 服务返回的 JSON 无效'))
          }
        })
      }
    )

    request.on('timeout', () => {
      request.destroy(new Error('OCR 请求超时'))
    })
    request.on('error', reject)
    request.write(body)
    request.end()
  })
}

function requestNativeOcr(endpoint, image) {
  const parsed = parseDataUrl(image.dataUrl)
  const boundary = `----ai-agents-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  const filename = String(image.name || 'image').replace(/"/g, "'")
  const head = Buffer.from(
    [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="${filename}"`,
      `Content-Type: ${parsed.mimeType}`,
      '',
      ''
    ].join('\r\n')
  )
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`)
  const body = Buffer.concat([head, parsed.buffer, tail])

  return requestJson(endpoint, body, {
    'Content-Type': `multipart/form-data; boundary=${boundary}`
  })
}

window.aiAgentsServices = {
  version: '0.1.0',
  readClipboardText() {
    return clipboard.readText()
  },
  readClipboardImage() {
    const image = clipboard.readImage()
    if (image.isEmpty()) return null
    return imagePayloadFromDataUrl(image.toDataURL(), 'Clipboard Image')
  },
  readImageFile(filePath) {
    return imagePayloadFromFile(filePath)
  },
  runNativeOcr(endpoint, image) {
    return requestNativeOcr(endpoint, image)
  }
}
