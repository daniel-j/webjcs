
const m = require('mithril')
const vent = require('../vent')
const Scrollbars = require('../scrollbars')
const Drag = require('../util/drag')
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
    this.dragStartX = 0
    this.dragStartY = 0
    this.selectedArea = [0, 0, 0, 0]
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
  }

  toggleTileType (e) {
    let mode = this.tileTypeMode + 1
    if (mode > 2) {
      mode = 0
    }
    this.tileTypeMode = mode
    e.currentTarget.firstChild.style.marginTop = (-mode * e.currentTarget.offsetHeight) + 'px'
  }

  calculateSelectedArea () {
    this.selectedArea[0] = Math.max(0, Math.min(Math.floor(this.dragStartX / 32), Math.floor((this.drag.x - this.scrollbars.smoothScroller.offsetLeft) / 32)))
    this.selectedArea[1] = Math.max(0, Math.min(Math.floor(this.dragStartY / 32), Math.floor((this.drag.y - this.scrollbars.smoothScroller.offsetTop) / 32)))
    this.selectedArea[2] = Math.min(this.scrollbars.contentWidth / 32, Math.max(Math.ceil(this.dragStartX / 32), Math.ceil((this.drag.x - this.scrollbars.smoothScroller.offsetLeft) / 32)))
    this.selectedArea[3] = Math.min(this.scrollbars.contentHeight / 32, Math.max(Math.ceil(this.dragStartY / 32), Math.ceil((this.drag.y - this.scrollbars.smoothScroller.offsetTop) / 32)))
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
    this.scrollbars.on('scroll', () => this.calculateSelectedArea())

    this.drag = new Drag(dom.parentNode)
    this.drag.on('move', (x, y) => {
      this.calculateSelectedArea()
    })
    this.drag.on('start', (x, y) => {
      this.dragStartX = x - this.scrollbars.smoothScroller.offsetLeft
      this.dragStartY = y - this.scrollbars.smoothScroller.offsetTop
      this.calculateSelectedArea()
    })
    this.drag.on('stop', () => {
      let selection = []
      let tilecount = 0
      for (let x = 0; x < this.selectedArea[2] - this.selectedArea[0]; x++) {
        selection[x] = []
        for (let y = 0; y < this.selectedArea[3] - this.selectedArea[1]; y++) {
          let tile = this.map.map[this.selectedArea[0] + x + 10 * (this.selectedArea[1] + y)]
          if (tile) tile = new Tile(tile)
          selection[x][y] = tile
          tilecount++
        }
      }
      if (tilecount > 0) {
        vent.publish('selectedtiles', selection)
      }
    })

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
      repeatTilesX: 0,
      repeatTilesY: 0,
      map: this.map,
      maskOpacity: maskOpacity,
      backgroundColor: [72 / 255, 48 / 255, 168 / 255, 1.0],
      invertArea: this.drag.active && this.selectedArea,
      viewport: [rect.left, rect.top - canvasRect.top, cw, ch]
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
      m('.panelcontent', m('div', {oncreate: this.addScrollbars.bind(this)}))
    ])
  }
}

module.exports = TilesetPanel
