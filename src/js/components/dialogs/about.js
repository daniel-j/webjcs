
const m = require('mithril')
const Dialog = require('../dialog')
const vent = require('../../vent')

const AboutDialog = {
  oninit ({state}) {
    state.dialog = {
      onclose: (e, canceled) => {}
    }
  },
  oncreate ({dom, state}) {
    vent.subscribe('menuclick.openabout', () => state.dialog.showModal())
  },
  view ({state}) {
    return m(Dialog, state.dialog, [
      m('.title', 'About WebJCS v' + WEBJCS_VERSION),
      m('.flexwrapper.content', {style: {maxWidth: '600px'}}, [
        m('img', {src: 'media/icons/JCS.png', style: {marginRight: '10px'}}),
        m('.flexfluid', [
          m('div', 'The original Jazz Creation Station was created by ', m('a', {href: 'https://twitter.com/mvdleeuwgg', target: '_blank'}, 'Michiel van der Leeuw'), ' for ', m('a', {href: 'http://epicgames.com/', target: '_blank'}, 'Epic (Mega)Games'), ' during 1996-1998.'),
          m('div', 'WebJCS was created by ', m('a', {href: 'https://www.jazz2online.com/user/7540/djazz/', target: '_blank'}, 'djazz'), '. You can read more about this project and access the code on ', m('a', {href: 'https://github.com/daniel-j/webjcs', target: '_blank'}, 'Github'), '.')
        ])
      ]),
      m('.buttons.center', [
        m('button', {type: 'submit', value: 'close', autofocus: true}, 'Close')
      ])
    ])
  }
}

module.exports = AboutDialog
