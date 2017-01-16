
const zlib = require('zlib')
const crc = require('crc')
const Struct = require('struct')
const npot = require('./util/next-power-of-two')

function wrapStruct (buffer, struct) {
  if (buffer) {
    struct.setBuffer(buffer)
  }
  return struct
}

class J2T {

  static HeaderStruct (buffer) {
    return wrapStruct(buffer, Struct()
      .chars('Copyright', 180)
      .chars('Magic', 4)
      .word32Ule('Signature')
      .charsnt('Title', 32)
      .word16Ule('Version')
      .word32Ule('FileSize')
      .word32Ule('Checksum')
      .array('StreamSize', 8, 'word32Ule')
    )
  }

  static TilesetInfoStruct (version = J2T.VERSION_123, buffer) {
    // 1.20 or 1.23
    let maxTiles = 1024
    if (version === J2T.VERSION_TSF) { // If it's TSF (1.24)
      maxTiles = 4096
    }
    return wrapStruct(buffer, Struct()
      // this is extracted separately
      // .array('PaletteColor', 256, 'word32Ule')
      .word32Ule('TileCount')
      .array('FullyOpaque', maxTiles, 'word8')
      .array('Unknown1', maxTiles, 'word8')
      .array('ImageAddress', maxTiles, 'word32Ule')
      .array('Unknown2', maxTiles, 'word32Ule')
      .array('TMaskAddress', maxTiles, 'word32Ule')
      .array('Unknown3', maxTiles, 'word32Ule')
      .array('MaskAddress', maxTiles, 'word32Ule')
      .array('FMaskAddress', maxTiles, 'word32Ule')

    )
  }

  constructor () {
    this.version = J2T.VERSION_123
    this.isTSF = false

    this.header = J2T.HeaderStruct()
    this.tilesetInfo = J2T.TilesetInfoStruct(this.version)
    this.tilesetInfo.allocate()
    this.palette = new Uint32Array(256)

    this.tilesetCanvas = document.createElement('canvas')
    this.tilesetCanvas.className = 'tileset-image'
    this.tilesetCanvas.width = 32
    this.tilesetCanvas.height = 32
    this.tilesetCtx = this.tilesetCanvas.getContext('2d')
    this.tilesetCtx.imageSmoothingEnabled = false

    document.body.appendChild(this.tilesetCanvas)

    this.maskCanvas = document.createElement('canvas')
    this.maskCanvas.className = 'tileset-mask'
    this.maskCanvas.width = 32
    this.maskCanvas.height = 32
    this.maskCtx = this.maskCanvas.getContext('2d')
    this.maskCtx.imageSmoothingEnabled = false
  }

  loadFromBuffer (buffer) {
    return new Promise((resolve, reject) => {
      let headerBuffer = buffer.slice(0, 262)
      let header = J2T.HeaderStruct(headerBuffer)
      if (header.fields.Magic !== 'TILE') {
        reject(new Error('Not a tileset'))
        return
      }
      let checksum = crc.crc32(buffer.slice(262))
      if (header.fields.Checksum !== checksum) {
        reject(new Error('Invalid checksum'))
        return
      }
      if (header.fields.Version !== J2T.VERSION_123 && header.fields.Version !== J2T.VERSION_TSF) {
        reject(new Error('Unknown version ' + header.fields.Version))
        return
      }
      this.version = header.fields.Version
      this.isTSF = this.version === J2T.VERSION_TSF
      this.header.setBuffer(headerBuffer)

      let dataId = 0
      let offset = 262

      let images
      let masks

      let inflateNext = () => {
        if (offset >= buffer.length) {
          this.drawTilesetImage(images)
          this.drawTilesetMask(masks)
          resolve()
          return
        }

        zlib.inflate(buffer.slice(offset, offset + this.header.fields.StreamSize[2 * dataId]), (err, data) => {
          if (err) {
            reject(err)
            return
          }

          switch (dataId) {
            case 0:
              this.tilesetInfo = J2T.TilesetInfoStruct(this.version, data.slice(4 * 256))
              this.palette = new Uint32Array(data.buffer.slice(0, 4 * 256))
              break
            case 1:
              images = new Uint8Array(data.buffer)
              break
            case 3:
              masks = new Uint8Array(data.buffer)
              break
          }

          offset += this.header.fields.StreamSize[2 * dataId]
          dataId++
          inflateNext()
        })
      }
      inflateNext()
    })
  }

  drawTilesetImage (images) {
    let tileCount = this.tilesetInfo.fields.TileCount
    let width = npot(32 * Math.min(tileCount, 64))
    let height = npot(Math.ceil(tileCount / 64) * 32)

    this.tilesetCanvas.width = width
    this.tilesetCanvas.height = height

    let imgdata = this.tilesetCtx.createImageData(32, 32)
    let imgd = imgdata.data

    for (let i = 0; i < tileCount; i++) {
      let x = i % 64
      let y = (i / 64) | 0
      let offset = this.tilesetInfo.fields.ImageAddress[i]
      if (offset === 0) continue
      for (let j = 0; j < 1024; j++) {
        let index = images[offset + j]
        if (index > 1) {
          let color = this.palette[index]
          imgd[j * 4 + 0] = color & 0xFF
          imgd[j * 4 + 1] = (color >> 8) & 0xFF
          imgd[j * 4 + 2] = (color >> 16) & 0xFF
          imgd[j * 4 + 3] = 255
        } else {
          imgd[j * 4 + 3] = 0
        }
      }
      this.tilesetCtx.putImageData(imgdata, x * 32, y * 32)
    }
  }

  drawTilesetMask (masks) {
    let tileCount = this.tilesetInfo.fields.TileCount
    let width = npot(32 * Math.min(tileCount, 64))
    let height = npot(Math.ceil(tileCount / 64) * 32)

    this.maskCanvas.width = width
    this.maskCanvas.height = height

    let imgdata = this.maskCtx.createImageData(32, 32)
    let imgd = imgdata.data

    for (let i = 0; i < tileCount; i++) {
      let x = i % 64
      let y = (i / 64) | 0
      let offset = this.tilesetInfo.fields.MaskAddress[i]
      if (offset === 0) continue
      for (let x = 0; x < 128; x++) {
        let byte = masks[offset + x]
        for (let y = 0; y < 8; y++) {
          let masked = (byte & Math.pow(2, y)) > 0
          let pos = (x * 8 + y) * 4
          imgd[pos + 0] = 0
          imgd[pos + 1] = 0
          imgd[pos + 2] = 0
          imgd[pos + 3] = masked ? 255 : 0
        }
      }
      this.maskCtx.putImageData(imgdata, x * 32, y * 32)
    }
  }

}

J2T.VERSION_123 = 0x200
J2T.VERSION_TSF = 0x201

module.exports = J2T
