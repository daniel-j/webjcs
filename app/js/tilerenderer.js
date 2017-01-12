
const twgl = require('twgl.js')
const npot = require('./util/next-power-of-two')
const Tile = require('./tile')

const hasWebGL = !!window.WebGLRenderingContext && !!window.document.createElement('canvas').getContext('webgl')
console.log('hasWebGL', hasWebGL)
// hasWebGL = false

// RECTANGLE SHADER
let rectVS = `
  attribute vec2 position;

  uniform vec2 viewportSize;
  uniform vec2 viewOffset;
  uniform vec2 size;
  uniform float scale;

  void main (void) {
    gl_Position = vec4((((size * 32.0 * position - floor(viewOffset * scale) / scale) / (viewportSize / scale)) * 2.0 - 1.0) * vec2(1, -1), 0.0, 1.0);
  }
`
let rectFS = `
  precision highp float;

  uniform vec4 color;
  uniform float opacity;

  void main() {
    gl_FragColor = vec4(color.rgb, color.a * opacity);
  }
`

// FBO SHADER
let fboVS = `
  attribute vec2 position;
  varying vec2 texcoord;

  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
    texcoord = position.xy * 0.5 + 0.5;
  }
`
let fboFS = `
  precision mediump float;
  varying vec2 texcoord;
  uniform sampler2D texture;
  uniform float opacity;

  void main() {
    vec4 color = texture2D(texture, texcoord);
    color.a *= opacity;
    gl_FragColor = color;
  }
`

// TILEMAP SHADER
let tilemapVS = `
  attribute vec2 position;
  attribute vec2 texture;

  varying vec2 pixelCoord;

  uniform vec2 viewOffset;
  uniform vec2 viewportSize;
  uniform float scale;

  void main (void) {
    pixelCoord = (texture * viewportSize) / scale + viewOffset;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`
let tilemapFS = `
  precision highp float;

  varying vec2 pixelCoord;

  uniform sampler2D map;
  uniform sampler2D tileset;
  uniform sampler2D mask;
  uniform sampler2D animMap;

  uniform vec2 textureSize;
  uniform vec2 spriteTextureSize;
  uniform vec2 scaledSize;
  uniform int repeatTilesX;
  uniform int repeatTilesY;
  uniform float tileCount;
  uniform float maskOpacity;
  uniform vec4 backgroundColor;


  const float MAX_TILES = 4096.;

  void main (void) {
    vec2 mapCoord =  pixelCoord / 32.0 / textureSize;
    if (repeatTilesX == 1 && (mapCoord.x * scaledSize.x < 0.0 || mapCoord.x * scaledSize.x >= 1.0)) {
      mapCoord.x = fract(mapCoord.x * scaledSize.x) / scaledSize.x;
    }
    if (repeatTilesY == 1 && (mapCoord.y * scaledSize.y < 0.0 || mapCoord.y * scaledSize.y >= 1.0)) {
      mapCoord.y = fract(mapCoord.y * scaledSize.y) / scaledSize.y;
    }
    if ((repeatTilesX == 0 && (mapCoord.x < 0.0 || mapCoord.x >= 1.0)) || (repeatTilesY == 0 && (mapCoord.y < 0.0 || mapCoord.y >= 1.0))) {
      discard;
    }
    vec4 tile = texture2D(map, mapCoord);
    if (tile.a == 0.0) {discard;}
    vec2 spriteOffset = floor(tile.xy * 255.0);
    float tileId = spriteOffset.x + spriteOffset.y * 256.0;
    bool flipped = tileId >= MAX_TILES;
    bool animated = tileId >= MAX_TILES * 2.;
    tileId = mod(tileId, MAX_TILES);
    vec4 outColor = vec4(1.0, 0.0, 1.0, 1.0); // Render magenta color
    if (animated) {
      tile = texture2D(animMap, vec2(tileId / 256.0, 0.0));
      spriteOffset = floor(tile.xy * 255.0);
      tileId = spriteOffset.x + spriteOffset.y * 256.0;
      flipped = tileId >= MAX_TILES;
      animated = tileId >= MAX_TILES * 2.;
      tileId = mod(tileId, MAX_TILES);
    }

    if (tileId < tileCount && !animated) {
      vec2 spriteCoord = mod(pixelCoord, 32.0);
      if (flipped) {
        spriteCoord.x = 32. - spriteCoord.x;
      }
      vec2 tilesetPos = vec2(
        mod(float(tileId), 64.0) * 32.0,
        floor(float(tileId) / 64.0) * 32.0
      );
      //spriteCoord = clamp(spriteCoord, 0.0, 32.0);
      tilesetPos = (tilesetPos + spriteCoord) / spriteTextureSize;
      vec4 tilesetColor = texture2D(tileset, tilesetPos);
      vec4 maskColor = texture2D(mask, tilesetPos);
      outColor.rgb = mix(tilesetColor.rgb, maskColor.rgb, maskOpacity * 0.7);
      outColor.a = min(1.0, tilesetColor.a * (1.0 - maskOpacity * 0.8) + maskColor.a * maskOpacity);
      //outColor = mix(outColor, vec4(tilesetPos, 0.0, 1.0), 0.2);
    }
    outColor = mix(backgroundColor, outColor, outColor.a);
    gl_FragColor = outColor;
  }
`

