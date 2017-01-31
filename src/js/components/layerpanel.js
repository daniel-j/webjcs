
const m = require('mithril')
const vent = require('../vent')
const Scrollbars = require('../scrollbars')
const Drag = require('../util/drag')
const app = require('../app')
const Tile = require('../Tile')
const TileMap = require('../TileMap')
const r = require('../renderer')
const Tween = require('../util/tween')
const mod = require('../util/helpers').mod

class LayerPanel {
  constructor () {
    this.isActive = false
    this.panelEl = null
    this.tileMode = 0
    this.maskTween = new Tween(0, 0.2)
    this.showMask = false
    this.showParallax = false
    this.showClassic = false
    this.showEvents = true
    this.zoomLevel = 1
    this.currentLayer = 3
    this.layers = []
    this.selection = [[new Tile()]]
    this.selectedArea = [0, 0, 0, 0]
    this.selectStartX = 0
    this.selectStartY = 0
    this.mouseX = 0
    this.mouseY = 0

    vent.subscribe('window.keydown', (ev, {e, key, accel, modalOpen, hasActiveElement}) => {
      if (!this.isActive || modalOpen) return
      const isMacOS = navigator.platform.includes('Mac')
      const ctrlKey = isMacOS ? e.metaKey : e.ctrlKey
      let prevent = true
      if (!e.shiftKey && key >= 1 && key <= 8) { // Number 1-8
        let l = key - 1
        if (!ctrlKey) {
          this.setCurrentLayer(l)
        } else {
          vent.publish('layerpanel.openproperties', l)
        }
      } else if (accel === 'Backspace') {
        vent.publish('selectedtiles', [[new Tile()]])
      } else {
        prevent = false
        // console.log(kc, c)
      }
      if (prevent) {
        e.preventDefault()
      }
    })
    vent.subscribe('window.keypress', (ev, {e, modalOpen, hasActiveElement}) => {
      if (!this.isActive || modalOpen) return
      const kc = e.keyCode
      const c = String.fromCharCode(kc)
      let prevent = true
      if (c === '+') {
        this.setZoomLevel(this.zoomLevel * 2)
      } else if (c === '-') {
        this.setZoomLevel(this.zoomLevel * 0.5)
      } else if (c === 'p') {
        vent.publish('layerpanel.openproperties', this.currentLayer)
      } else if (c === 'f') {
        this.flipSelectionH()
      } else if (c === 'i') {
        this.flipSelectionV()
      } else if (c === 'b') {
        if (!this.select.active) {
          this.select.start()
        } else {
          this.select.stop()
        }
      } else if (c === 'm') {
        this.setShowMask(!this.showMask)
      } else {
        prevent = false
      }
      if (prevent) {
        e.preventDefault()
      }
    })
  }

  activate (e) {
    if (e.which === 0) {
      this.isActive = true
      vent.publish('panel.active', this)
    }
  }

