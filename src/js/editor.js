
const m = require('mithril')
const vent = require('postal').channel()

const panels = require('./components/panels')
const TilesetPanel = require('./components/tilesetpanel')
const AnimPanel = require('./components/animpanel')
const LayerPanel = require('./components/layerpanel')
const Renderer = require('./renderer')

const app = require('./app')
const isElectron = require('is-electron')()

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
  view: () => {
    const R = m('#editor', m(Renderer, m(panels, {columns: columns})))
    if (isElectron) {
      return R
    } else {
      return m(require('./components/menu'), R)
    }
  }
})

// const jj2Dir = path.join(__dirname, '/../data/')
const levelBuffer = require('buffer-loader!../../data/ab17btl06.j2l')
const tilesetBuffer = require('buffer-loader!../../data/DiambGarden.j2t')
// console.log('Loading ' + path.join(jj2Dir, levelFile))
app.j2l.loadFromBuffer(levelBuffer, 'ab17btl06.j2l').then(() => {
  console.log('Level loaded')
  vent.publish('level.load')

  // console.log('Loading ' + path.join(jj2Dir, app.j2l.levelInfo.fields.Tileset))
  return app.j2t.loadFromBuffer(tilesetBuffer, 'DiambGarden.j2t').then(() => {
    console.log('Tileset loaded')
    vent.publish('tileset.load')
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
