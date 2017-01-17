
const m = require('mithril')
const vent = require('postal').channel()
const rafLoop = require('raf-loop')
const twgl = require('twgl.js')
const TileMap = require('./TileMap')
const Tile = require('./Tile')
const app = require('./app')

const rectShader = [
  require('../shaders/rect.vert.glsl'),
  require('../shaders/rect.frag.glsl')
]
const tilemapShader = [
  require('../shaders/tilemap.vert.glsl'),
  require('../shaders/tilemap.frag.glsl')
]
const fboShader = [
  require('../shaders/fbo.vert.glsl'),
  require('../shaders/fbo.frag.glsl')
]

const r = {
  view ({children}) {
    return [
      m('canvas.renderer', {oncreate: r.createCanvas}),
      children
    ]
  },

  twgl: twgl,
  gl: null,
  canvas: null,
  loop: null,
  textures: {},
  shaders: {},
  buffers: {},
  uniforms: {},

  tilesetSize: [0, 0],

  createCanvas ({state, dom}) {
    r.canvas = dom
    const gl = r.gl = twgl.getWebGLContext(r.canvas, {alpha: false})

    // If webgl is not supported, abort
    // TODO: Implement 2D Canvas fallback
    if (!gl) return

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    r.textures.tileset = gl.createTexture()
    r.textures.mask = gl.createTexture()
    r.animMap = new TileMap(256, 1)

    gl.bindTexture(gl.TEXTURE_2D, r.textures.tileset)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
    r.setDefaultTextureProperties()

    gl.bindTexture(gl.TEXTURE_2D, r.textures.mask)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
    r.setDefaultTextureProperties()

    r.addShader('rect', rectShader)

    r.addShader('fbo', fboShader)
    r.buffers.fbo = twgl.createBufferInfoFromArrays(gl, {
      position: {numComponents: 2, data: new Float32Array([ 1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1 ])}
    })

    r.addShader('tilemap', tilemapShader)
    r.buffers.tilemap = twgl.createBufferInfoFromArrays(gl, {
      position: { numComponents: 2, data: new Float32Array([ -1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ]) },
      texture: { numComponents: 2, data: new Float32Array([ 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0 ]) }
    })
    r.uniforms.tilemap = {
      tilesetSize: r.tilesetSize,
      tileCount: 0,
      tileset: r.textures.tileset,
      mask: r.textures.mask,
      animMap: r.animMap.texture
    }

    r.loop = rafLoop(r.redraw)
    r.loop.start()

    vent.subscribe('tileset.load', () => {
      gl.bindTexture(gl.TEXTURE_2D, r.textures.tileset)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, app.j2t.tilesetCanvas)

      gl.bindTexture(gl.TEXTURE_2D, r.textures.mask)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, app.j2t.maskCanvas)
      r.tilesetSize[0] = app.j2t.tilesetCanvas.width
      r.tilesetSize[1] = app.j2t.tilesetCanvas.height
      r.uniforms.tilemap.tileCount = app.j2t.tilesetInfo.fields.TileCount
    })
  },

  addShader (name, code) {
    if (r.shaders[name]) return
    r.shaders[name] = twgl.createProgramInfo(r.gl, code)
  },

  setDefaultTextureProperties () {
    const gl = r.gl
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  },

  redraw (dt) {
    r.canvas.width = r.canvas.parentNode.offsetWidth
    r.canvas.height = r.canvas.parentNode.offsetHeight
    const gl = r.gl

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, r.canvas.width, r.canvas.height)

    gl.clearColor(0, 0, 0, 1) // black
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    /*
    gl.useProgram(r.shaders.rect.program)
    twgl.setUniforms(r.shaders.rect, {
      color: [72 / 255, 48 / 255, 168 / 255, 1.0],
      opacity: 1,
      scale: 1,
      size: [10, 10],
      viewportSize: [r.canvas.width, r.canvas.height],
      viewOffset: [0, 0]
    })
    drawQuad(gl)
    */

    // Update current animation frames
    let animCount = app.j2l.levelInfo.fields.AnimCount || 0
    let tiles = []
    for (let i = 0; i < 256; i++) {
      if (i < animCount) {
        let currentFrame = 0
        let anim = app.j2l.levelInfo.fields.Anim[i]
        currentFrame = Math.floor(anim.Speed * (Date.now() / 1000) % anim.FrameCount)
        let tile = new Tile(anim.Frame[currentFrame])
        tiles.push([tile])
      } else {
        tiles.push([null])
      }
    }
    r.animMap.setTiles(0, 0, tiles)

    vent.publish('renderer.draw')
  }
}

module.exports = r
