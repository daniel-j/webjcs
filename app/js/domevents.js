
const vent = require('postal').channel()

window.addEventListener('mousedown', function (e) {
  vent.publish('window.mousedown', e)
}, false)

window.addEventListener('mousemove', function (e) {
  vent.publish('window.mousemove', e)
}, false)

window.addEventListener('mouseup', function (e) {
  vent.publish('window.mouseup', e)
}, false)

window.addEventListener('resize', function () {
  vent.publish('window.resize')
}, false)
