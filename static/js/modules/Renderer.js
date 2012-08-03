/*
   Author:
     djazz
*/

define([
	'utils/webgl/gl-util',
	'utils/webgl/gl-matrix-min'
], function (GLUtil) {
	
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

		"uniform sampler2D tiles;",
		"uniform sampler2D sprites;",

		"uniform vec2 inverseTileTextureSize;",
		"uniform vec2 inverseSpriteTextureSize;",
		"uniform float tileSize;",
		"uniform int repeatTiles;",
		"uniform int tileCount;",

		"void main(void) {",
		"	if(repeatTiles == 0 && (texCoord.x < 0.0 || texCoord.x > 1.0 || texCoord.y < 0.0 || texCoord.y > 1.0)) { discard; }",
		"	vec4 tile = texture2D(tiles, texCoord);",
		"	if(tile.x == 0.0 && tile.y == 0.0) { discard; }",
		"	vec2 spriteOffset = floor(tile.xy * 256.0);",
		"	vec2 spriteCoord = mod(pixelCoord, tileSize);",
		"	int tileId = int(spriteOffset.x + spriteOffset.y*256.0);",
		"	if(tileId < tileCount) {",
		"		gl_FragColor = texture2D(sprites, (spriteOffset*tileSize + spriteCoord) * inverseSpriteTextureSize);",
		"	} else {",
		//"		gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);", // Render magneta color
		"		discard;", // Tile id out of bounds
		"	}",
		//"	gl_FragColor = tile;",
		"}"
	].join("\n");


	var TileMapLayer = function (gl) {
		this.gl = gl;
		this.scrollScaleX = 1;
		this.scrollScaleY = 1;
		this.tileTexture = gl.createTexture();
		this.textureSize = vec2.create();
		this.inverseTextureSize = vec2.create();
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


	var Renderer = function (gl) {
		this.gl = gl;
		this.viewportSize = vec2.create();
		this.scaledViewportSize = vec2.create();
		this.inverseTileTextureSize = vec2.create();
		this.inverseSpriteTextureSize = vec2.create();

		this.tileScale = 1.0;
		this.tileSize = 32;

		this.filtered = false;

		this.spriteSheet = gl.createTexture();
		this.layers = [];

		var quadVerts = [
			//x  y  u  v
			-1, -1, 0, 1,
			1, -1, 1, 1,
			1,  1, 1, 0,

			-1, -1, 0, 1,
			1,  1, 1, 0,
			-1,  1, 0, 0
		];

		this.quadVertBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVertBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadVerts), gl.STATIC_DRAW);

		this.tilemapShader = GLUtil.createProgram(gl, tilemapVS, tilemapFS);

		this.tileCount = 0;

	};

	Renderer.prototype.setTileScale = function (scale) {
		this.tileScale = scale;

		this.scaledViewportSize[0] = this.viewportSize[0] / scale;
		this.scaledViewportSize[1] = this.viewportSize[1] / scale;
	};

	Renderer.prototype.setSpriteSheet = function (img, tileCount) {
		var self = this;
		var gl = this.gl;

		gl.bindTexture(gl.TEXTURE_2D, self.spriteSheet);
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

		self.tileCount = tileCount;
	};

	Renderer.prototype.setTileLayer = function (layerId, w, h, scrollScaleX, scrollScaleY) {
        var layer = new TileMapLayer(this.gl);
        layer.setTexture(w, h);

        if(scrollScaleX) {
            layer.scrollScaleX = scrollScaleX;
        }
        if(scrollScaleY) {
            layer.scrollScaleY = scrollScaleY;
        }

        this.layers[layerId] = layer;
    };

    Renderer.prototype.resizeViewport = function (width, height) {
    	this.gl.viewport(0, 0, width, height);

		this.viewportSize[0] = width;
		this.viewportSize[1] = height;

		this.scaledViewportSize[0] = width / this.tileScale;
		this.scaledViewportSize[1] = height / this.tileScale;
	};

	Renderer.prototype.draw = function (x, y) {
		var gl = this.gl;

		x = x*32 - (this.viewportSize[0]/2)/this.tileScale;
		y = y*32 - (this.viewportSize[1]/2)/this.tileScale;

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
		gl.uniform1i(shader.uniform.sprites, 0);
		gl.bindTexture(gl.TEXTURE_2D, this.spriteSheet);

		gl.activeTexture(gl.TEXTURE1);
		gl.uniform1i(shader.uniform.tiles, 1);

		gl.uniform1i(shader.uniform.tileCount, this.tileCount)

		// Draw each layer of the map
		var i, layer;
		for (i = this.layers.length; i >= 0; --i) {
			layer = this.layers[i];
			if (layer) {
				gl.uniform2f(shader.uniform.viewOffset, Math.floor(x * layer.scrollScaleX), Math.floor(y * layer.scrollScaleY));
				gl.uniform2fv(shader.uniform.inverseTileTextureSize, layer.inverseTextureSize);
				gl.uniform1i(shader.uniform.repeatTiles, layer.repeat ? 1 : 0);

				gl.bindTexture(gl.TEXTURE_2D, layer.tileTexture);

				gl.drawArrays(gl.TRIANGLES, 0, 6);

			}
		}
	};


	return Renderer;

});