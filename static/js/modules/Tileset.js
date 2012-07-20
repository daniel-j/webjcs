/*
   Author:
     djazz
*/

var modules = modules || {};

modules.Tileset = (function (global) {
	'use strict';

	var J2T = modules.formats.J2T;

	var Tileset = function (options) {
		var self = this;

		this.j2t    = new J2T();

		this.image  = global.document.createElement('canvas');
		this.mask   = global.document.createElement('canvas');
		this.imgc   = this.image.getContext('2d');
		this.maskc  = this.image.getContext('2d');

		this.image.width = 320;
		this.image.height = 32;
		this.mask.width  = 320;
		this.image.classList.add('image');
		this.mask.classList.add('mask');
		this.image.classList.add('hide');
		this.mask.classList.add('hide');

		this.events = {};

		this.j2t.on('progress', function (p) {
			self.emit('progress', p);
		});

	};

	Tileset.prototype.load = function (filename, folderIndex) {
		var self = this;
		var st = Date.now();
		this.j2t.abort();
		this.emit('progress', 0);
		this.image.classList.add('hide');
		this.mask.classList.add('hide');

		this.j2t.filepath = '/node/files/get?n='+encodeURIComponent(filename)+(folderIndex!==false?'&f='+folderIndex:'')+'&parse=j2t';
		this.j2t.parse(function (data) {
			
			console.log('tileset download time:', (Date.now() - st)/1000+'s');
		
			self.emit('progress', 1);

			st = Date.now();
			var height = Math.ceil(data.info.tileCount/10);
			self.image.height = self.mask.height = height*32;

			var tileCount = data.info.tileCount;

			var imgdata = self.imgc.createImageData(32, 32);
			var imgd = imgdata.data;
			var tilecache = [];
			
			var i, j, x, y, tile, index, color, pos, cachepos, masked, mbyte, pixpos;
			
			for (i = 0; i < tileCount; i++) {
				tile = data.info.imageAddress[i]/1024;
				if (tile === 0) {
					continue;
				}
				pos = [i % 10, Math.floor(i / 10)];
				if (tilecache[tile] !== undefined) {
					cachepos = [tilecache[tile] % 10, Math.floor(tilecache[tile] / 10)];
					self.imgc.drawImage(self.image, cachepos[0]*32, cachepos[1]*32, 32, 32, pos[0]*32, pos[1]*32, 32, 32);
				} else {
					tilecache[tile] = i;
					for (j = 0; j < 4096 /* 32x32x4 */; j+=4) {

						index = data.images[tile][j/4];
						if (index > 1) {
							color = data.info.palette[index];
							imgd[j + 0] = color & 0xFF;
							imgd[j + 1] = (color >> 8) & 0xFF;
							imgd[j + 2] = (color >> 16) & 0xFF;
							imgd[j + 3] = 255;
						} else {
							imgd[j + 3] = 0;
						}
					}
					self.imgc.putImageData(imgdata, pos[0]*32, pos[1]*32);
				}
			}
			self.image.classList.remove('hide');
			self.mask.classList.remove('hide');
			console.log('tileset render time:', (Date.now() - st)/1000+'s');

		});
	};

	Tileset.prototype.unload = function () {
		this.j2t.abort();
		this.image.classList.add('hide');
		this.mask.classList.add('hide');
	};

	Tileset.prototype.emit = function (name, value) {
		var self = this;
		if (self.events[name] && self.events[name].length > 0) {
			for (var i = 0; i < self.events[name].length; i++) {
				self.events[name][i].call(self, value);
			}
		}
	};

	Tileset.prototype.on = function (name, callback) {
		this.events[name] = this.events[name] || [];
		this.events[name].push(callback);
	};

	Tileset.prototype.unbind = function (name, callback) {
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

	return Tileset;
}(window));