  setZoomLevel (z) {
    if (z < 1 / 8 || z > 4) return
    let zd = z / this.zoomLevel
    this.zoomLevel = z

    let scrollX = this.scrollbars.scrollPosition[0]
    let scrollY = this.scrollbars.scrollPosition[1]

    this.setCurrentLayer(this.currentLayer)
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
    this.currentLayer = l
    let lw = app.j2l.levelInfo.fields.LayerWidth[l]
    let lh = app.j2l.levelInfo.fields.LayerHeight[l]

    this.scrollbars.contentWidth = lw * 32 * this.zoomLevel
    this.scrollbars.contentHeight = lh * 32 * this.zoomLevel
    this.scrollbars.disableTransition()
    this.scrollbars.update()

    let currentSpeedX = app.j2l.levelInfo.fields.LayerXSpeed[l] / 65536
    let currentSpeedY = app.j2l.levelInfo.fields.LayerYSpeed[l] / 65536

    // let currentAutoSpeedX = app.j2l.levelInfo.fields.LayerAutoXSpeed[l] / 65536
    // let currentAutoSpeedY = app.j2l.levelInfo.fields.LayerAutoYSpeed[l] / 65536

    for (let i = 0; i < 8; i++) {
      let layer = this.layers[i]
      let speedX = app.j2l.levelInfo.fields.LayerXSpeed[i] / 65536
      let speedY = app.j2l.levelInfo.fields.LayerYSpeed[i] / 65536
      let autoSpeedX = app.j2l.levelInfo.fields.LayerAutoXSpeed[i] / 65536
      let autoSpeedY = app.j2l.levelInfo.fields.LayerAutoYSpeed[i] / 65536
      if (i === l) {
        layer.speedX = 1
        layer.speedY = 1
        layer.autoSpeedX = 0
        layer.autoSpeedY = 0
      } else {
        layer.speedX = speedX / currentSpeedX
        layer.speedY = speedY / currentSpeedY
        layer.autoSpeedX = autoSpeedX
        layer.autoSpeedY = autoSpeedY
        if (!isFinite(layer.speedX)) layer.speedX = 0
        if (!isFinite(layer.speedY)) layer.speedY = 0
      }
      let layerMisc = app.j2l.levelInfo.fields.LayerMiscProperties[i]
      layer.repeatX = !this.showClassic && layerMisc & 1
      layer.repeatY = !this.showClassic && (layerMisc >> 1) & 1
      layer.zIndex = this.showParallax ? 0 : Math.min(1, Math.max(-1, i - l))
      layer.hidden = this.showClassic && i !== l
      layer.backgroundOpacity = this.showClassic ? 1 : (!this.showParallax && i === l ? 0.8 : 0)
    }
    m.redraw()
  }

  getLayerTitle () {
    let l = this.currentLayer
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
    let z = this.zoomLevel
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
    this.showMask = show
    this.maskTween.set(show ? 1 : 0)
  }
  setTileMode (mode) {
    this.tileMode = mode
    this.showParallax = mode === 1
    this.showClassic = mode === 2
    this.setCurrentLayer(this.currentLayer)
  }
  toggleTileMode (e) {
    let mode = this.tileMode + 1
    if (mode > 2) {
      mode = 0
    }
    e.currentTarget.firstChild.style.marginTop = (-mode * e.currentTarget.offsetHeight) + 'px'
    this.setTileMode(mode)
  }

  toggleEvents () {
    this.showEvents = !this.showEvents
  }

  mousemove (e) {
    this.mousePageX = e.pageX
    this.mousePageY = e.pageY
    this.updateSelectionPosition()
  }
  updateSelectionPosition () {
    let rect = this.panelEl.parentNode.getBoundingClientRect()
    let x = Math.max(0, Math.floor((this.mousePageX - rect.left - this.scrollbars.smoothScroller.offsetLeft) / 32 / this.zoomLevel))
    let y = Math.max(0, Math.floor((this.mousePageY - rect.top - this.scrollbars.smoothScroller.offsetTop) / 32 / this.zoomLevel))
    this.mouseX = x
    this.mouseY = y
  }
  paintSelection () {
    let x = Math.floor((this.drag.x - this.scrollbars.smoothScroller.offsetLeft) / 32 / this.zoomLevel)
    let y = Math.floor((this.drag.y - this.scrollbars.smoothScroller.offsetTop) / 32 / this.zoomLevel)
    if (x < this.layers[this.currentLayer].width && y < this.layers[this.currentLayer].height) {
      this.layers[this.currentLayer].setTiles(x, y, this.selection)
    }
  }
  flipSelectionH () {
    this.selection.reverse()
    for (let x = 0; x < this.selection.length; x++) {
      for (let y = 0; y < this.selection[x].length; y++) {
        let tile = this.selection[x][y]
        if (tile && (tile.animated || tile.id > 0)) {
          tile.flipped = !tile.flipped
        }
      }
    }
    this.selectionMap.setTiles(0, 0, this.selection)
  }
  flipSelectionV () {
    for (let x = 0; x < this.selection.length; x++) {
      this.selection[x].reverse()
      for (let y = 0; y < this.selection[x].length; y++) {
        let tile = this.selection[x][y]
        if (tile && (tile.animated || tile.id > 0)) {
          tile.vflipped = !tile.vflipped
        }
      }
    }
    this.selectionMap.setTiles(0, 0, this.selection)
  }

