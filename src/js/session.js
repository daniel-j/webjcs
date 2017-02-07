
const app = require('./app')
const vent = require('./vent')

const socket = app.socket
let currentSession = null

if (socket) {
  vent.subscribe('session.id', (ev, id) => {
    if (currentSession) return
    if (!id) return
    currentSession = id
    console.log('Joining session', id)
    app.socket.emit('session', id)
  })
  socket.on('session', (id) => {
    currentSession = id
    console.log('joined session', id)
  })
  socket.on('j2l', (data) => {
    app.j2l.loadFromBuffer(Buffer.from(data)).then(() => {
      vent.publish('level.load')
    })
  })
  socket.on('update', (data) => {
    console.log('send', data)
    vent.publish('session.update.' + data.type, data)
  })
}

vent.subscribe('session.send', (ev, data) => {
  console.log('send', data)
  vent.publish('session.update.' + data.type, data)
  if (!currentSession) return
  if (!socket) return
  socket.emit('send', data)
})
