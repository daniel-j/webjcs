
const m = require('mithril')
const vent = require('../vent')

const app = require('../app')
const Scrollbars = require('../scrollbars')
const TileMap = require('../TileMap')
const r = require('../renderer')
const Tile = require('../Tile')
const Tween = require('../util/tween')
const Drag = require('../util/drag')

class AnimPanel {
  constructor () {
    this.showMask = false
    this.maskTween = new Tween(0, 0.2)
    this.selectingFrame = false
    this.selectStartX = 0
    this.selectStartY = 0
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

  oncontextmenu (e) {
    let rect = this.panelEl.parentNode.getBoundingClientRect()
    let x = e.pageX - rect.left
    let y = e.pageY - rect.top
    if (x >= 32 + 4) return
    x = Math.floor(x / 32)
    y = Math.floor((y - this.scrollbars.smoothScroller.offsetTop) / 32)
    console.log(y)
    if (y >= 0 && y < app.j2l.anims.length) {
      e.preventDefault()
      vent.publish('animpanel.openproperties', y)
    }
  }

  calculateSelectedArea () {
    this.selectedArea[0] = this.selectStartX
    this.selectedArea[1] = this.selectStartY
    this.selectedArea[2] = this.selectedArea[0] + 1
    this.selectedArea[3] = this.selectedArea[1] + 1
  }

  addScrollbars ({dom}) {
    this.panelEl = dom
    this.scrollbars = new Scrollbars({
      element: dom,
      revealDistance: 64
    })

    vent.subscribe('panel.resize', () => this.scrollbars.update())

    this.select = new Drag(dom.parentNode)
    this.select.on('start', (x, y) => {
      if (x >= 32 + 4) {
        this.selectingFrame = true
        this.selectStartX = Math.floor((x - this.scrollbars.smoothScroller.offsetLeft - (32 + 4)) / 32)
        this.selectStartY = Math.floor((y - this.scrollbars.smoothScroller.offsetTop) / 32)
      } else {
        this.selectingFrame = false
        this.selectStartX = Math.floor(x / 32)
        this.selectStartY = Math.floor((y - this.scrollbars.smoothScroller.offsetTop) / 32)
      }
      this.calculateSelectedArea()
    })
    this.select.on('move', (x, y) => {
      if (this.selectingFrame) {
        x = Math.floor((x - this.scrollbars.smoothScroller.offsetLeft - (32 + 4)) / 32)
        y = Math.floor((y - this.scrollbars.smoothScroller.offsetTop) / 32)
      } else {
        x = Math.floor(x / 32)
        y = Math.floor((y - this.scrollbars.smoothScroller.offsetTop) / 32)
      }
      if (x !== this.selectStartX || y !== this.selectStartY) {
        this.select.stop(true)
      }
    })
    this.select.on('stop', (x, y) => {
      let selection = null
      if (!this.selectingFrame) {
        let tile = this.animMap.map[this.selectStartY]
        if (tile) {
          selection = [[new Tile(tile)]]
        }
      }
      if (selection) {
        vent.publish('selectedtiles', selection)
      }
    })

    this.initialize()
  }

  initialize () {
    this.animMap = new TileMap(1, 256)
    this.framesMap = new TileMap(64, 256)

    vent.subscribe('level.load', () => {
      let animCount = app.j2l.anims.length

      let animTiles = []
      let longestAnim = 0
      for (let i = 0; i < animCount; i++) {
        let anim = app.j2l.anims[i]
        animTiles.push(new Tile({id: i, animated: true}))
        let frames = []
        for (let j = 0; j < anim.frames.length; j++) {
          frames.push([new Tile(anim.frames[j])])
        }

        this.framesMap.setTiles(0, i, frames)
        if (anim.FrameCount > longestAnim) {
          longestAnim = anim.FrameCount
        }
      }

      this.animMap.setTiles(0, 0, [animTiles])
      this.scrollbars.contentWidth = (32 + 4) + 64 * 32
      this.scrollbars.contentHeight = Math.min(256, animCount + 1) * 32

      // TODO: Fix scrollbars.update so it doesn't have to be called twice
      this.scrollbars.update()
      this.scrollbars.update()
    })
    vent.subscribe('renderer.draw', () => this.redraw())
  }

  redraw (dt) {
    const scrollLeft = this.scrollbars.smoothScroller.offsetLeft
    const scrollTop = this.scrollbars.smoothScroller.offsetTop
    this.scrollbars.enableTransition()

    const gl = r.gl
    const ctx = r.ctx
    const maskOpacity = this.maskTween.get()
    const canvasRect = r.canvas.getBoundingClientRect()
    const rect = this.panelEl.parentNode.getBoundingClientRect()
    const cw = this.scrollbars.getOffsetWidth()
    const ch = this.scrollbars.getOffsetHeight()

    let x = -scrollLeft
    let y = -scrollTop

    if (!r.disableWebGL) {
      gl.viewport(rect.left + 32 + 4, r.canvas.height - (rect.top - canvasRect.top + ch), cw - (32 + 4), ch)
    } else {
      ctx.save()
      ctx.beginPath()
      ctx.rect(rect.left + 32 + 4, rect.top - canvasRect.top, cw - (32 + 4), ch)
      ctx.clip()
      ctx.translate(rect.left + 32 + 4, rect.top - canvasRect.top)
    }
    r.drawTilemap({
      scale: 1,
      viewportSize: [cw - (32 + 4), ch],
      viewOffset: [Math.floor(x), Math.floor(y)],
      repeatTilesX: 0,
      repeatTilesY: 0,
      map: this.framesMap,
      maskOpacity: maskOpacity,
      backgroundColor: [72 / 255, 48 / 255, 168 / 255, 1.0],
      invertArea: this.selectingFrame && this.selectedArea,
      viewport: [rect.left + 32 + 4, rect.top - canvasRect.top, cw - (32 + 4), ch]
    })
    if (r.disableWebGL) {
      ctx.restore()
    }

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
      viewOffset: [0, Math.floor(y)],
      repeatTilesX: 0,
      repeatTilesY: 0,
      map: this.animMap,
      maskOpacity: maskOpacity,
      backgroundColor: [72 / 255, 48 / 255, 168 / 255, 1.0],
      invertArea: this.select.active && !this.selectingFrame && this.selectedArea,
      viewport: [rect.left, rect.top - canvasRect.top, cw, ch]
    })
    if (r.disableWebGL) {
      ctx.restore()
    }
  }

  view ({fluid, oncreate, active}) {
    return m('#animpanel.panel', {class: ((fluid ? 'flexfluid' : '') + ' ' + (active ? 'active' : '')).trim(), oncreate, onmouseover: this.activate.bind(this)}, [
      m('.toolbar', [
        m('.title.flexfluid', 'Animations'),

        m('button', {title: 'Toggle tile mask', onclick: this.toggleMask.bind(this), class: this.showMask ? 'selected' : ''}, 'Mask')
      ]),
      m('.panelcontent', {oncontextmenu: (e) => this.oncontextmenu(e)}, m('div', {oncreate: this.addScrollbars.bind(this)}))
    ])
  }
}

module.exports = AnimPanel
