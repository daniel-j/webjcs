#!/usr/bin/env node

const config = require('./config.json')
const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const uuidV4 = require('uuid/v4')
//const GameManager = require('./game-manager')

const J2L = require(__dirname + '/../src/js/J2L')

const sessions = new Map()

io.origins('*:*')



  io.on('connection', (socket) => {
    console.log('a user connected')
    const user = {
      socket,
      session: null
    }
    socket.on('session', (sessionId) => {
      if (user.session) {
        // Can only be in one session
        socket.emit('session', user.session.id)
        return
      }
      let session = sessions.get(sessionId)
      let j2l
      if (!session) {
        j2l = new J2L()
        j2l.newLevel()
        session = {
          j2l,
          tileset: '',
          id: sessionId
        }
        sessions.set(sessionId, session)
      } else {
        j2l = session.j2l
      }
      sessions.set(sessionId, session)
      user.session = session

      session.id = sessionId
      session.users = session.users || []
      session.users.push(user)

      io.sockets.in(sessionId).emit('join', 'a user joined room')
      socket.join(sessionId)

      socket.emit('session', sessionId)
      j2l.export(J2L.VERSION_TSF).then((data) => {
        socket.emit('j2l', data)
      })

      socket.on('disconnect', () => {
        console.log('a user left room ' + sessionId)
        session.users.splice(session.users.indexOf(user), 1)
        io.sockets.in(sessionId).emit('leave', 'a user left room')
        if (session.users.length === 0) {
          GameManager.removeSession(sessionId)
          sessions.delete(sessionId)
        }
      })
    })
    socket.on('disconnect', () => {
      console.log('a user disconnected')
    })

    socket.on('send', (data) => {
      const session = user.session
      console.log('got update', data.type)
      if (!session) return
      const j2l = session.j2l
      switch (data.type) {
        case 'layer.settiles':
          j2l.layers[data.layer].setTiles(data.x, data.y, data.tiles, data.layer !== 3)
          break
      }
      socket.broadcast.to(session.id).emit('update', data)
    })
  })
/*GameManager.initAll().then(() => {
  const fs = require('fs')
  let level = fs.readFileSync(__dirname + '/../data/ab17btl06.j2l')
  let j2l = new J2L()
  j2l.loadFromBuffer(level).then(() => {
    j2l.export(J2L.VERSION_123, (header, info) => {
      info.set('NextLevel', '')
      info.set('SecretLevel', '')
      info.set('BonusLevel', '')
    }).then((buffer) => {
      let game = GameManager.newGame({
        gamemode: 'tb',
        j2l: buffer
      }).then((game) => {
        game.child.once('close', () => {
          console.log('Game closed!')
        })
      })
    })
  })
})*/

app.use(express.static(__dirname + '/../app'))

server.listen(config.port, () => {
  console.log('Listening on *:' + config.port)
})
