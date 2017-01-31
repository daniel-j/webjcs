
const toml = require('toml')
const defaultEventsFile = require('raw-loader!../../conf/events.toml')

let eventConfig = toml.parse(defaultEventsFile)

const canvas = document.createElement('canvas')
canvas.width = 16 * 32 * 2
canvas.height = 16 * 32
const ctx = canvas.getContext('2d')

ctx.fillStyle = 'white'
ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
ctx.lineWidth = 2
let fontface = 'Tahoma, sans-serif'
ctx.textBaseline = 'middle'
ctx.textAlign = 'center'
ctx.imageSmoothingEnabled = false

const tree = []
const categories = new Map()

function buildTree () {
  tree.length = 0
  categories.clear()
  eventConfig.Subcategories.forEach((o) => {
    categories.set(o.category, o)
  })
  eventConfig.Categories.forEach(({name, multiplayer}) => {

  })
}

function drawEvents () {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.imageSmoothingEnabled = false

  ctx.save()

  for (let i = 0; i < 256; i++) {
    let event = eventConfig.Events[i] || {category: null}
    let category = categories.get(event.category)

    let hue = typeof event.hue === 'number' ? event.hue : (category && typeof category.hue === 'number' ? category.hue : null)
    let saturation = typeof event.saturation === 'number' ? event.saturation : (category && typeof category.saturation === 'number' ? category.saturation : 100)
    let brightness = typeof event.brightness === 'number' ? event.brightness : (category && typeof category.brightness === 'number' ? category.brightness : 40)
    let stroke = typeof event.stroke === 'boolean' ? event.stroke : (category && typeof category.stroke === 'boolean' ? category.stroke : true)

    if (hue == null) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
    } else {
      ctx.fillStyle = 'hsla(' + hue + ', ' + saturation + '%, ' + (brightness / 4) + '%, 0.6)'
      ctx.strokeStyle = 'hsla(' + hue + ', ' + saturation + '%, ' + brightness + '%, ' + (stroke ? 1 : 0.2) + ')'
    }

    ctx.save()
    ctx.beginPath()
    ctx.rect((i % 16) * 32, Math.floor(i / 16) * 32, 32, 32)
    ctx.clip()
    ctx.beginPath()
    ctx.rect((i % 16) * 32, Math.floor(i / 16) * 32, 32, 32)
    ctx.fill()
    ctx.stroke()
    ctx.restore()

    ctx.drawImage(canvas, (i % 16) * 32, Math.floor(i / 16) * 32, 32, 32, (i % 16) * 32 + 16 * 32, Math.floor(i / 16) * 32, 32, 32)

    ctx.save()
    ctx.translate((i % 16) * 32 + 16 * 32, Math.floor(i / 16) * 32)
    ctx.fillStyle = ctx.strokeStyle
    ctx.beginPath()

    ctx.moveTo(1, 1)
    ctx.lineTo(1, 6)
    ctx.lineTo(12, 1)

    ctx.moveTo(31, 31)
    ctx.lineTo(31, 26)
    ctx.lineTo(20, 31)

    ctx.fill()
    ctx.restore()

    if (i > 0) {
      ctx.clearRect(0, 0, 32, 32)
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, 32, 32)
      ctx.clip()
      ctx.translate(16, 16)
      if (!event.bottom) {
        findFontSize(event.top)
        ctx.fillStyle = 'black'
        ctx.fillText(event.top, 1, 1)
        ctx.fillStyle = 'white'
        ctx.fillText(event.top, 0, 0)
        ctx.fillText(event.top, 0, 0)
      } else {
        let size = Math.min(findFontSize(event.top), findFontSize(event.bottom))
        let fontstyle = size <= 10 ? 'bold' : ''
        ctx.font = fontstyle + ' ' + size + 'px ' + fontface
        ctx.textBaseline = 'bottom'
        ctx.fillStyle = 'black'
        ctx.fillText(event.top, 1, 2)
        ctx.fillStyle = 'white'
        ctx.fillText(event.top, 0, 1)
        ctx.fillText(event.top, 0, 1)
        ctx.textBaseline = 'top'
        ctx.fillStyle = 'black'
        ctx.fillText(event.bottom, 1, 0)
        ctx.fillStyle = 'white'
        ctx.fillText(event.bottom, 0, -1)
        ctx.fillText(event.bottom, 0, -1)
      }
      ctx.restore()

      ctx.drawImage(canvas, 0, 0, 32, 32, (i % 16) * 32, Math.floor(i / 16) * 32, 32, 32)
      ctx.drawImage(canvas, 0, 0, 32, 32, (i % 16) * 32 + 16 * 32, Math.floor(i / 16) * 32, 32, 32)
    }
  }
  ctx.clearRect(0, 0, 32, 32)
  ctx.restore()
}

function findFontSize (text) {
  let fontSize = 12.5
  do {
    fontSize -= 0.5
    let fontstyle = fontSize <= 10 ? 'bold' : ''
    ctx.font = fontstyle + ' ' + fontSize + 'px ' + fontface
  } while (ctx.measureText(text).width > 33 && fontSize >= 9)
  return fontSize
}

buildTree()
drawEvents()

const events = {
  canvas,
  ctx
}

module.exports = events
