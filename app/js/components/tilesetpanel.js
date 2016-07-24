
const m = require('mithril')
const vent = require('postal').channel()
const Scrollbars = require('../scrollbars')
const app = require('../app')
const TileRenderer = require('../tilerenderer')
const loop = require('raf-loop')
const Tile = require('../tile')

function viewTilesetOption (tileset) {
  if (!tileset) {
    tileset = {
      title: '« No tileset »',
      filename: ''
    }
  }
  return m('option', {value: tileset.filename}, tileset.title)
}

function tileMap (w, h) {
  let map = []
  for (let x = 0; x < w; x++) {
    map[x] = []
    for (let y = 0; y < h; y++) {
      map[x][y] = new Tile(x + y * 10)
    }
  }
  return map
}

class TilesetPanel {
  constructor () {
    this.showMask = m.prop(false)
    this.tileTypeMode = m.prop(0)
    this.tilesetList = m.prop([])
    this.loop = loop(this.redraw.bind(this))
  }

  toggleMask () {
    let show = !this.showMask()
    this.showMask(show)
    this.renderer.setMaskOpacity(show ? 1 : 0)
    vent.publish('tileset.togglemask', show)
  }

  toggleTileType (e) {
    let mode = this.tileTypeMode() + 1
    if (mode > 2) {
      mode = 0
    }
    this.tileTypeMode(mode)
    e.currentTarget.firstChild.style.marginTop = (-mode * e.currentTarget.offsetHeight) + 'px'
  }

  addScrollbars (node, isInitialized) {
    if (isInitialized) return
    this.scrollbars = new Scrollbars({
      element: node,
      revealDistance: 64
    })
    this.scrollbars.contentWidth = 10 * 32
    this.scrollbars.contentHeight = 0 * 32
    this.scrollbars.update()
    vent.subscribe('panel.resize', () => this.scrollbars.update())
  }

  initCanvas (node, isInitialized) {
    if (isInitialized) return

    this.canvas = node
    this.renderer = new TileRenderer(this.canvas, true)

    vent.subscribe('tileset.load', () => {
      let tileCount = app.j2t.tilesetInfo.fields.TileCount
      let w = 10
      let h = Math.ceil(tileCount / 10)

      this.scrollbars.contentHeight = h * 32
      this.scrollbars.update()

      this.renderer.setBackgroundSize(w, h)
      this.renderer.setTileset(app.j2t.tilesetCanvas, app.j2t.maskCanvas, tileCount)
      this.renderer.setTileLayer(0, w, h, 1, 1, false)
      let map = tileMap(w, h)
      this.renderer.layers[0].setTiles(0, 0, map)
      this.loop.start()
    })

    vent.subscribe('tileset.togglemask', (show) => {

    })
  }

  redraw (dt) {
    let cw = this.canvas.parentNode.offsetWidth
    let ch = this.canvas.parentNode.offsetHeight
    if (cw !== this.canvas.width) this.canvas.width = cw
    if (ch !== this.canvas.height) this.canvas.height = ch
    this.renderer.resizeViewport(cw, ch)

    let scrollTop = this.scrollbars.smoothScroller.offsetTop

    this.renderer.draw(cw / 2, -scrollTop + ch / 2)
  }

  view ({fluid, config}) {
    return m('#tilesetpanel.panel', {class: fluid ? 'flexfluid' : '', config}, [
      m('.toolbar', [
        m('strong', 'Tileset'),
        m('.selectwrap.flexfluid', m('select', {disabled: false}, [viewTilesetOption(), this.tilesetList().map(viewTilesetOption)])),

        m('button', {title: 'Toggle tile mask', onclick: this.toggleMask.bind(this), class: this.showMask() ? 'selected' : ''}, 'Mask'),
        m('button.tile-types.right', {title: 'Toggle tile types', onclick: this.toggleTileType.bind(this)}, [
          m('div', 'Tile Type'),
          m('div', 'Events'),
          m('div', 'None')
        ])
      ]),
      m('.panelcontent', m('.canvaswrapper', {config: this.addScrollbars.bind(this)}, m('canvas', {config: this.initCanvas.bind(this)})))
    ])
  }
}

module.exports = TilesetPanel
