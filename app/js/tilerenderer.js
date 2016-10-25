
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

  void main (void) {
    gl_Position = vec4((((size * 32.0 * position - viewOffset) / viewportSize) * 2.0 - 1.0) * vec2(1, -1), 0.0, 1.0);
  }
`
let rectFS = `
  precision highp float;

  uniform vec4 color;

  void main() {
    gl_FragColor = color;
  }
`

// TILEMAP SHADER
let tilemapVS = `
  attribute vec2 position;
  attribute vec2 texture;

  varying vec2 pixelCoord;
  varying vec2 texCoord;

  uniform vec2 viewOffset;
  uniform vec2 viewportSize;
  uniform vec2 textureSize;

  void main (void) {
    pixelCoord = (texture * viewportSize) + viewOffset;
    texCoord =  pixelCoord / 32.0 / textureSize;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`
let tilemapFS = `
  precision highp float;

  varying vec2 pixelCoord;
  varying vec2 texCoord;

  uniform sampler2D map;
  uniform sampler2D tileset;
  uniform sampler2D mask;

  uniform vec2 spriteTextureSize;
  uniform int repeatTiles;
  uniform float tileCount;
  uniform float maskOpacity;

  const float MAX_TILES = 4096.;

  void main (void) {
    vec2 mapCoord = texCoord;
    if (repeatTiles == 0 && (texCoord.x < 0.0 || texCoord.x > 1.0 || texCoord.y < 0.0 || texCoord.y > 1.0)) { discard; }
    else if (repeatTiles == 1 && (texCoord.x < 0.0 || texCoord.x > 1.0 || texCoord.y < 0.0 || texCoord.y > 1.0)) {
      mapCoord = mod(mapCoord, 1.0);
    }
    vec4 tile = texture2D(map, mapCoord);
    // empty tile
    if (tile.x == 0.0 && tile.y == 0.0) { discard; }
    vec2 spriteCoord = mod(pixelCoord, 32.0);
    vec2 spriteOffset = floor(tile.xy * 256.0);
    float tileId = (spriteOffset.x + spriteOffset.y * 256.0);
    bool flipped = tileId >= MAX_TILES;
    bool animated = tileId >= MAX_TILES * 2.;
    tileId = mod(tileId, MAX_TILES);
    if (tileId < tileCount && !animated) {
      // vec2 tilesetPos = (spriteOffset * 32.0 + spriteCoord) / spriteTextureSize;
      if (flipped) {
        spriteCoord.x = 32. - spriteCoord.x;
      }
      vec2 tilesetPos = (vec2(mod(float(tileId), 64.0) * 32.0, floor(float(tileId) / 64.0) * 32.0) + spriteCoord) / spriteTextureSize;
      vec4 tilesetColor = texture2D(tileset, tilesetPos);
      vec4 maskColor = texture2D(mask, tilesetPos);
      vec4 outColor = mix(tilesetColor, maskColor, maskOpacity);
      gl_FragColor = outColor;
    } else {
      // unknown tile
      gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0); // Render magenta color
      // discard; // Tile id out of bounds
    }
    // gl_FragColor = tile;
    // gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
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

  // this.inverseTextureSize[0] = 1 / w
  // this.inverseTextureSize[1] = 1 / h
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

  if (this.useWebGL) {
    let gl = canvas.getContext('webgl')
    this.gl = gl
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    this.viewportSize = [0, 0]
    this.scaledViewportSize = [0, 0]
    this.spriteTextureSize = [0, 0]
    this.tileset = gl.createTexture()
    this.mask = gl.createTexture()
    this.maskTransitionElement = document.createElement('div')
    this.maskTransitionElement.className = 'mask-transition'
    document.body.appendChild(this.maskTransitionElement)

    this.tilemapShader = twgl.createProgramInfo(gl, [tilemapVS, tilemapFS])
    this.tilemapBuffers = twgl.createBufferInfoFromArrays(gl, {
      position: { numComponents: 2, data: new Float32Array([ -1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ]) },
      texture: { numComponents: 2, data: new Float32Array([ 0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0 ]) }
    })
    this.tilemapUniforms = {
      viewportSize: this.scaledViewportSize,
      spriteTextureSize: this.spriteTextureSize,
      tileCount: 0,
      tileset: this.tileset,
      mask: this.mask
    }

    this.rectShader = twgl.createProgramInfo(gl, [rectVS, rectFS])
    this.rectBuffers = twgl.createBufferInfoFromArrays(gl, {
      position: { numComponents: 2, data: new Float32Array([ -1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1 ]) }
    })
    this.rectUniforms = {
      viewportSize: this.scaledViewportSize,
      viewOffset: [0, 0],
      color: [72 / 255, 48 / 255, 168 / 255, 1],
      size: [0, 0]
    }
  } else {
    this.viewportSize = [0, 0]
    this.ctx = canvas.getContext('2d')
    this.tileset = null
    this.mask = null
  }

  this.tileScale = 1.0
  this.tileSize = 32

  this.filtered = false
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
  this.scaledViewportSize[0] = this.viewportSize[0] / scale
  this.scaledViewportSize[1] = this.viewportSize[1] / scale
}

