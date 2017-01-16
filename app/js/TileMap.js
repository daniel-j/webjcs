
const npot = require('./util/next-power-of-two')

class TileMap {
  constructor (w = 1, h = 1) {
    const gl = r.gl
    this.texture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    // Map MUST be filtered with NEAREST or tile lookup fails
    r.setDefaultTextureProperties()
    this.textureSize = [0, 0]
    this.setTexture(w, h)

    this.width = w
    this.height = h
  }

  setTexture (w, h) {
    const gl = r.gl
    this.width = w
    this.height = h
    w = npot(w)
    h = npot(h)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(w * h * 4))
    r.setDefaultTextureProperties()

    this.textureSize[0] = w
    this.textureSize[1] = h
  }

  setTiles (x, y, selection) {
    const gl = r.gl
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
        mapBuffer[i + 0] = (tileId % 64) * 4
        mapBuffer[i + 1] = Math.floor(tileId / 64) * 4
        mapBuffer[i + 2] = (tile.flipped * 1 + tile.animated * 2) * 4
        mapBuffer[i + 3] = 255
      }
    }

    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, sw, sh, gl.RGBA, gl.UNSIGNED_BYTE, mapBuffer)
  }
}

module.exports = TileMap

// down here because circular dependency
const r = require('./renderer')
