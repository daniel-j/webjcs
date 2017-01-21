
const m = require('mithril')
const Dialog = require('../dialog')
const vent = require('../../vent')
const settings = require('../../settings')

function resetPreferences (prefs) {
  for (let key in prefs) {
    prefs[key] = settings.get(key)
  }
}

function checkbox (label, prefs, key) {
  return m('label', 'Disable WebGL', m('input', {type: 'checkbox', checked: prefs[key], onchange: m.withAttr('checked', (val) => { prefs[key] = val })}))
}

const PreferencesDialog = {
  oninit ({state}) {
    state.dialog = {
      onclose: (e) => {
        let val = state.dialog.dom.returnValue
        console.log(val, typeof val)
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
      m('div', [
        m('div', checkbox('Disable WebGL', state.prefs, 'disable_webgl')),
        m('label', 'Search paths'),
        state.prefs.paths.map((v, i, a) => {
          return m('div', m('input', {value: v, oninput: m.withAttr('value', (v) => { a[i] = v })}))
        }),
        m('button', {type: 'button', onclick: () => state.prefs.paths.push('')}, 'Add')
      ]),
      m('.buttons.center', [
        m('button', {type: 'submit', value: 'ok'}, 'OK'),
        ' ',
        m('button', {type: 'submit', value: 'close', autofocus: true}, 'Cancel')
      ])
    ])
  }
}

module.exports = PreferencesDialog
