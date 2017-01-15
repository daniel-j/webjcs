
module.exports = [`
  attribute vec2 position;

  uniform vec2 viewportSize;
  uniform vec2 viewOffset;
  uniform vec2 size;
  uniform float scale;

  void main (void) {
    gl_Position = vec4((((size * 32.0 * (position * 0.5 + 0.5) - floor(viewOffset * scale) / scale) / (viewportSize / scale)) * 2.0 - 1.0) * vec2(1, -1), 0.0, 1.0);
  }
`, `
  precision mediump float;

  uniform vec4 color;
  uniform float opacity;

  void main() {
    gl_FragColor = vec4(color.rgb, color.a * opacity);
  }
`]
