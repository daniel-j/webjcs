
// Since this loader is used by both web and electron, it has to be checked in runtime
let isElectron = require('is-electron')()

if (WEBGL_INSPECTOR) {
  let s = document.createElement('script')
  s.onload = loadMain
  s.src = 'webgl-inspector/core/embed.js'
  document.body.appendChild(s)
} else {
  loadMain()
}

function loadMain () {
  let s = document.createElement('script')
  if (isElectron) {
    s.src = './build/electron.js'
  } else {
    s.src = './build/web.js'
  }
  document.body.appendChild(s)
}
