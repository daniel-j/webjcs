/*
   Author:
     djazz
*/

var modules = modules || {};

modules.Render = (function (global) {
	'use strict';

	// shim layer with setTimeout fallback
	var requestAnimFrame = (function(){
		return  window.requestAnimationFrame       || 
				window.webkitRequestAnimationFrame || 
				window.mozRequestAnimationFrame    || 
				window.oRequestAnimationFrame      || 
				window.msRequestAnimationFrame     || 
				function( callback ){
					window.setTimeout(callback, 1000 / 60);
				};
	})();

	function Render(params) {
		var self = this;
		
		this.tileSize = params.tileSize || 32;
		this.texture = params.texture;
		this.width = window.innerWidth/this.tileSize;
		this.height = window.innerHeight/this.tileSize;
		
		this.canvas = global.document.createElement('canvas');

		this.canvas.width = window.innerWidth;
		this.canvas.height = window.innerHeight;

		WebGL2D.enable(this.canvas);
		this.ctx = this.canvas.getContext('2d');

		
		this.animate = function () {
			requestAnimFrame(self.animate, self.canvas);
			self.render();
		};

		self.animate();
	};

	Render.prototype.render = function () {

		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		
		
		var tilesPerRow    = this.texture.width / this.tileSize;
		var tilesPerColumn = this.texture.height / this.tileSize;

		var tileId = 0;

		for (var x = 0; x < this.width; x++) {
			for (var y = 0; y < this.height; y++) {
				tileId = Math.floor(Math.random()*tilesPerRow*tilesPerColumn);
				this.ctx.drawImage(this.texture, (tileId % tilesPerRow)*this.tileSize, Math.floor(tileId / tilesPerRow)*this.tileSize, this.tileSize, this.tileSize, x*this.tileSize, y*this.tileSize, this.tileSize, this.tileSize);
			}
		}

	};

	return Render;

}(window));
