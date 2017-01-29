
const {shell} = require('electron')

function click (menuItem, win, event) {
  if (menuItem.href) {
    shell.openExternal(menuItem.href)
    return
  }
  if (win && menuItem.command) {
    win.webContents.send('menuclick', menuItem.command)
    return
  }
}

module.exports = [
  {
    label: '&File',
    submenu: [
      {label: '&New', command: 'newlevel', accelerator: 'CmdOrCtrl+N', click},
      {label: '&Open...', command: 'openlevel', accelerator: 'CmdOrCtrl+O', click},
      {type: 'separator'},
      {label: '&Save', command: 'savelevel', accelerator: 'CmdOrCtrl+S', click},
      {label: 'Save &As...', command: 'savelevelas', accelerator: 'CmdOrCtrl+Shift+S', click},
      {label: 'Save and Run', command: 'savelevelrun', accelerator: 'CmdOrCtrl+Shift+R', click},
      {label: '&Run', command: 'levelrun', accelerator: 'CmdOrCtrl+R', click},
      {type: 'separator'},
      {label: '&Preferences', command: 'openpreferences', accelerator: 'CmdOrCtrl+,', click}
    ]
  },
  {
    label: '&View',
    submenu: [
      {label: 'Toggle &fullscreen', role: 'togglefullscreen'},
      {label: 'Toggle Developer Tools', accelerator: 'Ctrl+Shift+I', click (item, win) { if (win) win.webContents.toggleDevTools() }, electronOnly: true}
    ]
  },
  {
    label: '&Edit',
    submenu: [
      {label: '&Undo', command: 'undo', accelerator: 'CmdOrCtrl+Z', enabled: false, click, hasActiveElement: false},
      {label: '&Redo', command: 'redo', accelerator: 'CmdOrCtrl+Shift+Z', enabled: false, click, hasActiveElement: false}
    ]
  },
  {
    label: '&Tools',
    submenu: [
      {label: 'Level &properties...', command: 'openlevelproperties', click},
      {label: 'Level password...', command: 'openlevelpassword', click}
    ]
  },
  {
    label: '&Help',
    role: 'help',
    submenu: [
      {label: 'Howto JCS', href: 'http://ninjadodo.net/htjcs/', click},
      {label: 'JcsRef', href: 'https://web.archive.org/web/20090303060826/http://www.jazz2online.com/jcsref/index.php?&menu=topics', click},
      {type: 'separator'},
      {label: 'WebJCS on Github', href: 'https://github.com/daniel-j/webjcs', click},
      {label: '&About', command: 'openabout', click}
    ]
  }
]
