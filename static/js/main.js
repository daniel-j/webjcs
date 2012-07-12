/*
   Author:
     djazz
*/

(function (global) {
	'use strict';

	var Tileset = modules.Tileset;
	var xhr = utils.xhr;

	xhr({
		uri: '/node/files/list',
		successCallback: function (response) {
			console.log(JSON.parse(response));
		}
	});

	//var tileset = new Tileset();
	
	
	
}(window));