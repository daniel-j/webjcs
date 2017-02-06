
const path = require('path')
const vent = require('./vent')
const app = require('./app')
const settings = require('./settings')
const findFile = require('./util/findFile')
const fs = require('fs')
const J2L = require('./J2L')

if (IS_ELECTRON) {
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
if (!IS_ELECTRON) {
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

    if (IS_ELECTRON) {
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

vent.subscribe('menuclick.savelevel', () => {
  app.j2l.levelInfo.set('Tileset', app.j2t.name)
  vent.publish('j2l.preexport')
  app.j2l.export(J2L.VERSION_123).then((buffer) => {
    if (!IS_ELECTRON || true) {
      const saveAs = require('file-saver').saveAs
      const file = new File([buffer.buffer], 'webjcs.j2l', {type: 'application/x-jazz2-level'})
      saveAs(file)
    }
    vent.publish('loadlevel', {data: buffer})
  })
})

vent.subscribe('menuclick.newlevel', () => {
  if (confirm('Are you sure?')) {
    app.j2l.newLevel()
    vent.publish('level.load')
  }
})

vent.subscribe('menuclick.openlevelpassword', () => {
  let password = prompt('Set level password')
  if (password !== null) app.j2l.setPassword(password)
})
