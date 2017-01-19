
const path = require('path')
const vent = require('./vent')
const isElectron = require('is-electron')()
const app = require('./app')
const settings = require('./settings')
const findFile = require('./util/findFile')
const fs = require('fs')

if (isElectron) {
  const {ipcRenderer} = require('electron')
  ipcRenderer.on('menuclick', (event, command) => {
    vent.publish('menuclick.' + command)
  })
  ipcRenderer.on('loadlevel', (event, name) => {
    fs.readFile(name, (err, data) => {
      if (err) throw err
      vent.publish('loadlevel', { data, name: path.basename(name), dir: path.dirname(name) })
    })
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
  const remote = require('electron').remote
  const dialog = remote.dialog
  const fs = require('fs')
  vent.subscribe('menuclick.openlevel', () => {
    dialog.showOpenDialog(remote.getCurrentWindow(), {
      title: 'Open Jazz Jackrabbit 2 level',
      filters: [{
        name: 'Jazz2 Level',
        extensions: ['j2l']
      }],
      properties: ['openFile']
    }, (filePaths) => {
      if (!filePaths) return
      const name = filePaths[0]
      fs.readFile(name, (err, data) => {
        if (err) throw err
        vent.publish('loadlevel', { data, name: path.basename(name), dir: path.dirname(name) })
      })
    })
  })
}

vent.subscribe('loadlevel', (ev, {data, name, dir}) => {
  app.j2l.loadFromBuffer(data, name).then(() => {
    const tilesetName = app.j2l.levelInfo.fields.Tileset

    if (isElectron) {
      let paths = settings.get('paths').map((p) => path.normalize(p.replace(/(\/|\\)$/, '')))
      if (dir) {
        dir = path.normalize(dir)
        if (!paths.includes(dir)) {
          paths = [dir].concat(paths)
        }
      }
      findFile(tilesetName, paths).then((file) => {
        fs.readFile(file, (err, data) => {
          if (err) throw err
          app.j2t.loadFromBuffer(data, tilesetName).then(() => {
            vent.publish('tileset.load')
            vent.publish('level.load')
          })
        })
      }).catch(() => {
        alert('Tileset ' + tilesetName + ' was not found.')
        vent.publish('level.load')
      })
    } else {
      vent.publish('level.load')
      /*
      if (confirm('Tileset ' + tilesetName + ' was not found, do you want to search for it on J2O?')) {
        window.open('https://www.jazz2online.com/downloads/search/?search=' + encodeURIComponent(tilesetName), '_blank')
      }
      */
    }
  }).catch((err) => {
    alert(err)
    console.error(err)
  })
})
