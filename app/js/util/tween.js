
const tweenContainer = document.createElement('div')
document.body.appendChild(tweenContainer)

class Tween {
  constructor (val, duration = 0.2, easing = 'ease-in-out') {
    this.duration = duration
    this.easing = easing
    this.el = document.createElement('div')
    this.el.style.opacity = val
    this.el.style.transition = 'opacity ' + this.duration + 's ' + this.easing
    tweenContainer.appendChild(this.el)
  }

  set (val) {
    this.el.style.opacity = val
  }
  get () {
    return window.getComputedStyle(this.el).getPropertyValue('opacity')
  }

  destroy () {
    tweenContainer.removeChild(this.el)
  }
}

module.exports = Tween
