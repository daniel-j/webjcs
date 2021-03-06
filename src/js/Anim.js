
const Tile = require('./Tile')

class Anim {
  constructor (a) {
    this.speed = 10
    this.frameWait = 0
    this.pingPongWait = 0
    this.randomWait = 0
    this.pingPong = false
    this.frames = []
  }

  fromBuffer (data, isTSF = false, animCount = 0) {
    // because cyclic dependency
    const J2L = require('./J2L')
    let f = J2L.AnimatedTileStruct(data).fields
    this.speed = f.Speed
    this.frameWait = f.FrameWait
    this.pingPongWait = f.PingPongWait
    this.randomWait = f.RandomWait
    this.pingPong = !!f.PingPong
    this.frames.length = 0
    for (let i = 0; i < f.FrameCount; i++) {
      let tile = new Tile()
      tile.fromNumber(f.Frame[i], isTSF, animCount)
      this.frames[i] = tile
    }
  }

  toBuffer (isTSF = false, animCount = 0) {
    // because cyclic dependency
    const J2L = require('./J2L')
    let a = J2L.AnimatedTileStruct()
    a.setBuffer(Buffer.alloc(a.length()))
    let f = a.fields
    f.Speed = this.speed
    f.FrameWait = this.frameWait
    f.PingPongWait = this.pingPongWait
    f.RandomWait = this.randomWait
    f.PingPong = this.pingPong ? 1 : 0
    f.FrameCount = this.frames.length
    for (let i = 0; i < this.frames.length; i++) {
      f.Frame[i] = this.frames[i].toNumber(isTSF, animCount)
    }
    return a.buffer()
  }

  static findFlipped (anims, anim, invertFlip, found = new Set(), processedAnims = new Set()) {
    anim.frames.forEach((tile) => {
      let flip = !!(tile.flipped ^ invertFlip)
      if (tile.animated) {
        if (!processedAnims.has(tile.id)) {
          // only process every anim once
          processedAnims.add(tile.id)
          Anim.findFlipped(anims, anims[tile.id], flip, found, processedAnims)
        }
        return
      } else {
        if (flip) {
          // frame appears flipped in level
          found.add(tile.id)
        }
      }
    })
    return found
  }
}

module.exports = Anim
