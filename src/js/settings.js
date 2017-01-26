
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
    const def = this.defaults[key]
    this.set(key, def)
    return def
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

  paths: IS_ELECTRON && os.platform() === 'win32' ? ['C:\\Games\\Jazz2\\'] : [],
  jj2_exe: IS_ELECTRON && os.platform() === 'win32' ? 'C:\\Games\\Jazz2\\Jazz2+.exe' : '',
  jj2_args: IS_ELECTRON ? '-windowed -nolog' + (os.platform() !== 'win32' ? ' -noddrawmemcheck -nocpucheck' : '') : '',
  wine_prefix: IS_ELECTRON && os.platform() !== 'win32' && process.env.HOME ? process.env.HOME : ''
})