Renderer.prototype.setTileset = function (tileset, mask, tileCount = this.tileCount) {
  if (this.useWebGL) {
    let gl = this.gl

    gl.bindTexture(gl.TEXTURE_2D, this.tileset)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tileset)

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    gl.bindTexture(gl.TEXTURE_2D, this.mask)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mask)

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)

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

Renderer.prototype.setTileLayer = function (layerId, w, h, scrollScaleX, scrollScaleY, repeat) {
  let layer = new TileMapLayer(this.gl, w, h, this.useWebGL)
  layer.repeat = !!repeat

  if (scrollScaleX) {
    layer.scrollScaleX = scrollScaleX
  }
  if (scrollScaleY) {
    layer.scrollScaleY = scrollScaleY
  }

  this.layers[layerId] = layer
  return layer
}

Renderer.prototype.resizeViewport = function (width, height) {
  this.viewportSize[0] = width
  this.viewportSize[1] = height

  if (this.useWebGL) {
    this.gl.viewport(0, 0, width, height)

    this.scaledViewportSize[0] = width / this.tileScale
    this.scaledViewportSize[1] = height / this.tileScale
  }
}

Renderer.prototype.draw = function (x, y) {
  x = Math.floor(x - (this.viewportSize[0] / 2) / this.tileScale)
  y = Math.floor(y - (this.viewportSize[1] / 2) / this.tileScale)

  let gl = this.gl
  let maskOpacity = window.getComputedStyle(this.maskTransitionElement).getPropertyValue('opacity')

  if (this.useWebGL) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    // Draw background color
    this.rectUniforms.viewOffset[0] = x
    this.rectUniforms.viewOffset[1] = y

    gl.useProgram(this.rectShader.program)
    twgl.setBuffersAndAttributes(gl, this.rectShader, this.rectBuffers)
    twgl.setUniforms(this.rectShader, this.rectUniforms)
    twgl.drawBufferInfo(gl, this.rectBuffers, gl.TRIANGLES)

    // Draw tiles
    gl.useProgram(this.tilemapShader.program)
    this.tilemapUniforms.tileCount = this.tileCount
    twgl.setBuffersAndAttributes(gl, this.tilemapShader, this.tilemapBuffers)
    twgl.setUniforms(this.tilemapShader, this.tilemapUniforms)
    twgl.setUniforms(this.tilemapShader, {
      maskOpacity: maskOpacity
    })
  }

  // Draw each layer of the map
  for (let i = 0; i < this.layers.length; i++) {
    let layer = this.layers[i]
    if (layer) {
      if (this.useWebGL) {
        twgl.setUniforms(this.tilemapShader, {
          viewOffset: [Math.floor(x * layer.scrollScaleX), Math.floor(y * layer.scrollScaleY)],
          textureSize: layer.textureSize,
          repeatTiles: layer.repeat ? 1 : 0,
          map: layer.tileTexture
        })
        twgl.drawBufferInfo(gl, this.tilemapBuffers, gl.TRIANGLES)
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
}

module.exports = Renderer
