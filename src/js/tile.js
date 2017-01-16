
class Tile {
  constructor (tile = 0) {
    this.id = 0
    this.flipped = false
    this.animated = false
    this.event = 0

    if (tile !== 0) {
      if (typeof tile === 'number') {
        this.fromNumber(tile)
      } else {
        this.id = tile.id
        this.flipped = !!tile.flipped
        this.animated = !!tile.animated
      }
    }
  }

  toNumber (isTSF = false, animCount = 0) {
    let maxTiles = !isTSF ? 1024 : 4096
    let staticTiles = maxTiles - animCount
    return this.id & (maxTiles - 1) | (this.flipped ? maxTiles : 0) | (this.animated ? staticTiles : 0)
  }

  fromNumber (n, isTSF = false, animCount = 0) {
    let maxTiles = !isTSF ? 1024 : 4096
    let staticTiles = maxTiles - animCount
    this.id = n & (maxTiles - 1)
    this.flipped = (n & maxTiles) !== 0
    this.animated = false
    if (this.id >= staticTiles) {
      this.id -= staticTiles
      this.animated = true
    }
  }
}

module.exports = Tile
