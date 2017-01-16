const isElectron = require('is-electron')()

const vent = require('postal').channel()

const J2L = require('./J2L')
const J2T = require('./J2T')

const j2l = new J2L()
const j2t = new J2T()

if (isElectron) {
  require('electron').ipcRenderer.on('menuclick', (event, command) => {
    vent.publish('menuclick', command)
  })
}

module.exports = { vent, j2l, j2t }
