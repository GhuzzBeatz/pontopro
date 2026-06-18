const SALT_PP   = 'GHZ2026PONTOPRO'
const LS_KEY_PP = '@PONTOPRO:licenca'
const PREFIX_PP = 'PONTO'

function gerarChavePP(n) {
  const p1 = String(n).padStart(4, '0')
  const p2 = btoa(n + SALT_PP).replace(/[^A-Z0-9]/gi, '').slice(0, 4).toUpperCase()
  const p3 = String((n * 37) % 9999).padStart(4, '0')
  return `${PREFIX_PP}-${p1}-${p2}-${p3}`
}

function validarChavePP(key) {
  if (!key) return false
  const clean = key.trim().toUpperCase()
  const parts = clean.split('-')
  if (parts.length !== 4 || parts[0] !== PREFIX_PP) return false
  const n = parseInt(parts[1])
  if (isNaN(n)) return false
  return gerarChavePP(n) === clean
}

function licencaAtivaPP() {
  try { return validarChavePP(localStorage.getItem(LS_KEY_PP) || '') }
  catch(e) { return false }
}

function salvarLicencaPP(key) {
  localStorage.setItem(LS_KEY_PP, key.trim().toUpperCase())
}
