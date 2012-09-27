/*

Copyright (c) 2012 Brandon Jones

This software is provided 'as-is', without any express or implied
warranty. In no event will the authors be held liable for any damages
arising from the use of this software.

Permission is granted to anyone to use this software for any purpose,
including commercial applications, and to alter it and redistribute it
freely, subject to the following restrictions:

    1. The origin of this software must not be misrepresented; you must not
    claim that you wrote the original software. If you use this software
    in a product, an acknowledgment in the product documentation would be
    appreciated but is not required.

    2. Altered source versions must be plainly marked as such, and must not
    be misrepresented as being the original software.

    3. This notice may not be removed or altered from any source
    distribution.

Modified by djazz

*/

define([
	'utils/webgl/gl-util',
	'utils/webgl/gl-matrix-min'
], function (GLUtil) {

	var hasWebGL = !!window.WebGLRenderingContext && (!!window.document.createElement('canvas').getContext('experimental-webgl') || !!window.document.createElement('canvas').getContext('webgl'));
	console.log(hasWebGL);
	//hasWebGL = false;
	
	// Shader
	var tilemapVS = [
		"attribute vec2 position;",
		"attribute vec2 texture;",

		"varying vec2 pixelCoord;",
		"varying vec2 texCoord;",

		"uniform vec2 viewOffset;",
		"uniform vec2 viewportSize;",
		"uniform vec2 inverseTileTextureSize;",
		"uniform float inverseTileSize;",

		"void main(void) {",
		"	pixelCoord = (texture * viewportSize) + viewOffset;",
		"	texCoord = pixelCoord * inverseTileTextureSize * inverseTileSize;",
		"	gl_Position = vec4(position, 0.0, 1.0);",
		"}"
	].join("\n");

	var tilemapFS = [
		"precision highp float;",

		"varying vec2 pixelCoord;",
		"varying vec2 texCoord;",

		"uniform sampler2D map;",
		"uniform sampler2D tileset;",

		"uniform vec2 inverseTileTextureSize;",
		"uniform vec2 inverseSpriteTextureSize;",
		"uniform float tileSize;",
		"uniform int repeatTiles;",
		"uniform int tileCount;",

		"void main(void) {",
		"	vec2 mapCoord = texCoord;",
		"	if(repeatTiles == 0 && (texCoord.x < 0.0 || texCoord.x > 1.0 || texCoord.y < 0.0 || texCoord.y > 1.0)) { discard; }",
		"	else if(repeatTiles == 1 && (texCoord.x < 0.0 || texCoord.x > 1.0 || texCoord.y < 0.0 || texCoord.y > 1.0)) {",
		"		mapCoord = mod(mapCoord, 1.0);",
		"	}",
		"	vec4 tile = texture2D(map, mapCoord);",
		"	if(tile.x == 0.0 && tile.y == 0.0) { discard; }",
		"	vec2 spriteOffset = floor(tile.xy * 256.0);",
		"	vec2 spriteCoord = mod(pixelCoord, tileSize);",
		"	int tileId = int(spriteOffset.x + spriteOffset.y*256.0);",
		"	if(tileId < tileCount) {",
		"		vec4 outColor = texture2D(tileset, (spriteOffset*tileSize + spriteCoord) * inverseSpriteTextureSize);",
		"		if(outColor.a < 0.5) {discard;}",
		"		gl_FragColor = outColor;",
		"	} else {",
		//"		gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);", // Render magneta color
		"		discard;", // Tile id out of bounds
		"	}",
		//"	gl_FragColor = tile;",
		//"	gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);",
		"}"
	].join("\n");


	var TileMapLayer = function (gl, w, h) {
		if (hasWebGL) {
			this.gl = gl;
			this.tileTexture = gl.createTexture();
			this.textureSize = vec2.create();
			this.inverseTextureSize = vec2.create();
			this.setTexture(w, h);
		} else {
			this.tiles = [];
			for (var x = 0; x < w; x++) {
				this.tiles[x] = [];
				for (var y = 0; y < h; y++) {
					this.tiles[x][y] = 0;
				}

			}
		}
		
		this.scrollScaleX = 1;
		this.scrollScaleY = 1;
		this.repeat = false;

		this.width = w;
		this.height = h;
	};

	TileMapLayer.prototype.setTexture = function (w, h, repeat) {
		var gl = this.gl;
		gl.bindTexture(gl.TEXTURE_2D, this.tileTexture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(w*h*8));

		// MUST be filtered with NEAREST or tile lookup fails
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

		if(repeat) {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		} else {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		}

		this.textureSize[0] = w;
		this.textureSize[1] = h;

		this.inverseTextureSize[0] = 1/w;
		this.inverseTextureSize[1] = 1/h;
	};

	TileMapLayer.prototype.setTiles = function (x, y, selection, selectionBuf) {
		x = Math.floor(x);
		y = Math.floor(y);
		var sw = selection.length;
		var sh = selection[0].length;

		if (hasWebGL) {
			var gl = this.gl;
			gl.bindTexture(gl.TEXTURE_2D, this.tileTexture);
			//gl.texSubImage2D(gl.TEXTURE_2D, 0, Math.floor(x), Math.floor(y), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([tileId % 256, Math.floor(tileId / 256), 0, 255]));
			gl.texSubImage2D(gl.TEXTURE_2D, 0, x, y, selection.length, selection[0].length, gl.RGBA, gl.UNSIGNED_BYTE, selectionBuf);

		} else {
			
			for (var sx = 0; sx < sw; sx++) {
				for (var sy = 0; sy < sh; sy++) {
					this.tiles[x+sx][y+sy] = selection[sx][sy];
				}
			}
		}
	};


	var Renderer = function (ctx) {
		if (hasWebGL) {
			var gl = ctx;
			this.gl = gl;
			this.viewportSize = vec2.create();
			this.scaledViewportSize = vec2.create();
			this.inverseTileTextureSize = vec2.create();
			this.inverseSpriteTextureSize = vec2.create();
			this.tileset = gl.createTexture();

			var quadVerts = new Float32Array([
				//x  y  u  v
				-1, -1, 0, 1,
				1, -1, 1, 1,
				1,  1, 1, 0,

				-1, -1, 0, 1,
				1,  1, 1, 0,
				-1,  1, 0, 0
			]);

			this.quadVertBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVertBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

			this.tilemapShader = GLUtil.createProgram(gl, tilemapVS, tilemapFS);

		} else {
			this.viewportSize = [0, 0];
			this.ctx = ctx;
			this.tileset = new Image();
		}

		this.tileScale = 1.0;
		this.tileSize = 32;

		this.filtered = false;
		this.layers = [];

		

		this.tileCount = 0;

	};

	Renderer.prototype.setTileScale = function (scale) {
		this.tileScale = scale;

		this.scaledViewportSize[0] = this.viewportSize[0] / scale;
		this.scaledViewportSize[1] = this.viewportSize[1] / scale;
	};

	Renderer.prototype.setTileset = function (img, tileCount) {
		
		var self = this;
		if (hasWebGL) {
			var gl = this.gl;

			gl.bindTexture(gl.TEXTURE_2D, self.tileset);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

			if(!self.filtered) {
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			} else {
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); // Worth it to mipmap here?
			}

			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			self.inverseSpriteTextureSize[0] = 1/img.width;
			self.inverseSpriteTextureSize[1] = 1/img.height;
		} else {
			self.tileset = img;
		}

		self.tileCount = tileCount;
	};

	Renderer.prototype.setTileLayer = function (layerId, w, h, scrollScaleX, scrollScaleY, repeat) {
        var layer = new TileMapLayer(this.gl, w, h);
        layer.repeat = !!repeat;

        if(scrollScaleX) {
            layer.scrollScaleX = scrollScaleX;
        }
        if(scrollScaleY) {
            layer.scrollScaleY = scrollScaleY;
        }

        this.layers[layerId] = layer;
    };

    Renderer.prototype.resizeViewport = function (width, height) {

    	this.viewportSize[0] = width;
		this.viewportSize[1] = height;

    	if (hasWebGL) {
    		this.gl.viewport(0, 0, width, height);

			this.scaledViewportSize[0] = width / this.tileScale;
			this.scaledViewportSize[1] = height / this.tileScale;
    	}
	};

	Renderer.prototype.draw = function (x, y) {
		
		x = x*32 - (this.viewportSize[0]/2)/this.tileScale;
		y = y*32 - (this.viewportSize[1]/2)/this.tileScale;
		
		if (hasWebGL) {

			var gl = this.gl;

			var shader = this.tilemapShader;
			gl.useProgram(shader.program);

			gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVertBuffer);

			gl.enableVertexAttribArray(shader.attribute.position);
			gl.enableVertexAttribArray(shader.attribute.texture);
			gl.vertexAttribPointer(shader.attribute.position, 2, gl.FLOAT, false, 16, 0);
			gl.vertexAttribPointer(shader.attribute.texture, 2, gl.FLOAT, false, 16, 8);

			gl.uniform2fv(shader.uniform.viewportSize, this.scaledViewportSize);
			gl.uniform2fv(shader.uniform.inverseSpriteTextureSize, this.inverseSpriteTextureSize);
			gl.uniform1f(shader.uniform.tileSize, this.tileSize);
			gl.uniform1f(shader.uniform.inverseTileSize, 1/this.tileSize);

			gl.activeTexture(gl.TEXTURE0);
			gl.uniform1i(shader.uniform.tileset, 0);
			gl.bindTexture(gl.TEXTURE_2D, this.tileset);

			gl.activeTexture(gl.TEXTURE1);
			gl.uniform1i(shader.uniform.map, 1);
			
			gl.uniform1i(shader.uniform.tileCount, this.tileCount);

		} else {

		}

		// Draw each layer of the map
		var i, layer;
		for (i = 0; i < this.layers.length; i++) {
			layer = this.layers[i];
			if (layer) {
				if (hasWebGL) {
					gl.uniform2f(shader.uniform.viewOffset, Math.floor(x * layer.scrollScaleX), Math.floor(y * layer.scrollScaleY));
					gl.uniform2fv(shader.uniform.inverseTileTextureSize, layer.inverseTextureSize);

					gl.uniform1i(shader.uniform.repeatTiles, layer.repeat ? 1 : 0);

					gl.bindTexture(gl.TEXTURE_2D, layer.tileTexture);

					gl.drawArrays(gl.TRIANGLES, 0, 6);
				} else {

					var w = this.ctx.canvas.width;
					var h = this.ctx.canvas.height;

					this.ctx.clearRect(0, 0, w, h);

					for (var dx = Math.floor(x/32); dx-Math.floor(x/32) < Math.ceil(w/32); dx++) {
						for (var dy = Math.floor(y/32); dy-Math.floor(y/32) < Math.ceil(h/32); dy++) {
							if (this.tileset) {
								var tileId = layer.tiles[dx][dy];
								if (tileId > 0) {
									this.ctx.drawImage(this.tileset, 32*(tileId % 10), 32*Math.floor(tileId / 10), 32, 32, dx*32-x, dy*32-y, 32, 32);
								}
								
							}
						}
					}

				}
				

			}
		}
	};


	return Renderer;

});