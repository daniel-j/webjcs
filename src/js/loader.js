const isElectron = require('is-electron')()

let s = document.createElement('script')
if (isElectron) {
  s.src = './build/electron.js'
} else {
  s.src = './build/web.js'
}
document.body.appendChild(s)

if (WEBGL_INSPECTOR) {
  s = document.createElement('script')
  s.src = 'webgl-inspector/core/embed.js'
  document.body.appendChild(s)
}
