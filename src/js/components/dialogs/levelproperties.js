
const m = require('mithril')
const Dialog = require('../dialog')
const vent = require('../../vent')
const app = require('../../app')
const toggler = require('../misc').toggler

function reset (p) {
  let f = app.j2l.levelInfo.fields
  p.LevelName = f.LevelName
  p.BonusLevel = f.BonusLevel
  p.NextLevel = f.NextLevel
  p.SecretLevel = f.SecretLevel
  p.MusicFile = f.MusicFile

  p.VerticalSplitscreen = f.VerticalSplitscreen & 1
  p.IsLevelMultiplayer = f.IsLevelMultiplayer & 1
  p.HideLevel = app.j2l.header.fields.HideLevel & 1

  p.MinLight = Math.round(f.MinLight * 1.5625)
  p.StartLight = Math.round(f.StartLight * 1.5625)

  p.HelpString = []
  for (let i = 0; i < 16; i++) {
    p.HelpString[i] = f.HelpString[i].replace(/@/g, '\n')
  }
}

function stringInput (name, value, {disabled, style, maxlength} = {}) {
  return m('input', {
    name,
    type: 'text',
    value,
    maxlength,
    autocomplete: 'off',
    size: 32,
    disabled: !!disabled,
    style
  })
}

function rangeInput (name, value, min, max, {disabled, style, step = 1} = {}) {
  return [
    m('input', {
      name,
      type: 'range',
      value,
      disabled: !!disabled,
      min,
      max,
      step,
      style
    }),
    m('input', {
      name,
      type: 'number',
      value,
      disabled: !!disabled,
      min,
      max,
      step,
      size: 5,
      pattern: '\\d*'
    })
  ]
}

function boolInput (label, name, checked, {disabled} = {}) {
  return m(toggler, {
    name,
    checked: !!checked,
    disabled: !!disabled
  }, label)
}

function selectInput (name, value, items, {disabled, style} = {}) {
  return m('select.flexfluid', {
    name,
    value,
    disabled: !!disabled,
    style
  }, items && items.map((item, value) => {
    return m('option', {value}, item)
  }))
}

const LevelPropertiesDialog = {
  oninit ({state}) {
    state.dialog = {
      onclose: (e) => {
        let val = state.dialog.dom.returnValue
        if (val !== 'ok') {
          return
        }

        let p = state.prefs
        let f = app.j2l.levelInfo.fields

        f.LevelName = p.LevelName
        f.BonusLevel = p.BonusLevel
        f.NextLevel = p.NextLevel
        f.SecretLevel = p.SecretLevel
        f.MusicFile = p.MusicFile

        f.VerticalSplitscreen &= -1 << 5
        f.VerticalSplitscreen |= p.VerticalSplitscreen & 1
        f.IsLevelMultiplayer &= -1 << 5
        f.IsLevelMultiplayer |= p.IsLevelMultiplayer & 1
        f.HideLevel &= -1 << 5
        f.HideLevel |= app.j2l.header.fields.HideLevel & 1

        f.MinLight = p.MinLight / 1.5625
        f.StartLight = p.StartLight / 1.5625

        for (let i = 0; i < 16; i++) {
          f.HelpString[i] = p.HelpString[i].replace(/\n/g, '@')
        }
        vent.publish('updatetitle')
      },
      onValueChange (e, ev, type, name, value) {
        let t = e.target
        let p = state.prefs
        let parts = name.split('.')
        let o = p
        let i = 0
        while (i < parts.length - 1) {
          o = o[parts[i]]
          i++
        }
        let key = parts[i]
        name = parts[0]
        type = t.dataset.type || type
        o[key] = value

        // console.log(ev, type, name, value)
      }
    }
    state.prefs = {}
    state.prefs.currentHelpString = 0
  },
  oncreate ({dom, state}) {
    vent.subscribe('menuclick.openlevelproperties', (ev) => {
      reset(state.prefs)
      m.redraw()
      state.dialog.showModal()
    })
  },
  view ({state}) {
    return m(Dialog, state.dialog, [
      m('.title', 'Level Properties'),
      m('table.content', {style: {width: '100%', borderSpacing: '5px', borderCollapse: 'separate'}}, [
        m('tr', [
          m('td.textright', 'Level Name'),
          m('td', {width: 120}, m('.flexwrapper', stringInput('LevelName', state.prefs.LevelName, {maxlength: 32}))),
          m('td.textright', 'Text'),
          m('td', m('.flexwrapper', selectInput('currentHelpString', state.prefs.currentHelpString, state.prefs.HelpString && state.prefs.HelpString.map((s, id) => {
            return id + ': ' + s.replace(/\n/g, ' ').replace(/§./g, '').trim().substring(0, 30)
          }))))
        ]),
        m('tr', [
          m('td.textright', 'Next Level'),
          m('td', {width: 120}, m('.flexwrapper', stringInput('NextLevel', state.prefs.NextLevel, {maxlength: 32}))),
          m('td', {rowspan: 9, colspan: 2}, m('textarea', {
            name: 'HelpString.' + state.prefs.currentHelpString,
            value: state.prefs.HelpString && state.prefs.HelpString[state.prefs.currentHelpString],
            style: {
              minHeight: '270px',
              height: '100%',
              width: '380px',
              whiteSpace: 'nowrap',
              textAlign: 'center',
              resize: 'none',
              maxlength: 512
            }
          }))
        ]),
        m('tr', [
          m('td.textright', 'Secret Level'),
          m('td', {width: 120}, m('.flexwrapper', stringInput('SecretLevel', state.prefs.SecretLevel, {maxlength: 32})))
        ]),
        m('tr', [
          m('td.textright', 'Bonus Level'),
          m('td', {width: 120}, m('.flexwrapper', stringInput('BonusLevel', state.prefs.BonusLevel, {maxlength: 32})))
        ]),
        m('tr', [
          m('td.textright', 'Music File'),
          m('td', {width: 120}, m('.flexwrapper', stringInput('MusicFile', state.prefs.MusicFile, {maxlength: 32})))
        ]),
        m('tr', [
          m('td.textright', {title: 'Hide level in Homecooked Levels in JJ2'}, 'Hide in HCL'),
          m('td', boolInput(null, 'HideLevel', state.prefs.HideLevel))
        ]),
        m('tr', [
          m('td.textright', 'Vertical Splitscreen'),
          m('td', boolInput(null, 'VerticalSplitscreen', state.prefs.VerticalSplitscreen))
        ]),
        m('tr', [
          m('td.textright', 'Multiplayer Level'),
          m('td', boolInput(null, 'IsLevelMultiplayer', state.prefs.IsLevelMultiplayer))
        ]),
        m('tr', [
          m('td.textright', 'Minimum Light'),
          m('td', rangeInput('MinLight', state.prefs.MinLight, 0, 399))
        ]),
        m('tr', [
          m('td.textright', 'Start Light'),
          m('td', rangeInput('StartLight', state.prefs.StartLight, 0, 399))
        ])
      ]),
      m('.buttons.center', [
        m('button', {type: 'submit', value: 'ok', autofocus: true}, 'OK'),
        ' ',
        m('button', {type: 'button', onclick: state.dialog.close}, 'Cancel')
      ])
    ])
  }
}

module.exports = LevelPropertiesDialog
