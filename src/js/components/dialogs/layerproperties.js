
const m = require('mithril')
const Dialog = require('../dialog')
const vent = require('../../vent')
const app = require('../../app')
const toggler = require('../misc').toggler

function clamp (n, min, max) {
  return Math.max(min, Math.min(n, max))
}

function reset (p, l) {
  if (!app.j2l.levelInfo) return
  let f = app.j2l.levelInfo.fields
  p.offsetX = f.LayerXOffset[l] / (32 * 65536)
  p.offsetY = f.LayerYOffset[l] / (32 * 65536)
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

function boolInput (label, name, checked, {disabled} = {}) {
  return m(toggler, {
    name,
    checked: !!checked,
    disabled: !!disabled
  }, label)
}
function floatInput (name, value, {min = -Infinity, max = Infinity, disabled, style} = {}) {
  return m('input.flexfluid', {
    type: 'text',
    name,
    size: 10,
    min,
    max,
    required: true,
    pattern: '-?\\d*?.?\\d*?',
    value,
    disabled: !!disabled,
    style
  })
}
function integerInput (name, value, {min, max, disabled, style} = {}) {
  return m('input.flexfluid', {
    type: 'number',
    name,
    size: 10,
    step: 1,
    min,
    max,
    required: true,
    pattern: '\\d*',
    value,
    disabled: !!disabled,
    style
  })
}
function selectInput (name, value, items, {disabled, style} = {}) {
  return m('select.flexfluid', {
    name,
    value,
    disabled: !!disabled,
    style
  }, items.map((item, value) => {
    return m('option', {value}, item)
  }))
}
function colorInput (name, value, {disabled, style} = {}) {
  return m('input', {
    name,
    type: 'color',
    value: rgb2hex(value),
    disabled: disabled,
    style
  })
}

const LayerPropertiesDialog = {
  oninit ({state}) {
    state.dialog = {
      onclose: (e) => {
        let val = state.dialog.dom.returnValue
        if (val !== 'ok') {
          return
        }
        // console.log('Applying layer properties...')
        let p = state.prefs
        let l = state.currentLayer
        let f = app.j2l.levelInfo.fields
        p.layerWidth = clamp(parseInt(p.layerWidth), 1, 1023)
        p.layerHeight = clamp(parseInt(p.layerHeight), 1, 1023)
        if (p.layerWidth !== f.LayerWidth[l] || p.layerHeight !== f.LayerHeight[l]) {
          if (p.layerWidth < f.LayerWidth[l] || p.layerHeight < f.LayerHeight[l]) {
            if (!confirm('Are you sure you want to shrink the layer?')) {
              state.dialog.showModal()
              return
            }
          }
          vent.publish('layer.resize', [this.currentLayer, p.layerWidth, p.layerHeight])
        }
        f.LayerXOffset[l] = clamp(p.offsetX, -1024, 1023) * 65536 * 32
        f.LayerYOffset[l] = clamp(p.offsetY, -1024, 1023) * 65536 * 32
        f.LayerXSpeed[l] = clamp(p.speedX, -32768, 32767) * 65536
        f.LayerYSpeed[l] = clamp(p.speedY, -32768, 32767) * 65536
        f.LayerAutoXSpeed[l] = clamp(p.autoSpeedX, -32768, 32767) * 65536
        f.LayerAutoYSpeed[l] = clamp(p.autoSpeedY, -32768, 32767) * 65536

        // clear lower 5 bits and then set the new bits
        f.LayerMiscProperties[l] &= -1 << 5
        f.LayerMiscProperties[l] |= (p.parallaxStars << 4) | (p.textureMode << 3) | (p.limitVisibleRegion << 2) | (p.tileHeight << 1) | (p.tileWidth << 0)
        f.LayerTextureMode[l] = p.textureType
        f.LayerTextureParams[l * 3] = p.textureParams[0]
        f.LayerTextureParams[l * 3 + 1] = p.textureParams[1]
        f.LayerTextureParams[l * 3 + 2] = p.textureParams[2]

        vent.publish('layer.refresh')
      },
      onValueChange (e, ev, type, name, value) {
        let t = e.target
        let p = state.prefs
        let parts = name.split('.')
        let o = p
        let i = 0
        while (i < parts.length - 1) {
          o = o[parts[i]]
          i++
        }
        let key = parts[i]
        name = parts[0]
        type = t.dataset.type || type
        if (type === 'color') {
          value = hex2rgb(value)
        }
        o[key] = value

        // console.log(ev, type, name, value)
      }
    }
    state.currentLayer = 3
    state.prefs = {}
    reset(state.prefs, state.currentLayer)
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
      m('table.content', {style: {width: '100%', borderSpacing: '5px', borderCollapse: 'separate'}}, [
        m('tr', [
          m('td.textright', 'X-Offset'),
          m('td', {width: 120}, m('.flexwrapper', floatInput('offsetX', state.prefs.offsetX, {min: -1024, max: 1023, disabled: state.currentLayer === 3}))),
          m('td.textright', 'X-Speed'),
          m('td', {width: 120}, m('.flexwrapper', floatInput('speedX', state.prefs.speedX, {min: -32768, max: 32768, disabled: state.currentLayer === 3}))),
          m('td.textright', 'Auto X-Speed'),
          m('td', {width: 120}, m('.flexwrapper', floatInput('autoSpeedX', state.prefs.autoSpeedX, {min: -32768, max: 32768, disabled: state.currentLayer === 3})))
        ]),
        m('tr', [
          m('td.textright', 'Y-Offset'),
          m('td', m('.flexwrapper', floatInput('offsetY', state.prefs.offsetY, {min: -1024, max: 1023, disabled: state.currentLayer === 3}))),
          m('td.textright', 'Y-Speed'),
          m('td', m('.flexwrapper', floatInput('speedY', state.prefs.speedY, {min: -32768, max: 32768, disabled: state.currentLayer === 3}))),
          m('td.textright', 'Auto Y-Speed'),
          m('td', m('.flexwrapper', floatInput('autoSpeedY', state.prefs.autoSpeedY, {min: -32768, max: 32768, disabled: state.currentLayer === 3})))
        ]),
        m('tr', [
          m('td.textright', 'Width'),
          m('td', m('.flexwrapper', integerInput('layerWidth', state.prefs.layerWidth, {min: 1, max: 1023}))),
          m('td.textright', 'Height'),
          m('td', m('.flexwrapper', integerInput('layerHeight', state.prefs.layerHeight, {min: 1, max: 1023})))
        ]),
        m('tr', [
          m('td', {colspan: 2}, boolInput('Tile Width', 'tileWidth', state.prefs.tileWidth)),
          m('td', {colspan: 2}, boolInput('Tile Height', 'tileHeight', state.prefs.tileHeight)),
          m('td', {colspan: 2}, boolInput('Limit Visible Region', 'limitVisibleRegion', state.prefs.limitVisibleRegion))
        ]),
        m('tr', [
          m('td', {colspan: 6}, boolInput('Texture mode', 'textureMode', state.prefs.textureMode))
        ]),
        m('tr', [
          m('td.textright', 'Texture type '),
          m('td', m('.flexwrapper', selectInput('textureType', state.prefs.textureType, ['Warp Horizon', 'Tunnel', 'Menu', 'Tile Menu'], {disabled: !state.prefs.textureMode}))),
          +state.prefs.textureType < 2 ? [
            m('td.textright', {colspan: 2}, 'Fade Color'),
            m('td', {colspan: 2}, colorInput('textureParams', state.prefs.textureParams, {disabled: !state.prefs.textureMode, style: {marginLeft: '5px'}}))
          ] : null
        ]),
        +state.prefs.textureType === 2 ? m('tr', m('td', {colspan: 6}, m('.flexwrapper.alignitemscenter', [
          'Palrow 16',
          integerInput('textureParams.0', state.prefs.textureParams[0], {disabled: !state.prefs.textureMode, min: 0, max: 255, style: {margin: '0 5px'}}),
          'Palrow 32',
          integerInput('textureParams.1', state.prefs.textureParams[1], {disabled: !state.prefs.textureMode, min: 0, max: 255, style: {margin: '0 5px'}}),
          'Palrow 256',
          integerInput('textureParams.2', state.prefs.textureParams[2], {disabled: !state.prefs.textureMode, min: 0, max: 255, style: {marginLeft: '5px'}})
        ]))) : null,
        +state.prefs.textureType < 3 ? m('tr', [
          m('td', {colspan: 6}, boolInput(['Parallaxing stars', 'Spiral', 'Reverse gradients'][state.prefs.textureType], 'parallaxStars', state.prefs.parallaxStars, {disabled: !state.prefs.textureMode}))
        ]) : null
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
