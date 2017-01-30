
const m = require('mithril')
const Dialog = require('../dialog')
const vent = require('../../vent')
const settings = require('../../settings')

function resetPreferences (prefs) {
  for (let key in prefs) {
    prefs[key] = settings.get(key)
  }
}

function selectInput (name, value, items, {disabled, style} = {}) {
  return m('select.flexfluid', {
    name,
    value,
    disabled: !!disabled,
    style
  }, Object.keys(items).map((key) => {
    return m('option', {value: key}, items[key])
  }))
}

const PreferencesDialog = {
  oninit ({state}) {
    state.dialog = {
      onclose: (e) => {
        let val = state.dialog.dom.returnValue
        if (val !== 'ok') {
          resetPreferences(state.prefs)
          return
        }
        for (let key in state.prefs) {
          settings.set(key, state.prefs[key])
        }
      },
      onValueChange (e, ev, type, name, value) {
        let p = state.prefs
        let parts = name.split('.')
        let o = p
        let i = 0
        while (i < parts.length - 1) {
          o = o[parts[i]]
          i++
        }
        let key = parts[i]
        o[key] = value
      }
    }
    state.prefs = {
      renderer: settings.get('renderer'),
      paths: settings.get('paths')
    }
  },
  oncreate ({dom, state}) {
    vent.subscribe('menuclick.openpreferences', () => state.dialog.showModal())
  },
  view ({state}) {
    return m(Dialog, state.dialog, [
      m('.title', 'Preferences'),
      m('.content', [
        m('div', 'Renderer (requires restart): ', selectInput('renderer', state.prefs.renderer, {
          'canvas': '2D Canvas',
          'webgl': 'WebGL',
          'webgl-advanced': 'WebGL (advanced)'
        })),
        IS_ELECTRON ? [
          m('label', 'Search paths'),
          state.prefs.paths.map((v, i, a) => {
            return m('div', m('input', {value: v, oninput: m.withAttr('value', (v) => { a[i] = v })}))
          }),
          m('button', {type: 'button', onclick: () => state.prefs.paths.push('')}, 'Add')
        ] : null
      ]),
      m('.buttons.center', [
        m('button', {type: 'submit', value: 'ok', autofocus: true}, 'OK'),
        ' ',
        m('button', {type: 'submit', value: 'close'}, 'Cancel')
      ])
    ])
  }
}

module.exports = PreferencesDialog
