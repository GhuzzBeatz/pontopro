const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs   = require('fs')
const createLocalLicenseGate = require('./js/local-license-gate')

app.setName('PontoPro')

const gotSingleInstanceLock = app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) app.quit()

function getDataDir() {
  return app.isPackaged
    ? path.join(app.getPath('userData'), 'data')
    : path.join(__dirname, 'data')
}

function lerJSON(nome, padrao) {
  const f = path.join(getDataDir(), nome + '.json')
  try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch(e) { return padrao }
}

function salvarJSON(nome, dados) {
  const dir = getDataDir()
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, nome + '.json'), JSON.stringify(dados, null, 2))
}

let win = null
const licenseGate = createLocalLicenseGate({
  storageKey: '@PONTOPRO:licenca', prefix: 'PONTO', salt: 'GHZ2026PONTOPRO', multiplier: 37
})

app.on('second-instance', () => {
  if (!win) return
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
})

function createWindow() {
  const dir = getDataDir()
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  win = new BrowserWindow({
    width: 1280, height: 820,
    minWidth: 1024, minHeight: 700,
    title: 'PontoPro',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      nodeIntegrationInSubFrames: true,
      contextIsolation: false,
      webSecurity: false,
      devTools: !app.isPackaged,
      additionalArguments: ['--data-dir=' + dir]
    }
  })

  licenseGate.attach(win)
  win.once('ready-to-show', () => { win.show(); win.focus() })
  setTimeout(() => { if (win && !win.isVisible()) win.show() }, 4000)
  win.on('page-title-updated', e => e.preventDefault())
}

// ── EXPORTAR EXCEL ──────────────────────────────────────────
ipcMain.handle('exportar-excel', async (event, { nomeArquivo }) => {
  try {
    const { filePath, canceled } = await dialog.showSaveDialog(win, {
      defaultPath: nomeArquivo,
      filters: [{ name: 'Excel', extensions: ['xlsx'] }]
    })
    if (canceled || !filePath) return { sucesso: false, motivo: 'cancelado' }
    return { sucesso: true, caminho: filePath }
  } catch(e) { return { sucesso: false, erro: e.message } }
})

ipcMain.handle('salvar-arquivo-bin', async (event, { caminho, dados }) => {
  try {
    const buf = Buffer.from(dados)
    fs.writeFileSync(caminho, buf)
    return { sucesso: true }
  } catch(e) { return { sucesso: false, erro: e.message } }
})

// ── DADOS ────────────────────────────────────────────────────
ipcMain.handle('dados:ler',    async (e, nome)        => lerJSON(nome, []))
ipcMain.handle('dados:salvar', async (e, nome, dados) => { salvarJSON(nome, dados); return { ok: true } })

app.whenReady().then(async () => {
  if (!gotSingleInstanceLock) return
  createWindow()
  await win.loadFile('pages/licenca.html')
  if (await licenseGate.authorizeFromStorage(win)) await win.loadFile('index.html')
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
