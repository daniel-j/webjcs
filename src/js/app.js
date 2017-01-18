
const vent = require('postal').channel()
const settings = require('./settings')

const J2L = require('./J2L')
const J2T = require('./J2T')

const j2l = new J2L()
const j2t = new J2T()

const app = { vent, settings, j2l, j2t }
window.app = app

module.exports = app
