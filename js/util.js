;(function(){
  var t = localStorage.getItem('@PONTOPRO:tema') || 'dark'
  document.documentElement.setAttribute('data-tema', t)
})()

function fmtData(d) {
  if (!d) return '—'
  const p = d.split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d
}
function fmtCPF(v) {
  return v.replace(/\D/g,'').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}
function dataHoje() { return new Date().toISOString().split('T')[0] }
function mesAtual()  { return new Date().toISOString().slice(0, 7) }

function getTema()  { return localStorage.getItem('@PONTOPRO:tema') || 'dark' }
function aplicarTema(t) {
  document.documentElement.setAttribute('data-tema', t)
  localStorage.setItem('@PONTOPRO:tema', t)
}
function aplicarTemaAtual() { aplicarTema(getTema()) }

function aviso(tipo, msg) {
  const ok  = document.getElementById('avisoOk')
  const err = document.getElementById('avisoErro')
  if (tipo === 'ok') {
    if (err) err.style.display = 'none'
    if (ok)  { ok.textContent = msg; ok.style.display = 'block'; setTimeout(() => ok.style.display = 'none', 3200) }
  } else {
    if (ok)  ok.style.display = 'none'
    if (err) { err.textContent = msg; err.style.display = 'block'; setTimeout(() => err.style.display = 'none', 4000) }
  }
}

function avisoModal(msg) {
  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)'
  overlay.innerHTML = `<div style="background:var(--card);border:1px solid var(--border2);border-radius:14px;padding:28px 32px;max-width:380px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5)">
    <div style="font-size:13px;color:var(--fg);margin-bottom:18px;line-height:1.6">${msg}</div>
    <button onclick="this.closest('div[style]').remove()" style="padding:9px 24px;border:none;border-radius:8px;background:var(--primary);color:#fff;cursor:pointer;font-size:13px;font-weight:700;font-family:inherit">OK</button>
  </div>`
  document.body.appendChild(overlay)
}

function confirmar(msg, cb) {
  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)'
  overlay.innerHTML = `<div style="background:var(--card);border:1px solid var(--border2);border-radius:14px;padding:28px 32px;max-width:380px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5)">
    <div style="font-size:14px;color:var(--fg);font-weight:600;margin-bottom:18px;line-height:1.5">⚠️<br>${msg}</div>
    <div style="display:flex;gap:10px;justify-content:center">
      <button id="cfnCancel" style="padding:9px 20px;border:1px solid var(--border2);border-radius:8px;background:transparent;color:var(--fg2);cursor:pointer;font-size:13px;font-family:inherit">Cancelar</button>
      <button id="cfnOk" style="padding:9px 20px;border:none;border-radius:8px;background:var(--primary);color:#fff;cursor:pointer;font-size:13px;font-weight:700;font-family:inherit">Confirmar</button>
    </div>
  </div>`
  document.body.appendChild(overlay)
  overlay.querySelector('#cfnOk').onclick     = () => { overlay.remove(); cb(true) }
  overlay.querySelector('#cfnCancel').onclick = () => { overlay.remove(); cb(false) }
}
