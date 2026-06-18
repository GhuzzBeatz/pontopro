/**
 * db.js — PontoPro data layer
 * Pure JSON / filesystem. Zero native dependencies.
 */
const fs   = require('fs')
const path = require('path')

function getDataDir() {
  try {
    const arg = process.argv.find(a => a.startsWith('--data-dir='))
    if (arg) return arg.replace('--data-dir=', '')
  } catch(e) {}
  return path.join(__dirname, '..', 'data')
}

const DATA_DIR = getDataDir()
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

function lerJSON(nome, padrao = []) {
  const f = path.join(DATA_DIR, nome + '.json')
  try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch(e) { return padrao }
}

function salvarJSON(nome, dados) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    fs.writeFileSync(path.join(DATA_DIR, nome + '.json'), JSON.stringify(dados, null, 2))
  } catch(e) {
    throw new Error('Erro ao salvar ' + nome + ': ' + e.message)
  }
}

function nextId(lista) {
  return lista.length ? Math.max(...lista.map(x => x.id || 0)) + 1 : 1
}

function agora() { return new Date().toLocaleString('sv-SE') }
function hoje()  { return new Date().toISOString().split('T')[0] }
function horaAtual() {
  const n = new Date()
  return n.toTimeString().slice(0, 5)
}

// ── CONFIG ────────────────────────────────────────────────────
function getConfig(k, padrao = '') {
  const cfg = lerJSON('config', {})
  return cfg[k] !== undefined ? cfg[k] : padrao
}
function setConfig(k, v) {
  const cfg = lerJSON('config', {})
  cfg[k] = v
  salvarJSON('config', cfg)
}

// ── FUNCIONÁRIOS ──────────────────────────────────────────────
function listarFuncionarios(busca = '') {
  let lista = lerJSON('funcionarios')
  if (busca) {
    const b = busca.toLowerCase()
    lista = lista.filter(f =>
      f.nome?.toLowerCase().includes(b) ||
      f.cpf?.includes(b) ||
      f.matricula?.toString().includes(b)
    )
  }
  return lista.sort((a, b) => a.nome.localeCompare(b.nome))
}

function getFuncionarioByCPF(cpf) {
  const limpo = cpf.replace(/\D/g, '')
  return lerJSON('funcionarios').find(f => f.cpf.replace(/\D/g, '') === limpo) || null
}

function getFuncionario(id) {
  return lerJSON('funcionarios').find(f => f.id === Number(id)) || null
}

function inserirFuncionario(d) {
  const lista = lerJSON('funcionarios')
  if (lista.some(f => f.cpf.replace(/\D/g,'') === d.cpf.replace(/\D/g,''))) return false
  const novo = {
    id: nextId(lista),
    ...d,
    ativo: true,
    criado_em: agora()
  }
  lista.push(novo)
  salvarJSON('funcionarios', lista)
  return novo.id
}

function atualizarFuncionario(d) {
  const lista = lerJSON('funcionarios')
  const i = lista.findIndex(f => f.id === Number(d.id))
  if (i >= 0) lista[i] = { ...lista[i], ...d, atualizado_em: agora() }
  salvarJSON('funcionarios', lista)
}

function deletarFuncionario(id) {
  const lista = lerJSON('funcionarios').map(f =>
    f.id === Number(id) ? { ...f, ativo: false } : f
  )
  salvarJSON('funcionarios', lista)
}

// ── REGISTROS DE PONTO ────────────────────────────────────────
function listarRegistros(filtros = {}) {
  let lista = lerJSON('registros')
  if (filtros.funcionario_id) lista = lista.filter(r => Number(r.funcionario_id) === Number(filtros.funcionario_id))
  if (filtros.data_inicio)    lista = lista.filter(r => r.data >= filtros.data_inicio)
  if (filtros.data_fim)       lista = lista.filter(r => r.data <= filtros.data_fim)
  if (filtros.data)           lista = lista.filter(r => r.data === filtros.data)
  return lista.sort((a, b) => {
    if (b.data !== a.data) return b.data.localeCompare(a.data)
    return b.hora.localeCompare(a.hora)
  })
}

function marcarPonto(funcionario_id, tipo) {
  const lista = lerJSON('registros')
  const reg = {
    id: nextId(lista),
    funcionario_id: Number(funcionario_id),
    data: hoje(),
    hora: horaAtual(),
    tipo, // 'entrada' | 'saida' | 'almoco_saida' | 'almoco_retorno'
    criado_em: agora()
  }
  lista.push(reg)
  salvarJSON('registros', lista)
  return reg
}

function deletarRegistro(id) {
  salvarJSON('registros', lerJSON('registros').filter(r => r.id !== Number(id)))
}

// Determinar próximo tipo de ponto para o funcionário hoje
function proximoPonto(funcionario_id) {
  const hoje_str = hoje()
  const regs = lerJSON('registros')
    .filter(r => Number(r.funcionario_id) === Number(funcionario_id) && r.data === hoje_str)
    .sort((a, b) => a.hora.localeCompare(b.hora))

  if (!regs.length) return 'entrada'
  const ultimo = regs[regs.length - 1].tipo
  const sequencia = {
    'entrada':        'almoco_saida',
    'almoco_saida':   'almoco_retorno',
    'almoco_retorno': 'saida',
    'saida':          null  // encerrado
  }
  return sequencia[ultimo] || null
}

// ── RELATÓRIO DE PONTO ────────────────────────────────────────
function calcularHorasDia(registros_dia) {
  const r = registros_dia.sort((a,b) => a.hora.localeCompare(b.hora))
  const porTipo = {}
  r.forEach(x => porTipo[x.tipo] = x.hora)

  const toMin = h => {
    const [hh, mm] = h.split(':').map(Number)
    return hh * 60 + mm
  }
  const fmtMin = m => {
    const h = Math.floor(Math.abs(m) / 60)
    const min = Math.abs(m) % 60
    return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`
  }

  if (!porTipo.entrada) return { trabalhado: '00:00', extras: '00:00', falta: '00:00', completo: false }

  let trabalhado = 0

  // Período manhã: entrada → almoço_saída
  if (porTipo.entrada && porTipo.almoco_saida) {
    trabalhado += toMin(porTipo.almoco_saida) - toMin(porTipo.entrada)
  }
  // Período tarde: almoço_retorno → saída
  if (porTipo.almoco_retorno && porTipo.saida) {
    trabalhado += toMin(porTipo.saida) - toMin(porTipo.almoco_retorno)
  }
  // Sem almoço: entrada → saída direto
  if (porTipo.entrada && porTipo.saida && !porTipo.almoco_saida) {
    trabalhado = toMin(porTipo.saida) - toMin(porTipo.entrada)
  }

  return {
    trabalhado: fmtMin(trabalhado),
    trabalhado_min: trabalhado,
    entrada:         porTipo.entrada || '—',
    almoco_saida:    porTipo.almoco_saida || '—',
    almoco_retorno:  porTipo.almoco_retorno || '—',
    saida:           porTipo.saida || '—',
    completo:        !!porTipo.saida
  }
}

module.exports = {
  lerJSON, salvarJSON, nextId, agora, hoje, horaAtual,
  getConfig, setConfig,
  listarFuncionarios, getFuncionarioByCPF, getFuncionario,
  inserirFuncionario, atualizarFuncionario, deletarFuncionario,
  listarRegistros, marcarPonto, deletarRegistro, proximoPonto,
  calcularHorasDia
}
