const isElectron = require('is-electron')()

let s = document.createElement('script')
if (isElectron) {
  s.src = './build/electron.js'
} else {
  s.src = './build/web.js'
}
document.body.appendChild(s)
