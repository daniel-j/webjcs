/*
   Author:
     djazz
*/



define([
	"modules/formats/J2T"
], function (J2T) {
	'use strict';


	var Tileset = function (options) {
		var self = this;

		this.j2t    = new J2T();

		this.image  = document.createElement('canvas');
		this.mask   = document.createElement('canvas');
		this.raw    = document.createElement('canvas');
		this.glImg 	= document.createElement('canvas');
		this.imgc   = this.image.getContext('2d');
		this.maskc  = this.mask.getContext('2d');
		this.rawc   = this.raw.getContext('2d');
		this.glic   = this.glImg.getContext('2d');

		this.image.width = 320;
		this.image.height = 32;
		this.mask.width  = 320;
		this.mask.height = 32;
		this.glImg.width = 32;
		this.glImg.height = 32;
		this.image.classList.add('image');
		this.mask.classList.add('mask');
		this.image.classList.add('hide');
		this.mask.classList.add('hide');

		this.events = {};

		this.j2t.on('progress', function (p) {
			self.emit('progress', p);
		});

	};

	Tileset.prototype.load = function (filename, folderIndex, callback) {
		var self = this;
		var st = Date.now();
		this.j2t.abort();
		this.emit('progress', 0);
		this.image.classList.add('hide');
		this.mask.classList.add('hide');

		this.j2t.filepath = '/node/files/get?n='+encodeURIComponent(filename)+(folderIndex!==false?'&f='+folderIndex:'')+'&parse=j2t';
		this.j2t.parse(function () {
			var data = self.j2t.info;
			console.log('tileset download time:', (Date.now() - st)/1000+'s');
		
			self.emit('progress', 1);

			st = Date.now();
			var height = Math.ceil(data.info.tileCount/10);
			self.image.height = self.mask.height = height*32;
			self.raw.width = 32*Math.min(data.images.length, 256);
			self.raw.height = 32*Math.ceil(data.images.length / 256);
			self.glImg.width = 32*Math.min(data.info.tileCount, 256);
			self.glImg.height = Math.ceil(data.info.tileCount / 256)*32;

			var tileCount = data.info.tileCount;

			
			
			var i, j, x, y, tile, index, color, pos, cachepos, masked, mbyte, pixpos;
			
			var imgdata = self.rawc.createImageData(32, 32);
			var imgd = imgdata.data;

			for (i = 0; i < data.images.length; i++) {
				for (j = 0; j < 4096 /* 32x32x4 */; j+=4) {
					index = data.images[i][j/4];
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
				self.rawc.putImageData(imgdata, (i % 256)*32, Math.floor(i / 256)*32);
			}

			var imgdata = self.imgc.createImageData(32, 32);
			var imgd = imgdata.data;
			var tilecache = [];



			for (i = 0; i < tileCount; i++) {
				tile = data.info.imageAddress[i]/1024;
				if (tile === 0) {
					continue;
				}
				self.glic.drawImage(self.raw, (tile % 256)*32, Math.floor(tile / 256)*32, 32, 32, (i % 256)*32, Math.floor(i / 256)*32, 32, 32);
				self.imgc.drawImage(self.raw, (tile % 256)*32, Math.floor(tile / 256)*32, 32, 32, (i % 10)*32, Math.floor(i / 10)*32, 32, 32);
			}
			self.image.classList.remove('hide');
			self.mask.classList.remove('hide');
			console.log('tileset render time:', (Date.now() - st)/1000+'s');
			callback();
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
});