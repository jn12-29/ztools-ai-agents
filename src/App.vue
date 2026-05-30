<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import {
  Bot,
  Braces,
  Check,
  Clipboard,
  Copy,
  FileText,
  Languages,
  Loader2,
  MessageSquareText,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Sparkles,
  Square,
  Trash2
} from 'lucide-vue-next'
import type { AbortablePromise, AgentConfig, AiModel, LaunchAction, OutputAction } from './types'
import { loadState, saveState } from './services/storage'
import { createDefaultAgents, isBuiltInAgentId } from './services/defaultAgents'
import { parseAgentRequestConfig } from './services/jsonConfig'
import { runAgent } from './services/ai'
import {
  featureCodeForAgent,
  findAgentByFeatureCode,
  registerAgentFeatures
} from './services/features'

const state = reactive(loadState())
const models = ref<AiModel[]>([])
const view = ref<'run' | 'settings'>('run')
const output = ref('')
const reasoning = ref('')
const error = ref('')
const status = ref('')
const running = ref(false)
const inputText = ref('')
const currentRequest = ref<AbortablePromise<unknown> | null>(null)

const activeAgent = computed(() => {
  return state.agents.find((agent) => agent.id === state.activeAgentId) || state.agents[0] || null
})

const modelLabel = computed(() => {
  if (!activeAgent.value?.model) return '默认模型'
  return models.value.find((model) => model.id === activeAgent.value?.model)?.label || activeAgent.value.model
})

const featureSyncKey = computed(() => {
  return state.agents
    .map((agent) =>
      [agent.id, agent.name, agent.description, agent.featureEnabled ? '1' : '0', agent.builtIn ? '1' : '0'].join(':')
    )
    .join('|')
})

function now(): number {
  return Date.now()
}

function createId(): string {
  if (crypto.randomUUID) return crypto.randomUUID()
  return `agent-${now().toString(36)}`
}

function selectAgent(id: string): void {
  state.activeAgentId = id
  view.value = 'run'
  error.value = ''
}

function setView(nextView: 'run' | 'settings'): void {
  view.value = nextView
  error.value = ''
}

function addAgent(): void {
  const agent: AgentConfig = {
    id: createId(),
    name: 'Custom Agent',
    description: '',
    model: '',
    systemPrompt: 'You are a helpful assistant. Follow the user request precisely.',
    userTemplate: '{{input}}',
    stream: true,
    showReasoning: false,
    outputAction: 'show',
    headersText: '',
    extraBodyText: '',
    featureEnabled: true,
    builtIn: false
  }
  state.agents.push(agent)
  state.activeAgentId = agent.id
  view.value = 'settings'
}

function duplicateAgent(agent: AgentConfig): void {
  const copy: AgentConfig = {
    ...agent,
    id: createId(),
    name: `${agent.name} Copy`,
    builtIn: false,
    featureEnabled: true
  }
  state.agents.push(copy)
  state.activeAgentId = copy.id
  view.value = 'settings'
}

function deleteAgent(agent: AgentConfig): void {
  if (agent.builtIn) return
  const index = state.agents.findIndex((item) => item.id === agent.id)
  if (index < 0) return
  window.ztools.removeFeature(featureCodeForAgent(agent))
  state.agents.splice(index, 1)
  state.activeAgentId = state.agents[0]?.id || ''
  view.value = 'run'
}

function resetBuiltInAgent(agent: AgentConfig): void {
  if (!isBuiltInAgentId(agent.id)) return
  const fresh = createDefaultAgents().find((item) => item.id === agent.id)
  if (!fresh) return
  Object.assign(agent, fresh, { model: agent.model })
}

function validateJsonFields(agent: AgentConfig): boolean {
  try {
    parseAgentRequestConfig(agent.headersText, agent.extraBodyText)
    error.value = ''
    status.value = 'JSON 配置有效'
    return true
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
    status.value = ''
    return false
  }
}

async function loadModels(): Promise<void> {
  try {
    models.value = await window.ztools.allAiModels()
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  }
}

function openModelSettings(): void {
  window.ztools.redirectAiModelsSetting()
}

