
const m = require('mithril')
const vent = require('postal').channel()
const Scrollbars = require('../scrollbars')
const app = require('../app')
const TileRenderer = require('../tilerenderer')
const loop = require('raf-loop')

class LayerPanel {
  constructor () {
    this.isActive = m.prop(false)
    this.tileMode = m.prop(0)
    this.showMask = m.prop(false)
    this.showParallax = m.prop(false)
    this.showClassic = m.prop(false)
    this.showEvents = m.prop(true)
    this.zoomLevel = m.prop(1)
    this.currentLayer = m.prop(3)
    this.el = null
    this.loop = loop(this.redraw.bind(this))

    vent.subscribe('window.keypress', (e) => {
      if (!this.isActive()) return
      let kc = e.keyCode
      let c = String.fromCharCode(kc)
      if (kc >= 49 && kc <= 56) { // Number 1-8
        let l = kc - 49
        this.setCurrentLayer(l)
      } else if (c === '+') {
        this.setZoomLevel(this.zoomLevel() * 2)
      } else if (c === '-') {
        this.setZoomLevel(this.zoomLevel() * 0.5)
      } else {
        console.log(kc, c)
      }
    })
  }

  activate (e) {
    if (e.which === 0) {
      this.isActive(true)
      vent.publish('panel.active', this)
    }
  }

  setZoomLevel (z) {
    if (z < 1 / 8 || z > 4) return
    let zd = z / this.zoomLevel()
    this.zoomLevel(z)

    let scrollX = this.scrollbars.scrollPosition[0]
    let scrollY = this.scrollbars.scrollPosition[1]

    this.setCurrentLayer(this.currentLayer())
    let cw = this.scrollbars.getOffsetWidth()
    let ch = this.scrollbars.getOffsetHeight()
    if (zd > 1) { // Zoom in
      this.scrollbars.scrollPosition[0] = scrollX * zd + cw / zd
      this.scrollbars.scrollPosition[1] = scrollY * zd + ch / zd
    } else if (zd < 1) { // Zoom out
      this.scrollbars.scrollPosition[0] = scrollX * zd - (cw / 2) * zd
      this.scrollbars.scrollPosition[1] = scrollY * zd - (ch / 2) * zd
    }
    this.scrollbars.update(true)
    m.redraw()
  }

  setCurrentLayer (l) {
    this.currentLayer(l)
    let lw = app.j2l.levelInfo.fields.LayerWidth[l]
    let lh = app.j2l.levelInfo.fields.LayerHeight[l]

    this.scrollbars.contentWidth = lw * 32 * this.zoomLevel()
    this.scrollbars.contentHeight = lh * 32 * this.zoomLevel()
    this.scrollbars.disableTransition()
    this.scrollbars.update()

    this.renderer.setBackgroundSize(lw, lh)
    this.renderer.setTileScale(this.zoomLevel())

    let currentSpeedX = app.j2l.levelInfo.fields.LayerXSpeed[l] / 65536
    let currentSpeedY = app.j2l.levelInfo.fields.LayerYSpeed[l] / 65536

    for (let i = 0; i < 8; i++) {
      let layer = this.renderer.layers[i]
      let speedX = app.j2l.levelInfo.fields.LayerXSpeed[i] / 65536
      let speedY = app.j2l.levelInfo.fields.LayerYSpeed[i] / 65536
      if (i === l) {
        layer.scrollScaleX = 1
        layer.scrollScaleY = 1
      } else {
        layer.scrollScaleX = speedX / currentSpeedX
        layer.scrollScaleY = speedY / currentSpeedY
        if (!isFinite(layer.scrollScaleX)) layer.scrollScaleX = 0
        if (!isFinite(layer.scrollScaleY)) layer.scrollScaleY = 0
      }
      let layerMisc = app.j2l.levelInfo.fields.LayerMiscProperties[i]
      layer.repeatX = !this.showClassic() && layerMisc & 1
      layer.repeatY = !this.showClassic() && (layerMisc >> 1) & 1
      layer.zIndex = this.showParallax() ? 0 : i - l
      layer.hidden = this.showClassic() && i !== l
    }
    m.redraw()
  }

