
const prefix = 'webjcs:'

class Settings {
  constructor (defaults = {}) {
    this.defaults = defaults
    this.settings = {}
  }

  set (key, value) {
    window.localStorage.setItem(prefix + key, JSON.stringify(value))
  }
  setDefault (key) {
    this.set(key, this.defaults[key])
  }
  get (key) {
    let item = window.localStorage.getItem(prefix + key)
    if (item === null) item = this.defaults[key]
    return item
  }
}

module.exports = new Settings({
  disable_webgl: false
})
