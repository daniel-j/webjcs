'use strict'

const bufferCache = new WeakMap()

function drawTriangle (gl) {
  let vertexBuf = bufferCache.get(gl)
  if (!vertexBuf) {
    vertexBuf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, -1, 4, 4, -1
    ]), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
    bufferCache.set(gl, vertexBuf)
  }

  gl.disable(gl.DEPTH_TEST)
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuf)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
}

module.exports = drawTriangle
