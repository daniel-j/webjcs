// heavily inspired by https://github.com/deskjet/chiptune2.js

const Module = require('../lib/libopenmpt.js')

// player
class ModPlayer {

  constructor (config = {repeatCount: -1}) {
    this.config = config
    this.context = config.context || new AudioContext()
    this.currentPlayingNode = null
    this.handlers = []
    this.initialized = false
  }

  // event handlers section
  fireEvent (eventName, response) {
    let handlers = this.handlers
    if (handlers.length) {
      handlers.forEach(function (handler) {
        if (handler.eventName === eventName) {
          handler.handler(response)
        }
      })
    }
  }

  addHandler (eventName, handler) {
    this.handlers.push({eventName: eventName, handler: handler})
  }

  onEnded (handler) {
    this.addHandler('onEnded', handler)
  }

  onError (handler) {
    this.addHandler('onError', handler)
  }

  // metadata
  duration () {
    return Module._openmpt_module_get_duration_seconds(this.currentPlayingNode.modulePtr)
  }

  metadata () {
    let data = {}
    let keys = Module.Pointer_stringify(Module._openmpt_module_get_metadata_keys(this.currentPlayingNode.modulePtr)).split(';')
    for (let i = 0; i < keys.length; i++) {
      let keyNameBuffer = Module._malloc(keys[i].length + 1)
      Module.writeStringToMemory(keys[i], keyNameBuffer)
      data[keys[i]] = Module.Pointer_stringify(Module._openmpt_module_get_metadata(this.currentPlayingNode.modulePtr, keyNameBuffer))
      Module._free(keyNameBuffer)
    }
    return data
  }

  // playing, etc
  load (input, callback) {
    var player = this
    if (input instanceof File) {
      var reader = new FileReader()
      reader.onload = function () {
        return callback(reader.result) // no error
      }
      reader.readAsArrayBuffer(input)
    } else {
      var xhr = new XMLHttpRequest()
      xhr.open('GET', input, true)
      xhr.responseType = 'arraybuffer'
      xhr.onload = function (e) {
        if (xhr.status === 200) {
          return callback(xhr.response) // no error
        } else {
          player.fireEvent('onError', {type: 'onxhr'})
        }
      }
      xhr.onerror = function () {
        player.fireEvent('onError', {type: 'onxhr'})
      }
      xhr.onabort = function () {
        player.fireEvent('onError', {type: 'onxhr'})
      }
      xhr.send()
    }
  }

  play (buffer) {
    this.stop()
    let processNode = this.createLibopenmptNode(buffer, this.config)
    if (processNode == null) {
      return
    }

    // set config options on module
    Module._openmpt_module_set_repeat_count(processNode.modulePtr, this.config.repeatCount)

    this.currentPlayingNode = processNode
    processNode.connect(this.context.destination)
  }

  stop () {
    if (this.currentPlayingNode != null) {
      this.currentPlayingNode.disconnect()
      this.currentPlayingNode.cleanup()
      this.currentPlayingNode = null
    }
  }

  togglePause () {
    if (this.currentPlayingNode != null) {
      this.currentPlayingNode.togglePause()
    }
  }

  createLibopenmptNode (buffer, config) {
    // TODO error checking in this whole function

    let maxFramesPerChunk = 4096
    let processNode = this.context.createScriptProcessor(maxFramesPerChunk, 0, 2)
    processNode.config = config
    processNode.player = this
    let byteArray = new Int8Array(buffer)
    let ptrToFile = Module._malloc(byteArray.byteLength)
    Module.HEAPU8.set(byteArray, ptrToFile)
    processNode.modulePtr = Module._openmpt_module_create_from_memory(ptrToFile, byteArray.byteLength, 0, 0, 0)
    processNode.paused = false
    processNode.leftBufferPtr = Module._malloc(4 * maxFramesPerChunk)
    processNode.rightBufferPtr = Module._malloc(4 * maxFramesPerChunk)
    processNode.cleanup = function () {
      if (this.modulePtr !== 0) {
        Module._openmpt_module_destroy(this.modulePtr)
        this.modulePtr = 0
      }
      if (this.leftBufferPtr !== 0) {
        Module._free(this.leftBufferPtr)
        this.leftBufferPtr = 0
      }
      if (this.rightBufferPtr !== 0) {
        Module._free(this.rightBufferPtr)
        this.rightBufferPtr = 0
      }
    }
    processNode.stop = function () {
      this.disconnect()
      this.cleanup()
    }
    processNode.pause = function () {
      this.paused = true
    }
    processNode.unpause = function () {
      this.paused = false
    }
    processNode.togglePause = function () {
      this.paused = !this.paused
    }
    processNode.onaudioprocess = function (e) {
      let outputL = e.outputBuffer.getChannelData(0)
      let outputR = e.outputBuffer.getChannelData(1)
      let framesToRender = outputL.length
      if (this.ModulePtr === 0) {
        for (let i = 0; i < framesToRender; ++i) {
          outputL[i] = 0
          outputR[i] = 0
        }
        this.disconnect()
        this.cleanup()
        return
      }
      if (this.paused) {
        for (let i = 0; i < framesToRender; ++i) {
          outputL[i] = 0
          outputR[i] = 0
        }
        return
      }
      let framesRendered = 0
      let ended = false
      let error = false
      while (framesToRender > 0) {
        let framesPerChunk = Math.min(framesToRender, maxFramesPerChunk)
        let actualFramesPerChunk = Module._openmpt_module_read_float_stereo(this.modulePtr, this.context.sampleRate, framesPerChunk, this.leftBufferPtr, this.rightBufferPtr)
        if (actualFramesPerChunk === 0) {
          ended = true
          // modulePtr will be 0 on openmpt: error: openmpt_module_read_float_stereo: ERROR: module * not valid or other openmpt error
          error = !this.modulePtr
        }
        let rawAudioLeft = Module.HEAPF32.subarray(this.leftBufferPtr / 4, this.leftBufferPtr / 4 + actualFramesPerChunk)
        let rawAudioRight = Module.HEAPF32.subarray(this.rightBufferPtr / 4, this.rightBufferPtr / 4 + actualFramesPerChunk)
        for (let i = 0; i < actualFramesPerChunk; ++i) {
          outputL[framesRendered + i] = rawAudioLeft[i]
          outputR[framesRendered + i] = rawAudioRight[i]
        }
        for (let i = actualFramesPerChunk; i < framesPerChunk; ++i) {
          outputL[framesRendered + i] = 0
          outputR[framesRendered + i] = 0
        }
        framesToRender -= framesPerChunk
        framesRendered += framesPerChunk
      }
      if (ended) {
        this.disconnect()
        this.cleanup()
        error ? processNode.player.fireEvent('onError', {type: 'openmpt'}) : processNode.player.fireEvent('onEnded')
      }
    }
    return processNode
  }
}

ModPlayer.initialized = false
Module.onRuntimeInitialized = () => {
  ModPlayer.initialized = true
}

module.exports = ModPlayer
