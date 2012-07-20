/*
   Author:
     djazz
*/

var modules = modules || {};
modules.formats = modules.formats || {};

modules.formats.J2T = (function (global) {
	'use strict';

	// Requirements
	var zlib   = utils.zlib;
	var Struct = utils.Struct;
	var xhr    = utils.xhr;
	
	// Private variables
	var structs = {
		header: new utils.Struct([
			{copyright: '180'},
			{magic:     '4'},
			{signature: new Uint32Array(1)},
			{title:     '32'},
			{version:   new Uint16Array(1)},
			{fileSize:  new Uint32Array(1)},
			{checksum:  new Int32Array(1)},
			{streamSize: [
				new Uint32Array(2),
				new Uint32Array(2),
				new Uint32Array(2),
				new Uint32Array(2)
			]}
		]),

		// 1.20/1.21/1.23
		info1024: new utils.Struct([
			{palette: 			new Uint32Array(256)},		// RGBA, RGBA, RGBA...
			{tileCount: 		new Uint32Array(1)},		// Number of tiles, always a multiple of 10
			{fullyOpaque: 		new Uint8Array(1024)},		// 1 if no transparency at all, otherwise 0
			{unknown1: 			new Uint8Array(1024)},
			{imageAddress: 		new Uint32Array(1024)},		// Image address
			{unknown2: 			new Uint32Array(1024)},
			{transMaskAddress: 	new Uint32Array(1024)},		// Transparency masking, for bitblt
			{unknown3: 			new Uint32Array(1024)},
			{maskAddress: 		new Uint32Array(1024)},		// Clipping or tile mask
			{flipMaskAddress: 	new Uint32Array(1024)}		// Flipped version of the above
		]),

		// 1.24/TSF
		info4096: new utils.Struct([
			{palette: 			new Uint32Array(256)},		// RGBA, RGBA, RGBA...
			{tileCount: 		new Uint32Array(1)},		// Number of tiles, always a multiple of 10
			{fullyOpaque: 		new Uint8Array(4096)},		// 1 if no transparency at all, otherwise 0
			{unknown1: 			new Uint8Array(4096)},
			{imageAddress: 		new Uint32Array(4096)},		// Image address
			{unknown2: 			new Uint32Array(4096)},
			{transMaskAddress: 	new Uint32Array(4096)},		// Transparency masking, for bitblt
			{unknown3: 			new Uint32Array(4096)},
			{maskAddress: 		new Uint32Array(4096)},		// Clipping or tile mask
			{flipMaskAddress: 	new Uint32Array(4096)}		// Flipped version of the above
		])
	};

	// Constructor
	var J2T = function (filepath) {
		
		this.filepath = filepath;

		this.requests = [];

		this.events = {};
	};

	// Methods
	J2T.prototype.parse = function (parseCallback) {
		var self = this;
		this.requests.push(xhr({uri: this.filepath, responseType: 'arraybuffer', successCallback: function (x) {
			if (x.status !== 200) {
				console.log('unable to load', self.filepath);
				return;
			}

			var ab = x.response;
			
			var header = structs.header.unpack(ab.slice(0, 262));
			var isTSF = header.version === 0x201;
			
			var streams = [];
			var offset = 262;

			for (var i = 0; i < 4; i++) {
				streams[i] = ab.slice(offset, header.streamSize[i][1] + offset);
				offset += header.streamSize[i][1];
			}

			
						
			self.requests = [];

			var info = (!isTSF? structs.info1024 : structs.info4096).unpack(streams[0]);
			


			var images = new Array(streams[1].byteLength/1024);
			for (var i = 0; i < images.length; i++) {
				images[i] = new Uint8Array(streams[1].slice(i*1024, i*1024+1024));
			}
			

			var masks = new Array(streams[3].byteLength/128);
			for (var i = 0; i < masks.length; i++) {
				masks[i] = new Uint32Array(streams[3].slice(i*128, i*128+128));
			}
			
			
			parseCallback({
				header: header,
				info: info,
				images: images,
				masks: masks,
				maxTiles: !isTSF? 1024 : 4096
			});

			
		}, progressCallback: function (loaded, total) {
			//console.log('tileset', Math.round((loaded/total)*100)+"%");
			var x = this;
			self.emit('progress', loaded/(+x.getResponseHeader('X-Total-Content-Length')));
		}}));
	};

	J2T.prototype.abort = function () {
		for (var i = 0; i < this.requests.length; i++) {
			this.requests[i].abort();
		}
		this.requests = [];
	};

	J2T.prototype.emit = function (name, value) {
		var self = this;
		if (self.events[name] && self.events[name].length > 0) {
			for (var i = 0; i < self.events[name].length; i++) {
				self.events[name][i].call(self, value);
			}
		}
	};

	J2T.prototype.on = function (name, callback) {
		this.events[name] = this.events[name] || [];
		this.events[name].push(callback);
	};

	J2T.prototype.unbind = function (name, callback) {
		var index;
		if (this.events[name]) {
			for (var i = 0; i < this.events[name].length; i++) {
				if ((index = this.events[name].indexOf(callback)) > -1) {
					this.events[name].splice(index, 1);
				}
			}
			if (this.events[name].length === 0) {
				delete this.events[name];
			}
		}
	};


	return J2T;
}(window));