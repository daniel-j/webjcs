/*
   Author:
     djazz
*/

define(function () {
	'use strict';
	
	var xhr = function (params) {
		
		var x = new XMLHttpRequest();

		x.open(params.method || 'get', params.uri, true);

		if (typeof params.responseType === 'string') {
			x.responseType = params.responseType;
		}
		
		x.addEventListener('load', function (e) {
			params.successCallback(x);
		}, false);
		x.addEventListener('progress', function (e) {
			if (typeof params.progressCallback === 'function') {
				params.progressCallback.call(x, e.loaded, e.total);
			}
		}, false);
		
		x.send(params.data);
		return x;
	};
	
	
	return xhr;
});