  getLayerTitle () {
    let l = this.currentLayer()
    let s = 'Layer ' + (l + 1) + ': '
    switch (l + 1) {
      case 1: s += 'Foreground layer #2'; break
      case 2: s += 'Foreground layer #1'; break
      case 3: s += 'Sprite foreground layer'; break
      case 4: s += 'Sprite layer'; break
      case 5: s += 'Background layer #1'; break
      case 6: s += 'Background layer #2'; break
      case 7: s += 'Background layer #3'; break
      case 8: s += 'Background layer'; break
    }
    let z = this.zoomLevel()
    if (z !== 1) {
      s += ' [' + z * 100 + '%]'
    }
    let layerMisc = app.j2l.levelInfo.fields.LayerMiscProperties[l]
    let repeatX = layerMisc & 1
    let repeatY = (layerMisc >> 1) & 1
    if (repeatX) {
      s += ' [Tile X]'
    }
    if (repeatY) {
      s += ' [Tile Y]'
    }
    return s
  }

  setShowMask (show) {
    this.showMask(show)
    this.renderer.setMaskOpacity(show ? 1 : 0)
  }
  setTileMode (mode) {
    this.tileMode(mode)
    this.setShowMask(mode === 1)
    this.showParallax(mode === 2)
    this.showClassic(mode === 3)
    this.setCurrentLayer(this.currentLayer())
  }
  toggleTileMode (e) {
    let mode = this.tileMode() + 1
    if (mode > 3) {
      mode = 0
    }
    e.currentTarget.firstChild.style.marginTop = (-mode * e.currentTarget.offsetHeight) + 'px'
    this.setTileMode(mode)
  }

  toggleEvents () {
    let show = !this.showEvents()
    this.showEvents(show)
  }

  configPanel (el, isInitialized) {
    this.el = el
  }

  addScrollbars (node, isInitialized) {
    if (isInitialized) return
    this.scrollbars = new Scrollbars({
      element: node,
      revealDistance: 64
    })
    this.scrollbars.contentWidth = app.j2l.levelInfo.fields.LayerWidth[this.currentLayer()] * 32 * this.zoomLevel()
    this.scrollbars.contentHeight = app.j2l.levelInfo.fields.LayerHeight[this.currentLayer()] * 32 * this.zoomLevel()
    this.scrollbars.update()

    vent.subscribe('panel.resize', () => this.scrollbars.update())
  }

  initCanvas (node, isInitialized) {
    if (isInitialized) return

    this.canvas = node
    this.renderer = new TileRenderer(this.canvas, true)

    vent.subscribe('level.load', () => {
      this.renderer.setTileset(app.j2t.tilesetCanvas, app.j2t.maskCanvas, app.j2t.tilesetInfo.fields.TileCount)

      for (let i = 0; i < 8; i++) {
        let lw = app.j2l.levelInfo.fields.LayerWidth[i]
        let lh = app.j2l.levelInfo.fields.LayerHeight[i]
        let speedX = app.j2l.levelInfo.fields.LayerXSpeed[i] / 65536
        let speedY = app.j2l.levelInfo.fields.LayerYSpeed[i] / 65536
        this.renderer.setTileLayer(i, lw, lh, speedX, speedY)
        this.renderer.layers[i].setTiles(0, 0, app.j2l.layers[i])
      }

      this.setCurrentLayer(app.j2l.levelInfo.fields.SecEnvAndLayer & 0xF)
      this.scrollbars.scrollPosition[0] = app.j2l.levelInfo.fields.JCSHorizontalOffset * this.zoomLevel()
      this.scrollbars.scrollPosition[1] = app.j2l.levelInfo.fields.JCSVerticalOffset * this.zoomLevel()
      this.scrollbars.disableTransition()
      this.scrollbars.update(true)
      this.loop.start()
    })
    vent.subscribe('anim.frames', (tiles) => {
      this.renderer.animMap.setTiles(0, 0, tiles)
    })
  }

