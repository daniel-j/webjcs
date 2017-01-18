const isElectron = require('is-electron')()

const vent = require('postal').channel()
const settings = require('./settings')

const J2L = require('./J2L')
const J2T = require('./J2T')

const j2l = new J2L()
const j2t = new J2T()

if (isElectron) {
  require('electron').ipcRenderer.on('menuclick', (event, command) => {
    vent.publish('menuclick.' + command)
  })
}

// File > Open - For web and electron
if (!isElectron) {
  const openlevelinput = document.createElement('input')
  openlevelinput.setAttribute('accept', '.j2l')
  openlevelinput.addEventListener('change', (e) => {
    const file = openlevelinput.files[0]
    const name = file.name
    const fr = new FileReader()
    fr.addEventListener('load', () => {
      const data = Buffer.from(fr.result)
      vent.publish('loadlevel', { data, name })
    }, false)
    fr.readAsArrayBuffer(file)
    // reset it
    openlevelinput.value = ''
  }, false)
  vent.subscribe('menuclick.openlevel', () => {
    openlevelinput.type = 'file'
    openlevelinput.click()
  })
} else {
  const dialog = require('electron').remote.dialog
  const fs = require('fs')
  vent.subscribe('menuclick.openlevel', () => {
    dialog.showOpenDialog({
      title: 'Open Jazz Jackrabbit 2 level',
      filters: [{
        name: 'Jazz2 Level',
        extensions: ['j2l']
      }],
      properties: ['openFile']
    }, (filePaths) => {
      const name = filePaths[0]
      fs.readFile(name, (err, data) => {
        if (err) throw err
        vent.publish('loadlevel', { data, name })
      })
    })
  })
}

vent.subscribe('loadlevel', ({data, name}) => {
  j2l.loadFromBuffer(data, name).then(() => {
    const tilesetName = j2l.levelInfo.fields.Tileset
    if (confirm('Tileset ' + tilesetName + ' was not found, do you want to search for it on J2O?')) {
      window.open('https://www.jazz2online.com/downloads/search/?search=' + encodeURIComponent(tilesetName), '_blank')
    }
    vent.publish('level.load')
  }).catch((err) => {
    alert(err)
    console.error(err)
  })
})

module.exports = { vent, settings, j2l, j2t }
