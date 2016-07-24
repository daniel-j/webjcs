
const m = require('mithril')
const vent = require('postal').channel()
const Scrollbars = require('../scrollbars')
const app = require('../app')
const TileRenderer = require('../tilerenderer')
const loop = require('raf-loop')

class LayerPanel {
  constructor () {
    this.showMask = m.prop(false)
    this.showEvents = m.prop(true)
    this.zoomLevel = m.prop(1)
    this.el = null
    this.loop = loop(this.redraw.bind(this))
  }

  toggleMask () {
    let show = !this.showMask()
    this.showMask(show)
    this.renderer.setMaskOpacity(show ? 1 : 0)
    vent.publish('layer.togglemask', show)
  }

  toggleEvents () {
    let show = !this.showEvents()
    this.showEvents(show)
  }

  configPanel (el) {
    this.el = el
  }

  addScrollbars (node, isInitialized) {
    if (isInitialized) return
    this.scrollbars = new Scrollbars({
      element: node,
      revealDistance: 64
    })
    this.scrollbars.contentWidth = app.j2l.levelInfo.fields.LayerWidth[3] * 32 * this.zoomLevel()
    this.scrollbars.contentHeight = app.j2l.levelInfo.fields.LayerHeight[3] * 32 * this.zoomLevel()
    this.scrollbars.update()

    vent.subscribe('panel.resize', () => this.scrollbars.update())
  }

  initCanvas (node, isInitialized) {
    if (isInitialized) return

    this.canvas = node
    this.renderer = new TileRenderer(this.canvas, true)

    vent.subscribe('level.load', () => {
      this.scrollbars.contentWidth = app.j2l.levelInfo.fields.LayerWidth[3] * 32 * this.zoomLevel()
      this.scrollbars.contentHeight = app.j2l.levelInfo.fields.LayerHeight[3] * 32 * this.zoomLevel()
      this.scrollbars.update()
      let l = 3
      let lw = app.j2l.levelInfo.fields.LayerWidth[l]
      let lh = app.j2l.levelInfo.fields.LayerHeight[l]
      let tileCount = app.j2t.tilesetInfo.fields.TileCount

      this.renderer.setBackgroundSize(lw, lh)
      this.renderer.setTileset(app.j2t.tilesetCanvas, app.j2t.maskCanvas, tileCount)
      this.renderer.setTileLayer(0, lw, lh, 1, 1, false)
      this.renderer.layers[0].setTiles(0, 0, app.j2l.layers[3])
      this.renderer.setTileScale(this.zoomLevel())
      this.loop.start()
    })
  }

  redraw (dt) {
    let cw = this.canvas.parentNode.offsetWidth
    let ch = this.canvas.parentNode.offsetHeight
    if (cw !== this.canvas.width) this.canvas.width = cw
    if (ch !== this.canvas.height) this.canvas.height = ch
    this.renderer.resizeViewport(cw, ch)

    let scrollLeft = this.scrollbars.smoothScroller.offsetLeft
    let scrollTop = this.scrollbars.smoothScroller.offsetTop

    let zoom = this.zoomLevel()

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

  view ({fluid, config}) {
    return m('#layerpanel.panel', {class: fluid ? 'flexfluid' : '', config}, [
      m('.toolbar', [
        m('strong.flexfluid', 'Layer'),

        m('button', {title: 'Toggle tile mask', onclick: this.toggleMask.bind(this), class: this.showMask() ? 'selected' : ''}, 'Mask'),
        m('button', {title: 'Toggle events', onclick: this.toggleEvents.bind(this), class: this.showEvents() ? 'selected' : ''}, 'Events')
      ]),
      m('.panelcontent', m('.canvaswrapper', {config: this.addScrollbars.bind(this)}, m('canvas', {config: this.initCanvas.bind(this)})))
    ])
  }
}

module.exports = LayerPanel
