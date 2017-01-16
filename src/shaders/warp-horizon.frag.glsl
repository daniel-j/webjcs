
uniform vec2 resolution;
uniform float time;
uniform sampler2D texture;

void main(void) {
  vec2 p = -1.0 + 2.0 * gl_FragCoord.xy / resolution.xy;
  vec2 uv;

  uv.y = .25/abs(p.y);

  if(p.y < 0.0) {
    uv.y = -.25/abs(p.y);
  }
  uv.x = .3*p.x/abs(p.y);
  
  gl_FragColor = vec4(texture2D(texture,uv).xyz, 1.0);
}
