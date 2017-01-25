
const vent = require('./vent')
const Dialog = require('./components/dialog')

window.addEventListener('blur', function (e) {
  vent.publish('window.blur')
}, false)

window.addEventListener('mousedown', function (e) {
  vent.publish('window.mousedown', e)
}, false)

window.addEventListener('mousemove', function (e) {
  vent.publish('window.mousemove', e)
}, false)

window.addEventListener('mouseup', function (e) {
  vent.publish('window.mouseup', e)
}, false)

window.addEventListener('mouseout', function (e) {
  let from = e.relatedTarget || e.toElement
  if (!from) {
    vent.publish('window.mouseout', e)
  }
}, false)

window.addEventListener('resize', function () {
  vent.publish('window.resize')
}, false)

window.addEventListener('keypress', function (e) {
  if (Dialog.currentModal) return
  if (document.activeElement !== document.body || !document.activeElement) return
  vent.publish('window.keypress', e)
}, false)
