
const fs = require('fs')

const m = require('mithril')
const Panels = require('./components/panels')
const TilesetPanel = require('./components/tilesetpanel')
const AnimPanel = require('./components/animpanel')
const LayerPanel = require('./components/layerpanel')

const app = require('./app')

const vent = require('postal').channel()

require('./domevents')

const panels = new Panels([
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
])

m.mount(document.getElementById('app'), panels)

const jj2Dir = '/vol/ssd/shared/games/Jazz2tsf/'

app.j2l.loadFromBuffer(fs.readFileSync(jj2Dir + 'ab17btl06.j2l')).then(() => {
  console.log('j2l success!')
  app.j2t.loadFromBuffer(fs.readFileSync(jj2Dir + app.j2l.levelInfo.fields.Tileset)).then(() => {
    console.log('j2t success!')
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
