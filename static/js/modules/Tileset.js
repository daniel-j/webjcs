/*
   Author:
     djazz
*/



define([
	"modules/formats/J2T",
	"modules/Scrollbars"
], function (J2T, Scrollbars) {
	'use strict';


	function Tileset() {
		var self = this;

		this.j2t    = new J2T();

		this.node = document.createElement('div');

		this.canvasContainer = document.createElement('div');
		this.node.appendChild(this.canvasContainer);
		this.node.classList.add('tilesetImage');
		this.scrollbars = new Scrollbars({
			element: self.canvasContainer,
			revealDistance: 130,
			contentWidth: 320
		});
		this.scrollbars.on('scroll', function () {
			self.canvasContainer.style.top = -self.scrollbars.scrollPosition[1]+'px';
			self.updateSelection();
		});

		this.selectionNode = document.createElement('div');
		this.selectionNode.classList.add('tileSelection');
		this.node.appendChild(this.selectionNode);
		this.selectionPos = {x: 0, y: 0, w: 0, h: 0, active: false};
		this.selectedTiles = [[0]];
		this.selectedTilesBuf = new Uint8Array([0, 0, 0, 0]);


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

		this.canvasContainer.appendChild(this.image);

		this.node.addEventListener('mousedown', function (e) {
			e.preventDefault();
			if (e.target.parentNode === self.canvasContainer || e.target === self.selectionNode) {
				var box = tilesetImageContainer.getBoundingClientRect();
				self.selectionPos.x = Math.floor(e.pageX/32);
				self.selectionPos.y = Math.floor((e.pageY-box.top+self.scrollbars.scrollPosition[1])/32);
				self.selectionPos.w = 0;
				self.selectionPos.h = 0;
				self.selectionPos.active = true;
				self.selectionNode.classList.add('active');
				self.updateSelection();
			}
		}, false);
		window.addEventListener('mousemove', function (e) {
			if (!self.selectionPos.active) {
				return;
			}
			var box = self.node.getBoundingClientRect();
			var x = Math.max(Math.floor(e.pageX/32), 0);
			var y = Math.max(Math.floor((e.pageY-box.top+self.scrollbars.scrollPosition[1])/32), 0);

			self.selectionPos.w = Math.min(x-self.selectionPos.x, 10-self.selectionPos.x-1);
			self.selectionPos.h = Math.min(y-self.selectionPos.y, self.image.height/32-self.selectionPos.y-1);

			//self.selectionPos.w = x-self.selectionPos.x;
			//self.selectionPos.h = y-self.selectionPos.y;

			//console.log(x, self.selectionPos.x, self.selectionPos.w);
			self.updateSelection();
		}, false);
		window.addEventListener('mouseup', function () {
			if (self.selectionPos.active) {
				self.selectionPos.active = false;
				self.selectionNode.classList.remove('active');

				var startx = Math.min(self.selectionPos.x, self.selectionPos.x+self.selectionPos.w);
				var starty = Math.min(self.selectionPos.y, self.selectionPos.y+self.selectionPos.h);
				var w = self.selectionPos.w > 0? self.selectionPos.w+1 : -self.selectionPos.w+1;
				var h = self.selectionPos.h > 0? self.selectionPos.h+1 : -self.selectionPos.h+1;
				self.selectedTiles = [];
				self.selectedTilesBuf = new Uint8Array(w*h*4);
				
				for (var x = 0; x < w; x++) {
					self.selectedTiles[x] = [];
					for (var y = 0; y < h; y++) {
						var tileId = (startx+x)+10*(starty+y);
						self.selectedTiles[x][y] = tileId;
						
						var i = (y*w+x)*4;
						self.selectedTilesBuf[i] = tileId % 256;
						self.selectedTilesBuf[i+1] = Math.floor(tileId / 256);
						self.selectedTilesBuf[i+2] = 0;
						self.selectedTilesBuf[i+3] = 255;
						
					}
				}
				self.emit('selection');
				//console.log(selectedTiles, selectedTilesBuf);
			}
			
		}, false);

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
		this.node.classList.add('hide');

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

			/*var pal = [];

			for (var i = 0; i < 256; i++) {
				var color = data.info.palette[i];
				var r = color & 0xFF;
				var g = (color >> 8) & 0xFF;
				var b = (color >> 16) & 0xFF;
				pal.push(r+" "+g+" "+b);
			}
			console.log(pal.join("\n"));*/
			
			
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
			self.node.classList.remove('hide');
			self.scrollbars.contentHeight = height*32;
			self.scrollbars.update();
			console.log('tileset render time:', (Date.now() - st)/1000+'s');
			callback();
		});
	};

	Tileset.prototype.unload = function () {
		this.j2t.abort();
		this.image.classList.add('hide');
		this.mask.classList.add('hide');
		this.node.classList.add('hide');
		this.image.height = 32;
		this.mask.height = 32;
		this.glImg.width = 32;
		this.glImg.height = 32;

		this.scrollbars.contentHeight = 0;
		this.scrollbars.update();
	};

	Tileset.prototype.updateSelection = function () {
		var startx = Math.min(this.selectionPos.x, this.selectionPos.x+this.selectionPos.w);
		var starty = Math.min(this.selectionPos.y, this.selectionPos.y+this.selectionPos.h);
		this.selectionNode.style.left = (startx*32)+'px';
		this.selectionNode.style.top = (starty*32-this.scrollbars.scrollPosition[1])+'px';
		this.selectionNode.style.width = (this.selectionPos.w > 0? this.selectionPos.w+1 : -this.selectionPos.w+1)*32+'px';
		this.selectionNode.style.height = (this.selectionPos.h > 0? this.selectionPos.h+1 : -this.selectionPos.h+1)*32+'px';
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