
const m = require('mithril')
const vent = require('postal').channel()
const Scrollbars = require('../scrollbars')

class AnimPanel {
  constructor () {
    this.showMask = m.prop(false)
  }

  toggleMask () {
    let show = !this.showMask()
    this.showMask(show)
    vent.publish('panel.anim', {
      showMask: show
    })
  }

  addScrollbars (node, isInitialized) {
    if (isInitialized) return
    this.scrollbars = new Scrollbars({
      element: node,
      revealDistance: 64
    })
    this.scrollbars.contentWidth = 13 * 32
    this.scrollbars.contentHeight = 4 * 32
    this.scrollbars.update()

    vent.subscribe('panel.resize', () => this.scrollbars.update())
  }

  configCanvas (canvas, isInitialized) {
    if (isInitialized) return

    vent.subscribe('panel.resize', () => {
      canvas.width = canvas.parentNode.offsetWidth
      canvas.height = canvas.parentNode.offsetHeight
      vent.publish('panel.anim.redraw')
    })
  }

  view ({fluid, config}) {
    return m('#animpanel.panel', {class: fluid ? 'flexfluid' : '', config}, [
      m('.toolbar', [
        m('strong.flexfluid', 'Animations'),

        m('button', {title: 'Toggle tile mask', onclick: this.toggleMask.bind(this), class: this.showMask() ? 'selected' : ''}, 'Mask')
      ]),
      m('.panelcontent', m('.canvaswrapper', {config: this.addScrollbars}, m('canvas', {config: this.configCanvas})))
    ])
  }
}

module.exports = AnimPanel
