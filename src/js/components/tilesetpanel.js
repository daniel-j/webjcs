
const m = require('mithril')
const vent = require('postal').channel()
const Scrollbars = require('../scrollbars')
const app = require('../app')
const Tile = require('../Tile')
const TileMap = require('../TileMap')
const r = require('../renderer')
const Tween = require('../util/tween')

function viewTilesetOption (tileset) {
  if (!tileset) {
    tileset = {
      title: '« No tileset »',
      filename: ''
    }
  }
  return m('option', {value: tileset.filename}, tileset.title)
}

function createTileArray (w, h) {
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
    this.showMask = false
    this.maskTween = new Tween(0, 0.2)
    this.tileTypeMode = 0
    this.tilesetList = []
  }

  activate (e) {
    if (e.which === 0) {
      vent.publish('panel.active', this)
    }
  }

  toggleMask () {
    let show = !this.showMask
    this.showMask = show
    this.maskTween.set(show ? 1 : 0)
    vent.publish('tileset.togglemask', show)
  }

  toggleTileType (e) {
    let mode = this.tileTypeMode + 1
    if (mode > 2) {
      mode = 0
    }
    this.tileTypeMode = mode
    e.currentTarget.firstChild.style.marginTop = (-mode * e.currentTarget.offsetHeight) + 'px'
  }

  addScrollbars ({dom}) {
    this.panelEl = dom
    this.scrollbars = new Scrollbars({
      element: dom,
      revealDistance: 64
    })
    this.scrollbars.contentWidth = 10 * 32
    this.scrollbars.contentHeight = 100 * 32
    this.scrollbars.update()
    vent.subscribe('panel.resize', () => this.scrollbars.update())

    this.initialize()
  }

  initialize () {
    this.map = new TileMap(1, 1)

    vent.subscribe('tileset.load', () => {
      let tileCount = app.j2t.tilesetInfo.fields.TileCount
      let w = 10
      let h = Math.ceil(tileCount / 10)
      this.scrollbars.contentHeight = h * 32
      this.scrollbars.update()
      let arr = createTileArray(w, h)
      this.map.setTexture(w, h)
      this.map.setTiles(0, 0, arr)
    })
    vent.subscribe('renderer.draw', () => this.redraw())
  }

  redraw () {
    const gl = r.gl
    const ctx = r.ctx
    const canvasRect = r.canvas.getBoundingClientRect()
    const rect = this.panelEl.parentNode.getBoundingClientRect()
    const cw = this.scrollbars.getOffsetWidth()
    const ch = this.scrollbars.getOffsetHeight()
    const maskOpacity = this.maskTween.get()

    if (!r.disableWebGL) {
      gl.viewport(rect.left, r.canvas.height - (rect.top - canvasRect.top + ch), cw, ch)
    } else {
      ctx.save()
      ctx.beginPath()
      ctx.rect(rect.left, rect.top - canvasRect.top, cw, ch)
      ctx.clip()
      ctx.translate(rect.left, rect.top - canvasRect.top)
    }
    r.drawTilemap({
      scale: 1,
      viewportSize: [cw, ch],
      viewOffset: [Math.floor(-this.scrollbars.smoothScroller.offsetLeft), Math.floor(-this.scrollbars.smoothScroller.offsetTop)],
      mapSize: [this.map.width, this.map.height],
      textureSize: this.map.textureSize,
      repeatTilesX: 0,
      repeatTilesY: 0,
      map: this.map.texture,
      maskOpacity: maskOpacity,
      backgroundColor: [72 / 255, 48 / 255, 168 / 255, 1.0]
    })
    if (r.disableWebGL) {
      ctx.restore()
    }
  }

  view ({fluid, oncreate, active}) {
    return m('#tilesetpanel.panel', {class: ((fluid ? 'flexfluid' : '') + ' ' + (active ? 'active' : '')).trim(), oncreate, onmouseover: this.activate.bind(this)}, [
      m('.toolbar', [
        m('.title', 'Tileset'),
        m('.selectwrap.flexfluid', m('select', {disabled: false}, [viewTilesetOption(), this.tilesetList.map(viewTilesetOption)])),

        m('button', {title: 'Toggle tile mask', onclick: this.toggleMask.bind(this), class: this.showMask ? 'selected' : ''}, 'Mask'),
        m('button.tile-types.right', {title: 'Toggle tile types', onclick: this.toggleTileType.bind(this)}, [
          m('div', 'Tile Type'),
          m('div', 'Events'),
          m('div', 'None')
        ])
      ]),
      m('.panelcontent', m('.canvaswrapper', {oncreate: this.addScrollbars.bind(this)}))
    ])
  }
}

module.exports = TilesetPanel