  calculateSelectedArea () {
    let layer = this.layers[this.currentLayer]
    this.selectedArea[0] = Math.max(0, Math.min(Math.floor(this.selectStartX / 32), Math.floor((this.select.x - this.scrollbars.smoothScroller.offsetLeft) / 32 / this.zoomLevel)))
    this.selectedArea[1] = Math.max(0, Math.min(Math.floor(this.selectStartY / 32), Math.floor((this.select.y - this.scrollbars.smoothScroller.offsetTop) / 32 / this.zoomLevel)))
    this.selectedArea[2] = Math.min(layer.width, Math.max(Math.ceil(this.selectStartX / 32), Math.ceil((this.select.x - this.scrollbars.smoothScroller.offsetLeft) / 32 / this.zoomLevel)))
    this.selectedArea[3] = Math.min(layer.height, Math.max(Math.ceil(this.selectStartY / 32), Math.ceil((this.select.y - this.scrollbars.smoothScroller.offsetTop) / 32 / this.zoomLevel)))
  }

  addScrollbars ({dom}) {
    this.panelEl = dom
    this.scrollbars = new Scrollbars({
      element: dom,
      revealDistance: 64
    })
    this.scrollbars.contentWidth = app.j2l.levelInfo.fields.LayerWidth[this.currentLayer] * 32 * this.zoomLevel
    this.scrollbars.contentHeight = app.j2l.levelInfo.fields.LayerHeight[this.currentLayer] * 32 * this.zoomLevel
    this.scrollbars.update()

    vent.subscribe('panel.resize', () => this.scrollbars.update())
    this.scrollbars.on('scroll', () => this.updateSelectionPosition())

    this.drag = new Drag(dom.parentNode)
    this.drag.on('start', (x, y) => this.paintSelection())
    this.drag.on('move', (x, y) => this.paintSelection())
    this.select = new Drag(dom.parentNode, true, true)
    this.select.on('start', (x, y) => {
      this.selectStartX = (x - this.scrollbars.smoothScroller.offsetLeft) / this.zoomLevel
      this.selectStartY = (y - this.scrollbars.smoothScroller.offsetTop) / this.zoomLevel
      this.calculateSelectedArea()
    })
    this.select.on('move', (x, y) => this.calculateSelectedArea())
    this.select.on('stop', () => {
      let selection = []
      let layer = this.layers[this.currentLayer]
      for (let x = 0; x < this.selectedArea[2] - this.selectedArea[0]; x++) {
        selection[x] = []
        for (let y = 0; y < this.selectedArea[3] - this.selectedArea[1]; y++) {
          let tile = layer.map[this.selectedArea[0] + x + layer.width * (this.selectedArea[1] + y)]
          if (tile) tile = new Tile(tile)
          selection[x][y] = tile
        }
      }
      vent.publish('selectedtiles', selection)
    })
    vent.subscribe('selectedtiles', (ev, selection) => {
      this.selection = selection
      this.selectionMap.setTexture(this.selection.length, this.selection[0].length)
      this.selectionMap.setTiles(0, 0, this.selection)
    })

    this.initialize()
  }

  initialize () {
    this.selectionMap = new TileMap(1, 1)
    this.selectionMap.setTexture(this.selection.length, this.selection[0].length)
    this.selectionMap.setTiles(0, 0, this.selection)

    vent.subscribe('layer.resize', (ev, [l, w, h]) => {
      app.j2l.resizeLayer(l, w, h)
    })
    vent.subscribe('layer.refresh', () => {
      this.setCurrentLayer(this.currentLayer)
    })

    vent.subscribe('level.load', () => {
      for (let i = 0; i < 8; i++) {
        const layer = this.layers[i] = app.j2l.layers[i]
        layer.speedX = app.j2l.levelInfo.fields.LayerXSpeed[i] / 65536
        layer.speedY = app.j2l.levelInfo.fields.LayerYSpeed[i] / 65536
      }

      this.setCurrentLayer(app.j2l.levelInfo.fields.SecEnvAndLayer & 0xF)
      this.scrollbars.scrollPosition[0] = app.j2l.levelInfo.fields.JCSHorizontalOffset * this.zoomLevel
      this.scrollbars.scrollPosition[1] = app.j2l.levelInfo.fields.JCSVerticalOffset * this.zoomLevel
      this.scrollbars.disableTransition()
      this.scrollbars.update(true)
    })

    vent.subscribe('j2l.preexport', () => {
      app.j2l.levelInfo.fields.JCSHorizontalOffset = this.scrollbars.scrollPosition[0] / this.zoomLevel
      app.j2l.levelInfo.fields.JCSVerticalOffset = this.scrollbars.scrollPosition[1] / this.zoomLevel
      app.j2l.levelInfo.fields.SecEnvAndLayer &= -1 << 4
      app.j2l.levelInfo.fields.SecEnvAndLayer |= this.currentLayer & 0xF
    })

    if (!r.disableWebGL) {
      this.fboAttachments = [
        {format: r.gl.RGBA, type: r.gl.UNSIGNED_BYTE, min: r.gl.NEAREST, wrap: r.gl.CLAMP_TO_EDGE}
      ]
      this.fbo = r.twgl.createFramebufferInfo(r.gl, this.fboAttachments)
      r.gl.bindFramebuffer(r.gl.FRAMEBUFFER, null)
    } else {
      this.fbo = document.createElement('canvas')
      this.fboCtx = this.fbo.getContext('2d')
      this.fboCtx.imageSmoothingEnabled = false
    }

    vent.subscribe('renderer.draw', () => this.redraw())
  }

