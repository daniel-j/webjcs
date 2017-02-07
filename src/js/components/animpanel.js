
const m = require('mithril')
const vent = require('../vent')

const app = require('../app')
const Scrollbars = require('../scrollbars')
const TileMap = require('../TileMap')
const r = require('../renderer')
const Tile = require('../Tile')
const Tween = require('../util/tween')
const Drag = require('../util/drag')
const Anim = require('../Anim')

class AnimPanel {
  constructor () {
    this.isActive
    this.showMask = false
    this.maskTween = new Tween(0, 0.2)
    this.selectingFrame = false
    this.selectStartX = 0
    this.selectStartY = 0
    this.selectedArea = [0, 0, 0, 0]
    this.hasSelection = false
    this.isHFlipping = false
    this.isVFlipping = false

    vent.subscribe('window.keydown', (ev, {e, key, accel, modalOpen, hasActiveElement}) => {
      if (!this.isActive || modalOpen) return
      let prevent = true
      if (accel === 'Delete' && this.hasSelection) {
        let animId = this.selectStartY
        let anim = app.j2l.anims[animId]
        if (anim) {
          if (!this.selectingFrame) {
            app.j2l.anims.splice(animId, 1)
            this.updateAnimMap()
          } else {
            let frame = this.selectStartX
            if (anim.frames.length > 1) {
              anim.frames.splice(frame, 1)
              this.updateAnimMap()
            }
          }
        }
      } else if (key === 'f') {
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

  oncontextmenu (e) {
    let rect = this.panelEl.parentNode.getBoundingClientRect()
    let x = e.pageX - rect.left
    let y = e.pageY - rect.top
    if (x >= 32 + 4) return
    x = Math.floor(x / 32)
    y = Math.floor((y - this.scrollbars.smoothScroller.offsetTop) / 32)
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

  updateAnimMap () {
    let animCount = app.j2l.anims.length
    this.animMap.setTexture(1, Math.min(animCount + 1, 256))
    this.framesMap.setTexture(64, Math.max(1, animCount))

    let animTiles = []
    for (let i = 0; i < animCount; i++) {
      let anim = app.j2l.anims[i]
      animTiles.push(new Tile({id: i, animated: true}))
      let frames = []
      for (let j = 0; j < anim.frames.length; j++) {
        frames.push([new Tile(anim.frames[j])])
      }
      if (anim.frames.length < 64) {
        frames.push([null])
      }

      this.framesMap.setTiles(0, i, frames, false, true)
    }
    if (animCount < 256) {
      animTiles.push(null)
    }

    this.animMap.setTiles(0, 0, [animTiles])
    this.scrollbars.contentWidth = (32 + 4) + 64 * 32
    this.scrollbars.contentHeight = Math.min(256, animCount + 2) * 32
    // TODO: Fix scrollbars.update so it doesn't have to be called twice
    this.scrollbars.update()
    this.scrollbars.update()
  }

  addScrollbars ({dom}) {
    this.panelEl = dom
    this.scrollbars = new Scrollbars({
      element: dom,
      revealDistance: 64
    })

    vent.subscribe('panel.resize', () => this.scrollbars.update())

    this.select = new Drag(dom.parentNode)
    this.select.on('start', (x, y, e) => {
      if (e && e.ctrlKey) {
        this.select.stop(true)
        if (!this.hasSelection) return
        let animId = Math.floor((y - this.scrollbars.smoothScroller.offsetTop) / 32)
        let anim = app.j2l.anims[animId]
        if (!anim) return
        let tile
        if (x >= 32 + 4) {
          let frame = anim.frames[Math.floor((x - this.scrollbars.smoothScroller.offsetLeft - (32 + 4)) / 32)]
          if (frame) tile = new Tile(frame)
        } else if (x < 32) {
          tile = new Tile({id: animId, animated: true})
        }
        if (tile) {
          tile.flipped = tile.flipped ^ this.isHFlipping
          tile.vflipped = tile.vflipped ^ this.isVFlipping
          vent.publish('anim.addframe', tile)
        }
        return
      }
      if (x >= 32 + 4) {
        this.selectingFrame = true
        this.selectStartX = Math.floor((x - this.scrollbars.smoothScroller.offsetLeft - (32 + 4)) / 32)
        this.selectStartY = Math.floor((y - this.scrollbars.smoothScroller.offsetTop) / 32)
        if (this.selectStartY >= app.j2l.anims.length || this.selectStartX > app.j2l.anims[this.selectStartY].frames.length) {
          this.select.stop(true)
          this.hasSelection = false
          return
        }
      } else {
        this.selectingFrame = false
        this.selectStartX = Math.floor(x / 32)
        this.selectStartY = Math.floor((y - this.scrollbars.smoothScroller.offsetTop) / 32)
        if (this.selectStartY > app.j2l.anims.length) {
          this.select.stop(true)
          this.hasSelection = false
          return
        }
      }
      this.hasSelection = true
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
        selection.source = 'anim'
        vent.publish('selectedtiles', selection)
      }
    })

    this.initialize()
  }

  initialize () {
    this.animMap = new TileMap(1, 1)
    this.framesMap = new TileMap(64, 1)

    vent.subscribe('anim.addframe', (ev, tile) => {
      if (!this.hasSelection) return
      let animId = this.selectStartY
      let anim = app.j2l.anims[animId]
      tile = new Tile(tile)
      if (!anim && !this.selectingFrame && this.selectStartY === app.j2l.anims.length) {
        anim = new Anim()
        app.j2l.anims.push(anim)
      }
      if (!anim || anim.frames.length === 64) {
        return
      }
      let position = this.selectingFrame ? this.selectStartX : anim.frames.length

      anim.frames.splice(position, 0, tile)
      if (this.selectingFrame && position >= anim.frames.length - 1) {
        this.selectStartX++
        if (this.selectStartX >= 64) {
          this.selectStartX = 63
        }
        this.calculateSelectedArea()
      }
      this.updateAnimMap()
    })

    vent.subscribe('selectedtiles', (ev, selection) => {
      let source = selection.source
      if (source !== 'tileset' || source === 'anim') return
      this.hasSelection = false
    })

    vent.subscribe('level.load', () => {
      this.updateAnimMap()
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

    if (app.j2l.anims.length > 0) {
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
        invertArea: this.hasSelection && this.selectingFrame && this.selectedArea,
        viewport: [rect.left + 32 + 4, rect.top - canvasRect.top, cw - (32 + 4), ch]
      })
      if (r.disableWebGL) {
        ctx.restore()
      }
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
      invertArea: this.hasSelection && !this.selectingFrame && this.selectedArea,
      viewport: [rect.left, rect.top - canvasRect.top, cw, ch]
    })
    if (r.disableWebGL) {
      ctx.restore()
    }
  }

  view ({fluid, oncreate, active}) {
    this.isActive = active
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
