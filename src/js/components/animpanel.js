
const m = require('mithril')
const vent = require('../vent')

const app = require('../app')
const Scrollbars = require('../scrollbars')
const TileMap = require('../TileMap')
const r = require('../renderer')
const Tile = require('../Tile')

class AnimPanel {
  constructor () {
    this.showMask = false
  }

  activate (e) {
    if (e.which === 0) {
      vent.publish('panel.active', this)
    }
  }

  toggleMask () {
    let show = !this.showMask
    this.showMask = show
    vent.publish('panel.anim', {
      showMask: show
    })
  }

  addScrollbars ({dom}) {
    this.panelEl = dom
    this.scrollbars = new Scrollbars({
      element: dom,
      revealDistance: 64
    })

    vent.subscribe('panel.resize', () => this.scrollbars.update())

    this.initialize()
  }

  initialize () {
    this.animMap = new TileMap(1, 256)
    this.framesMap = new TileMap(64, 256)

    vent.subscribe('level.load', () => {
      let animCount = app.j2l.levelInfo.fields.AnimCount

      let animTiles = []
      let longestAnim = 0
      for (let i = 0; i < animCount; i++) {
        let anim = app.j2l.levelInfo.fields.Anim[i]
        animTiles.push(new Tile({id: i, animated: true}))
        let frames = []
        for (let j = 0; j < anim.FrameCount; j++) {
          frames.push([new Tile(anim.Frame[j])])
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
      mapSize: [this.framesMap.width, this.framesMap.height],
      textureSize: this.framesMap.textureSize,
      repeatTilesX: 0,
      repeatTilesY: 0,
      map: this.framesMap.texture,
      maskOpacity: 0,
      backgroundColor: [72 / 255, 48 / 255, 168 / 255, 1.0]
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
      mapSize: [this.animMap.width, this.animMap.height],
      textureSize: this.animMap.textureSize,
      repeatTilesX: 0,
      repeatTilesY: 0,
      map: this.animMap.texture,
      maskOpacity: 0,
      backgroundColor: [72 / 255, 48 / 255, 168 / 255, 1.0]
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
      m('.panelcontent', m('.canvaswrapper', {oncreate: this.addScrollbars.bind(this)}))
    ])
  }
}

module.exports = AnimPanel
