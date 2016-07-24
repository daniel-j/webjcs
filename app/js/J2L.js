
/*
selectedTiles = [[{'id': 0, 'animated': false, 'flipped': false, 'event': 0}]]
selectedSource = 'tileset'
animSelection =  false
*/

const zlib = require('zlib')
const crc = require('crc')
const Struct = require('struct')
const Tile = require('./tile')

function wrapStruct (buffer, struct) {
  if (buffer) {
    struct.setBuffer(buffer)
  }
  return struct
}

class J2L {

  static HeaderStruct (buffer) {
    return wrapStruct(buffer, Struct()
      .chars('Copyright', 180)
      .chars('Magic', 4)
      .array('PasswordHash', 3, 'word8')
      .word8('HideLevel')
      .charsnt('LevelName', 32)
      .word16Ule('Version')
      .word32Ule('FileSize')
      .word32Ule('Checksum')
      .array('StreamSize', 8, 'word32Ule')
    )
  }

  static LevelInfoStruct (version = J2L.VERSION_123, buffer) {
    // 1.20 or 1.23
    let maxTiles = 1024
    let maxAnims = 128
    if (version === J2L.VERSION_TSF) { // If it's TSF (1.24)
      maxTiles = 4096
      maxAnims = 256
    }

    return wrapStruct(buffer, Struct()
      .word16Ule('JCSHorizontalOffset')
      .word16Ule('SecurityEnvelope1') // 0xBA00 if passworded, 0x0000 otherwise
      .word16Ule('JCSVerticalOffset')
      .word16Ule('SecurityEnvelope2') // 0xBE00 if passworded, 0x0000 otherwise
      .word8('SecEnvAndLayer') // Upper 4 bits are set if passworded, zero otherwise. Lower 4 bits represent the layer number as last saved in JCS.
      .word8('MinLight') // Multiply by 1.5625 to get value seen in JCS
      .word8('StartLight') // Multiply by 1.5625 to get value seen in JCS
      .word16Ule('AnimCount')
      .word8('VerticalSplitscreen')
      .word8('IsLevelMultiplayer')
      .word32Ule('BufferSize')
      .charsnt('LevelName', 32)
      .charsnt('Tileset', 32)
      .charsnt('BonusLevel', 32)
      .charsnt('NextLevel', 32)
      .charsnt('SecretLevel', 32)
      .charsnt('MusicFile', 32)
      .array('HelpString', 16, 'charsnt', 512)
      .array('LayerMiscProperties', 8, 'word32Ule') // Each property is a bit in the following order: Tile Width, Tile Height, Limit Visible Region, Texture Mode, Parallax Stars. This leaves 27 (32-5) unused bits for each layer?
      .array('Type', 8, 'word8') // unused
      .array('DoesLayerHaveAnyTiles', 8, 'word8')
      .array('LayerWidth', 8, 'word32Ule')
      .array('LayerRealWidth', 8, 'word32Ule')
      .array('LayerHeight', 8, 'word32Ule')
      .array('LayerZAxis', 8, 'word32Sle') // unused
      .array('DetailLevel', 8, 'word8') // unused
      .array('WaveXY', 10, 'word8') // unused
      .array('LayerXSpeed', 8, 'word32Ule') // Divide by 65536 to get value seen in JCS
      .array('LayerYSpeed', 8, 'word32Ule') // Divide by 65536 to get value seen in JCS
      .array('LayerAutoXSpeed', 8, 'word32Ule') // Divide by 65536 to get value seen in JCS
      .array('LayerAutoYSpeed', 8, 'word32Ule') // Divide by 65536 to get value seen in JCS
      .array('LayerTextureMode', 8, 'word8')
      .array('LayerTextureParams', 24, 'word8')
      .word16Ule('AnimOffset') // MAX_TILES minus AnimCount, also called StaticTiles
      .array('TilesetEvents', maxTiles, 'word32Ule')
      .array('IsEachTileFlipped', maxTiles, 'word8') // set to 1 if a tile appears flipped anywhere in the level
      .array('TileTypes', maxTiles, 'word8') // translucent=1 or caption=4, basically. Doesn't work on animated tiles.
      .array('XMask', maxTiles, 'word8') // unused
      .array('Anim', maxAnims, J2L.AnimatedTileStruct())
    )
  }

  static AnimatedTileStruct (buffer) {
    return wrapStruct(buffer, Struct()
      .word16Ule('FrameWait')
      .word16Ule('RandomWait')
      .word16Ule('PingPongWait')
      .word8('PingPong')
      .word8('Speed')
      .word8('FrameCount')
    )
  }