function TileMapLayer (gl, w, h, useWebGL) {
  this.useWebGL = useWebGL
  if (this.useWebGL) {
    this.gl = gl
    this.tileTexture = gl.createTexture()
    this.textureSize = [0, 0]
    this.setTexture(w, h)
  } else {
    this.textureSize = [w, h]
    this.tiles = []
    for (let x = 0; x < w; x++) {
      this.tiles[x] = []
      for (let y = 0; y < h; y++) {
        this.tiles[x][y] = new Tile(0)
      }
    }
  }

  this.scrollScaleX = 1
  this.scrollScaleY = 1
  this.repeat = false
  this.zIndex = 0

  this.width = w
  this.height = h
}

TileMapLayer.prototype.setTexture = function (w, h, repeat) {
  const gl = this.gl
  w = npot(w)
  h = npot(h)
  gl.bindTexture(gl.TEXTURE_2D, this.tileTexture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(w * h * 8))

  // MUST be filtered with NEAREST or tile lookup fails
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)

  if (repeat) {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }

  this.textureSize[0] = w
  this.textureSize[1] = h
}

TileMapLayer.prototype.setTiles = function (x, y, selection) {
  x = Math.floor(x)
  y = Math.floor(y)

  let sw = selection.length
  let sh = selection[0].length
  // let oldwidth = sw;

  sw = Math.min(this.textureSize[0] - x, sw)
  sh = Math.min(this.textureSize[1] - y, sh)
  let mapBuffer = new Uint8Array(sw * sh * 4)
  for (let sx = 0; sx < sw; sx++) {
    for (let sy = 0; sy < sh; sy++) {
      let i = (sy * sw + sx) * 4
      // let j = (sy*oldwidth+sx)*4
      let tile = selection[sx][sy]
      let tileId = tile.id + tile.flipped * 4096 + tile.animated * 4096 * 2
      mapBuffer[i + 0] = tileId % 256
      mapBuffer[i + 1] = Math.floor(tileId / 256)
      mapBuffer[i + 2] = 0
      mapBuffer[i + 3] = 255
    }
  }

  if (this.useWebGL) {
    let gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.tileTexture)
    // gl.texSubImage2D(gl.TEXTURE_2D, 0, Math.floor(x), Math.floor(y), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([tileId % 64, Math.floor(tileId / 64), 0, 255]));

    gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, sw, sh, gl.RGBA, gl.UNSIGNED_BYTE, mapBuffer)
  } else {
    for (let sx = 0; sx < sw; sx++) {
      for (let sy = 0; sy < sh; sy++) {
        this.tiles[x + sx][y + sy] = selection[sx][sy]
      }
    }
  }
}

