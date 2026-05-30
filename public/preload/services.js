const { clipboard } = require('electron')

window.aiAgentsServices = {
  version: '0.1.0',
  readClipboardText() {
    return clipboard.readText()
  }
}
