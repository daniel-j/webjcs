precision highp float;

varying vec2 uv;
varying vec2 mapCoord;

uniform sampler2D tileset;
uniform sampler2D mask;

uniform vec2 tilesetSize;
uniform float tileCount;
uniform float maskOpacity;
uniform float opacity;
uniform vec4 backgroundColor;
uniform vec4 invertArea;

void main (void) {
	if (uv.x == 0. && uv.y == 0.) {
		discard;
	}

	vec4 outColor = vec4(1.0, 0.0, 1.0, 1.0); // Render magenta color

	vec2 tilesetPos = uv * 32. / tilesetSize;
	vec4 tilesetColor = texture2D(tileset, tilesetPos);
	vec4 maskColor = texture2D(mask, tilesetPos);
	outColor.rgb = mix(tilesetColor.rgb, maskColor.rgb, maskOpacity * 0.8);
	outColor.a = min(1.0, tilesetColor.a * (1.0 - maskOpacity * 0.95) + maskColor.a * maskOpacity);

	outColor = mix(backgroundColor, outColor, outColor.a * opacity);
	bool inverted = mapCoord.x > invertArea.r && mapCoord.y > invertArea.g && mapCoord.x < invertArea.b && mapCoord.y < invertArea.a;
	if (inverted) {
		outColor = vec4(1.0 - outColor.r, 1.0 - outColor.g, 1.0 - outColor.b, outColor.a);
	}

	gl_FragColor = outColor;
}