let Renderer = function (canvas, attemptWebGL) {
  this.canvas = canvas

  this.useWebGL = attemptWebGL && hasWebGL

  this.tileScale = 1.0
  this.tileSize = 32

  if (this.useWebGL) {
    let gl = canvas.getContext('webgl', {alpha: false})
    this.gl = gl
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    this.viewportSize = [0, 0]
    this.spriteTextureSize = [0, 0]
    this.tileset = gl.createTexture()
    this.mask = gl.createTexture()
    this.animMap = new TileMapLayer(this.gl, 256, 1, this.useWebGL)
    this.maskTransitionElement = document.createElement('div')
    this.maskTransitionElement.className = 'mask-transition'
    document.body.appendChild(this.maskTransitionElement)

    this.tilemapShader = twgl.createProgramInfo(gl, [tilemapVS, tilemapFS])
    this.tilemapBuffers = twgl.createBufferInfoFromArrays(gl, {
      position: { numComponents: 2, data: new Float32Array([ -1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ]) },
      texture: { numComponents: 2, data: new Float32Array([ 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0 ]) }
    })
    this.tilemapUniforms = {
      viewportSize: this.viewportSize,
      spriteTextureSize: this.spriteTextureSize,
      tileCount: 0,
      tileset: this.tileset,
      mask: this.mask,
      animMap: this.animMap.tileTexture
    }

    this.rectShader = twgl.createProgramInfo(gl, [rectVS, rectFS])
    this.rectBuffers = twgl.createBufferInfoFromArrays(gl, {
      position: { numComponents: 2, data: new Float32Array([ -1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ]) }
    })
    this.rectUniforms = {
      viewportSize: this.viewportSize,
      viewOffset: [0, 0],
      color: [72 / 255, 48 / 255, 168 / 255, 1.0],
      opacity: 1.0,
      size: [0, 0]
    }
    this.fboShader = twgl.createProgramInfo(gl, [fboVS, fboFS])
    this.fboBuffers = twgl.createBufferInfoFromArrays(gl, {
      position: {numComponents: 2, data: new Float32Array([ 1, 1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1 ])}
    })
    this.fboAttachments = [
      {format: gl.RGBA, type: gl.UNSIGNED_BYTE, min: gl.NEAREST, wrap: gl.CLAMP_TO_EDGE}
    ]
    this.FBO = {
      front: twgl.createFramebufferInfo(gl, this.fboAttachments),
      main: twgl.createFramebufferInfo(gl, this.fboAttachments),
      back: twgl.createFramebufferInfo(gl, this.fboAttachments)
    }
  } else {
    this.viewportSize = [0, 0]
    this.ctx = canvas.getContext('2d')
    this.tileset = null
    this.mask = null
  }

  this.layers = []

  this.tileCount = 0
}

Renderer.prototype.setBackgroundSize = function (w = 0, h = 0) {
  this.rectUniforms.size[0] = w
  this.rectUniforms.size[1] = h
}
Renderer.prototype.setBackgroundColor = function (r, g, b, a = 1.0) {
  this.rectUniforms.color[0] = r / 255
  this.rectUniforms.color[1] = g / 255
  this.rectUniforms.color[2] = b / 255
  this.rectUniforms.color[3] = a
}

Renderer.prototype.setMaskOpacity = function (o) {
  this.maskTransitionElement.style.opacity = o
}

Renderer.prototype.setTileScale = function (scale) {
  this.tileScale = scale

  if (this.useWebGL) {
    let gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.tileset)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.tileScale < 1 ? gl.LINEAR : gl.NEAREST)

    gl.bindTexture(gl.TEXTURE_2D, this.mask)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.tileScale < 1 ? gl.LINEAR : gl.NEAREST)
  }
}

Renderer.prototype.setTileset = function (tileset, mask, tileCount = this.tileCount) {
  if (this.useWebGL) {
    let gl = this.gl

    gl.bindTexture(gl.TEXTURE_2D, this.tileset)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tileset)

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.tileScale < 1 ? gl.LINEAR : gl.NEAREST)

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    gl.bindTexture(gl.TEXTURE_2D, this.mask)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask)

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.tileScale < 1 ? gl.LINEAR : gl.NEAREST)

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    this.spriteTextureSize[0] = tileset.width
    this.spriteTextureSize[1] = tileset.height
  } else {
    this.tileset = tileset
    this.mask = mask
  }

  this.tileCount = tileCount
}

Renderer.prototype.setTileLayer = function (layerId, w, h, scrollScaleX = 1, scrollScaleY = 1, repeatX = false, repeatY = false) {
  let layer = new TileMapLayer(this.gl, w, h, this.useWebGL)
  layer.repeatX = !!repeatX
  layer.repeatY = !!repeatY

  layer.scrollScaleX = scrollScaleX
  layer.scrollScaleY = scrollScaleY

  layer.positionX = 0
  layer.positionY = 0

  this.layers[layerId] = layer
  return layer
}

Renderer.prototype.resizeViewport = function (width, height) {
  let sizeChanged = width !== this.viewportSize[0] || height !== this.viewportSize[1]
  if (!sizeChanged) return
  this.viewportSize[0] = width
  this.viewportSize[1] = height

  if (this.useWebGL) {
    this.gl.viewport(0, 0, width, height)

    twgl.resizeFramebufferInfo(this.gl, this.FBO.front, this.fboAttachments, width, height)
    twgl.resizeFramebufferInfo(this.gl, this.FBO.main, this.fboAttachments, width, height)
    twgl.resizeFramebufferInfo(this.gl, this.FBO.back, this.fboAttachments, width, height)
  }
}

