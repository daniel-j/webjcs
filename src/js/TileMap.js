
const Tile = require('./Tile')
const npot = require('./util/next-power-of-two')

let r

class TileMap {
  constructor (w = 1, h = 1, mapOnly = false, eventsOnly = false) {
    this.map = null
    this.mapOnly = mapOnly
    this.eventsOnly = eventsOnly
    if (!this.mapOnly) {
      r = require('./renderer')
      if (r.disableWebGL) this.mapOnly = true
    }
    if (!this.mapOnly && !r.disableWebGL) {
      if (r.advancedShaders && !this.eventsOnly) {
        this.texture = r.gl.createTexture()
        r.gl.bindTexture(r.gl.TEXTURE_2D, this.texture)
        // Map MUST be filtered with NEAREST or tile lookup fails
        r.setDefaultTextureProperties()
      } else {
        this.buffers = r.twgl.createBufferInfoFromArrays(r.gl, {
          position: { numComponents: 2, data: new Float32Array([]), drawType: r.gl.DYNAMIC_DRAW },
          uvs: { numComponents: 2, data: new Float32Array([]), drawType: r.gl.DYNAMIC_DRAW }
        })
      }
    }
    this.textureSize = [0, 0]
    this.setTexture(w, h)

    this.width = w
    this.height = h
  }

  setTexture (w, h) {
    this.width = w
    this.height = h
    this.map = new Array(w * h)
    if (!this.mapOnly && !r.disableWebGL) {
      if (r.advancedShaders && !this.eventsOnly) {
        w = npot(w)
        h = npot(h)
        r.gl.bindTexture(r.gl.TEXTURE_2D, this.texture)
        r.gl.texImage2D(r.gl.TEXTURE_2D, 0, r.gl.RGBA, w, h, 0, r.gl.RGBA, r.gl.UNSIGNED_BYTE, new Uint8Array(w * h * 4))
        r.setDefaultTextureProperties()
      } else {
        let position = new Float32Array(w * h * 12)
        for (let x = 0; x < w; x++) {
          for (let y = 0; y < h; y++) {
            let i = (x + y * w) * 12
            position[i + 0] = x
            position[i + 1] = y
            position[i + 2] = x + 1
            position[i + 3] = y
            position[i + 4] = x
            position[i + 5] = y + 1

            position[i + 6] = x + 1
            position[i + 7] = y
            position[i + 8] = x + 1
            position[i + 9] = y + 1
            position[i + 10] = x
            position[i + 11] = y + 1
          }
        }

        this.uvs = new Float32Array(w * h * 12)
        r.twgl.setAttribInfoBufferFromArray(r.gl, this.buffers.attribs.position, position)
        r.twgl.setAttribInfoBufferFromArray(r.gl, this.buffers.attribs.uvs, this.uvs)
      }
    }

    this.textureSize[0] = w
    this.textureSize[1] = h
  }

