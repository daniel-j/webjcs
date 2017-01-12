
const m = require('mithril')
const vent = require('postal').channel()
const loop = require('raf-loop')

const app = require('../app')
const Scrollbars = require('../scrollbars')
const TileRenderer = require('../tilerenderer')
const Tile = require('../tile')

class AnimPanel {
  constructor () {
    this.showMask = m.prop(false)
    this.loop = loop(this.redraw.bind(this))
  }

  activate (e) {
    if (e.which === 0) {
      vent.publish('panel.active', this)
    }
  }

  toggleMask () {
    let show = !this.showMask()
    this.showMask(show)
    vent.publish('panel.anim', {
      showMask: show
    })
  }

  addScrollbars (node, isInitialized) {
    if (isInitialized) return
    this.scrollbars = new Scrollbars({
      element: node,
      revealDistance: 64
    })

    vent.subscribe('panel.resize', () => this.scrollbars.update())
  }

  initCanvas (canvas, isInitialized) {
    if (isInitialized) return

    this.canvas = canvas
    this.renderer = new TileRenderer(this.canvas, true)

    vent.subscribe('level.load', () => {
      this.renderer.setTileset(app.j2t.tilesetCanvas, app.j2t.maskCanvas, app.j2t.tilesetInfo.fields.TileCount)

      let animCount = app.j2l.levelInfo.fields.AnimCount
      this.renderer.setBackgroundSize(1, animCount)
      let animTiles = []
      for (let i = 0; i < animCount; i++) {
        let anim = app.j2l.levelInfo.fields.Anim[i]
        animTiles.push(new Tile({id: i, animated: true}))
        let frames = []
        for (let j = 0; j < anim.FrameCount; j++) {
          frames.push([new Tile(anim.Frame[j])])
        }
        this.renderer.setTileLayer(i + 1, anim.FrameCount, 1, 1, 1, false, false)
        this.renderer.layers[i + 1].positionX = -(32 + 8)
        this.renderer.layers[i + 1].positionY = -i * 32
        this.renderer.layers[i + 1].showBackground = true
        this.renderer.layers[i + 1].setTiles(0, 0, frames)
      }

      this.renderer.setTileLayer(0, 1, animCount, 0, 1, false, false)
      this.renderer.layers[0].showBackground = true
      this.renderer.layers[0].setTiles(0, 0, [animTiles])
      this.scrollbars.contentWidth = 65 * 32
      this.scrollbars.contentHeight = animCount * 32

      // TODO: Fix scrollbars.update so it doesn't have to be called twice
      this.scrollbars.update()
      this.scrollbars.update()

      this.loop.start()
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

    let animCount = app.j2l.levelInfo.fields.AnimCount
    let tiles = []
    for (let i = 0; i < 256; i++) {
      let currentFrame = 0
      if (i < animCount) {
        let anim = app.j2l.levelInfo.fields.Anim[i]
        currentFrame = Math.floor(anim.Speed * (Date.now() / 1000) % anim.FrameCount)
        tiles.push([new Tile(anim.Frame[currentFrame])])
      } else {
        tiles.push([new Tile({animated: true, id: i})])
      }
    }
    this.renderer.animMap.setTiles(0, 0, tiles)
    vent.publish('anim.frames', tiles)

    this.renderer.draw(-scrollLeft + cw / 2, -scrollTop + ch / 2)
  }

  view ({fluid, config, active}) {
    return m('#animpanel.panel', {class: ((fluid ? 'flexfluid' : '') + ' ' + (active ? 'active' : '')).trim(), config, onmouseover: this.activate.bind(this)}, [
      m('.toolbar', [
        m('.title.flexfluid', 'Animations'),

        m('button', {title: 'Toggle tile mask', onclick: this.toggleMask.bind(this), class: this.showMask() ? 'selected' : ''}, 'Mask')
      ]),
      m('.panelcontent', {style: {height: '400px'}}, m('.canvaswrapper', {config: this.addScrollbars.bind(this)}, m('canvas', {config: this.initCanvas.bind(this)})))
    ])
  }
}

module.exports = AnimPanel
