
const m = require('mithril')
const vent = require('../vent')
require('../../style/menu.css')

const screenfull = require('screenfull')

const mainMenu = require('../menus/main-menu')

const isMacOS = navigator.platform.includes('Mac')

function click (menuItem) {
  if (menuItem.href) {
    // ...
  }
  if (menuItem.command) {
    vent.publish('menuclick.' + menuItem.command)
  }
}

const Menu = {
  oninit ({state}) {
    state.currentItem = null
    state.menuEl = null
    state.accelerators = {}
  },
  oncreate ({state, dom}) {
    state.menuEl = dom
    vent.subscribe('window.mousedown', (ev, e) => {
      let t = e.target
      while (t !== document.body) {
        if (t.parentNode === dom) {
          return
        }
        t = t.parentNode
      }
      state.currentItem = null
      m.redraw()
    })
    vent.subscribe('window.blur', () => {
      if (state.currentItem) {
        state.currentItem = null
        m.redraw()
      }
    })
    vent.subscribe('window.keydown', (ev, {e, key, accel, hasActiveElement, modalOpen}) => {
      let menuItem = state.accelerators[accel]
      if (!menuItem) console.log(accel)
      if (!menuItem || (hasActiveElement && menuItem && menuItem.hasActiveElement === false)) return
      e.preventDefault()
      if (modalOpen) return
      console.log(accel, menuItem.command)
      state.clickItem(menuItem, state)
    })
  },

  build (list, state, level = 0, selected) {
    if (!list) return null
    return m('ul', {class: [selected ? 'selected' : ''].join(' ')}, list.map((item) => {
      if (item.electronOnly) return null
      if (item.label) {
        let label = item.label.replace(/&(.)/g, '<u>$1</u>')
        let accel = item.accelerator
        if (accel) {
          state.accelerators[accel.replace('CmdOrCtrl', isMacOS ? 'Meta' : 'Ctrl')] = item
          accel = accel.replace('CmdOrCtrl', isMacOS ? '⌘' : 'Ctrl')
          if (isMacOS) {
            accel = accel.replace('Shift', '⇧')
            accel = accel.replace(/\+/g, ' ')
          }
        }
        return m(
          'li', {
            class: [item === state.currentItem ? 'selected' : ''].join(' ')
          },
          m(
            'a.label', {
              onclick: Menu.clickHandler.bind(null, item, level, state),
              onmouseover: Menu.mouseOver.bind(null, item, level, state),
              href: item.href,
              target: item.href && '_blank'
            },
            m.trust(label),
            accel && m('.accelerator', accel)
          ),
          Menu.build(item.submenu, state, level + 1, item === state.currentItem)
        )
      } else if (item.type === 'separator') {
        return m('li.separator')
      }
    }))
  },

  clickHandler (item, level, state) {
    if (level === 0) {
      if (item === state.currentItem) {
        state.currentItem = null
      } else {
        state.currentItem = item
      }
    }
    state.clickItem(item, state)
  },

  clickItem (item, state) {
    if (item.click) {
      state.currentItem = null
      setTimeout(() => click(item), 20)
    }
    if (item.role === 'togglefullscreen') {
      state.currentItem = null
      if (screenfull.enabled) {
        setTimeout(() => screenfull.toggle(), 20)
      }
    }
  },

  mouseOver (item, level, state) {
    if (level === 0) {
      if (state.currentItem) {
        state.currentItem = item
      }
    }
  },

  toggle (newItem, oldItem) {

  },

  view ({children, state}) {
    state.accelerators = {}
    return [
      m('#menu', Menu.build(mainMenu, state)),
      children
    ]
  }
}

module.exports = Menu
