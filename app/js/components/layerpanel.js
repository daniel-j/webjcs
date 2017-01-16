
const m = require('mithril')
const vent = require('postal').channel()
const Scrollbars = require('../scrollbars')
const app = require('../app')
const TileMap = require('../TileMap')
const r = require('../renderer')
const Tween = require('../util/tween')

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
    this.el = null
    this.layers = []

    vent.subscribe('window.keypress', (e) => {
      if (!this.isActive) return
      let kc = e.keyCode
      let c = String.fromCharCode(kc)
      if (kc >= 49 && kc <= 56) { // Number 1-8
        let l = kc - 49
        this.setCurrentLayer(l)
      } else if (c === '+') {
        this.setZoomLevel(this.zoomLevel * 2)
      } else if (c === '-') {
        this.setZoomLevel(this.zoomLevel * 0.5)
      } else {
        console.log(kc, c)
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

    for (let i = 0; i < 8; i++) {
      let layer = this.layers[i]
      let speedX = app.j2l.levelInfo.fields.LayerXSpeed[i] / 65536
      let speedY = app.j2l.levelInfo.fields.LayerYSpeed[i] / 65536
      if (i === l) {
        layer.speedX = 1
        layer.speedY = 1
      } else {
        layer.speedX = speedX / currentSpeedX
        layer.speedY = speedY / currentSpeedY
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
    this.setShowMask(mode === 1)
    this.showParallax = mode === 2
    this.showClassic = mode === 3
    this.setCurrentLayer(this.currentLayer)
  }
  toggleTileMode (e) {
    let mode = this.tileMode + 1
    if (mode > 3) {
      mode = 0
    }
    e.currentTarget.firstChild.style.marginTop = (-mode * e.currentTarget.offsetHeight) + 'px'
    this.setTileMode(mode)
  }

  toggleEvents () {
    let show = !this.showEvents
    this.showEvents = show
  }

  configPanel ({dom}) {
    this.el = dom
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

    vent.subscribe('level.load', () => {
      for (let i = 0; i < 8; i++) {
        let lw = app.j2l.levelInfo.fields.LayerWidth[i]
        let lh = app.j2l.levelInfo.fields.LayerHeight[i]
        let layer = new TileMap(lw, lh)
        this.layers[i] = layer
        layer.speedX = app.j2l.levelInfo.fields.LayerXSpeed[i] / 65536
        layer.speedY = app.j2l.levelInfo.fields.LayerYSpeed[i] / 65536
        layer.setTiles(0, 0, app.j2l.layers[i])
      }

      this.setCurrentLayer(app.j2l.levelInfo.fields.SecEnvAndLayer & 0xF)
      this.scrollbars.scrollPosition[0] = app.j2l.levelInfo.fields.JCSHorizontalOffset * this.zoomLevel
      this.scrollbars.scrollPosition[1] = app.j2l.levelInfo.fields.JCSVerticalOffset * this.zoomLevel
      this.scrollbars.disableTransition()
      this.scrollbars.update(true)
    })

    this.fboAttachments = [
      {format: r.gl.RGBA, type: r.gl.UNSIGNED_BYTE, min: r.gl.NEAREST, wrap: r.gl.CLAMP_TO_EDGE}
    ]
    this.fbo = r.twgl.createFramebufferInfo(r.gl, this.fboAttachments)
    r.gl.bindFramebuffer(r.gl.FRAMEBUFFER, null)

    vent.subscribe('renderer.draw', () => this.redraw())
  }

  redraw () {
    const gl = r.gl
    const cw = this.scrollbars.getOffsetWidth()
    const ch = this.scrollbars.getOffsetHeight()

    const scrollLeft = this.scrollbars.smoothScroller.offsetLeft
    const scrollTop = this.scrollbars.smoothScroller.offsetTop
    this.scrollbars.enableTransition()

    const rect = this.panelEl.parentNode.getBoundingClientRect()
    const maskOpacity = this.maskTween.get()

    let x = (-scrollLeft) / this.zoomLevel
    let y = (-scrollTop) / this.zoomLevel

    r.twgl.resizeFramebufferInfo(gl, this.fbo, this.fboAttachments, cw, ch)

    if (this.zoomLevel < 1) {
      gl.bindTexture(gl.TEXTURE_2D, r.textures.tileset)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)

      gl.bindTexture(gl.TEXTURE_2D, r.textures.mask)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    }
    let zIndexLast = null

    for (var i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i]
      if (layer.hidden) continue
      let viewOffset = [Math.floor(x * layer.speedX) || 0, Math.floor(y * layer.speedY) || 0]
      if ((zIndexLast === null || zIndexLast !== layer.zIndex)) {
        if (zIndexLast !== null) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, null)
          gl.viewport(rect.left, r.canvas.height - (rect.top + ch), cw, ch)
          gl.useProgram(r.shaders.fbo.program)
          r.twgl.setBuffersAndAttributes(gl, r.shaders.fbo, r.buffers.fbo)
          r.twgl.setUniforms(r.shaders.fbo, {
            opacity: 1.0,
            texture: this.fbo.attachments[0]
          })
          r.twgl.drawBufferInfo(gl, gl.TRIANGLES, r.buffers.fbo)
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo.framebuffer)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        gl.viewport(0, 0, cw, ch)
        zIndexLast = layer.zIndex
      }

      gl.useProgram(r.shaders.tilemap.program)
      r.twgl.setBuffersAndAttributes(gl, r.shaders.tilemap, r.buffers.tilemap)
      r.twgl.setUniforms(r.shaders.tilemap, r.uniforms.tilemap)
      r.twgl.setUniforms(r.shaders.tilemap, {
        scale: this.zoomLevel,
        viewportSize: [cw, ch],
        maskOpacity: maskOpacity
      })

      r.twgl.setUniforms(r.shaders.tilemap, {
        viewOffset: viewOffset,
        mapSize: [layer.width, layer.height],
        textureSize: layer.textureSize,
        repeatTilesX: layer.repeatX,
        repeatTilesY: layer.repeatY,
        map: layer.texture,
        backgroundColor: [72 / 255, 48 / 255, 168 / 255, layer.backgroundOpacity * (1 + maskOpacity * 0.15)]
      })
      r.twgl.drawBufferInfo(gl, gl.TRIANGLES, r.buffers.tilemap)
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(rect.left, r.canvas.height - (rect.top + ch), cw, ch)
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

        m('button', {title: 'Zoom in', onclick: this.setZoomLevel.bind(this, this.zoomLevel * 2)}, '+'),
        m('button', {title: 'Zoom out', onclick: this.setZoomLevel.bind(this, this.zoomLevel * 0.5)}, '-'),
        m('.spacer'),
        layerButtons,
        m('.spacer'),
        m('button.tile-modes.right', {title: 'Toggle tile modes', onclick: this.toggleTileMode.bind(this)}, [
          m('div', 'X-Ray'),
          m('div', 'Mask'),
          m('div', 'Parallax'),
          m('div', 'Classic')
        ]),
        m('button', {title: 'Toggle events', onclick: this.toggleEvents.bind(this), class: this.showEvents ? 'selected' : ''}, 'Events')
      ]),
      m('.panelcontent', m('.canvaswrapper', {oncreate: this.addScrollbars.bind(this)}))
    ])
  }
}

module.exports = LayerPanel
