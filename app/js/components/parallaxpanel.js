
const m = require('mithril')
const postal = require('postal')

class ParallaxPanel {
  constructor () {
    this.showSprites = m.prop(false)
  }

  toggleSprites () {
    let show = !this.showSprites()
    this.showSprites(show)
  }

  view ({fluid, config}) {
    return m('#parallaxpanel.panel', {class: fluid ? 'flexfluid' : '', config}, [
      m('.toolbar', [
        m('strong.flexfluid', 'Parallax View'),

        m('button', {title: 'Toggle sprite rendering', onclick: this.toggleSprites.bind(this), class: this.showSprites() ? 'selected' : ''}, 'Sprites')
      ]),
      m('.panelcontent', m('.canvaswrapper', m('canvas')))
    ])
  }
}

module.exports = ParallaxPanel
