
const m = require('mithril')
const dialogPolyfill = require('dialog-polyfill')
require('dialog-polyfill/dialog-polyfill.css')
require('../../style/dialog.css')

const Dialog = {
  currentModal: null,

  oncreate ({attrs, state, dom}) {
    dialogPolyfill.registerDialog(dom)

    attrs.show = (modal = false) => {
      if (modal) {
        dom.showModal()
        Dialog.currentModal = dom
      } else {
        dom.show()
      }
    }
    attrs.showModal = () => attrs.show(true)
    attrs.close = (val) => dom.close(val)
    state.onValueChange = (e) => {
      let t = e.target
      if (e.type === 'input' && t.type.startsWith('select')) {
        e.redraw = false
        return
      }
      if (e.type === 'input' && t.type !== 'range') {
        e.redraw = false
      }
      let val = t.value
      if (t.type === 'checkbox') val = t.checked
      if (attrs.onValueChange) return attrs.onValueChange(e, e.type, t.type, t.name, val)
      else e.redraw = false
    }
    attrs.dom = dom
  },
  view ({children, state, attrs}) {
    return m('dialog', {
      onclose: (e) => {
        if (Dialog.currentModal === attrs.dom) {
          Dialog.currentModal = null
        }
        if (attrs.onclose) return attrs.onclose(e)
      },
      oncancel: (e) => { attrs.dom.returnValue = 'cancel' }
    }, m('form', {
      method: 'dialog',
      oncreate: ({dom}) => { state.form = attrs.form = dom },
      oninput: state.onValueChange,
      onchange: state.onValueChange
    }, children))
  }
}

module.exports = Dialog
