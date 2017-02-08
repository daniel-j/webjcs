
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
    this.isActive = false
    this.showMask = false
    this.maskTween = new Tween(0, 0.2)
    this.tileTypeMode = 0
    this.tilesetList = []
    this.selectStartX = 0
    this.selectStartY = 0
    this.selectedArea = [0, 0, 0, 0]
    this.isHoldingCtrl = false
    this.isHFlipping = false
    this.isVFlipping = false

    vent.subscribe('window.keydown', (ev, {e, key, accel, modalOpen, hasActiveElement}) => {
      if (!this.isActive || modalOpen) return
      let prevent = true
      if (key === 'f') {
        this.isHFlipping = true
      } else if (key === 'i') {
        this.isVFlipping = true
      } else {
        prevent = false
      }
      if (prevent) {
        e.preventDefault()
      }
    })
    vent.subscribe('window.keyup', (ev, {e, key, accel, modalOpen, hasActiveElement}) => {
      if (!this.isActive || modalOpen) return
      if (key === 'f') {
        this.isHFlipping = false
      } else if (key === 'i') {
        this.isVFlipping = false
      }
    })
  }

  activate (e) {
    if (e.which === 0) {
      this.isActive = true
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
    this.selectedArea[0] = Math.max(0, Math.min(this.selectStartX, Math.floor((this.select.x - this.scrollbars.smoothScroller.offsetLeft) / 32)))
    this.selectedArea[1] = Math.max(0, Math.min(this.selectStartY, Math.floor((this.select.y - this.scrollbars.smoothScroller.offsetTop) / 32)))
    this.selectedArea[2] = Math.min(this.scrollbars.contentWidth / 32, Math.max(this.selectStartX + 1, Math.ceil((this.select.x - this.scrollbars.smoothScroller.offsetLeft) / 32)))
    this.selectedArea[3] = Math.min(this.scrollbars.contentHeight / 32, Math.max(this.selectStartY + 1, Math.ceil((this.select.y - this.scrollbars.smoothScroller.offsetTop) / 32)))
  }

  addScrollbars ({dom}) {
    this.panelEl = dom

    this.scrollbars = new Scrollbars({
      element: dom,
      revealDistance: 64
    })
    this.scrollbars.contentWidth = 10 * 32
    this.scrollbars.contentHeight = 0 * 32
    this.scrollbars.update()
    vent.subscribe('panel.resize', () => this.scrollbars.update())
    this.scrollbars.on('scroll', () => this.calculateSelectedArea())

    this.select = new Drag(dom.parentNode)
    this.select.on('start', (x, y, e) => {
      this.selectStartX = Math.floor((x - this.scrollbars.smoothScroller.offsetLeft) / 32)
      this.selectStartY = Math.floor((y - this.scrollbars.smoothScroller.offsetTop) / 32)
      this.calculateSelectedArea()
    })
    this.select.on('move', (x, y, e) => {
      if (!e.ctrlKey) {
        this.calculateSelectedArea()
      }
    })
    this.select.on('stop', (e) => {
      if (e && e.ctrlKey) {
        let tile = this.map.map[this.selectStartX + 10 * this.selectStartY]
        if (tile) {
          tile = new Tile(tile)
          tile.flipped = this.isHFlipping
          tile.vflipped = this.isVFlipping
          vent.publish('anim.addframe', tile)
        }
        return
      }
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
        selection.source = 'tileset'
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
      invertArea: this.select.active && this.selectedArea,
      viewport: [rect.left, rect.top - canvasRect.top, cw, ch]
    })
    if (r.disableWebGL) {
      ctx.restore()
    }
  }

  view ({fluid, oncreate, active}) {
    this.isActive = active
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