  constructor () {
    this.version = J2L.VERSION_123
    this.isTSF = false

    this.header = J2L.HeaderStruct()
    this.levelInfo = J2L.LevelInfoStruct(this.version)
    this.levelInfo.allocate()
    this.events = new Uint32Array(0)
    this.layers = null

    this.newLevel()
  }

  newLevel () {
    this.levelInfo.fields.MinLight = 64
    this.levelInfo.fields.StartLight = 64

    /*
    this.anims = []
    this.maxTiles = 1024
    this.isTSF = false

    this.events = new Uint32Array(this.levelInfo.LayerWidth[3] * this.levelInfo.LayerHeight[3])

    this.level = []
    for (let l = 0; l < 8; l++) {
      this.level[l] = []
      let w = this.levelInfo.LayerWidth[l]
      let h = this.levelInfo.LayerHeight[l]
      for (let x = 0; x < w; x++) {
        this.level[l][x] = []
        for (let y = 0; y < h; y++) {
          this.level[l][x][y] = {'flipped': false, 'animated': false, 'id': 0}
        }
      }
    }

    this.tilesetProperties = {
      'TileEvent': [],
      'TileUnknown1': [],
      'TileType': [],
      'TileUnknown2': []
    }

    for (let i = 0; i < this.maxTiles; i++) {
      this.tilesetProperties.TileEvent[i] = 0
      this.tilesetProperties.TileUnknown1[i] = 0
      this.tilesetProperties.TileType[i] = 0
      this.tilesetProperties.TileUnknown2[i] = 0
    }
    */
  }

  initLayers () {
    this.layers = []
    for (let l = 0; l < 8; l++) {
      this.layers[l] = []
      let width = this.levelInfo.fields.LayerWidth[l]
      let height = this.levelInfo.fields.LayerHeight[l]
      for (let x = 0; x < width; x++) {
        this.layers[l][x] = []
        for (let y = 0; y < height; y++) {
          this.layers[l][x][y] = new Tile()
        }
      }
    }
  }

  loadFromBuffer (buffer) {
    return new Promise((resolve, reject) => {
      let headerBuffer = buffer.slice(0, 262)
      let header = J2L.HeaderStruct(headerBuffer)
      if (header.fields.Magic !== 'LEVL') {
        reject(new Error('Not a level'))
        return
      }
      let checksum = crc.crc32(buffer.slice(262))
      if (header.fields.Checksum !== checksum) {
        reject(new Error('Invalid checksum'))
        return
      }
      if (header.fields.Version !== J2L.VERSION_123 && header.fields.Version !== J2L.VERSION_TSF) {
        reject(new Error('Unknown version ' + header.fields.Version))
        return
      }
      this.version = header.fields.Version
      this.isTSF = this.version === J2L.VERSION_TSF
      this.header.setBuffer(headerBuffer)

      let dataId = 0
      let offset = 262

      let dictionary
      let map

      let inflateNext = () => {
        if (offset >= buffer.length) {
          this.initLayers()
          this.loadLayersFromDictMap(dictionary, map)
          resolve()
          return
        }

        zlib.inflate(buffer.slice(offset, offset + this.header.fields.StreamSize[2 * dataId]), (err, data) => {
          if (err) {
            reject(err)
            return
          }

          switch (dataId) {
            case 0: this.levelInfo = J2L.LevelInfoStruct(this.version, data); break
            case 1: this.events = new Uint32Array(data.buffer); break
            case 2: dictionary = new Uint16Array(data.buffer); break
            case 3: map = new Uint16Array(data.buffer); break
          }

          offset += this.header.fields.StreamSize[2 * dataId]
          dataId++
          inflateNext()
        })
      }
      inflateNext()
    })
  }

  loadLayersFromDictMap (dictionary, map) {
    let animCount = this.levelInfo.fields.AnimCount
    let mapOffset = 0

    for (let l = 0; l < 8; l++) {
      if (!this.levelInfo.fields.DoesLayerHaveAnyTiles[l]) {
        continue
      }

      let width = this.levelInfo.fields.LayerWidth[l]
      let height = this.levelInfo.fields.LayerHeight[l]
      let realWidth = Math.ceil(width / 4)

      if ((this.levelInfo.fields.LayerMiscProperties[l] & 1) === 1) {
        realWidth = Math.ceil(this.levelInfo.fields.LayerRealWidth[l] / 4)
      }

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < realWidth; x++) {
          let wordId = map[mapOffset]
          for (let t = 0; t < 4; t++) {
            if (x * 4 + t >= width) break
            this.layers[l][x * 4 + t][y].fromNumber(dictionary[wordId * 4 + t], this.isTSF, animCount)
          }
          mapOffset++
        }
      }
    }
  }
}

J2L.VERSION_123 = 0x202
J2L.VERSION_TSF = 0x203

module.exports = J2L
