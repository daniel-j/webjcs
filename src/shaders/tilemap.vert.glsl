attribute vec2 position;
attribute vec2 texture;

varying vec2 pixelCoord;

uniform vec2 viewportSize;
uniform vec2 viewOffset;
uniform float scale;

void main (void) {
	pixelCoord = (texture * viewportSize) / scale + viewOffset;
	gl_Position = vec4(position, 0.0, 1.0);
}
