
const m = require('mithril')
const vent = require('postal').channel()

class Panels {
  constructor (columns) {
    this.columns = columns

    let startPos = 0
    let startHeight = 0
    let resizingPanel = null
    let resizingColumn = null

    vent.subscribe('window.mousedown', (e) => {
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
      resizeState.toolbarsHeight = toolbarsHeight*/
    })

    vent.subscribe('window.mousemove', (e) => {
      if (!resizingPanel) return
      let y = e.pageY
      let offset = startPos - y
      let maxLimit = this.panelsEl.offsetHeight - resizingColumn.panels.length * 20
      let newHeight = Math.min(Math.max(startHeight + offset, 0), maxLimit)

      resizingPanel.el.lastChild.style.height = newHeight + 'px'

      vent.publish('panel.resize')
    })

    vent.subscribe('window.mouseup', (e) => {
      resizingPanel = false
    })
  }

  renderPanels (el) {
    this.panelsEl = el
  }

  renderColumn (column) {
    return (el, isInitialized, context, vdom) => {
      column.el = el
    }
  }

  renderPanel (column, panel) {
    return (el, isInitialized, context, vdom) => {
      panel.el = el
      if (panel.panel.configPanel) panel.panel.configPanel(el)
    }
  }

  view () {
    return m('.panels', {config: this.renderPanels.bind(this)}, this.columns.map(column => {
      return m('.column', {class: column.fluid ? 'flexfluid' : '', config: this.renderColumn(column)}, column.panels.map(panel => {
        return panel.panel.view({fluid: panel.fluid, config: this.renderPanel(column, panel)})
      }))
    }))
  }
}

module.exports = Panels
