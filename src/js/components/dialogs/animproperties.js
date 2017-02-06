
const m = require('mithril')
const Dialog = require('../dialog')
const vent = require('../../vent')
const app = require('../../app')
const toggler = require('../misc').toggler

function clamp (n, min, max) {
  return Math.max(min, Math.min(n, max))
}

function reset (p, animId) {
  let a = app.j2l.anims[animId]
  if (!a) return
  p.speed = a.speed
  p.pingPong = a.pingPong
  p.pingPongWait = a.pingPongWait
  p.frameWait = a.frameWait
  p.randomWait = a.randomWait
}

function boolInput (label, name, checked, {disabled} = {}) {
  return m(toggler, {
    name,
    checked: !!checked,
    disabled: !!disabled
  }, label)
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

function rangeInput (name, value, min, max, {disabled, style, step = 1} = {}) {
  return [
    m('input', {
      name,
      type: 'range',
      value,
      disabled: !!disabled,
      min,
      max,
      step,
      style
    }),
    m('input', {
      name,
      type: 'number',
      value,
      disabled: !!disabled,
      min,
      max,
      step,
      size: 5,
      pattern: '\\d*'
    })
  ]
}

const AnimPropertiesDialog = {
  oninit ({state}) {
    state.dialog = {
      onclose: (e) => {
        let val = state.dialog.dom.returnValue
        if (val !== 'ok') {
          return
        }
        let p = state.prefs
        let animId = state.animId
        let a = app.j2l.anims[animId]

        a.speed = +p.speed
        a.pingPong = !!p.pingPong
        a.pingPongWait = +p.pingPongWait
        a.frameWait = +p.frameWait
        a.randomWait = +p.randomWait
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
        o[key] = value

        // console.log(ev, type, name, value)
      }
    }
    state.animId = 0
    state.prefs = {}
  },
  oncreate ({dom, state}) {
    console.log('create')
    vent.subscribe('animpanel.openproperties', (ev, animId) => {
      state.animId = animId
      reset(state.prefs, state.animId)
      m.redraw()
      state.dialog.showModal()
    })
  },
  view ({state}) {
    return m(Dialog, state.dialog, [
      m('.title', 'Animation Properties'),
      m('table.content', {style: {width: '100%', borderSpacing: '5px', borderCollapse: 'separate'}}, [
        m('tr', [
          m('td.textright', 'Speed'),
          m('td', {colspan: 2}, rangeInput('speed', state.prefs.speed, 0, 255, {style: {width: '256px'}}))
        ]),
        m('tr', [
          m('td.textright', 'Frame Wait'),
          m('td', {width: 200}, m('.flexwrapper', integerInput('frameWait', state.prefs.frameWait, {min: 0, max: 65535})))
        ]),
        m('tr', [
          m('td.textright', 'Random Wait'),
          m('td', m('.flexwrapper', integerInput('randomWait', state.prefs.randomWait, {min: 0, max: 65535})))
        ]),
        m('tr', [
          m('td.textright', 'Ping Pong Wait'),
          m('td', m('.flexwrapper', integerInput('pingPongWait', state.prefs.pingPongWait, {min: 0, max: 65535, disabled: !state.prefs.pingPong}))),
          m('td', boolInput('Ping Pong', 'pingPong', state.prefs.pingPong))
        ])
      ]),
      m('.buttons.center', [
        m('button', {type: 'submit', value: 'ok', autofocus: true}, 'OK'),
        ' ',
        m('button', {type: 'button', onclick: state.dialog.close}, 'Cancel')
      ])
    ])
  }
}

module.exports = AnimPropertiesDialog
