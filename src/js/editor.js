
const m = require('mithril')
const app = require('./app')
const vent = require('./vent')

require('./domevents')
require('./commands')

const panels = require('./components/panels')
const TilesetPanel = require('./components/tilesetpanel')
const AnimPanel = require('./components/animpanel')
const LayerPanel = require('./components/layerpanel')
const Renderer = require('./renderer')

const AboutDialog = require('./components/dialogs/about')
const PreferencesDialog = require('./components/dialogs/preferences')
const LayerPropertiesDialog = require('./components/dialogs/layerproperties')
const LevelPropertiesDialog = require('./components/dialogs/levelproperties')

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
    const R = m(
      '#editor',
      m(Renderer, m(panels, {columns: columns})),
      m(AboutDialog),
      m(PreferencesDialog),
      m(LevelPropertiesDialog),
      m(LayerPropertiesDialog)
    )
    if (IS_ELECTRON) {
      return R
    } else {
      return m(require('./components/menu'), R)
    }
  }
})

require.ensure([], () => {
  if (DEVELOPMENT) {
    // const jj2Dir = path.join(__dirname, '/../data/')
    const levelBuffer = require('buffer-loader!../../data/ab17btl06.j2l')
    const tilesetBuffer = require('buffer-loader!../../data/DiambGarden.j2t')
    // console.log('Loading ' + path.join(jj2Dir, levelFile))
    app.j2l.loadFromBuffer(levelBuffer, null, (resolve) => resolve(prompt('Enter level password', ''))).then(() => {
      console.log('Level loaded')
      vent.publish('level.load')

      // console.log('Loading ' + path.join(jj2Dir, app.j2l.levelInfo.fields.Tileset))
      return app.j2t.loadFromBuffer(tilesetBuffer).then(() => {
        console.log('Tileset loaded')
        vent.publish('tileset.load')
      }).catch((err) => {
        console.error(err)
        alert(err)
      })
    }).catch((err) => {
      console.error(err)
      alert(err)
    })
  } else {
    app.j2l.newLevel()
    vent.publish('level.load')
  }
})

/*
const ModPlayer = require('./modplayer')

let modplayer = new ModPlayer({repeatCount: 1})

require.ensure([], () => {
  modplayer.play(require('buffer-loader!../../data/NWK-LAST.XM'))
})
*/
