
const fs = require('fs')
const path = require('path')

const m = require('mithril')
const panels = require('./components/panels')
const TilesetPanel = require('./components/tilesetpanel')
const AnimPanel = require('./components/animpanel')
const LayerPanel = require('./components/layerpanel')
const Renderer = require('./renderer')

const app = require('./app')

const vent = require('postal').channel()

require('./domevents')

const columns = [
  {
    panels: [
      {
        panel: new TilesetPanel(),
        fluid: true
      },
      {
        panel: new AnimPanel()
      }
    ]
  },
  {
    panels: [
      {panel: new LayerPanel(), fluid: true}
    ],
    fluid: true
  }
]

m.mount(document.getElementById('app'), {
  view: () => m(Renderer, m(panels, {columns: columns}))
})

const jj2Dir = path.join(__dirname, '/../data/')

const jj2File = 'ab17btl06.j2l'
console.log('Loading ' + path.join(jj2Dir, jj2File))
app.j2l.loadFromBuffer(fs.readFileSync(path.join(jj2Dir, jj2File))).then(() => {
  console.log('Level loaded')
  console.log('Loading ' + path.join(jj2Dir, app.j2l.levelInfo.fields.Tileset))
  app.j2t.loadFromBuffer(fs.readFileSync(path.join(jj2Dir, app.j2l.levelInfo.fields.Tileset))).then(() => {
    console.log('Tileset loaded')
    vent.publish('tileset.load')
    vent.publish('level.load')
  }).catch((err) => {
    console.error(err)
  })
}).catch((err) => {
  console.error(err)
})

/*
const ModPlayer = require('./modplayer')

let modplayer = new ModPlayer({repeatCount: 1})

fs.readFile('/vol/ssd/shared/games/Jazz2tsf/Castle.j2b', (err, buffer) => {
  if (err) throw err
  modplayer.play(buffer)
})
*/
