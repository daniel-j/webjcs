
module.exports = [`
  attribute vec2 position;
  varying vec2 texcoord;

  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
    texcoord = position.xy * 0.5 + 0.5;
  }
`, `
  precision mediump float;
  varying vec2 texcoord;
  uniform sampler2D texture;
  uniform float opacity;

  void main() {
    vec4 color = texture2D(texture, texcoord);
    color.a *= opacity;
    gl_FragColor = color;
  }
`]
