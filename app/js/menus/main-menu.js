
module.exports = [
  {
    label: '&File',
    submenu: [
      {label: '&New', command: 'newlevel', accelerator: 'CmdOrCtrl+N'},
      {label: '&Open...', command: 'openlevel', accelerator: 'CmdOrCtrl+O'},
      {type: 'separator'},
      {label: '&Save', command: 'savelevel', accelerator: 'CmdOrCtrl+S'},
      {label: 'Save &As...', command: 'savelevelas', accelerator: 'CmdOrCtrl+Shift+S'},
      {label: 'Save and Run', command: 'savelevelrun', accelerator: 'CmdOrCtrl+R'},
      {type: 'separator'},
      {label: '&Preferences', click: function () {
        global.document.forms['settingsform'].reset();
        Popup.open('settings');
        var lightBgColorPicker = global.document.querySelector('#lightBgColorPicker');
        var darkBgColorPicker = global.document.querySelector('#darkBgColorPicker');
        lightBgColorPicker.onchange = function (color, cstr) {
          lightBgColor = cstr;
          localStorage['WebJCS_lightBgColor'] = cstr;
          //redraw(0, true);
          requestAnimFrame(function () {redraw(0, true);}, layercanvas);
        };
        lightBgColorPicker.onupdate = function (color, cstr) {
          lightBgColor = cstr;
        };
        lightBgColorPicker.oncancel = function (oldcolor, cstr) {
          lightBgColor = cstr;
        };
        darkBgColorPicker.onchange = function (color, cstr) {
          darkBgColor = cstr;
          localStorage['WebJCS_darkBgColor'] = cstr;
          //redraw(0, true);
          requestAnimFrame(function () {redraw(0, true);}, layercanvas);
        };
        darkBgColorPicker.onupdate = function (color, cstr) {
          darkBgColor = cstr;
        };
        darkBgColorPicker.oncancel = function (oldcolor, cstr) {
          darkBgColor = cstr;
        };
        
        var toggleTileCache = global.document.getElementById('toggleTileCache');
        toggleTileCache.set(localStorage['WebJCS_toggleTileCache'] === '1');
        toggleTileCache.addEventListener('click', function () {
          localStorage['WebJCS_toggleTileCache'] = toggleTileCache.get()? '1' : '0';
          toggleTileCacheVar = toggleTileCache.get();
        }, false);
        var toggleEventLinks = global.document.getElementById('toggleEventLinks');
        toggleEventLinks.set(localStorage['WebJCS_toggleEventLinks'] !== '0');
        toggleEventLinks.addEventListener('click', function () {
          localStorage['WebJCS_toggleEventLinks'] = toggleEventLinks.get()? '1' : '0';
          toggleEventLinksVar = toggleEventLinks.get();
        }, false);
      }}
    ]
  },
  {
    label: '&View', submenu: [
      {label: 'Toggle &fullscreen', role: 'togglefullscreen'}
    ]
  },
  {
    label: '&Edit',
    submenu: [
      {label: '&Undo', command: 'undo', accelerator: 'CmdOrCtrl+Z', enabled: false},
      {label: '&Redo', command: 'redo', accelerator: 'CmdOrCtrl+Shift+Z', enabled: false}
    ]
  },
  {
    label: '&Tools',
    submenu: [
      {label: 'Level &properties...', command: 'openlevelproperties', click () {
        global.document.forms['levelpropertiesform'].reset();
        Popup.open('levelproperties');
        tmpHelpStrings = [];
        for(var i=0; i < 16; i+=1) {
          tmpHelpStrings[i] = J2L.LEVEL_INFO.HelpString[i];
        }
        var lpform = global.document.forms['levelpropertiesform'];
        lpform.leveltitle.value = J2L.LEVEL_INFO.LevelName;
        lpform.nextlevel.value = J2L.LEVEL_INFO.NextLevel;
        lpform.secretlevel.value = J2L.LEVEL_INFO.SecretLevel;
        lpform.bonuslevel.value = J2L.LEVEL_INFO.BonusLevel;
        lpform.musicfile.value = J2L.LEVEL_INFO.MusicFile;
        lpform.minlightslider.value = J2L.LEVEL_INFO.MinimumAmbient/0.64;
        lpform.minlightnumber.value = Math.round(J2L.LEVEL_INFO.MinimumAmbient/0.64);
        lpform.startlightslider.value = J2L.LEVEL_INFO.StartingAmbient/0.64;
        lpform.startlightnumber.value = Math.round(J2L.LEVEL_INFO.StartingAmbient/0.64);
        if(J2L.LEVEL_INFO.SplitScreenDivider > 0)
          lpform.splitscreenradio[1].checked = true;
        if(J2L.LEVEL_INFO.IsItMultiplayer > 0)
          lpform.isMultiplayer.setAttribute('on');
        else
          lpform.isMultiplayer.setAttribute('off');
        if(J2L.HEADER_INFO.HideLevel > 0)
          lpform.hideLevel.setAttribute('on');
        else
          lpform.hideLevel.setAttribute('off');
        helpStringEditor.value = tmpHelpStrings[0].replace(/\@/g, "\n");
        updateHelpStringPreview();
      }},
      {label: 'Level password...', command: 'openlevelpassword'}
    ]
  },
  {
    label: '&Help',
    role: 'help',
    submenu: [
      {label: 'Howto JCS', href: 'http://ninjadodo.net/htjcs/'},
      {label: 'JcsRef', href: 'http://www.jazz2online.com/jcsref/index.php?&menu=topics'},
      {type: 'separator'},
      {label: '&About', click () {
        Popup.open('about');
      }}
    ]
  }
]