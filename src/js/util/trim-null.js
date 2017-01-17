
module.exports = function trimNull (str) {
  str = str.replace(/^\0\0*/, '')
  let i = str.length
  while (/\0/.test(str.charAt(--i))) {}
  return str.slice(0, i + 1)
}
