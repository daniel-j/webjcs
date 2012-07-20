/*
   Author:
     djazz
*/

var modules = modules || {};

modules.MainMenu = (function (global) {
	'use strict';


	function MainMenu() {

	};

	MainMenu.prototype.method_name = function() {
		
	};

}(window));


var mm = new modules.MainMenu([
	{name: 'File', items: [
		{name: 'New'},
		{name: 'Open'},
		,
		{name: 'Download'},
		,
		{name: 'Run'}
	]},
	{name: 'Edit', items: [
		{name: 'Undo'},
		{name: 'Redo'}
	]},
	{name: 'Settings', items: [
		{'Gameserver'},
		{'WebJCS settings'},
		{'Level properties'}
	]}
]);