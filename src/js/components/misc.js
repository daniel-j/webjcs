
const m = require('mithril')
require('../../style/toggler.css')

module.exports.toggler = {
  view ({attrs, children}) {
    return m('label.toggler', [
      m('input', Object.assign({
        type: 'checkbox',
        style: {}
      }, attrs)),
      m('a'),
      children ? m('span', children) : null
    ])
  }
}
