const m = require('mithril')
const Dialog = require('./dialog')
const vent = require('../vent')

const AboutDialog = {
  oninit ({state}) {
    state.dialog = {
      onclose: () => {},
      oncancel: () => {}
    }
  },
  oncreate ({dom, state}) {
    vent.subscribe('menuclick.openabout', () => state.dialog.showModal())
  },
  view ({state}) {
    return m(Dialog, state.dialog, [
      m('h1', 'About'),
      m('br'),
      m('input', {type: 'submit', value: 'close'}, 'Close')
    ])
  }
}

module.exports = AboutDialog