  redraw (dt) {
    let cw = this.scrollbars.getOffsetWidth()
    let ch = this.scrollbars.getOffsetHeight()
    if (cw !== this.canvas.width) this.canvas.width = cw
    if (ch !== this.canvas.height) this.canvas.height = ch
    this.renderer.resizeViewport(cw, ch)

    let scrollLeft = this.scrollbars.smoothScroller.offsetLeft
    let scrollTop = this.scrollbars.smoothScroller.offsetTop
    this.scrollbars.enableTransition()

    // let zoom = this.zoomLevel()

    this.renderer.draw(-scrollLeft + cw / 2, -scrollTop + ch / 2)

    // background color
    /*
    this.ctx.fillStyle = '#4830a8'
    this.ctx.fillRect(
      scrollLeft,
      scrollTop,
      app.j2l.levelInfo.fields.LayerWidth[3] * 32 * zoom,
      app.j2l.levelInfo.fields.LayerHeight[3] * 32 * zoom
    )

    if (!app.j2l.layers) return

    let l = 3
    let layer = app.j2l.layers[l]
    let level = app.j2l.levelInfo.fields

    let lw = level.LayerWidth[l]
    let lh = level.LayerHeight[l]

    let offx = Math.floor(-scrollLeft / (32 * zoom))
    let offy = Math.floor(-scrollTop / (32 * zoom))
    let offw = Math.ceil(cw / (32 * zoom))
    let offh = Math.ceil(ch / (32 * zoom))

    for (let x = offx; x <= offx + offw; x++) {
      for (let y = offy; y <= offy + offh; y++) {
        if (x >= lw || y >= lh) continue
        let tile = layer[x][y]
        if (tile.animated || tile.flipped) continue
        let tileX = tile.id % 10
        let tileY = tile.id / 10 | 0
        this.ctx.drawImage(this.showMask()?app.j2t.mask:app.j2t.tileset, tileX * 32, tileY * 32, 32, 32, Math.floor(x * 32 * zoom + scrollLeft), Math.floor(y * 32 * zoom + scrollTop), 32*zoom, 32*zoom);
      }
    }
    */
  }

  view ({fluid, config, active}) {
    this.isActive(active)

    const layerButtons = []
    for (let i = 0; i < 8; i++) {
      layerButtons[i] = m('button', {
        title: 'Select layer ' + (i + 1),
        class: i === this.currentLayer() ? 'selected' : '',
        onclick: this.setCurrentLayer.bind(this, i)
      }, i + 1)
    }
    return m('#layerpanel.panel', {class: ((fluid ? 'flexfluid' : '') + ' ' + (active ? 'active' : '')).trim(), config, onmouseover: this.activate.bind(this)}, [
      m('.toolbar', [
        m('.title.flexfluid', m('.text-clip', this.getLayerTitle())),

        m('button', {title: 'Zoom in', onclick: this.setZoomLevel.bind(this, this.zoomLevel() * 2)}, '+'),
        m('button', {title: 'Zoom out', onclick: this.setZoomLevel.bind(this, this.zoomLevel() * 0.5)}, '-'),
        m('.spacer'),
        layerButtons,
        m('.spacer'),
        m('button.tile-modes.right', {title: 'Toggle tile modes', onclick: this.toggleTileMode.bind(this)}, [
          m('div', 'X-Ray'),
          m('div', 'Mask'),
          m('div', 'Parallax'),
          m('div', 'Classic')
        ]),
        m('button', {title: 'Toggle events', onclick: this.toggleEvents.bind(this), class: this.showEvents() ? 'selected' : ''}, 'Events')
      ]),
      m('.panelcontent', m('.canvaswrapper', {config: this.addScrollbars.bind(this)}, m('canvas', {config: this.initCanvas.bind(this)})))
    ])
  }
}

module.exports = LayerPanel
