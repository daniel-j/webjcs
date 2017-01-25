
const m = require('mithril')
const Dialog = require('../dialog')
const vent = require('../../vent')
const settings = require('../../settings')
const toggler = require('../misc').toggler

function resetPreferences (prefs) {
  for (let key in prefs) {
    prefs[key] = settings.get(key)
  }
}

function boolInput (label, prefs, key, {disabled} = {}) {
  return m(toggler, {
    checked: !!prefs[key],
    disabled: !!disabled,
    onchange: m.withAttr('checked', (val) => { prefs[key] = val }),
    style: {width: '100%'}
  }, label)
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
      }
    }
    state.prefs = {
      disable_webgl: settings.get('disable_webgl'),
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
        m('div', boolInput('Disable WebGL', state.prefs, 'disable_webgl')),
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
