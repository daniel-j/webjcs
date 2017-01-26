
const vent = require('./vent')
const Dialog = require('./components/dialog')
const keycode = require('keycode')

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

window.addEventListener('keydown', function (e) {
  if ([16, 17, 18, 92, 225].includes(e.keyCode)) return
  const key = keycode(e) || 'unknown'
  let accel = []
  if (e.ctrlKey) accel.push('Ctrl')
  if (e.metaKey) accel.push('Meta')
  if (e.altKey) accel.push('Alt')
  if (e.shiftKey) accel.push('Shift')
  accel.push(key.substring(0, 1).toUpperCase() + key.substring(1))
  accel = accel.join('+')
  vent.publish('window.keydown', {e, key, accel, modalOpen: !!Dialog.currentModal, hasActiveElement: document.activeElement !== document.body || !document.activeElement})
}, false)

window.addEventListener('keypress', function (e) {
  vent.publish('window.keypress', {e, modalOpen: !!Dialog.currentModal, hasActiveElement: document.activeElement !== document.body || !document.activeElement})
}, false)
