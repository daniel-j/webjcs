
const vent = require('../vent')
const EventEmitter = require('events').EventEmitter

class Drag extends EventEmitter {
  constructor (dom, noMouseDown = false, noMouseUp = false) {
    super()
    this.dom = dom
    this.active = false
    if (!noMouseDown) dom.addEventListener('mousedown', (e) => this.mousedown(e), false)
    if (!noMouseUp) vent.subscribe('window.mouseup', (ev, e) => this.mouseup(e), false)
    vent.subscribe('window.mousemove', (ev, e) => this.mousemove(e), false)
    this.x = 0
    this.y = 0
    this.lastX = 0
    this.lastY = 0
  }
  mousedown (e) {
    if (e.which !== 1) return
    this.active = true
    // e.preventDefault && e.preventDefault()
    this.lastX = e.pageX
    this.lastY = e.pageY
    this.start()
  }
  start () {
    this.active = true
    let rect = this.dom.getBoundingClientRect()
    let x = this.lastX - rect.left
    let y = this.lastY - rect.top
    this.x = x
    this.y = y
    this.emit('start', x, y)
  }
  mouseup (e) {
    this.stop()
  }
  stop () {
    if (this.active) {
      this.emit('stop')
    }
    this.active = false
  }
  mousemove (e) {
    this.lastX = e.pageX
    this.lastY = e.pageY
    if (!this.active) return
    let rect = this.dom.getBoundingClientRect()
    let x = e.pageX - rect.left
    let y = e.pageY - rect.top
    this.x = x
    this.y = y
    this.emit('move', x, y)
  }
}
module.exports = Drag