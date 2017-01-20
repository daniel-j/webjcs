
const fs = require('fs')
const path = require('path')

function findFile (name, paths = []) {
  return new Promise((resolve, reject) => {
    let i = 0
    function r () {
      if (!paths[i]) {
        reject()
        return
      }
      const file = path.join(paths[i], name)
      fs.access(file, fs.constants.R_OK, (err) => {
        if (err) {
          i++
          r()
        } else {
          resolve(file)
        }
      })
    }
    r()
  })
}

module.exports = findFile