function usePayload(action: LaunchAction): string {
  if (typeof action.payload === 'string') return action.payload
  if (Array.isArray(action.payload)) {
    return action.payload
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && 'text' in item) return String(item.text)
        if (item && typeof item === 'object' && 'path' in item) return String(item.path)
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

async function runSelectedAgent(autoInput?: string): Promise<void> {
  const agent = activeAgent.value
  if (!agent || running.value) return

  const input = typeof autoInput === 'string' ? autoInput : inputText.value
  if (!input.trim()) {
    error.value = '请输入要处理的文本'
    return
  }

  if (models.value.length === 0) {
    error.value = '请先配置 AI 模型'
    openModelSettings()
    return
  }

  output.value = ''
  reasoning.value = ''
  error.value = ''
  status.value = '请求中'
  running.value = true

  try {
    const result = await runAgent(
      agent,
      input,
      (chunk) => {
        output.value = chunk.content
        reasoning.value = chunk.reasoning
        status.value = '接收中'
      },
      (request) => {
        currentRequest.value = request
      }
    )
    output.value = result.content
    reasoning.value = result.reasoning
    status.value = '已完成'
    await applyOutputAction(agent.outputAction, result.content)
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
    status.value = ''
  } finally {
    running.value = false
    currentRequest.value = null
  }
}

async function applyOutputAction(action: OutputAction, text: string): Promise<void> {
  if (!text) return
  if (action === 'copy') {
    window.ztools.copyText(text)
    status.value = '已复制'
  }
  if (action === 'paste') {
    window.ztools.hideMainWindowPasteText(text)
    status.value = '已粘贴'
  }
}

function abortRun(): void {
  currentRequest.value?.abort()
  status.value = '已中止'
}

function copyOutput(): void {
  if (!output.value) return
  window.ztools.copyText(output.value)
  status.value = '已复制'
}

function pasteClipboardText(): void {
  const text = window.aiAgentsServices?.readClipboardText() || ''
  if (typeof text === 'string') inputText.value = text
}

function handleEnter(action: LaunchAction): void {
  const directAgent =
    state.agents.find((agent) => agent.id === action.code) ||
    findAgentByFeatureCode(state.agents, action.code)

  if (directAgent) {
    state.activeAgentId = directAgent.id
    view.value = 'run'
  } else if (action.code === 'manager') {
    view.value = 'settings'
  }

  const payloadText = usePayload(action)
  if (payloadText) {
    inputText.value = payloadText
    nextTick(() => runSelectedAgent(payloadText))
  }
}

watch(
  state,
  () => {
    saveState(state)
  },
  { deep: true }
)

watch(featureSyncKey, () => registerAgentFeatures(state.agents))

onMounted(async () => {
  await loadModels()
  registerAgentFeatures(state.agents)
  window.ztools.setExpendHeight(720)
  window.ztools.onPluginEnter((action) => handleEnter(action as LaunchAction))
})
</script>

<template>
  <main class="app-shell">
    <aside class="sidebar">
      <div class="brand">
        <Bot :size="20" />
        <span>AI Agents</span>
      </div>

      <div class="agent-list">
        <button
          v-for="agent in state.agents"
          :key="agent.id"
          class="agent-item"
          :class="{ active: activeAgent?.id === agent.id }"
          @click="selectAgent(agent.id)"
        >
          <Languages v-if="agent.id === 'translate'" :size="17" />
          <Pencil v-else-if="agent.id === 'polish'" :size="17" />
          <FileText v-else-if="agent.id === 'explain'" :size="17" />
          <Bot v-else :size="17" />
          <span>{{ agent.name }}</span>
        </button>
      </div>

      <div class="sidebar-actions">
        <button class="icon-button" title="Add Agent" @click="addAgent">
          <Plus :size="18" />
        </button>
        <button
          class="icon-button"
          title="Duplicate Agent"
          :disabled="!activeAgent"
          @click="activeAgent && duplicateAgent(activeAgent)"
        >
          <Copy :size="18" />
        </button>
      </div>
    </aside>

    <section class="workspace" v-if="activeAgent">
      <header class="toolbar">
        <div class="title-block">
          <h1>{{ activeAgent.name }}</h1>
          <p>{{ activeAgent.description || modelLabel }}</p>
        </div>

        <div class="toolbar-actions">
          <div class="segmented">
            <button :class="{ selected: view === 'run' }" @click="setView('run')">
              <MessageSquareText :size="16" />
              Run
            </button>
            <button :class="{ selected: view === 'settings' }" @click="setView('settings')">
              <Settings :size="16" />
              Settings
            </button>
          </div>
          <button class="primary-button" :disabled="running" @click="runSelectedAgent()">
            <Loader2 v-if="running" class="spin" :size="16" />
            <Send v-else :size="16" />
            Run
          </button>
        </div>
      </header>

      <div v-if="view === 'run'" class="run-grid">
        <section class="panel input-panel">
          <div class="panel-header">
            <span>Input</span>
            <button class="ghost-button" @click="pasteClipboardText">
              <Clipboard :size="15" />
              Paste
            </button>
          </div>
          <textarea v-model="inputText" spellcheck="false" />
          <div class="run-actions">
            <button class="primary-button" :disabled="running" @click="runSelectedAgent()">
              <Play :size="16" />
              Run
            </button>
            <button class="ghost-button" :disabled="!running" @click="abortRun">
              <Square :size="15" />
              Stop
            </button>
            <button class="ghost-button" title="Open AI model settings" @click="openModelSettings">
              <Settings :size="15" />
              Models
            </button>
          </div>
        </section>

        <section class="panel output-panel">
          <div class="panel-header">
            <span>Output</span>
            <div class="header-actions">
              <span v-if="status" class="status-text">{{ status }}</span>
              <button class="icon-button small" title="Copy Output" :disabled="!output" @click="copyOutput">
                <Copy :size="15" />
              </button>
            </div>
          </div>
          <pre class="result-text">{{ output }}</pre>
          <details v-if="activeAgent.showReasoning && reasoning" open class="reasoning">
            <summary>Reasoning</summary>
            <pre>{{ reasoning }}</pre>
          </details>
        </section>
      </div>

      <div v-else class="settings-grid">
        <section class="panel settings-panel">
          <div class="field-row">
            <label>
              Name
              <input v-model="activeAgent.name" />
            </label>
            <label>
              Model
              <select v-model="activeAgent.model">
                <option value="">默认模型</option>
                <option v-for="model in models" :key="model.id" :value="model.id">
                  {{ model.label || model.id }}
                </option>
              </select>
            </label>
          </div>

          <label>
            Description
            <input v-model="activeAgent.description" />
          </label>

          <label>
            System Prompt
            <textarea v-model="activeAgent.systemPrompt" spellcheck="false" />
          </label>

          <label>
            User Template
            <textarea v-model="activeAgent.userTemplate" spellcheck="false" />
          </label>

          <div class="toggle-grid">
            <label class="toggle">
              <input v-model="activeAgent.stream" type="checkbox" />
              <span>Stream</span>
            </label>
            <label class="toggle">
              <input v-model="activeAgent.showReasoning" type="checkbox" />
              <span>Reasoning</span>
            </label>
            <label class="toggle" :class="{ disabled: activeAgent.builtIn }">
              <input v-model="activeAgent.featureEnabled" type="checkbox" :disabled="activeAgent.builtIn" />
              <span>Command</span>
            </label>
            <label>
              Output
              <select v-model="activeAgent.outputAction">
                <option value="show">Show</option>
                <option value="copy">Copy</option>
                <option value="paste">Paste</option>
              </select>
            </label>
          </div>
        </section>

        <section class="panel request-panel">
          <div class="panel-header">
            <span>Request</span>
            <button class="ghost-button" @click="validateJsonFields(activeAgent)">
              <Check :size="15" />
              Validate
            </button>
          </div>

          <label>
            Headers JSON
            <textarea v-model="activeAgent.headersText" spellcheck="false" placeholder='{"X-Provider-Feature":"on"}' />
          </label>

          <label>
            Extra Body JSON
            <textarea
              v-model="activeAgent.extraBodyText"
              spellcheck="false"
              placeholder='{"enable_thinking":true}'
            />
          </label>

          <div class="danger-row">
            <button v-if="activeAgent.builtIn" class="ghost-button" @click="resetBuiltInAgent(activeAgent)">
              <RefreshCw :size="15" />
              Reset
            </button>
            <button v-else class="danger-button" @click="deleteAgent(activeAgent)">
              <Trash2 :size="15" />
              Delete
            </button>
          </div>
        </section>
      </div>

      <div v-if="error" class="error-line">
        <Braces :size="15" />
        <span>{{ error }}</span>
      </div>
    </section>

    <section v-else class="empty-state">
      <Sparkles :size="28" />
      <button class="primary-button" @click="addAgent">Create Agent</button>
    </section>
  </main>
</template>
