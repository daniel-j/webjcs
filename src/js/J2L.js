
const zlib = require('zlib')
const crc = require('crc')
const Struct = require('struct')
const Tile = require('./Tile')
const Anim = require('./Anim')

function wrapStruct (buffer, struct) {
  if (buffer) {
    struct.setBuffer(buffer)
  }
  return struct
}

class J2L {

  static HeaderStruct (buffer) {
    return wrapStruct(buffer, Struct()
      .chars('Copyright', 180, 'binary')
      .chars('Magic', 4, 'binary')
      .array('PasswordHash', 3, 'word8')
      .word8('HideLevel')
      .charsnt('LevelName', 32, 'binary')
      .word16Ule('Version')
      .word32Ule('FileSize')
      .word32Ule('Checksum')
      .array('StreamSize', 8, 'word32Ule')
    )
  }

  static LevelInfoStruct (buffer) {
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
      .charsnt('LevelName', 32, 'binary')
      .charsnt('Tileset', 32, 'binary')
      .charsnt('BonusLevel', 32, 'binary')
      .charsnt('NextLevel', 32, 'binary')
      .charsnt('SecretLevel', 32, 'binary')
      .charsnt('MusicFile', 32, 'binary')
      .array('HelpString', 16, 'charsnt', 512, 'binary')
      .array('LayerMiscProperties', 8, 'word32Ule') // Each property is a bit in the following order: Tile Width, Tile Height, Limit Visible Region, Texture Mode, Parallax Stars. This leaves 27 (32-5) unused bits for each layer?
      .array('Type', 8, 'word8') // unknown
      .array('DoesLayerHaveAnyTiles', 8, 'word8')
      .array('LayerWidth', 8, 'word32Ule')
      .array('LayerRealWidth', 8, 'word32Ule')
      .array('LayerHeight', 8, 'word32Ule')
      .array('LayerZAxis', 8, 'word32Sle') // nothing happens when you change these
      .array('DetailLevel', 8, 'word8') // is set to 02 for layer 5 in Battle1 and Battle3, but is 00 the rest of the time, at least for JJ2 levels. No clear effect of altering.
      .array('LayerXOffset', 8, 'word32Sle') // Divide by 65536 to get layer offset in pixels (does not affect mask or events. Plus only!)
      .array('LayerYOffset', 8, 'word32Sle') // Divide by 65536 to get layer offset in pixels (does not affect mask or events. Plus only!)
      .array('LayerXSpeed', 8, 'word32Sle') // Divide by 65536 to get value seen in JCS
      .array('LayerYSpeed', 8, 'word32Sle') // Divide by 65536 to get value seen in JCS
      .array('LayerAutoXSpeed', 8, 'word32Sle') // Divide by 65536 to get value seen in JCS
      .array('LayerAutoYSpeed', 8, 'word32Sle') // Divide by 65536 to get value seen in JCS
      .array('LayerTextureMode', 8, 'word8')
      .array('LayerTextureParams', 24, 'word8')
      .word16Ule('AnimOffset') // MAX_TILES minus AnimCount, also called StaticTiles
      /*
      .array('TilesetEvents', maxTiles, 'word32Ule')
      .array('IsEachTileFlipped', maxTiles, 'word8') // set to 1 if a tile appears flipped anywhere in the level
      .array('TileTypes', maxTiles, 'word8') // translucent=1 or caption=4, basically. Doesn't work on animated tiles.
      .array('XMask', maxTiles, 'word8') // unused
      .array('Anim', animCount, J2L.AnimatedTileStruct())
      */

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

  constructor ({renderable = false} = {}) {
    this.name = ''

    this.header = null
    this.levelInfo = null
    this.events = new Uint32Array(0)
    this.layers = new Array(8)
    this.TilesetEvents = new Uint32Array(4096)
    // this.IsEachTileFlipped = new Uint8Array(4096)
    this.TileTypes = Buffer.alloc(4096)
    this.anims = []

    this.renderable = renderable
    this.isLoading = false
    this.isProtected = false
  }

  newLevel () {
    this.name = 'Untitled.j2l'
    this.isProtected = false

    this.header = J2L.HeaderStruct()
    this.header.setBuffer(Buffer.alloc(this.header.length()))

    this.levelInfo = J2L.LevelInfoStruct()
    this.levelInfo.setBuffer(Buffer.alloc(this.levelInfo.length()))

    this.TilesetEvents.fill(0)
    this.TileTypes.fill(0)
    this.anims.length = 0

    this.header.get('PasswordHash').set(0, 0x00)
    this.header.get('PasswordHash').set(1, 0xBA)
    this.header.get('PasswordHash').set(2, 0xBE)

    this.levelInfo.set('SecEnvAndLayer', 3)

    this.levelInfo.set('MinLight', 64)
    this.levelInfo.set('StartLight', 64)

    this.levelInfo.set('LevelName', 'Untitled')

    // Default layer sizes
    this.levelInfo.get('LayerWidth').set(0, 864)
    this.levelInfo.get('LayerHeight').set(0, 216)
    this.levelInfo.get('LayerWidth').set(1, 576)
    this.levelInfo.get('LayerHeight').set(1, 144)
    this.levelInfo.get('LayerWidth').set(2, 256)
    this.levelInfo.get('LayerHeight').set(2, 64)
    this.levelInfo.get('LayerWidth').set(3, 256)
    this.levelInfo.get('LayerHeight').set(3, 64)
    this.levelInfo.get('LayerWidth').set(4, 171)
    this.levelInfo.get('LayerHeight').set(4, 43)
    this.levelInfo.get('LayerWidth').set(5, 114)
    this.levelInfo.get('LayerHeight').set(5, 29)
    this.levelInfo.get('LayerWidth').set(6, 76)
    this.levelInfo.get('LayerHeight').set(6, 19)
    this.levelInfo.get('LayerWidth').set(7, 8)
    this.levelInfo.get('LayerHeight').set(7, 8)

    // Default layer speeds
    this.levelInfo.get('LayerXSpeed').set(0, 3.375 * 65536)
    this.levelInfo.get('LayerYSpeed').set(0, 3.375 * 65536)
    this.levelInfo.get('LayerXSpeed').set(1, 2.25 * 65536)
    this.levelInfo.get('LayerYSpeed').set(1, 2.25 * 65536)
    this.levelInfo.get('LayerXSpeed').set(2, 1 * 65536)
    this.levelInfo.get('LayerYSpeed').set(2, 1 * 65536)
    this.levelInfo.get('LayerXSpeed').set(3, 1 * 65536)
    this.levelInfo.get('LayerYSpeed').set(3, 1 * 65536)
    this.levelInfo.get('LayerXSpeed').set(4, 0.6666717529296875 * 65536)
    this.levelInfo.get('LayerYSpeed').set(4, 0.6666717529296875 * 65536)
    this.levelInfo.get('LayerXSpeed').set(5, 0.4444580078125 * 65536)
    this.levelInfo.get('LayerYSpeed').set(5, 0.4444580078125 * 65536)
    this.levelInfo.get('LayerXSpeed').set(6, 0.2963104248046875 * 65536)
    this.levelInfo.get('LayerYSpeed').set(6, 0.2963104248046875 * 65536)
    this.levelInfo.get('LayerXSpeed').set(7, 0 * 65536)
    this.levelInfo.get('LayerYSpeed').set(7, 0 * 65536)

    this.levelInfo.get('LayerMiscProperties').set(7, 0x3) // tile width & tile height

    this.initLayers()
  }

  initLayers (events = null) {
    const TileMap = require('./TileMap')
    for (let l = 0; l < 8; l++) {
      let lw = this.levelInfo.fields.LayerWidth[l] || 1
      let lh = this.levelInfo.fields.LayerHeight[l] || 1
      if (!this.layers[l]) {
        this.layers[l] = new TileMap(lw, lh, !this.renderable)
      } else {
        this.layers[l].setTexture(lw, lh)
      }
      let tiles = []
      for (let x = 0; x < lw; x++) {
        tiles[x] = []
        for (let y = 0; y < lh; y++) {
          let t = new Tile()
          if (l === 3 && events) {
            t.event = events[x + lw * y]
          }
          tiles[x][y] = t
        }
      }
      this.layers[l].setTiles(0, 0, tiles)
    }
  }

  resizeLayer (l, w, h) {
    let oldlw = this.levelInfo.fields.LayerWidth[l]
    let oldlh = this.levelInfo.fields.LayerHeight[l]
    if (oldlw !== w || oldlh !== h) {
      let lw = this.levelInfo.fields.LayerWidth[l] = w
      let lh = this.levelInfo.fields.LayerHeight[l] = h
      let layer = this.layers[l]
      let oldmap = layer.map
      layer.setTexture(lw, lh)

      let tiles = []
      for (let x = 0; x < lw; x++) {
        tiles[x] = []
        for (let y = 0; y < lh; y++) {
          let t
          if (x < oldlw && y < oldlh) {
            t = oldmap[x + y * oldlw]
          } else {
            t = new Tile()
          }
          tiles[x][y] = t
        }
      }
      layer.setTiles(0, 0, tiles)
    }
  }

  setPassword (password = '') {
    let hash = crc.crc32(password) & 0xffffff
    if (hash === 0) hash = 0xBABE
    let ph = this.header.get('PasswordHash')
    ph.set(0, (hash >> 16) & 0xFF)
    ph.set(1, (hash >> 8) & 0xFF)
    ph.set(2, hash & 0xFF)
    this.isProtected = hash !== 0 && hash !== 0xBABE
  }

  loadLevelInfo (data, isTSF) {
    this.levelInfo = J2L.LevelInfoStruct(data)
    let maxTiles = isTSF ? 4096 : 1024
    let offset = this.levelInfo.length()
    for (let i = 0; i < maxTiles; i++) {
      this.TilesetEvents[i] = data.readUInt32LE(offset + i * 4)
    }
    data.copy(this.TileTypes, 0, offset + maxTiles * 5, offset + maxTiles * 6)
    let animCount = this.levelInfo.fields.AnimCount
    this.anims.length = 0
    for (let i = 0; i < animCount; i++) {
      let anim = new Anim()
      anim.fromBuffer(data.slice(offset + maxTiles * 7 + i * 137), isTSF, animCount)
      this.anims[i] = anim
    }
  }

  loadFromBuffer (buffer, name, handlePassword) {
    this.name = name || ''
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
      let ph = header.get('PasswordHash')
      let passwordHash = ph.get(0) << 16 | ph.get(1) << 8 | ph.get(2)
      this.isProtected = passwordHash !== 0xBABE && passwordHash !== 0

      let p = this.isProtected && handlePassword ? new Promise(handlePassword) : Promise.resolve()
      p.then((password = '') => {
        if (this.isProtected && handlePassword) {
          password = crc.crc32(password) & 0xffffff
          if (passwordHash !== password) {
            reject(new Error('Wrong password'))
            return
          }
        }

        this.isLoading = true

        this.header = header
        let version = header.fields.Version
        let isTSF = version === J2L.VERSION_TSF

        let dataId = 0
        let offset = 262

        let events
        let dictionary
        let wordMap

        let inflateNext = () => {
          if (offset >= buffer.length) {
            this.initLayers(events)
            this.loadLayersFromDictMap(dictionary, wordMap, isTSF)
            this.isLoading = false
            resolve()
            return
          }

          zlib.inflate(buffer.slice(offset, offset + this.header.fields.StreamSize[2 * dataId]), (err, data) => {
            if (err) {
              this.isLoading = false
              reject(err)
              return
            }

            switch (dataId) {
              case 0: this.loadLevelInfo(data, isTSF); break
              case 1: events = new Uint32Array(data.buffer, data.byteOffset, data.length / Uint32Array.BYTES_PER_ELEMENT); break
              case 2: dictionary = new Uint16Array(data.buffer, data.byteOffset, data.length / Uint16Array.BYTES_PER_ELEMENT); break
              case 3: wordMap = new Uint16Array(data.buffer, data.byteOffset, data.length / Uint16Array.BYTES_PER_ELEMENT); break
            }

            offset += this.header.fields.StreamSize[2 * dataId]
            dataId++
            inflateNext()
          })
        }
        inflateNext()
      }).catch((err) => {
        this.isLoading = false
        return reject(err)
      })
    })
  }

  loadLayersFromDictMap (dictionary, wordMap, isTSF) {
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

      let tiles = []
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < realWidth; x++) {
          let wordId = wordMap[mapOffset]
          for (let t = 0; t < 4; t++) {
            if (x * 4 + t >= width) break
            if (!tiles[x * 4 + t]) tiles[x * 4 + t] = []
            this.layers[l].map[x * 4 + t + y * width].fromNumber(dictionary[wordId * 4 + t], isTSF, animCount)
            tiles[x * 4 + t][y] = this.layers[l].map[x * 4 + t + y * width]
          }
          mapOffset++
        }
      }
      this.layers[l].setTiles(0, 0, tiles)
    }
  }

  export (version, modifier = null) {
    if (typeof version !== 'number') {
      version = this.header.fields.Version
    }
    if (version !== J2L.VERSION_123 && version !== J2L.VERSION_TSF) {
      return Promise.reject('Invalid version')
    }
    let maxTiles = 1024
    let maxAnims = 128
    let isTSF = version === J2L.VERSION_TSF
    if (isTSF) {
      maxTiles = 4096
      maxAnims = 256
    }
    let animCount = this.anims.length
    if (animCount > maxAnims) return Promise.reject('Too many animations')
    let staticTiles = maxTiles - animCount

    let ph = this.header.get('PasswordHash')
    let passwordHash = ph.get(0) << 16 | ph.get(1) << 8 | ph.get(2)
    let isProtected = passwordHash !== 0xBABE && passwordHash !== 0

    let header = J2L.HeaderStruct()
    header.setBuffer(Buffer.alloc(header.length()))
    header.set('Copyright', J2L.HEADER_NOTICE)
    header.set('Magic', J2L.IDENTIFIER)
    header.get('PasswordHash').set(0, ph.get(0))
    header.get('PasswordHash').set(1, ph.get(1))
    header.get('PasswordHash').set(2, ph.get(2))
    header.set('HideLevel', this.header.get('HideLevel'))
    header.set('LevelName', this.levelInfo.get('LevelName'))
    header.set('Version', version)

    let info = J2L.LevelInfoStruct()
    info.setBuffer(Buffer.alloc(info.length()))
    info.fields.BufferSize = info.buffer().length + maxTiles * 7 + animCount * 137
    info.fields.AnimOffset = staticTiles

    info.set('SecEnvAndLayer', (isProtected ? 0xF0 : 0) | (this.levelInfo.get('SecEnvAndLayer') & 0xF))
    info.set('SecurityEnvelope1', isProtected ? 0xBA : 0)
    info.set('SecurityEnvelope2', isProtected ? 0xBE : 0)

    let copyFields = [
      'JCSHorizontalOffset', 'JCSVerticalOffset',
      'MinLight', 'StartLight',
      'AnimCount',
      'VerticalSplitscreen', 'IsLevelMultiplayer',
      'LevelName', 'Tileset', 'NextLevel', 'BonusLevel', 'SecretLevel', 'MusicFile'
    ]
    copyFields.forEach((field) => {
      info.set(field, this.levelInfo.get(field))
    })

    let copyArrays = [
      'HelpString',
      'LayerMiscProperties',
      'LayerWidth', 'LayerHeight',
      'LayerXOffset', 'LayerYOffset',
      'LayerXSpeed', 'LayerYSpeed',
      'LayerAutoXSpeed', 'LayerAutoYSpeed',
      'LayerTextureMode', 'LayerTextureParams'
    ]
    copyArrays.forEach((arr) => {
      let fields = info.get(arr).fields
      for (let i in fields) {
        let val = 0
        try {
          val = this.levelInfo.get(arr).get(i)
        } catch (err) {}
        info.get(arr).set(i, val)
      }
    })

    info.get('LayerZAxis').set(0, -300)
    info.get('LayerZAxis').set(1, -200)
    info.get('LayerZAxis').set(2, -100)
    info.get('LayerZAxis').set(3, 0)
    info.get('LayerZAxis').set(4, 100)
    info.get('LayerZAxis').set(5, 200)
    info.get('LayerZAxis').set(6, 300)
    info.get('LayerZAxis').set(7, 400)

    let tileNeedsFlip = new Set()
    let animNeedsFlip = new Set()

    let dictArray = [new Uint16Array(4)] // data3
    let wordMap = [] // data4
    let uniqueWords = []
    let events

    for (let l = 0; l < 8; l++) {
      let lw = info.fields.LayerWidth[l]
      let lh = info.fields.LayerHeight[l]
      if (l === 3) {
        events = new Uint32Array(lw * lh)
      }
      let tileWidth = (info.fields.LayerMiscProperties[l] & 1) === 1
      info.fields.DoesLayerHaveAnyTiles[l] = this.checkIfLayerHasTiles(l, info)
      info.fields.LayerRealWidth[l] = lw
      if (tileWidth) {
        switch (lw % 4) {
          case 0: break
          case 2: info.fields.LayerRealWidth[l] *= 2; break
          default: info.fields.LayerRealWidth[l] *= 4; break
        }
      }
      if (!info.fields.DoesLayerHaveAnyTiles[l]) continue

      let realWidth = Math.ceil(info.fields.LayerRealWidth[l] / 4) * 4

      for (let y = 0; y < lh; y++) {
        for (let x = 0; x < realWidth; x += 4) {
          let hasAnimAndEvent = false
          let wordIndex = -1
          let tmpWord = new Uint16Array(4)
          for (let k = 0; k < 4; k++) {
            let tile = this.layers[l].map[((x + k) % lw) + y * lw]
            if (tile.id === 0 && !tile.animated) tile.flipped = false
            let rawTile = tile.toNumber(version === J2L.VERSION_TSF, animCount)

            if (l === 3 && x + k < lw) {
              events[x + k + y * lw] = tile.event
            }
            if (!tileWidth && x + k >= lw) break

            tmpWord[k] = rawTile
            if (l === 3 && tile.animated && tile.event > 0) {
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

    let isTileFlipped = Buffer.alloc(maxTiles)

    for (let i = 0; i < staticTiles; i++) {
      isTileFlipped[i] = tileNeedsFlip.has(i) ? 1 : 0
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

    if (typeof modifier === 'function') {
      modifier(header, info)
    }

    let animBuffers = []
    for (let i = 0; i < animCount; i++) {
      animBuffers.push(this.anims[i].toBuffer(isTSF, animCount))
    }

    let data1 = Buffer.concat([
      info.buffer(),
      Buffer.from(this.TilesetEvents.buffer, 0, maxTiles * 4),
      isTileFlipped,
      this.TileTypes.slice(0, maxTiles),
      Buffer.alloc(maxTiles), // XMask
      Buffer.concat(animBuffers)
    ])

    header.fields.StreamSize[0 * 2 + 1] = data1.byteLength
    header.fields.StreamSize[1 * 2 + 1] = events.byteLength
    header.fields.StreamSize[2 * 2 + 1] = dictionary.byteLength
    header.fields.StreamSize[3 * 2 + 1] = wordMap.byteLength

    return this.compressBuffers([data1, Buffer.from(events.buffer), Buffer.from(dictionary.buffer), Buffer.from(wordMap.buffer)]).then((streams) => {
      header.fields.StreamSize[0 * 2] = streams[0].length
      header.fields.StreamSize[1 * 2] = streams[1].length
      header.fields.StreamSize[2 * 2] = streams[2].length
      header.fields.StreamSize[3 * 2] = streams[3].length

      let streamBuffer = Buffer.concat(streams)

      header.set('Checksum', crc.crc32(streamBuffer))
      header.set('FileSize', header.length() + streamBuffer.length)

      let fileBuffer = Buffer.concat([header.buffer(), streamBuffer])
      return fileBuffer
    })
  }

  checkIfLayerHasTiles (l, info) {
    if (l === 3) return 1
    let lw = info.fields.LayerWidth[l]
    let lh = info.fields.LayerHeight[l]
    for (let x = 0; x < lw; x++) {
      for (let y = 0; y < lh; y++) {
        let tile = this.layers[l].map[x + y * lw]
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
