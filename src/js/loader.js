
let s = document.createElement('script')

// Since this loader is used by both web and electron, it has check dynamically
let isElectron = require('is-electron')()

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
