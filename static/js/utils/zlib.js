/*
   Author:
     djazz
*/

var utils = utils || {};

utils.zlib = (function zlib() {
	"use strict";

	var xhr = utils.xhr;

	function deflate(data, callback, progressCallback) {
		var fd = new FormData();
		fd.append('data', new Blob([data]));
		return xhr({uri: '/node/zlib?deflate', method: 'post', data: fd, responseType: 'arraybuffer', successCallback: function (x) {
			callback(x.response);
		}, progressCallback: progressCallback});
	};

	function inflate(data, callback, progressCallback) {
		var fd = new FormData();
		fd.append('data', new Blob([data]));
		return xhr({uri: '/node/zlib?inflate', method: 'post', data: fd, responseType: 'arraybuffer', successCallback: function (x) {
			callback(x.response);
		}, progressCallback: progressCallback});
	};

	return {
		deflate: deflate,
		inflate: inflate
	};

}());
