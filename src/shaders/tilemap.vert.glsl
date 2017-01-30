precision highp float;

attribute vec2 position;
attribute vec2 uvs;

varying vec2 uv;
varying vec2 mapCoord;

uniform vec2 viewportSize;
uniform vec2 viewOffset;
uniform float scale;

void main (void) {
	uv = uvs;
	mapCoord = position;
	gl_Position = vec4(((floor((position * 32. - viewOffset) * scale) / viewportSize) * 2.0 - 1.0) * vec2(1., -1.), 0.0, 1.0);
}
