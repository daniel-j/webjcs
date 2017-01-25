
const m = require('mithril')
const Dialog = require('../dialog')
const vent = require('../../vent')
const app = require('../../app')
const toggler = require('../misc').toggler

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

function boolInput (label, prefs, key, {disabled} = {}) {
  return m(toggler, {
    checked: !!prefs[key],
    disabled: !!disabled,
    onchange: m.withAttr('checked', (val) => { prefs[key] = val }),
    style: {width: '100%'}
  }, label)
}
function floatInput (prefs, key, {min = -Infinity, max = Infinity, disabled, style} = {}) {
  return m('input.flexfluid', {
    type: 'text',
    size: 10,
    required: true,
    pattern: '-?\\d*?.?\\d*?',
    value: prefs[key],
    disabled: !!disabled,
    oninput: m.withAttr('value', (val) => { prefs[key] = val }),
    onchange: () => {
      prefs[key] = Math.min(max, Math.max(min, parseFloat(prefs[key])))
      if (!isFinite(prefs[key])) prefs[key] = ''
    },
    style
  })
}
function integerInput (prefs, key, {min, max, disabled, style} = {}) {
  return m('input.flexfluid', {
    type: 'number',
    size: 10,
    step: 1,
    min,
    max,
    required: true,
    pattern: '\\d*',
    value: prefs[key],
    disabled: !!disabled,
    oninput: m.withAttr('value', (val) => { prefs[key] = val }),
    style
  })
}
function selectInput (prefs, key, items, {disabled, style} = {}) {
  return m('select.flexfluid', {
    value: prefs[key],
    disabled: !!disabled,
    onchange: m.withAttr('value', (val) => { prefs[key] = val }),
    style
  }, items.map((item, value) => {
    return m('option', {value}, item)
  }))
}
function colorInput (prefs, key, {disabled, style} = {}) {
  return m('input', {
    type: 'color',
    value: rgb2hex(prefs[key]),
    disabled: disabled,
    oninput: m.withAttr('value', (val) => { prefs[key] = hex2rgb(val) }),
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
          m('td.textright', 'X-Speed'),
          m('td', {width: 120}, m('.flexwrapper', floatInput(state.prefs, 'speedX', {min: -32768, max: 32768, disabled: state.currentLayer === 3}))),
          m('td.textright', 'Auto X-Speed'),
          m('td', {width: 120}, m('.flexwrapper', floatInput(state.prefs, 'autoSpeedX', {min: -32768, max: 32768, disabled: state.currentLayer === 3})))
        ]),
        m('tr', [
          m('td.textright', 'Y-Speed'),
          m('td', m('.flexwrapper', floatInput(state.prefs, 'speedY', {min: -32768, max: 32768, disabled: state.currentLayer === 3}))),
          m('td.textright', 'Auto Y-Speed'),
          m('td', m('.flexwrapper', floatInput(state.prefs, 'autoSpeedY', {min: -32768, max: 32768, disabled: state.currentLayer === 3})))
        ]),
        m('tr', [
          m('td.textright', 'Width'),
          m('td', m('.flexwrapper', integerInput(state.prefs, 'layerWidth', {min: 1, max: 1023}))),
          m('td.textright', 'Height'),
          m('td', m('.flexwrapper', integerInput(state.prefs, 'layerHeight', {min: 1, max: 1023})))
        ]),
        m('tr', [
          m('td', {colspan: 2}, boolInput('Tile Width', state.prefs, 'tileWidth')),
          m('td', {colspan: 2}, boolInput('Tile Height', state.prefs, 'tileHeight'))
        ]),
        m('tr', [
          m('td', {colspan: 4}, boolInput('Limit Visible Region', state.prefs, 'limitVisibleRegion'))
        ]),
        m('tr', [
          m('td', {colspan: 4}, boolInput('Texture mode', state.prefs, 'textureMode'))
        ]),
        m('tr', [
          m('td.textright', 'Texture type '),
          m('td', m('.flexwrapper', selectInput(state.prefs, 'textureType', ['Warp Horizon', 'Tunnel', 'Menu', 'Tile Menu'], {disabled: !state.prefs.textureMode}))),
            // integerInput(state.prefs, 'textureType', {min: 0, maz: 255, disabled: !state.prefs.textureMode, style: {margin: '0 10px'}}),
          +state.prefs.textureType < 2 ? [
            m('td.textright', 'Fade Color'),
            m('td', colorInput(state.prefs, 'textureParams', {disabled: !state.prefs.textureMode, style: {marginLeft: '5px'}}))
          ] : null
        ]),
        +state.prefs.textureType === 2 ? m('tr', m('td', {colspan: 4}, m('.flexwrapper.alignitemscenter', [
          'Palrow 16',
          integerInput(state.prefs.textureParams, 0, {disabled: !state.prefs.textureMode, min: 0, max: 255, style: {margin: '0 5px'}}),
          'Palrow 32',
          integerInput(state.prefs.textureParams, 1, {disabled: !state.prefs.textureMode, min: 0, max: 255, style: {margin: '0 5px'}}),
          'Palrow 256',
          integerInput(state.prefs.textureParams, 2, {disabled: !state.prefs.textureMode, min: 0, max: 255, style: {marginLeft: '5px'}})
        ]))) : null,
        +state.prefs.textureType < 3 ? m('tr', [
          m('td', {colspan: 4}, boolInput(['Parallaxing stars', 'Spiral', 'Reverse gradients'][state.prefs.textureType], state.prefs, 'parallaxStars'))
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
