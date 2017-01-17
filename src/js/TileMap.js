
const npot = require('./util/next-power-of-two')

class TileMap {
  constructor (w = 1, h = 1) {
    if (!r.disableWebGL) {
      this.texture = r.gl.createTexture()
      r.gl.bindTexture(r.gl.TEXTURE_2D, this.texture)
      // Map MUST be filtered with NEAREST or tile lookup fails
      r.setDefaultTextureProperties()
    } else {
      this.texture = null
    }
    this.textureSize = [0, 0]
    this.setTexture(w, h)

    this.width = w
    this.height = h
  }

  setTexture (w, h) {
    this.width = w
    this.height = h
    if (!r.disableWebGL) {
      w = npot(w)
      h = npot(h)
      r.gl.bindTexture(r.gl.TEXTURE_2D, this.texture)
      r.gl.texImage2D(r.gl.TEXTURE_2D, 0, r.gl.RGBA, w, h, 0, r.gl.RGBA, r.gl.UNSIGNED_BYTE, new Uint8Array(w * h * 4))
      r.setDefaultTextureProperties()
    } else {
      this.texture = new Array(w * h)
    }

    this.textureSize[0] = w
    this.textureSize[1] = h
  }

  setTiles (x, y, selection) {
    x = Math.floor(x)
    y = Math.floor(y)

    let sw = Math.min(this.textureSize[0] - x, selection.length)
    let sh = Math.min(this.textureSize[1] - y, selection[0].length)
    let mapBuffer = new Uint8Array(sw * sh * 4)
    for (let sx = 0; sx < sw; sx++) {
      for (let sy = 0; sy < sh; sy++) {
        let i = (sy * sw + sx) * 4

        let tile = selection[sx][sy]
        if (!tile) continue
        let tileId = tile.id
        mapBuffer[i + 0] = (tileId % 256)
        mapBuffer[i + 1] = Math.floor(tileId / 256)
        mapBuffer[i + 2] = (tile.flipped * 1 + tile.animated * 2)
        mapBuffer[i + 3] = 255
      }
    }

    if (!r.disableWebGL) {
      r.gl.bindTexture(r.gl.TEXTURE_2D, this.texture)
      r.gl.texSubImage2D(r.gl.TEXTURE_2D, 0, x, y, sw, sh, r.gl.RGBA, r.gl.UNSIGNED_BYTE, mapBuffer)
    } else {
      for (let sx = 0; sx < sw; sx++) {
        for (let sy = 0; sy < sh; sy++) {
          this.texture[x + sx + (y + sy) * this.width] = selection[sx][sy]
        }
      }
    }
  }
}

module.exports = TileMap

// down here because circular dependency
const r = require('./renderer')
