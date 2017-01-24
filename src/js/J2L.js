
/*
selectedTiles = [[{'id': 0, 'animated': false, 'flipped': false, 'event': 0}]]
selectedSource = 'tileset'
animSelection =  false
*/

const zlib = require('zlib')
const crc = require('crc')
const Struct = require('struct')
const Tile = require('./Tile')

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

    let animCount = maxAnims
    if (buffer) {
      // Anim list can be of variable size (MLLE)
      animCount = buffer.readUInt16LE(11)
    }

    let s = Struct()
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
      .array('DetailLevel', 8, 'word32Sle') // unused
      .array('WaveXY', 10, 'word32Sle') // unused
      .array('LayerXSpeed', 8, 'word32Sle') // Divide by 65536 to get value seen in JCS
      .array('LayerYSpeed', 8, 'word32Sle') // Divide by 65536 to get value seen in JCS
      .array('LayerAutoXSpeed', 8, 'word32Sle') // Divide by 65536 to get value seen in JCS
      .array('LayerAutoYSpeed', 8, 'word32Sle') // Divide by 65536 to get value seen in JCS
      .array('LayerTextureMode', 8, 'word8')
      .array('LayerTextureParams', 24, 'word8')
      .word16Ule('AnimOffset') // MAX_TILES minus AnimCount, also called StaticTiles
      .array('TilesetEvents', maxTiles, 'word32Ule')
      .array('IsEachTileFlipped', maxTiles, 'word8') // set to 1 if a tile appears flipped anywhere in the level
      .array('TileTypes', maxTiles, 'word8') // translucent=1 or caption=4, basically. Doesn't work on animated tiles.
      .array('XMask', maxTiles, 'word8') // unused
      .array('Anim', animCount, J2L.AnimatedTileStruct())

    return wrapStruct(buffer, s)
  }

  static AnimatedTileStruct (buffer) {
    return wrapStruct(buffer, Struct()
      .word16Ule('FrameWait')
      .word16Ule('RandomWait')
      .word16Ule('PingPongWait')
      .word8('PingPong')
      .word8('Speed')
      .word8('FrameCount')
      .array('Frame', 64, 'word16Ule')
    )
  }

  constructor () {
    this.version = J2L.VERSION_123
    this.isTSF = false

    this.name = ''

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

  loadFromBuffer (buffer, name = '') {
    this.name = name
    return new Promise((resolve, reject) => {
      let headerBuffer = buffer.slice(0, 262)
      let header = J2L.HeaderStruct(headerBuffer)
      if (header.fields.Magic !== J2L.IDENTIFIER) {
        reject(new Error('Not a valid Jazz2 Level file'))
        return
      }
      let checksum = crc.crc32(buffer.slice(262))
      if (header.fields.Checksum !== checksum) {
        reject(new Error('J2L has an invalid checksum'))
        return
      }
      if (header.fields.Version !== J2L.VERSION_123 && header.fields.Version !== J2L.VERSION_TSF) {
        reject(new Error('J2L is of an unknown version: ' + header.fields.Version))
        return
      }
      this.version = header.fields.Version
      this.isTSF = this.version === J2L.VERSION_TSF
      this.header.setBuffer(headerBuffer)

      let dataId = 0
      let offset = 262

      let dictionary
      let wordMap

      let inflateNext = () => {
        if (offset >= buffer.length) {
          this.initLayers()
          this.loadLayersFromDictMap(dictionary, wordMap)
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
            case 1: this.events = new Uint32Array(data.buffer, data.byteOffset, data.length / Uint32Array.BYTES_PER_ELEMENT); break
            case 2: dictionary = new Uint16Array(data.buffer, data.byteOffset, data.length / Uint16Array.BYTES_PER_ELEMENT); break
            case 3: wordMap = new Uint16Array(data.buffer, data.byteOffset, data.length / Uint16Array.BYTES_PER_ELEMENT); break
          }

          offset += this.header.fields.StreamSize[2 * dataId]
          dataId++
          inflateNext()
        })
      }
      inflateNext()
    })
  }

  loadLayersFromDictMap (dictionary, wordMap) {
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
          let wordId = wordMap[mapOffset]
          for (let t = 0; t < 4; t++) {
            if (x * 4 + t >= width) break
            this.layers[l][x * 4 + t][y].fromNumber(dictionary[wordId * 4 + t], this.isTSF, animCount)
          }
          mapOffset++
        }
      }
    }
  }

  export (version = this.version) {
    let maxTiles = 1024
    let maxAnims = 128
    if (version === J2L.VERSION_TSF) { // If it's TSF (1.24)
      maxTiles = 4096
      maxAnims = 256
    }
    let animCount = this.levelInfo.fields.AnimCount
    let staticTiles = maxTiles - animCount

    let tileNeedsFlip = new Set()
    let animNeedsFlip = new Set()

    let dictArray = [new Uint16Array(4)] // data3
    let wordMap = [] // data4
    let uniqueWords = []

    for (let l = 0; l < 8; l++) {
      let lw = this.levelInfo.fields.LayerWidth[l]
      let lh = this.levelInfo.fields.LayerHeight[l]
      let tileWidth = (this.levelInfo.fields.LayerMiscProperties[l] & 1) === 1
      this.levelInfo.fields.DoesLayerHaveAnyTiles[l] = this.checkIfLayerHasTiles(l)
      this.levelInfo.fields.LayerRealWidth[l] = lw
      if (tileWidth) {
        switch (lw % 4) {
          case 0: break
          case 2: this.levelInfo.fields.LayerRealWidth[l] *= 2; break
          default: this.levelInfo.fields.LayerRealWidth[l] *= 4; break
        }
      }
      if (!this.levelInfo.fields.DoesLayerHaveAnyTiles[l]) continue

      let realWidth = Math.ceil(this.levelInfo.fields.LayerRealWidth[l] / 4) * 4

      for (let y = 0; y < lh; y++) {
        for (let x = 0; x < realWidth; x += 4) {
          let hasAnimAndEvent = false
          let wordIndex = -1
          let tmpWord = new Uint16Array(4)
          for (let k = 0; k < 4; k++) {
            if (!tileWidth && x + k >= lw) break
            let tile = this.layers[l][(x + k) % lw][y]
            if (tile.id === 0 && !tile.animated) tile.flipped = false
            let rawTile = tile.toNumber(version === J2L.VERSION_TSF, animCount)
            tmpWord[k] = rawTile
            if (l === 3 && tile.animated && this.events[x + k + y * lw] > 0) {
              hasAnimAndEvent = true
            }
            if (tile.flipped && !tile.animated) {
              tileNeedsFlip.add(tile.id)
            } else if (tile.flipped) {
              animNeedsFlip.add(tile.id)
            }
          }
          if (!hasAnimAndEvent) {
            wordIndex = dictArray.findIndex((word, i) => {
              return tmpWord[0] === word[0] && tmpWord[1] === word[1] && tmpWord[2] === word[2] && tmpWord[3] === word[3]
            })
          }
          if (wordIndex === -1) {
            wordIndex = dictArray.length
            dictArray.push(tmpWord)
          }
          if (hasAnimAndEvent) {
            uniqueWords.push(wordIndex)
          }
          wordMap.push(wordIndex)
        }
      }
    }

    let dictionary = new Uint16Array(dictArray.length * 4)
    for (let i = 0; i < dictArray.length; i++) {
      dictionary.set(dictArray[i], i * 4)
    }

    wordMap = Uint16Array.from(wordMap)

    for (let i = 0; i < staticTiles; i++) {
      this.levelInfo.fields.IsEachTileFlipped[i] = tileNeedsFlip.has(i) ? 1 : 0
    }

    /*
    console.log('dictionary', dictionary.length, this.dictionary.length)

    for (let i = 0; i < dictionary.length || i < this.dictionary.length; i += 4) {
      if (dictionary[i] !== this.dictionary[i] || dictionary[i + 1] !== this.dictionary[i + 1] || dictionary[i + 2] !== this.dictionary[i + 2] || dictionary[i + 3] !== this.dictionary[i + 3]) {
        console.log(i / 4, [dictionary[i], dictionary[i + 1], dictionary[i + 2], dictionary[i + 3]], [this.dictionary[i], this.dictionary[i + 1], this.dictionary[i + 2], this.dictionary[i + 3]])
      }
    }

    console.log(this.dictionary)
    console.log(dictionary)

    console.log('map', wordMap.length, this.map.length)
    for (let i = 0; i < wordMap.length || i < this.map.length; i++) {
      if (wordMap[i] !== this.map[i]) {
        console.log(i, wordMap[i], this.map[i])
      }
    }

    console.log(this.map)
    console.log(wordMap)
    */

    let data1 = this.levelInfo.buffer()

    this.header.fields.StreamSize[0 * 2 + 1] = data1.byteLength
    this.header.fields.StreamSize[1 * 2 + 1] = this.events.byteLength
    this.header.fields.StreamSize[2 * 2 + 1] = dictionary.byteLength
    this.header.fields.StreamSize[3 * 2 + 1] = wordMap.byteLength

    return this.compressBuffers([data1, Buffer.from(this.events.buffer), Buffer.from(dictionary.buffer), Buffer.from(wordMap.buffer)]).then((streams) => {
      this.header.fields.StreamSize[0 * 2] = streams[0].length
      this.header.fields.StreamSize[1 * 2] = streams[1].length
      this.header.fields.StreamSize[2 * 2] = streams[2].length
      this.header.fields.StreamSize[3 * 2] = streams[3].length

      let streamBuffer = Buffer.concat(streams)

      this.header.fields.Checksum = crc.crc32(streamBuffer)
      this.header.fields.FileSize = this.header.length() + streamBuffer.length
      this.header.fields.Version = version

      let fileBuffer = Buffer.concat([this.header.buffer(), streamBuffer])
      return fileBuffer
    })
  }

  checkIfLayerHasTiles (l) {
    if (l === 3) return 1
    let lw = this.levelInfo.fields.LayerWidth[l]
    let lh = this.levelInfo.fields.LayerHeight[l]
    for (let x = 0; x < lw; x++) {
      for (let y = 0; y < lh; y++) {
        let tile = this.layers[l][x][y]
        if (tile.id > 0 || tile.animated) {
          return 1
        }
      }
    }
    return 0
  }

  compressBuffers (buffers) {
    return new Promise((resolve, reject) => {
      let index = 0
      let compressed = []
      function r (index) {
        let buffer = buffers[index]
        if (!buffer) {
          resolve(compressed)
          return
        }
        zlib.deflate(buffer, {level: 9}, (err, data) => {
          if (err) {
            reject(err)
            return
          }
          compressed[index] = data
          r(index + 1)
        })
      }
      r(index)
    })
  }
}

J2L.IDENTIFIER = 'LEVL'
J2L.VERSION_123 = 0x202
J2L.VERSION_TSF = 0x203
J2L.HEADER_NOTICE =
  '                      Jazz Jackrabbit 2 Data File\r\n\r\n' +
  '         Retail distribution of this data is prohibited without\r\n' +
  '             written permission from Epic MegaGames, Inc.\r\n\r\n\x1A'

module.exports = J2L