Renderer.prototype.draw = function (x, y) {
  x = (x - (this.viewportSize[0] / 2)) / this.tileScale
  y = (y - (this.viewportSize[1] / 2)) / this.tileScale

  let gl = this.gl
  let maskOpacity = window.getComputedStyle(this.maskTransitionElement).getPropertyValue('opacity')

  if (this.useWebGL) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.FBO.front.framebuffer)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.FBO.main.framebuffer)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.FBO.back.framebuffer)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.clearColor(32 / 255, 24 / 255, 80 / 255, 1)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    // Draw tiles
    gl.useProgram(this.tilemapShader.program)
    this.tilemapUniforms.tileCount = this.tileCount
    twgl.setBuffersAndAttributes(gl, this.tilemapShader, this.tilemapBuffers)
    twgl.setUniforms(this.tilemapShader, this.tilemapUniforms)
    twgl.setUniforms(this.tilemapShader, {
      scale: this.tileScale
    })
  }

  // Draw each layer of the map
  for (let i = this.layers.length - 1; i >= 0; i--) {
    let layer = this.layers[i]
    if (layer.hidden) continue
    if (layer) {
      if (this.useWebGL) {
        if (layer.zIndex < 0) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, this.FBO.front.framebuffer)
        } else if (layer.zIndex > 0) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, this.FBO.back.framebuffer)
        } else {
          gl.bindFramebuffer(gl.FRAMEBUFFER, this.FBO.main.framebuffer)
        }
        twgl.setUniforms(this.tilemapShader, {
          viewOffset: [Math.floor((x + layer.positionX) * layer.scrollScaleX) || 0, Math.floor((y + layer.positionY) * layer.scrollScaleY) || 0],
          scaledSize: [layer.textureSize[0] / layer.width, layer.textureSize[1] / layer.height],
          textureSize: layer.textureSize,
          repeatTilesX: layer.repeatX ? 1 : 0,
          repeatTilesY: layer.repeatY ? 1 : 0,
          map: layer.tileTexture,
          maskOpacity: maskOpacity,
          backgroundColor: layer.showBackground ? this.rectUniforms.color : [0, 0, 0, 0]
        })
        twgl.drawBufferInfo(gl, gl.TRIANGLES, this.tilemapBuffers)
      } else {
        this.ctx.save()
        let w = this.ctx.canvas.width
        let h = this.ctx.canvas.height

        this.ctx.clearRect(0, 0, w, h)
        this.ctx.fillStyle = '#f0f' // magenta

        for (let dx = Math.floor(x / 32); dx - Math.floor(x / 32) < Math.ceil(w / 32); dx++) {
          for (let dy = Math.floor(y / 32); dy - Math.floor(y / 32) < Math.ceil(h / 32); dy++) {
            if (this.tileset) {
              let tileId = layer.tiles[dx][dy]
              if (tileId > 0 && tileId < this.tileCount) {
                this.ctx.drawImage(this.tileset, 32 * (tileId % 10), 32 * Math.floor(tileId / 10), 32, 32, dx * 32 - x, dy * 32 - y, 32, 32)
              } else if (tileId > 0 && tileId >= this.tileCount) {
                this.ctx.fillRect(dx * 32 - x, dy * 32 - y, 32, 32)
              }
            }
          }
        }
        this.ctx.restore()
      }
    }
  }

  if (this.useWebGL) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    // Draw background tiles
    gl.useProgram(this.fboShader.program)
    twgl.setBuffersAndAttributes(gl, this.fboShader, this.fboBuffers)
    twgl.setUniforms(this.fboShader, {
      opacity: 1.0,
      texture: this.FBO.back.attachments[0]
    })
    twgl.drawBufferInfo(gl, gl.TRIANGLES, this.fboBuffers)

    // Draw background color
    gl.useProgram(this.rectShader.program)
    twgl.setBuffersAndAttributes(gl, this.rectShader, this.rectBuffers)
    this.rectUniforms.viewOffset[0] = x
    this.rectUniforms.viewOffset[1] = y
    twgl.setUniforms(this.rectShader, this.rectUniforms)
    twgl.setUniforms(this.rectShader, {
      scale: this.tileScale,
      opacity: 0.75
    })
    twgl.drawBufferInfo(gl, gl.TRIANGLES, this.rectBuffers)

    // Draw main tile layer
    gl.useProgram(this.fboShader.program)
    twgl.setBuffersAndAttributes(gl, this.fboShader, this.fboBuffers)
    twgl.setUniforms(this.fboShader, {
      opacity: 1.0,
      texture: this.FBO.main.attachments[0]
    })
    twgl.drawBufferInfo(gl, gl.TRIANGLES, this.fboBuffers)

    // Draw front tiles
    twgl.setUniforms(this.fboShader, {
      opacity: 0.3,
      texture: this.FBO.front.attachments[0]
    })
    twgl.drawBufferInfo(gl, gl.TRIANGLES, this.fboBuffers)
  }
}

module.exports = Renderer
