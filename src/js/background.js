
const electron = require('electron')
const {app, BrowserWindow, Menu} = electron
const path = require('path')

const args = process.argv.slice(2)

let fileToLoad = args.length > 0 ? args[args.length - 1] : null

const mainMenu = Menu.buildFromTemplate(require('./menus/main-menu'))

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    minWidth: 320,
    minHeight: 128,
    width: 800,
    height: 600,
    backgroundColor: '#383c4a', // #201850
    title: 'Jazz Creation Station',
    icon: path.join(__dirname, '/../media/icons/JCS.png')
  })

  mainWindow.setMenu(mainMenu)

  mainWindow.maximize()

  mainWindow.loadURL(`file://${__dirname}/../index.html`)

  if (DEVELOPMENT) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.webContents.once('did-finish-load', () => {
    if (fileToLoad) {
      console.log('Loading ' + fileToLoad)
      mainWindow.webContents.send('loadlevel', fileToLoad)
    }
  })

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })

  mainWindow.on('enter-full-screen', () => {
    mainWindow.setMenuBarVisibility(true)
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
