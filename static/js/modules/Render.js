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

	/*var tileUvWidth;
	var tileUvHeight;

	function uvmap (uvs, face, x, y, w, h, rotateBy) {
		if(!rotateBy) rotateBy = 0;
		var tileU = x;
		var tileV = y;


		uvs[ ((0 + rotateBy) % 4)*2 + face*8 ] = tileU/tileUvWidth;
		uvs[ ((0 + rotateBy) % 4)*2 + face*8 + 1] = tileV/tileUvHeight;

		uvs[ ((1 + rotateBy) % 4)*2 + face*8 ] = tileU/tileUvWidth;
		uvs[ ((1 + rotateBy) % 4)*2 + face*8 + 1] = tileV/tileUvHeight + h/tileUvHeight;

		uvs[ ((2 + rotateBy) % 4)*2 + face*8 ] = tileU/tileUvWidth + w/tileUvWidth;
		uvs[ ((2 + rotateBy) % 4)*2 + face*8 + 1] = tileV/tileUvHeight + h/tileUvHeight;

		uvs[ ((3 + rotateBy) % 4)*2 + face*8 ] = tileU/tileUvWidth + w/tileUvWidth;
		uvs[ ((3 + rotateBy) % 4)*2 + face*8 + 1] = tileV/tileUvHeight;
	};

	function createLayerData(w, h) {
		var i = 0;
		var v = 0;
		var j = 0;


		var vertex = [];
		var index  = [];

		var uvs = new Float32Array(w * h * 4 * 2);
		var tileId = 0;

		for (var x = 0; x < w; x++) {
			for (var y = 0; y < h; y++) {
				index[ i++ ] = v; index[ i++ ] = v+1; index[ i++ ] = v+2;
				index[ i++ ] = v; index[ i++ ] = v+2; index[ i++ ] = v+3;
				vertex[v++] = [x+1,     y+1,       0];
				vertex[v++] = [x+1,     y,         0];
				vertex[v++] = [x,       y,         0];
				vertex[v++] = [x,       y+1,       0];
				tileId = x*y;

				uvmap(uvs, j++, (tileId % 10)*32, Math.floor(tileId / 10)*32, 32, 32, 2);
			}
		}

		var vertices = new Float32Array(vertex.length * 3);
		for(var i=0; i < vertex.length; i++) {
			for(var j=0; j < 3; j++) {
				vertices[i*3+j] = vertex[i][j];
			}
		};
		var indices = new Uint16Array(index);

		return {vertices: vertices, indices: indices, uvs: uvs};
	};

	function createShader() {
		tileUvWidth = this.texture.width;
		tileUvHeight = this.texture.height;

		
		this.layerData = createLayerData(this.width, this.height);

		this.glowTexture = new GLOW.Texture({
			data: this.texture,
			wrapS: GL.CLAMP_TO_EDGE,
			wrapT: GL.CLAMP_TO_EDGE,
			minFilter: GL.NEAREST,
			magFilter: GL.NEAREST
		});

		this.shaderInfo = {
			vertexShader: [
				"uniform    vec2    resolution;",
				"uniform    vec2    offset;",
				"attribute  vec3    vertices;",
				"attribute  vec2    uvs;",

				"varying    vec2    uv;",

				"void main(void) {",
					"uv = uvs;",

					"vec2 clipSpace = (floor(32.0 * (vertices.xy + offset)) / resolution) * 2.0 - 1.0;",

					"clipSpace.y = clipSpace.y * -1.0;",

					"gl_Position = vec4( clipSpace, 1.0, 1.0 );",
				"}"
				].join( "\n" ),
			fragmentShader: [

				"#ifdef GL_ES",
					"precision highp float;",
				"#endif",

				"uniform    sampler2D    texture;",

				"varying    vec2         uv;",

				"void main( void ) {",
					"vec4 color = texture2D(texture, uv);", 
					"gl_FragColor = vec4(color.rgb, color.a);",
				"}"

				].join( "\n" ),

			data: {
				texture: this.glowTexture,
				vertices: this.layerData.vertices,
				uvs: this.layerData.uvs,
				resolution: new GLOW.Vector2(window.innerWidth, window.innerHeight),
				offset: new GLOW.Vector2(0, 0)
			},
			indices: this.layerData.indices,
			interleave: {
				uvs: false
			}
		};
		

		this.shader = new GLOW.Shader(this.shaderInfo);
	};*/

	function Render(params) {
		var self = this;
		
		this.tileSize = params.tileSize || 32;
		this.texture = params.texture;
		this.width = 100;//Math.floor(window.innerWidth/this.tileSize-2 - 11);
		this.height = 100;//Math.floor(window.innerHeight/this.tileSize-2);
		
		this.canvas = global.document.createElement('canvas');

		this.canvas.width = window.innerWidth - 340;
		this.canvas.height = window.innerHeight;

		this.ctx = this.canvas.getContext('2d');
		
		this.offset = {x: 0, y: 0};
		this.scale  = 1;

		
		
		this.update = function () {
			requestAnimFrame(self.render, self.canvas);
		};
		
		/*this.glow = new GLOW.Context();
		this.glow.setupClear( { red: 1, green: 0, blue: 1 } );
		this.glow.domElement.width  = window.innerWidth - 340;
		this.glow.domElement.height = window.innerHeight;
		this.glow.domElement.style.position = "absolute";
		this.glow.domElement.style.right = "0px";

		createShader.apply(this);*/

		this.render = function () {
			
			var cw = self.canvas.width;
			var ch = self.canvas.height;

			self.ctx.clearRect(0, 0, cw, ch);
			
			
			var tilesPerRow    = self.texture.width / self.tileSize;
			var tilesPerColumn = self.texture.height / self.tileSize;
			var tilesize       = Math.ceil(self.tileSize*self.scale);

			var offx = (self.offset.x*self.tileSize)*self.scale + cw/2;
			var offy = (self.offset.y*self.tileSize)*self.scale + ch/2;

			offx = /*Math.max(0, */Math.max(offx, (self.width*self.tileSize))//);
			//offy = Math.min(offy, 0);
			offx = 0;
			offy = 0;

			var tileId = 0;
			for (var i=0; i < 1; i++) {
				for (var x = 0; x < self.width; x++) {
					for (var y = 0; y < self.height; y++) {
						tileId = x ^ y;//Math.floor(Math.random()*tilesPerRow*tilesPerColumn);
						var drawx = Math.floor(x*self.tileSize*self.scale+offx);
						var drawy = Math.floor(y*self.tileSize*self.scale+offy);

						if (drawx > cw || drawy > ch || drawx+tilesize < 0 || drawy+tilesize < 0) {
							continue;
						}

						self.ctx.drawImage(self.texture, (tileId % tilesPerRow)*self.tileSize, Math.floor(tileId / tilesPerRow)*self.tileSize, self.tileSize, self.tileSize, drawx, drawy, tilesize, tilesize);
					}
				}
			}
			
			
			/*if (this.shader) {

				this.glow.cache.clear();
				this.shader.draw();
			}*/
			

		};

		this.update();
	};


	Render.prototype.updateTexture = function (texture) {
		this.texture = texture;
		

		/*this.shader.texture.swapTexture(texture);
		
		tileUvWidth = this.texture.width;
		tileUvHeight = this.texture.height;
		
		this.layerData = createLayerData(this.width, this.height);
		this.shader.attributes.uvs.bufferData(this.layerData.uvs);
		this.shader.attributes.uvs.bind();
		console.log(this.shader);*/

	};
	Render.prototype.resizeView = function(w, h) {
		/*this.glow.domElement.width = w;
		this.glow.domElement.height = h;*/
		this.canvas.width  = w;
		this.canvas.height = h;
	};
	Render.prototype.setOffset = function(x, y) {
		//this.shader.offset.set(x, y);
		this.offset.x = +x || 0;
		this.offset.y = +y || 0;
	};
	Render.prototype.setScale = function(scale) {
		this.scale = +scale || 1;
	};

	return Render;

}(window));
