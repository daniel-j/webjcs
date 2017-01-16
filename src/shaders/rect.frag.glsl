precision mediump float;

uniform vec4 color;
uniform float opacity;

void main() {
	gl_FragColor = vec4(color.rgb, color.a * opacity);
}
