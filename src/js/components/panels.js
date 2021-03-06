
const m = require('mithril')
const vent = require('../vent')

class Panels {
  oninit (vnode) {
    this.columns = vnode.attrs.columns
    this.activePanel = null

    let startPos = 0
    let startHeight = 0
    let resizingPanel = null
    let resizingColumn = null

    vent.subscribe('window.mousedown', (ev, e) => {
      // find out if the event occurs on a toolbar drag-handle
      if (!e.target.parentNode.classList.contains('toolbar') || e.target.parentNode.firstChild !== e.target) return

      let panelEl = e.target.parentNode.parentNode

      let found = false
      let column
      let panel
      for (let i = 0; i < this.columns.length && !found; i++) {
        column = this.columns[i]
        if (!column.el) return
        for (let j = 1; j < column.panels.length; j++) {
          panel = column.panels[j]
          if (!panel.el) return
          if (panelEl === panel.el) {
            found = true
            break
          }
        }
      }
      if (!found) return

      startPos = e.pageY
      startHeight = panel.el.lastChild.offsetHeight
      resizingPanel = panel
      resizingColumn = column

      // let columnBox = column.el.getBoundingClientRect()
      // let panelBox = panel.el.getBoundingClientRect()

      // console.log(panelBox, columnBox)

      /*
      let column = panel.parentNode.parentNode
      let panels = column.querySelectorAll('.panel')
      let toolbars = column.querySelectorAll('.toolbar')
      let toolbarsHeight = toolbars.length * toolbars[0].offsetHeight

      resizeState.panels = panels
      resizeState.panel = panel
      resizeState.startPos = e.pageY
      resizeState.startHeight = panel.lastChild.offsetHeight
      resizeState.column = column
      resizeState.toolbarsHeight = toolbarsHeight
      */
    })

    vent.subscribe('window.mousemove', (ev, e) => {
      if (!resizingPanel) return
      let y = e.pageY
      let offset = startPos - y
      let maxLimit = this.panelsEl.offsetHeight - resizingColumn.panels.length * 24
      let newHeight = Math.min(Math.max(startHeight + offset, 0), maxLimit)

      resizingPanel.el.lastChild.style.height = newHeight + 'px'

      vent.publish('panel.resize')
    })

    vent.subscribe('window.mouseup', (ev, e) => {
      resizingPanel = false
    })

    vent.subscribe('panel.active', (ev, panel) => {
      this.activePanel = panel
      m.redraw()
    })
  }

  renderPanels (vnode) {
    this.panelsEl = vnode.dom
  }

  renderColumn (column) {
    return (vnode) => {
      column.el = vnode.dom
    }
  }

  renderPanel (column, panel) {
    return (vnode) => {
      panel.el = vnode.dom
      if (panel.panel.configPanel) panel.panel.configPanel(vnode)
    }
  }

  view (vnode) {
    return m('.panels', {oncreate: this.renderPanels.bind(this)}, this.columns.map(column => {
      return m('.column', {class: column.fluid ? 'flexfluid' : '', oncreate: this.renderColumn(column)}, column.panels.map(panel => {
        return panel.panel.view({fluid: panel.fluid, oncreate: this.renderPanel(column, panel), active: panel.panel === this.activePanel})
      }))
    }))
  }
}

module.exports = new Panels()
