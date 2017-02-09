
const app = require('./app')
const vent = require('./vent')
const settings = require('./settings')
const J2L = require('./J2L')

const io = require('socket.io-client/dist/socket.io')

let currentServer = settings.get('socket_server')
let currentSession = null

let socket = null

function joinSession (id) {
  if (id === null) return
  if (socket) {
    socket.disconnect()
    socket = null
  }
  currentSession = id

  socket = io(currentServer, {
    'force new connection': true
  })

  socket.on('connect', () => {
    console.log('Joining session', currentSession)
    socket.emit('session', currentSession)
  })
  socket.on('connect_error', (err) => {
    socket.disconnect()
    socket = null
    currentSession = null
    console.warn('Couldn\'t connect to server', currentServer, err)
    alert('Couldn\'t connect to server ' + currentServer)
  })
  socket.on('session', (id, isNew) => {
    currentSession = id
    console.log('Joined session', id)
    if (isNew) {
      console.log('Uploading J2L')
      vent.publish('j2l.preexport')
      app.j2l.export(J2L.VERSION_TSF).then((data) => {
        socket.emit('upload.level', data)
      })
    } else {
      console.log('Downloading J2L')
      socket.emit('download.level')
    }
  })
  socket.on('j2l', (data) => {
    app.j2l.loadFromBuffer(Buffer.from(data)).then(() => {
      vent.publish('level.load')
    })
  })
  socket.on('update', (data) => {
    console.log('got update', data)
    vent.publish('session.update.' + data.type, data)
  })
  socket.on('disconnect', () => {
    console.log('socket disconnected')
  })
}

vent.subscribe('session.update', (ev, data) => {
  vent.publish('session.' + data.type, data)
  if (!currentSession) return
  if (!socket) return
  console.log('sending update', data)
  socket.emit('update', data)
})

vent.subscribe('menuclick.sessionstart', () => {
  let name = prompt('Session name (leave empty for random name)', currentSession || '')
  if (name !== null) {
    if (name !== currentSession) {
      joinSession(name)
    }
  }
})

vent.subscribe('menuclick.sessionstop', () => {
  if (socket) {
    socket.disconnect()
    socket = null
    currentSession = null
  }
})
