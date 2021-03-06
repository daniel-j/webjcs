precision highp float;

varying vec2 pixelCoord;

uniform sampler2D tileset;
uniform sampler2D mask;
uniform sampler2D animMap;
uniform sampler2D map;

uniform vec2 textureSize;
uniform vec2 tilesetSize;
uniform vec2 mapSize;
uniform int repeatTilesX;
uniform int repeatTilesY;
uniform float tileCount;
uniform float maskOpacity;
uniform float opacity;
uniform vec4 backgroundColor;
uniform vec4 invertArea;

void main (void) {
	vec2 mapCoord =  floor(pixelCoord) / 32.0 / textureSize;
	vec2 scaled = textureSize / mapSize;
	if ((repeatTilesX == 0 && (mapCoord.x < 0.0 || mapCoord.x >= 1.0)) || (repeatTilesY == 0 && (mapCoord.y < 0.0 || mapCoord.y >= 1.0))) {
		discard;
	}
	if (repeatTilesX == 1 && (mapCoord.x * scaled.x < 0.0 || mapCoord.x * scaled.x >= 1.0)) {
		mapCoord.x = fract(mapCoord.x * scaled.x) / scaled.x;
	}
	if (repeatTilesY == 1 && (mapCoord.y * scaled.y < 0.0 || mapCoord.y * scaled.y >= 1.0)) {
		mapCoord.y = fract(mapCoord.y * scaled.y) / scaled.y;
	}
	vec4 invArea = vec4(invertArea.rg / textureSize, invertArea.ba / textureSize);
	bool inverted = mapCoord.x > invArea.r && mapCoord.y > invArea.g && mapCoord.x < invArea.b && mapCoord.y < invArea.a;
	vec4 tile = texture2D(map, vec2(mapCoord.x, mapCoord.y));
	if (tile.a == 0.0) {discard;}
	vec2 spriteOffset = floor(tile.xy * 255.);
	float tileId = floor(spriteOffset.r) + floor(spriteOffset.g * 256.0);
	float extra = floor(tile.b * 256.);
	bool flipped = extra == 1. || extra == 3. || extra == 5. || extra == 7.;
	bool animated = extra == 2. || extra == 3. || extra == 6. || extra == 7.;
	bool vflipped = extra >= 4.;

	vec4 outColor = vec4(1.0, 0.0, 1.0, 1.0); // Render magenta color
	if (animated) {
		tile = texture2D(animMap, vec2(tileId / 256.0, 0.0));
		spriteOffset = floor(tile.xy * 255.);
		tileId = floor(spriteOffset.r) + floor(spriteOffset.g * 256.);
		extra = floor(tile.b * 256.);
		flipped = (extra == 1. || extra == 3. || extra == 5. || extra == 7.) ? !flipped : flipped;
		animated = extra == 2. || extra == 3. || extra == 6. || extra == 7.;
		vflipped = (extra >= 4.) ? !vflipped : vflipped;
	}

	if (tileId < tileCount && !animated) {
		vec2 spriteCoord = mod(floor(pixelCoord), 32.0);
		if (flipped) {
			spriteCoord.x = 31. - spriteCoord.x;
		}
		if (vflipped) {
			spriteCoord.y = 31. - spriteCoord.y;
		}
		vec2 tilesetPos = vec2(
			mod(float(tileId), 64.0) * 32.0,
			floor(float(tileId) / 64.0) * 32.0
		);
		//spriteCoord = clamp(spriteCoord, 4.0, 28.0);
		tilesetPos = (tilesetPos + spriteCoord) / tilesetSize;
		vec4 tilesetColor = texture2D(tileset, tilesetPos);
		vec4 maskColor = texture2D(mask, tilesetPos);
		outColor.rgb = mix(tilesetColor.rgb, maskColor.rgb, maskOpacity * 0.8);
		outColor.a = min(1.0, tilesetColor.a * (1.0 - maskOpacity * 0.95) + maskColor.a * maskOpacity);
		//outColor = mix(outColor, vec4(tilesetPos, 0.0, 1.0), 0.2);
	}
	outColor = mix(backgroundColor, outColor, outColor.a * opacity);
	if (inverted) {
		outColor = vec4(1.0 - outColor.r, 1.0 - outColor.g, 1.0 - outColor.b, outColor.a);
	}
	gl_FragColor = outColor;
}
