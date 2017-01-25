
const m = require('mithril')
const Dialog = require('../dialog')
const vent = require('../../vent')
const app = require('../../app')

function reset (p, l) {
  let f = app.j2l.levelInfo.fields
  p.speedX = f.LayerXSpeed[l] / 65536
  p.speedY = f.LayerYSpeed[l] / 65536
  p.autoSpeedX = f.LayerAutoXSpeed[l] / 65536
  p.autoSpeedY = f.LayerAutoYSpeed[l] / 65536
  p.layerWidth = f.LayerWidth[l]
  p.layerHeight = f.LayerHeight[l]
  let misc = f.LayerMiscProperties[l]
  p.tileWidth = misc & 1
  p.tileHeight = (misc >> 1) & 1
  p.limitVisibleRegion = (misc >> 2) & 1
  p.textureMode = (misc >> 3) & 1
  p.parallaxStars = (misc >> 4) & 1
  p.textureType = f.LayerTextureMode[l]
  p.textureParams = [
    f.LayerTextureParams[l * 3],
    f.LayerTextureParams[l * 3 + 1],
    f.LayerTextureParams[l * 3 + 2]
  ]
}

function rgb2hex (color) {
  if (!color) return undefined
  let s = '#'
  for (let i = 0; i < color.length; i++) {
    let hex = color[i].toString(16)
    if (hex.length < 2) hex = '0' + hex
    s += hex
  }
  return s
}
function hex2rgb (hex) {
  let components = hex.match(/^#(..)(..)(..)$/)
  return components.slice(1, 4).map((hex) => parseInt(hex, 16))
}

function checkbox (label, prefs, key) {
  return m('label', m('input', {type: 'checkbox', checked: !!prefs[key], onchange: m.withAttr('checked', (val) => { prefs[key] = val })}), label)
}
function floatInput (label, prefs, key, {min = -Infinity, max = Infinity}) {
  return m('label', label, m('input', {
    type: 'text',
    required: true,
    pattern: '-?\\d*?.?\\d*?',
    value: prefs[key],
    oninput: m.withAttr('value', (val) => { prefs[key] = val }),
    onchange: () => {
      prefs[key] = Math.min(max, Math.max(min, parseFloat(prefs[key])))
      if (!isFinite(prefs[key])) prefs[key] = ''
    }
  }))
}
function integerInput (label, prefs, key, {min, max}) {
  return m('label', label, m('input', {
    type: 'number',
    step: 1,
    min,
    max,
    required: true,
    pattern: '\\d*',
    value: prefs[key],
    oninput: m.withAttr('value', (val) => { prefs[key] = val })
  }))
}
function colorInput (label, prefs, key) {
  return m('label', label, m('input', {
    type: 'color',
    value: rgb2hex(prefs[key]),
    oninput: m.withAttr('value', (val) => { prefs[key] = hex2rgb(val) })
  }))
}

const LayerPropertiesDialog = {
  oninit ({state}) {
    state.dialog = {
      onclose: (e) => {
        let val = state.dialog.dom.returnValue
        if (val !== 'ok') {
          return
        }
        console.log('Applying layer properties...')
        let p = state.prefs
        let l = state.currentLayer
        let f = app.j2l.levelInfo.fields
        p.layerWidth = parseInt(p.layerWidth)
        p.layerHeight = parseInt(p.layerHeight)
        if (p.layerWidth !== f.LayerWidth[l] || p.layerHeight !== f.LayerHeight[l]) {
          if (p.layerWidth < f.LayerWidth[l] || p.layerHeight < f.LayerHeight[l]) {
            if (!confirm('Are you sure you want to shrink the layer?')) {
              state.dialog.showModal()
              return
            }
          }
          vent.publish('layer.resize', [this.currentLayer, p.layerWidth, p.layerHeight])
        }
        f.LayerXSpeed[l] = p.speedX * 65536
        f.LayerYSpeed[l] = p.speedY * 65536
        f.LayerAutoXSpeed[l] = p.autoSpeedX * 65536
        f.LayerAutoYSpeed[l] = p.autoSpeedY * 65536

        // clear lower 5 bits and then set the new bits
        f.LayerMiscProperties[l] &= -1 << 5
        f.LayerMiscProperties[l] |= (p.parallaxStars << 4) | (p.textureMode << 3) | (p.limitVisibleRegion << 2) | (p.tileHeight << 1) | (p.tileWidth << 0)
        f.LayerTextureMode[l] = p.textureType
        f.LayerTextureParams[l * 3] = p.textureParams[0]
        f.LayerTextureParams[l * 3 + 1] = p.textureParams[1]
        f.LayerTextureParams[l * 3 + 2] = p.textureParams[2]

        vent.publish('layer.refresh')
      }
    }
    state.currentLayer = 3
    state.prefs = {}
  },
  oncreate ({dom, state}) {
    vent.subscribe('layerpanel.openproperties', (ev, l) => {
      state.currentLayer = l
      reset(state.prefs, state.currentLayer)
      m.redraw()
      state.dialog.showModal()
    })
  },
  view ({state}) {
    return m(Dialog, state.dialog, [
      m('.title', 'Layer Properties for layer #' + (state.currentLayer + 1)),
      m('div', [
        floatInput('X-Speed', state.prefs, 'speedX', {min: -32768, max: 32768}),
        floatInput('Auto X-Speed', state.prefs, 'autoSpeedX', {min: -32768, max: 32768})
      ]),
      m('div', [
        floatInput('Y-Speed', state.prefs, 'speedY', {min: -32768, max: 32768}),
        floatInput('Auto Y-Speed', state.prefs, 'autoSpeedY', {min: -32768, max: 32768})
      ]),
      m('div', [
        integerInput('Width', state.prefs, 'layerWidth', {min: 1, max: 1023}),
        integerInput('Height', state.prefs, 'layerHeight', {min: 1, max: 1023})
      ]),
      m('div', [
        checkbox('Tile Width', state.prefs, 'tileWidth'),
        checkbox('Height', state.prefs, 'tileHeight')
      ]),
      m('div', [
        checkbox('Limit Visible Region', state.prefs, 'limitVisibleRegion')
      ]),
      m('div', [
        checkbox('Texture mode', state.prefs, 'textureMode')
      ]),
      m('div', [
        integerInput('Texture type', state.prefs, 'textureType', {min: 0, maz: 255}),
        colorInput('Fade color', state.prefs, 'textureParams')
      ]),
      m('div', [
        checkbox('Parallaxing stars background', state.prefs, 'parallaxStars')
      ]),
      m('.buttons.center', [
        m('button', {type: 'submit', value: 'ok', autofocus: true}, 'OK'),
        ' ',
        m('button', {type: 'button', onclick: state.dialog.close}, 'Cancel')
      ])
    ])
  }
}

module.exports = LayerPropertiesDialog
