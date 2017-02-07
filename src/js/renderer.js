
const m = require('mithril')
const vent = require('./vent')
const rafLoop = require('raf-loop')
const twgl = require('twgl.js/dist/twgl')
const app = require('./app')
const settings = require('./settings')
const mod = require('./util/helpers').mod
const events = require('./events')
const Tile = require('./Tile')

const rectShader = [
  require('../shaders/rect.vert.glsl'),
  require('../shaders/rect.frag.glsl')
]
const tilemapShader = [
  require('../shaders/tilemap.vert.glsl'),
  require('../shaders/tilemap.frag.glsl')
]
const tilemapAdvancedShader = [
  require('../shaders/tilemap-texture.vert.glsl'),
  require('../shaders/tilemap-texture.frag.glsl')
]
const fboShader = [
  require('../shaders/fbo.vert.glsl'),
  require('../shaders/fbo.frag.glsl')
]

const r = {}
r.canvas = null
r.ctx = null
r.twgl = null
r.gl = null
r.advancedShaders = true
r.textures = {}
r.shaders = {}
r.buffers = {}
r.uniforms = {}

r.anims = []

r.tilesetSize = [0, 0]

r.oncreate = ({dom}) => {
  r.canvas = dom
  r.loop = rafLoop(r.redraw)
  r.renderer = settings.get('renderer')
  r.disableWebGL = r.renderer === 'canvas'
  r.advancedShaders = r.renderer === 'webgl-advanced'

  vent.subscribe('window.resize', () => {
    r.canvas.width = r.canvas.parentNode.offsetWidth
    r.canvas.height = r.canvas.parentNode.offsetHeight
  })
  r.canvas.width = r.canvas.parentNode.offsetWidth
  r.canvas.height = r.canvas.parentNode.offsetHeight

  if (!r.disableWebGL) {
    let testGl = twgl.getWebGLContext(document.createElement('canvas'), {alpha: false})

    // If webgl is not supported
    // fallback to 2D Canvas
    if (!testGl) {
      console.warn('WebGL is not supported, falling back to 2D Canvas')
      r.disableWebGL = true
    }
  }

  if (r.disableWebGL) {
    console.log('Disabled WebGL')
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
  const gl = r.gl = twgl.getWebGLContext(r.canvas, {alpha: false})
  r.twgl = twgl

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  r.textures.tileset = gl.createTexture()
  r.textures.mask = gl.createTexture()
  r.textures.events = gl.createTexture()
  const TileMap = require('./TileMap')
  r.animMap = new TileMap(256, 1)

  gl.bindTexture(gl.TEXTURE_2D, r.textures.tileset)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
  r.setDefaultTextureProperties()

  gl.bindTexture(gl.TEXTURE_2D, r.textures.mask)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4))
  r.setDefaultTextureProperties()

  gl.bindTexture(gl.TEXTURE_2D, r.textures.events)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, events.canvas)
  r.setDefaultTextureProperties()

  r.addShader('rect', rectShader)

  r.addShader('fbo', fboShader)
  r.buffers.fbo = twgl.createBufferInfoFromArrays(gl, {
    position: {numComponents: 2, data: new Float32Array([ 1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1 ])}
  })

  if (r.advancedShaders) {
    r.addShader('tilemapAdvanced', tilemapAdvancedShader)
    r.buffers.tilemapAdvanced = twgl.createBufferInfoFromArrays(gl, {
      position: { numComponents: 2, data: new Float32Array([ -1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ]) },
      texture: { numComponents: 2, data: new Float32Array([ 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0 ]) }
    })
    r.uniforms.tilemapAdvanced = {
      tilesetSize: r.tilesetSize,
      tileCount: 0,
      tileset: r.textures.tileset,
      mask: r.textures.mask,
      animMap: r.animMap.texture,
      opacity: 1
    }
  }
  r.addShader('tilemap', tilemapShader)
  r.buffers.tilemap = twgl.createBufferInfoFromArrays(gl, {
    position: { numComponents: 2, data: new Float32Array([]), drawType: gl.DYNAMIC_DRAW },
    uvs: { numComponents: 2, data: new Float32Array([]), drawType: gl.DYNAMIC_DRAW }
  })
  r.uniforms.tilemap = {
    tilesetSize: r.tilesetSize,
    tileCount: 0,
    tileset: r.textures.tileset,
    mask: r.textures.mask,
    opacity: 1
  }
  r.uniforms.events = {
    tilesetSize: [events.canvas.width, events.canvas.height],
    tileCount: 256 * 2,
    tileset: r.textures.events,
    mask: r.textures.events,
    opacity: 1,
    maskOpacity: 0,
    backgroundColor: [0, 0, 0, 0]
  }

  r.loop.start()

  vent.subscribe('tileset.load', () => {
    gl.bindTexture(gl.TEXTURE_2D, r.textures.tileset)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, app.j2t.tilesetCanvas)

    gl.bindTexture(gl.TEXTURE_2D, r.textures.mask)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, app.j2t.maskCanvas)
    r.tilesetSize[0] = app.j2t.tilesetCanvas.width
    r.tilesetSize[1] = app.j2t.tilesetCanvas.height
    if (r.advancedShaders) {
      r.uniforms.tilemapAdvanced.tileCount = app.j2t.tilesetInfo.fields.TileCount
    } else {
      r.uniforms.tilemap.tileCount = app.j2t.tilesetInfo.fields.TileCount
    }
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
  const eventsOnly = !!info.drawEventsOnly

  info.textureSize = info.map.textureSize
  info.mapSize = [info.map.width, info.map.height]

  if (!r.disableWebGL) {
    const gl = r.gl
    if (r.advancedShaders && !eventsOnly) {
      gl.useProgram(r.shaders.tilemapAdvanced.program)
      twgl.setBuffersAndAttributes(gl, r.shaders.tilemapAdvanced, r.buffers.tilemapAdvanced)
      twgl.setUniforms(r.shaders.tilemapAdvanced, r.uniforms.tilemapAdvanced)
      if (!info.invertArea) {
        info.invertArea = [0, 0, 0, 0]
      }
      info.map = info.map.texture
      twgl.setUniforms(r.shaders.tilemapAdvanced, info)
      twgl.drawBufferInfo(gl, gl.TRIANGLES, r.buffers.tilemapAdvanced)
    } else {
      gl.useProgram(r.shaders.tilemap.program)
      if (!eventsOnly) {
        for (let x = 0; x < info.map.width; x++) {
          for (let y = 0; y < info.map.height; y++) {
            let i = x + y * info.map.width
            let tile = info.map.map[i]
            if (!tile || !tile.animated) continue
            let flipped = tile.flipped
            let vflipped = tile.vflipped
            tile = r.anims[tile.id]
            if (!tile) continue
            flipped = !!(tile.flipped ^ flipped)
            vflipped = !!(tile.vflipped ^ vflipped)
            let offset = (x + (y) * info.map.width) * 12
            let uv = new Float32Array(12)
            let tx0 = tile.id % 64
            let ty0 = Math.floor(tile.id / 64)
            let tx1 = tx0 + 1
            let ty1 = ty0 + 1
            if (flipped) {
              tx0 += 1
              tx1 -= 1
            }
            if (vflipped) {
              ty0 += 1
              ty1 -= 1
            }
            uv[0] = tx0
            uv[1] = ty0
            uv[2] = tx1
            uv[3] = ty0
            uv[4] = tx0
            uv[5] = ty1

            uv[6] = tx1
            uv[7] = ty0
            uv[8] = tx1
            uv[9] = ty1
            uv[10] = tx0
            uv[11] = ty1

            r.gl.bindBuffer(r.gl.ARRAY_BUFFER, info.map.buffers.attribs.uvs.buffer)
            r.gl.bufferSubData(r.gl.ARRAY_BUFFER, offset * 4, uv)
          }
        }
      }
      twgl.setBuffersAndAttributes(gl, r.shaders.tilemap, info.map.buffers)
      if (!eventsOnly) {
        twgl.setUniforms(r.shaders.tilemap, r.uniforms.tilemap)
      } else {
        twgl.setUniforms(r.shaders.tilemap, r.uniforms.events)
      }
      if (!info.invertArea) {
        info.invertArea = [0, 0, 0, 0]
      }
      twgl.setUniforms(r.shaders.tilemap, info)

      if (info.repeatTilesX || info.repeatTilesY) {
        let left = Math.floor(Math.floor(info.viewOffset[0] / 32) / info.map.width)
        let top = Math.floor(Math.floor(info.viewOffset[1] / 32) / info.map.height)
        let right = Math.ceil(Math.ceil(Math.ceil(info.viewportSize[0] / info.scale + info.viewOffset[0]) / 32) / info.map.width)
        let bottom = Math.ceil(Math.ceil(Math.ceil(info.viewportSize[1] / info.scale + info.viewOffset[1]) / 32) / info.map.height)

        let offsetX = info.viewOffset[0]
        let offsetY = info.viewOffset[1]

        if (!info.repeatTilesX) right = left + 1
        if (!info.repeatTilesY) bottom = top + 1

        for (let mapx = left; mapx < right; mapx++) {
          for (let mapy = top; mapy < bottom; mapy++) {
            twgl.setUniforms(r.shaders.tilemap, {
              viewOffset: [offsetX - mapx * info.map.width * 32, offsetY - mapy * info.map.height * 32],
              invertArea: mapx === left && mapy === top ? info.invertArea : [0, 0, 0, 0]
            })
            twgl.drawBufferInfo(gl, gl.TRIANGLES, r.buffers.tilemap, info.map.width * info.map.height * 6)
          }
        }
      } else {
        twgl.drawBufferInfo(gl, gl.TRIANGLES, r.buffers.tilemap, info.map.width * info.map.height * 6)
      }
    }
    return
  }
  const ctx = info.ctx || r.ctx
  const left = Math.floor(info.viewOffset[0] / 32)
  const top = Math.floor(info.viewOffset[1] / 32)
  const right = Math.ceil(Math.ceil(info.viewportSize[0] / info.scale + info.viewOffset[0]) / 32)
  const bottom = Math.ceil(Math.ceil(info.viewportSize[1] / info.scale + info.viewOffset[1]) / 32)

  ctx.imageSmoothingEnabled = false

  ctx.save()
  if (info.opacity !== undefined) {
    ctx.globalAlpha = info.opacity
  }
  if (!eventsOnly) {
    ctx.fillStyle = 'rgba(' + [info.backgroundColor[0] * 255, info.backgroundColor[1] * 255, info.backgroundColor[2] * 255, info.backgroundColor[3]].join(',') + ')'
  }

  for (let mapx = left; mapx < right; mapx++) {
    for (let mapy = top; mapy < bottom; mapy++) {
      let x = mapx
      let y = mapy
      if ((!info.repeatTilesX && (x < 0 || x >= info.map.width)) || (!info.repeatTilesY && (y < 0 || y >= info.map.height))) {
        continue
      }
      if (info.repeatTilesX) {
        x = mod(x, info.map.width)
      }
      if (info.repeatTilesY) {
        y = mod(y, info.map.height)
      }
      const outPos = [
        Math.floor(mapx * info.scale * 32 - info.viewOffset[0] * info.scale),
        Math.floor(mapy * info.scale * 32 - info.viewOffset[1] * info.scale),
        Math.floor(32 * info.scale),
        Math.floor(32 * info.scale)
      ]
      const tileIndex = x + y * info.map.width
      let tile = info.map.map[tileIndex]
      if (!tile) continue
      if (!eventsOnly) {
        let flipped = tile.flipped
        let vflipped = tile.vflipped
        if (tile.animated) {
          tile = r.anims[tile.id]
          if (!tile) continue
          flipped = !!(tile.flipped ^ flipped)
          vflipped = !!(tile.vflipped ^ vflipped)
        }

        const tileId = tile.id
        const tilesetPos = [
          (tileId % 64) * 32,
          Math.floor(tileId / 64) * 32
        ]

        ctx.fillRect(outPos[0], outPos[1], outPos[2], outPos[3])
        if (tileId === 0) continue
        ctx.save()
        ctx.translate(outPos[0], outPos[1])
        if (flipped) {
          ctx.translate(outPos[2], 0)
          ctx.scale(-1, 1)
        }
        if (vflipped) {
          ctx.translate(0, outPos[3])
          ctx.scale(1, -1)
        }
        ctx.drawImage(info.maskOpacity < 0.5 ? r.textures.tileset : r.textures.mask, tilesetPos[0], tilesetPos[1], 32, 32, 0, 0, outPos[2], outPos[3])
        ctx.restore()
      } else {
        let event = tile.event
        let eventId = event & 0xFF
        if (eventId === 0) continue
        let generator = false
        if (eventId === 216) {
          generator = true
          eventId = (event >> 12) & 0xFF
        }

        ctx.drawImage(events.canvas, (eventId % 16) * 32 + generator * 32 * 16, Math.floor(eventId / 16) * 32, 32, 32, outPos[0], outPos[1], outPos[2], outPos[3])
      }
    }
  }
  if (info.invertArea) {
    let x1 = (info.viewport[0] - info.viewOffset[0] + info.invertArea[0] * 32) * info.scale
    let y1 = (info.viewport[1] - info.viewOffset[1] + info.invertArea[1] * 32) * info.scale
    let x2 = (info.viewport[0] - info.viewOffset[0] + info.invertArea[2] * 32) * info.scale
    let y2 = (info.viewport[1] - info.viewOffset[1] + info.invertArea[3] * 32) * info.scale

    x1 = Math.max(x1, info.viewport[0])
    y1 = Math.max(y1, info.viewport[1])
    x2 = Math.min(x2, info.viewport[0] + info.viewport[2])
    y2 = Math.min(y2, info.viewport[1] + info.viewport[3])

    let w = x2 - x1
    let h = y2 - y1

    if (w > 0 && h > 0) {
      let imageData = ctx.getImageData(x1, y1, w, h)
      let data = imageData.data

      for (let i = 0; i < data.length; i += 4) {
        // red
        data[i] = 255 - data[i]
        // green
        data[i + 1] = 255 - data[i + 1]
        // blue
        data[i + 2] = 255 - data[i + 2]
      }

      // overwrite original image
      ctx.putImageData(imageData, x1, y1)
    }
  }

  ctx.restore()
  ctx.globalAlpha = 1
}

r.drawEventmap = function (info) {
  info.drawEventsOnly = true
  r.drawTilemap(info)
}

r.calculateAnimTile = (animId, flipped = false, vflipped = false, counter = 0) => {
  if (counter > 10) return new Tile()
  let currentFrame = 0
  let anim = app.j2l.anims[animId]
  if (!anim) return new Tile()
  currentFrame = Math.floor(anim.speed * (Date.now() / 1000) % anim.frames.length)
  let tile = anim.frames[currentFrame]
  if (tile.animated) {
    tile = r.calculateAnimTile(tile.id, tile.flipped ^ flipped, tile.vflipped ^ vflipped, ++counter)
  }
  tile = new Tile(tile)
  tile.flipped = tile.flipped ^ flipped
  tile.vflipped = tile.vflipped ^ vflipped
  return tile
}

r.redraw = (dt) => {
  const gl = r.gl
  const ctx = r.ctx

  if (app.j2l.isLoading) return

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
  let animCount = app.j2l.anims.length
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