  redraw () {
    const gl = r.gl
    const ctx = r.ctx
    const cw = this.scrollbars.getOffsetWidth()
    const ch = this.scrollbars.getOffsetHeight()

    const scrollLeft = this.scrollbars.smoothScroller.offsetLeft
    const scrollTop = this.scrollbars.smoothScroller.offsetTop
    this.scrollbars.enableTransition()

    const canvasRect = r.canvas.getBoundingClientRect()
    const rect = this.panelEl.parentNode.getBoundingClientRect()
    const maskOpacity = this.maskTween.get()

    let x = (-scrollLeft) / this.zoomLevel
    let y = (-scrollTop) / this.zoomLevel

    if (!r.disableWebGL) {
      r.twgl.resizeFramebufferInfo(gl, this.fbo, this.fboAttachments, cw, ch)

      if (this.zoomLevel < 1) {
        gl.bindTexture(gl.TEXTURE_2D, r.textures.tileset)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)

        gl.bindTexture(gl.TEXTURE_2D, r.textures.mask)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      }
    } else {
      ctx.save()
      ctx.beginPath()
      ctx.rect(rect.left, rect.top - canvasRect.top, cw, ch)
      ctx.clip()
      ctx.translate(rect.left, rect.top - canvasRect.top)

      this.fbo.width = cw
      this.fbo.height = ch
      this.fboCtx.clearRect(0, 0, cw, ch)
    }
    let zIndexLast = null
    let now = Date.now() / 1000

    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i]
      if (layer.hidden) continue
      let viewOffset = [Math.floor(x * layer.speedX + mod(layer.autoSpeedX * now, layer.width) * 32) || 0, Math.floor(y * layer.speedY + mod(layer.autoSpeedY * now, layer.height) * 32) || 0]
      if ((zIndexLast === null || zIndexLast !== layer.zIndex)) {
        if (zIndexLast !== null) {
          if (!r.disableWebGL) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null)
            gl.viewport(rect.left, r.canvas.height - (rect.top - canvasRect.top + ch), cw, ch)
            gl.useProgram(r.shaders.fbo.program)
            r.twgl.setBuffersAndAttributes(gl, r.shaders.fbo, r.buffers.fbo)
            r.twgl.setUniforms(r.shaders.fbo, {
              opacity: 1.0,
              texture: this.fbo.attachments[0]
            })
            r.twgl.drawBufferInfo(gl, gl.TRIANGLES, r.buffers.fbo)
          } else {
            ctx.drawImage(this.fbo, 0, 0)
          }
        }
        if (!r.disableWebGL) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo.framebuffer)
          gl.clearColor(0, 0, 0, 0)
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
          gl.viewport(0, 0, cw, ch)
        } else {
          this.fboCtx.clearRect(0, 0, cw, ch)
        }
        zIndexLast = layer.zIndex
      }

      r.drawTilemap({
        ctx: this.fboCtx,
        scale: this.zoomLevel,
        viewportSize: [cw, ch],
        maskOpacity: maskOpacity,
        viewOffset: viewOffset,
        repeatTilesX: layer.repeatX,
        repeatTilesY: layer.repeatY,
        map: layer,
        backgroundColor: [72 / 255, 48 / 255, 168 / 255, layer.backgroundOpacity * (1 + maskOpacity * 0.15)],
        invertArea: i === this.currentLayer && this.select.active && this.selectedArea,
        viewport: [0, 0, cw, ch]
      })

      if (i === this.currentLayer && this.isActive && !this.select.active) {
        r.drawTilemap({
          ctx: this.fboCtx,
          scale: this.zoomLevel,
          viewportSize: [cw, ch],
          maskOpacity: maskOpacity,
          viewOffset: [viewOffset[0] - this.mouseX * 32, viewOffset[1] - this.mouseY * 32],
          repeatTilesX: 0,
          repeatTilesY: 0,
          map: this.selectionMap,
          opacity: 0.5,
          backgroundColor: [72 / 255, 48 / 255, 168 / 255, (1 + maskOpacity * 0.15) * 0.8]
        })
      }
    }

    if (!r.disableWebGL) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(rect.left, r.canvas.height - (rect.top - canvasRect.top + ch), cw, ch)
      gl.useProgram(r.shaders.fbo.program)
      r.twgl.setBuffersAndAttributes(gl, r.shaders.fbo, r.buffers.fbo)
      r.twgl.setUniforms(r.shaders.fbo, {
        opacity: zIndexLast === -1 ? 0.3 : 1,
        texture: this.fbo.attachments[0]
      })
      r.twgl.drawBufferInfo(gl, gl.TRIANGLES, r.buffers.fbo)

      if (this.zoomLevel < 1) {
        gl.bindTexture(gl.TEXTURE_2D, r.textures.tileset)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)

        gl.bindTexture(gl.TEXTURE_2D, r.textures.mask)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
      }
    } else {
      ctx.save()
      ctx.globalAlpha = zIndexLast === -1 ? 0.3 : 1
      ctx.drawImage(this.fbo, 0, 0)
      ctx.restore()

      ctx.restore()
    }

    // let zoom = this.zoomLevel

    // this.renderer.draw(-scrollLeft + cw / 2, -scrollTop + ch / 2)

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

  view ({fluid, oncreate, active}) {
    this.isActive = active

    const layerButtons = []
    for (let i = 0; i < 8; i++) {
      layerButtons[i] = m('button', {
        title: 'Select layer ' + (i + 1),
        class: i === this.currentLayer ? 'selected' : '',
        onclick: this.setCurrentLayer.bind(this, i)
      }, i + 1)
    }
    return m('#layerpanel.panel', {class: ((fluid ? 'flexfluid' : '') + ' ' + (active ? 'active' : '')).trim(), oncreate, onmouseover: this.activate.bind(this)}, [
      m('.toolbar', [
        m('.title.flexfluid', m('.text-clip', this.getLayerTitle())),

        m('button', {title: 'Zoom in [+]', onclick: this.setZoomLevel.bind(this, this.zoomLevel * 2)}, '+'),
        m('button', {title: 'Zoom out [-]', onclick: this.setZoomLevel.bind(this, this.zoomLevel * 0.5)}, '-'),
        m('.spacer'),
        m('button', {title: 'Layer properties [P]', onclick: () => vent.publish('layerpanel.openproperties', this.currentLayer)}, 'i'),
        m('.spacer'),
        layerButtons,
        m('.spacer'),
        m('button.tile-modes.right', {title: 'Toggle tile modes', onclick: this.toggleTileMode.bind(this)}, [
          m('div', 'X-Ray'),
          m('div', 'Parallax'),
          m('div', 'Classic')
        ]),
        m('button', {title: 'Toggle mask', onclick: () => this.setShowMask(!this.showMask), class: this.showMask ? 'selected' : ''}, 'Mask'),
        m('button', {title: 'Toggle events', onclick: this.toggleEvents.bind(this), class: this.showEvents ? 'selected' : ''}, 'Events')
      ]),
      m('.panelcontent', {onmousemove: (e) => this.mousemove(e)}, m('div', {oncreate: this.addScrollbars.bind(this)}))
    ])
  }
}

module.exports = LayerPanel
