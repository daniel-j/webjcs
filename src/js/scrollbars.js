
require('../style/scrollbars.css')

let isHoldingScrollbar = false

class Scrollbars {

  constructor (params) {
    // Parameters

    this.element = params.element
    this.revealDistance = params.revealDistance || 250
    this.minimumSize = params.minimumSize || 4
    this.contentWidth = params.contentWidth || 0
    this.contentHeight = params.contentHeight || 0
    this.scrollPosition = [0, 0]
    this.isPanning = false
    this.pan = {}

    // Build the scrollbar DOM

    this.parent = this.element.parentNode

    this.element.classList.add('scrollNode')
    this.parent.classList.add('scrollParent')

    this.smoothScroller = document.createElement('div')
    this.smoothScroller.className = 'scrollbars smooth'

    this.hTrack = document.createElement('div')
    this.hTrack.className = 'scrollbars horizontal track hidden'

    this.vTrack = document.createElement('div')
    this.vTrack.className = 'scrollbars vertical track hidden'

    this.hThumb = document.createElement('div')
    this.hThumb.className = 'thumb'
    this.vThumb = document.createElement('div')
    this.vThumb.className = 'thumb'

    this.corner = document.createElement('div')
    this.corner.className = 'scrollbars corner disabled'

    this.hTrack.appendChild(this.hThumb)
    this.vTrack.appendChild(this.vThumb)

    this.parent.appendChild(this.smoothScroller)
    this.parent.appendChild(this.corner)
    this.parent.appendChild(this.hTrack)
    this.parent.appendChild(this.vTrack)

    this.state = {
      holdingWhich: null,
      mouseDownPosition: 0,
      isMouseOver: false,
      isMouseDown: false,

      scrollWidth: 0,
      scrollHeight: 0,

      gripPositionX: 0,
      gripPositionY: 0
    }

    this.lastMouseEvent = {pageX: 0, pageY: 0}

    // Event listeners

    this.hThumb.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (this.isPanning) return

      this.state.holdingWhich = this.hThumb
      this.state.mouseDownPosition = e.pageX - this.state.gripPositionX

      isHoldingScrollbar = this
    }, false)
    this.vThumb.addEventListener('mousedown', (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (this.isPanning) return

      this.state.holdingWhich = this.vThumb
      this.state.mouseDownPosition = e.pageY - this.state.gripPositionY
      isHoldingScrollbar = this
    }, false)

    window.addEventListener('mousedown', (e) => {
      this.hTrack.classList.add('hidden')
      this.vTrack.classList.add('hidden')
      this.state.isMouseDown = true
    }, false)

    window.addEventListener('mousemove', (e) => {
      this.lastMouseEvent = e

      if (this.isPanning) {
        this.scrollPosition[0] = this.pan.startPosition[0] + this.pan.mouseOffset[0] - e.pageX
        this.scrollPosition[1] = this.pan.startPosition[1] + this.pan.mouseOffset[1] - e.pageY

        this.update()
        this.smoothScroller.style.left = -Math.floor(this.scrollPosition[0]) + 'px'
        this.smoothScroller.style.top = -Math.floor(this.scrollPosition[1]) + 'px'
        this.emit('scroll')
      } else if (this.state.holdingWhich !== null) {
        let mouseDownPosition = this.state.mouseDownPosition

        if (this.state.holdingWhich === this.hThumb) {
          let containerWidth = this.getOffsetWidth()

          let box = this.hThumb.getBoundingClientRect()

          let newGripPosition = Math.max(Math.min((e.pageX - box.left) - (mouseDownPosition - box.left), this.state.scrollWidth), 0)

          let newScrollRatio = newGripPosition / this.state.scrollWidth
          if (isNaN(newScrollRatio)) {
            newScrollRatio = 0
          }
          this.scrollPosition[0] = newScrollRatio * (this.contentWidth - containerWidth)
        } else if (this.state.holdingWhich === this.vThumb) {
          let containerHeight = this.getOffsetHeight()

          let box = this.vThumb.getBoundingClientRect()

          let newGripPosition = Math.max(Math.min((e.pageY - box.top) - (mouseDownPosition - box.top), this.state.scrollHeight), 0)

          let newScrollRatio = newGripPosition / this.state.scrollHeight
          if (isNaN(newScrollRatio)) {
            newScrollRatio = 0
          }
          this.scrollPosition[1] = newScrollRatio * (this.contentHeight - containerHeight)
        }

        this.update()
        this.smoothScroller.style.left = -Math.floor(this.scrollPosition[0]) + 'px'
        this.smoothScroller.style.top = -Math.floor(this.scrollPosition[1]) + 'px'
        this.emit('scroll')
      }

      if (this.state.holdingWhich === null && !this.state.isMouseOver) {
        this.hTrack.classList.add('hidden')
        this.vTrack.classList.add('hidden')
      }
    }, false)

    window.addEventListener('resize', () => this.update(), false)

    function releaseScrollBar (e) {
      this.state.holdingWhich = null
      this.state.isMouseDown = false

      if (!this.state.isMouseOver) {
        this.hTrack.classList.add('hidden')
        this.vTrack.classList.add('hidden')
      }

      isHoldingScrollbar = false

      this.fixScrollbarVisibility(e)
    }
    window.addEventListener('mouseup', releaseScrollBar.bind(this), false)
    window.addEventListener('blur', releaseScrollBar.bind(this), false)

    this.parent.addEventListener('mousewheel', (e) => {
      if (this.isPanning) return
      let deltaX = e.wheelDeltaX / 120 // (e.wheelDeltaX > 0 ? 1 : (e.wheelDeltaX < 0 ? -1 : 0));
      let deltaY = e.wheelDeltaY / 120 // (e.wheelDeltaY > 0 ? 1 : (e.wheelDeltaY < 0 ? -1 : 0));
      let newScrollX = Math.max(Math.min(this.scrollPosition[0] - deltaX * 32, this.contentWidth - this.getOffsetWidth()), 0)
      let newScrollY = Math.max(Math.min(this.scrollPosition[1] - deltaY * 32, this.contentHeight - this.getOffsetHeight()), 0)

      if (newScrollX !== this.scrollPosition[0] || newScrollY !== this.scrollPosition[1]) {
        this.scrollPosition[0] = newScrollX
        this.scrollPosition[1] = newScrollY
        // e.preventDefault()
        this.update()
        this.smoothScroller.style.left = -Math.floor(newScrollX) + 'px'
        this.smoothScroller.style.top = -Math.floor(newScrollY) + 'px'
        this.emit('scroll')
      }
    }, {passive: true})

    this.parent.addEventListener('mousemove', (e) => {
      this.state.isMouseOver = true

      this.fixScrollbarVisibility(e)
    })
    this.parent.addEventListener('mouseout', (e) => {
      // console.log(e.target);
      // this.hTrack.classList.add('hidden');
      // this.vTrack.classList.add('hidden');
      this.state.isMouseOver = false
    })

    window.addEventListener('mouseup', (e) => {
      if (e.button === 1 && this.isPanning) {
        this.isPanning = false
      }
    }, false)

    this.parent.addEventListener('mousedown', (e) => {
      if (e.button !== 1) return
      e.preventDefault()
      this.isPanning = true
      this.pan.startPosition = this.scrollPosition.slice(0)
      this.pan.mouseOffset = [e.pageX, e.pageY]
    }, false)

    this.events = {}
  }

  fixScrollbarVisibility (e) {
    if (this.state.isMouseOver && !this.state.isMouseDown) {
      if (!e) {
        e = this.lastMouseEvent
      }
      let box = this.parent.getBoundingClientRect()

      if ((isHoldingScrollbar === false || isHoldingScrollbar === this) && this.state.holdingWhich !== this.vThumb && (this.state.holdingWhich === this.hThumb || box.height - (e.pageY - box.top) < this.revealDistance) && !this.hTrack.classList.contains('disabled')) {
        this.hTrack.classList.remove('hidden')
      } else {
        this.hTrack.classList.add('hidden')
      }

      if ((isHoldingScrollbar === false || isHoldingScrollbar === this) && this.state.holdingWhich !== this.hThumb && (this.state.holdingWhich === this.vThumb || box.width - (e.pageX - box.left) < this.revealDistance) && !this.vTrack.classList.contains('disabled')) {
        this.vTrack.classList.remove('hidden')
      } else {
        this.vTrack.classList.add('hidden')
      }
    }
  }

  getOffsetWidth () {
    return Math.max(0, this.parent.offsetWidth - (this.contentHeight > this.parent.offsetHeight ? this.vTrack.offsetWidth : 0))
  }
  getOffsetHeight () {
    return Math.max(0, this.parent.offsetHeight - (this.contentWidth > this.parent.offsetWidth ? this.hTrack.offsetHeight : 0))
  }

  update (force = false) {
    let containerWidth = this.getOffsetWidth()
    let containerHeight = this.getOffsetHeight()

    let trackWidth = this.hTrack.offsetWidth
    let trackHeight = this.vTrack.offsetHeight

    let gripRatioX = containerWidth / this.contentWidth
    let gripRatioY = containerHeight / this.contentHeight

    let minGripSize = this.minimumSize
    let maxGripWidth = trackWidth
    let maxGripHeight = trackHeight

    let scrollX = Math.max(Math.min(this.scrollPosition[0], this.contentWidth - containerWidth), 0)
    let scrollY = Math.max(Math.min(this.scrollPosition[1], this.contentHeight - containerHeight), 0)

    let gripWidth = Math.max(Math.min(trackWidth * gripRatioX, maxGripWidth), minGripSize)
    let gripHeight = Math.max(Math.min(trackHeight * gripRatioY, maxGripHeight), minGripSize)

    let scrollWidth = trackWidth - gripWidth
    let scrollHeight = trackHeight - gripHeight
    this.state.scrollWidth = scrollWidth
    this.state.scrollHeight = scrollHeight

    let scrollRatioX = scrollX / (this.contentWidth - containerWidth)
    let scrollRatioY = scrollY / (this.contentHeight - containerHeight)

    if (isNaN(scrollRatioX)) {
      scrollRatioX = 0
    }
    if (isNaN(scrollRatioY)) {
      scrollRatioY = 0
    }

    let gripPositionX = scrollWidth * scrollRatioX
    let gripPositionY = scrollHeight * scrollRatioY

    this.state.gripPositionX = gripPositionX
    this.state.gripPositionY = gripPositionY

    this.hThumb.style.width = gripWidth + 'px'
    this.vThumb.style.height = gripHeight + 'px'

    if (gripRatioX >= 1) {
      this.hTrack.classList.add('disabled')
    } else {
      this.hTrack.classList.remove('disabled')
    }

    if (gripRatioY >= 1) {
      this.vTrack.classList.add('disabled')
    } else {
      this.vTrack.classList.remove('disabled')
    }

    if (gripRatioX < 1 && gripRatioY < 1) {
      this.corner.classList.remove('disabled')
      this.hTrack.classList.add('both')
      this.vTrack.classList.add('both')
    } else {
      this.corner.classList.add('disabled')
      this.hTrack.classList.remove('both')
      this.vTrack.classList.remove('both')
    }

    this.hThumb.style.left = gripPositionX + 'px'
    this.vThumb.style.top = gripPositionY + 'px'

    if (scrollX !== this.scrollPosition[0] || scrollY !== this.scrollPosition[1] || force) {
      this.scrollPosition[0] = scrollX
      this.scrollPosition[1] = scrollY
      this.smoothScroller.style.left = -Math.floor(scrollX) + 'px'
      this.smoothScroller.style.top = -Math.floor(scrollY) + 'px'
      this.emit('scroll')
    }

    this.fixScrollbarVisibility()
  }

  disableTransition () {
    this.parent.classList.add('notransition')
  }
  enableTransition () {
    this.parent.classList.remove('notransition')
  }

  emit (name, value) {
    if (this.events[name] && this.events[name].length > 0) {
      for (let i = 0; i < this.events[name].length; i++) {
        this.events[name][i].call(this, value)
      }
    }
  }

  on (name, callback) {
    this.events[name] = this.events[name] || []
    this.events[name].push(callback)
  }

  unbind (name, callback) {
    if (this.events[name]) {
      for (let i = 0; i < this.events[name].length; i++) {
        let index = this.events[name].indexOf(callback)
        if (index > -1) {
          this.events[name].splice(index, 1)
        }
      }
      if (this.events[name].length === 0) {
        delete this.events[name]
      }
    }
  }
}

module.exports = Scrollbars