  setTiles (x, y, selection, removeEvents = false) {
    if (!selection || !selection[0]) {
      return
    }
    x = Math.floor(x)
    y = Math.floor(y)

    let sw = Math.min(this.width - x, selection.length)
    let sh = Math.min(this.height - y, selection[0].length)
    let mapBuffer
    if (!this.mapOnly && !r.disableWebGL) {
      if (r.advancedShaders) {
        mapBuffer = new Uint8Array(sw * sh * 4)
      }
    }
    for (let sy = 0; sy < sh; sy++) {
      for (let sx = 0; sx < sw; sx++) {
        let tile = selection[sx][sy]
        if (tile) {
          tile = this.map[x + sx + (y + sy) * this.width] = new Tile(tile)
        } else {
          tile = this.map[x + sx + (y + sy) * this.width]
        }
        if (!tile) continue
        if (removeEvents) tile.event = 0
        let tileId = tile.id
        if (!this.mapOnly && !r.disableWebGL) {
          if (r.advancedShaders) {
            let i = (sx + sy * sw) * 4
            mapBuffer[i + 0] = (tileId % 256)
            mapBuffer[i + 1] = Math.floor(tileId / 256)
            mapBuffer[i + 2] = (tile.flipped * 1 + tile.animated * 2 + tile.vflipped * 4)
            mapBuffer[i + 3] = 255
          } else {
            if (tile.animated) continue
            let i = (x + sx + (y + sy) * this.width) * 12
            let tx0 = tileId % 64
            let ty0 = Math.floor(tileId / 64)
            let tx1 = tx0 + 1
            let ty1 = ty0 + 1
            if (tile.flipped) {
              tx0 += 1
              tx1 -= 1
            }
            if (tile.vflipped) {
              ty0 += 1
              ty1 -= 1
            }
            let uvs = this.uvs
            uvs[i + 0] = tx0
            uvs[i + 1] = ty0
            uvs[i + 2] = tx1
            uvs[i + 3] = ty0
            uvs[i + 4] = tx0
            uvs[i + 5] = ty1

            uvs[i + 6] = tx1
            uvs[i + 7] = ty0
            uvs[i + 8] = tx1
            uvs[i + 9] = ty1
            uvs[i + 10] = tx0
            uvs[i + 11] = ty1
          }
        }
      }
      if (!this.mapOnly && !r.disableWebGL && !r.advancedShaders) {
        let offset = (x + (y + sy) * this.width) * 12
        r.gl.bindBuffer(r.gl.ARRAY_BUFFER, this.buffers.attribs.uvs.buffer)
        r.gl.bufferSubData(r.gl.ARRAY_BUFFER, offset * 4, this.uvs.subarray(offset, offset + sw * 12))
        // r.twgl.setAttribInfoBufferFromArray(r.gl, this.buffers.attribs.uvs, this.uvs.subarray(offset, offset + sw * 12), offset * 4)
      }
    }

    if (!this.mapOnly && !r.disableWebGL && r.advancedShaders) {
      r.gl.bindTexture(r.gl.TEXTURE_2D, this.texture)
      r.gl.texSubImage2D(r.gl.TEXTURE_2D, 0, x, y, sw, sh, r.gl.RGBA, r.gl.UNSIGNED_BYTE, mapBuffer)
    }
  }

  setEvents (x, y, selection) {
    if (!selection || !selection[0]) {
      return
    }
    x = Math.floor(x)
    y = Math.floor(y)

    let sw = Math.min(this.width - x, selection.length)
    let sh = Math.min(this.height - y, selection[0].length)

    for (let sy = 0; sy < sh; sy++) {
      for (let sx = 0; sx < sw; sx++) {
        let tile = selection[sx][sy]
        let event = tile.event
        if (tile) {
          this.map[x + sx + (y + sy) * this.width] = event
        } else {
          continue
        }

        let eventId = event & 0xFF
        let generator = false
        if (eventId === 216) {
          generator = true
          eventId = (event >> 12) & 0xFF
        }
        if (!this.mapOnly && !r.disableWebGL) {
          let i = (x + sx + (y + sy) * this.width) * 12
          let tx0 = (eventId % 16) + 16 * generator
          let ty0 = Math.floor(eventId / 16)
          let tx1 = tx0 + 1
          let ty1 = ty0 + 1
          let uvs = this.uvs
          uvs[i + 0] = tx0
          uvs[i + 1] = ty0
          uvs[i + 2] = tx1
          uvs[i + 3] = ty0
          uvs[i + 4] = tx0
          uvs[i + 5] = ty1

          uvs[i + 6] = tx1
          uvs[i + 7] = ty0
          uvs[i + 8] = tx1
          uvs[i + 9] = ty1
          uvs[i + 10] = tx0
          uvs[i + 11] = ty1
        }
      }
      if (!this.mapOnly && !r.disableWebGL) {
        let offset = (x + (y + sy) * this.width) * 12
        r.gl.bindBuffer(r.gl.ARRAY_BUFFER, this.buffers.attribs.uvs.buffer)
        r.gl.bufferSubData(r.gl.ARRAY_BUFFER, offset * 4, this.uvs.subarray(offset, offset + sw * 12))
      }
    }
  }
}

module.exports = TileMap
