precision mediump float;
varying vec2 texcoord;
uniform sampler2D texture;
uniform float opacity;

void main() {
	vec4 color = texture2D(texture, texcoord);
	color.a *= opacity;
	gl_FragColor = color;
}
