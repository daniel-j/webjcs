
const m = require('mithril')
const vent = require('postal').channel()
const rafLoop = require('raf-loop')
const twgl = require('twgl.js')
const TileMap = require('./TileMap')
const Tile = require('./Tile')
const app = require('./app')
const settings = require('./settings')

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

function mod (n, m) {
  return ((n % m) + m) % m
}

const r = {}
r.canvas = null
r.ctx = null
r.twgl = null
r.gl = null
r.textures = {}
r.shaders = {}
r.buffers = {}
r.uniforms = {}

r.anims = []

r.tilesetSize = [0, 0]

r.oncreate = ({dom}) => {
  r.canvas = dom
  r.loop = rafLoop(r.redraw)
  r.disableWebGL = settings.get('disable_webgl')

  vent.subscribe('window.resize', () => {
    r.canvas.width = r.canvas.parentNode.offsetWidth
    r.canvas.height = r.canvas.parentNode.offsetHeight
  })
  r.canvas.width = r.canvas.parentNode.offsetWidth
  r.canvas.height = r.canvas.parentNode.offsetHeight

  if (r.disableWebGL) {
    r.initCanvasRenderer()
  } else {
    r.initWebGLRenderer()
  }
}

r.view = ({children}) => {
  return [
    m('canvas.renderer'),
    children
  ]
}

r.initCanvasRenderer = () => {
  const ctx = r.canvas.getContext('2d')
  r.ctx = ctx
  ctx.imageSmoothingEnabled = false

  r.textures.tileset = app.j2t.tilesetCanvas
  r.textures.mask = app.j2t.maskCanvas

  r.loop.start()
}

r.initWebGLRenderer = () => {
  const gl = twgl.getWebGLContext(r.canvas, {alpha: false})

  // If webgl is not supported
  // fallback to 2D Canvas
  if (!gl) {
    r.disableWebGL = true
    r.initCanvasRenderer()
    return
  }

  r.gl = gl
  r.twgl = twgl

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
}

r.addShader = (name, code) => {
  if (r.shaders[name]) return
  r.shaders[name] = twgl.createProgramInfo(r.gl, code)
}

r.setDefaultTextureProperties = () => {
  const gl = r.gl
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
}

r.drawTilemap = (info) => {
  if (!r.disableWebGL) {
    const gl = r.gl
    gl.useProgram(r.shaders.tilemap.program)
    twgl.setBuffersAndAttributes(gl, r.shaders.tilemap, r.buffers.tilemap)
    twgl.setUniforms(r.shaders.tilemap, r.uniforms.tilemap)
    twgl.setUniforms(r.shaders.tilemap, info)
    twgl.drawBufferInfo(gl, gl.TRIANGLES, r.buffers.tilemap)
    return
  }
  const ctx = info.ctx || r.ctx
  const left = Math.floor(info.viewOffset[0] / 32)
  const top = Math.floor(info.viewOffset[1] / 32)
  const right = Math.ceil(Math.ceil(info.viewportSize[0] / info.scale + info.viewOffset[0]) / 32)
  const bottom = Math.ceil(Math.ceil(info.viewportSize[1] / info.scale + info.viewOffset[1]) / 32)

  ctx.imageSmoothingEnabled = false

  ctx.save()
  ctx.fillStyle = 'rgba(' + [info.backgroundColor[0] * 255, info.backgroundColor[1] * 255, info.backgroundColor[2] * 255, info.backgroundColor[3]].join(',') + ')'

  for (let mapx = left; mapx < right; mapx++) {
    for (let mapy = top; mapy < bottom; mapy++) {
      let x = mapx
      let y = mapy
      if ((!info.repeatTilesX && (x < 0 || x >= info.mapSize[0])) || (!info.repeatTilesY && (y < 0 || y >= info.mapSize[1]))) {
        continue
      }
      if (info.repeatTilesX) {
        x = mod(x, info.mapSize[0])
      }
      if (info.repeatTilesY) {
        y = mod(y, info.mapSize[1])
      }
      const tileIndex = x + y * info.mapSize[0]
      let tile = info.map[tileIndex]
      if (!tile) continue
      let flipped = tile.flipped
      if (tile.animated) {
        tile = r.anims[tile.id]
        if (!tile) continue
        if (flipped) tile.flipped = !tile.flipped
      }

      const tileId = tile.id
      const tilesetPos = [
        (tileId % 64) * 32,
        Math.floor(tileId / 64) * 32
      ]
      const outPos = [
        Math.floor(mapx * info.scale * 32 - info.viewOffset[0] * info.scale),
        Math.floor(mapy * info.scale * 32 - info.viewOffset[1] * info.scale),
        Math.floor(32 * info.scale),
        Math.floor(32 * info.scale)
      ]

      ctx.fillRect(outPos[0], outPos[1], outPos[2], outPos[3])
      if (tileId === 0) continue
      ctx.save()
      ctx.translate(outPos[0], outPos[1])
      if (tile.flipped) {
        ctx.translate(outPos[2], 0)
        ctx.scale(-1, 1)
      }
      ctx.drawImage(info.maskOpacity < 0.5 ? r.textures.tileset : r.textures.mask, tilesetPos[0], tilesetPos[1], 32, 32, 0, 0, outPos[2], outPos[3])
      ctx.restore()
    }
  }
  ctx.restore()
}

r.calculateAnimTile = (id) => {
  let currentFrame = 0
  let anim = app.j2l.levelInfo.fields.Anim[id]
  currentFrame = Math.floor(anim.Speed * (Date.now() / 1000) % anim.FrameCount)
  let tile = new Tile(anim.Frame[currentFrame])
  return tile
}

r.redraw = (dt) => {
  const gl = r.gl
  const ctx = r.ctx

  if (!r.disableWebGL) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, r.canvas.width, r.canvas.height)

    gl.clearColor(0, 0, 0, 1) // black
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
  } else {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, r.canvas.width, r.canvas.height)
  }

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
  r.anims.length = []
  for (let i = 0; i < animCount; i++) {
    r.anims[i] = r.calculateAnimTile(i)
  }
  if (!r.disableWebGL) {
    let tiles = []
    for (let i = 0; i < 256; i++) {
      if (i < animCount) {
        tiles.push([r.anims[i]])
      } else {
        tiles.push([null])
      }
    }
    r.animMap.setTiles(0, 0, tiles)
  }

  vent.publish('renderer.draw')
}

module.exports = r
