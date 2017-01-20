
// Since this loader is used by both web and electron, it has to be checked in runtime
let isElectron = require('is-electron')()
require('../style/style.css')
require('../style/theme.css')

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
  let webpackstyle = document.getElementById('webpackstyle')
  if (isElectron) {
    s.src = './build/electron.js'
    webpackstyle.href = './build/electron.css'
  } else {
    s.src = './build/web.js'
    webpackstyle.href = './build/web.css'
  }
  document.body.appendChild(s)
}
