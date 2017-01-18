
const isElectron = require('is-electron')()
const os = require('os')

const prefix = 'webjcs:'

class Settings {
  constructor (defaults = {}) {
    this.defaults = defaults
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
    else item = JSON.parse(item)
    return item
  }
}

module.exports = new Settings({
  disable_webgl: false,

  paths: isElectron && os.platform() === 'win32' ? ['C:\\Games\\Jazz2\\'] : [],
  jj2_exe: isElectron && os.platform() === 'win32' ? 'C:\\Games\\Jazz2\\Jazz2+.exe' : '',
  jj2_args: isElectron ? '-windowed -nolog' + (os.platform() !== 'win32' ? ' -noddrawwin -noddraw -noddrawmemcheck -nocpucheck' : '') : '',
  wine_prefix: isElectron && os.platform() !== 'win32' && process.env.HOME ? process.env.HOME : ''

})
