
const m = require('mithril')
const dialogPolyfill = require('dialog-polyfill')
require('dialog-polyfill/dialog-polyfill.css')
require('../../style/dialog.css')

const Dialog = {
  oncreate ({attrs, state, dom}) {
    dialogPolyfill.registerDialog(dom)

    attrs.show = (modal = false) => {
      if (modal) {
        dom.showModal()
      } else {
        dom.show()
      }
      state.form.reset()
    }
    attrs.showModal = () => attrs.show(true)
    attrs.close = dom.close
  },
  view ({children, state, attrs}) {
    return m('dialog', {
      onclose: (e) => attrs.onclose(e),
      oncancel: (e) => attrs.oncancel(e)
    }, m('form', {
      method: 'dialog',
      oncreate: ({dom}) => { state.form = dom }
    }, children))
  }
}

module.exports = Dialog
