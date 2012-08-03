
/*
 * Copyright (c) 2011 Brandon Jones
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */

define(function() {

    "use strict";

    var ShaderWrapper = function(gl, program) {
        var i, attrib, uniform, count, name;

        this.program = program;
        this.attribute = {};
        this.uniform = {};

        count = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        for (i = 0; i < count; i++) {
            attrib = gl.getActiveAttrib(program, i);
            this.attribute[attrib.name] = gl.getAttribLocation(program, attrib.name);
        }

        count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (i = 0; i < count; i++) {
            uniform = gl.getActiveUniform(program, i);
            name = uniform.name.replace("[0]", "");
            this.uniform[name] = gl.getUniformLocation(program, name);
        }
    };

    return {
        ShaderWrapper: ShaderWrapper,

        getContext: function(canvas, options) {
            var context;
        
            if (canvas.getContext) {
                try {
                    context = canvas.getContext('webgl', options);
                    if(context) { return context; }
                } catch(ex) {}
            
                try {
                    context = canvas.getContext('experimental-webgl', options);
                    if(context) { return context; }
                } catch(ex) {}
            }
        
            return null;
        },
    
        showGLFailed: function(element) {
            var errorElement = document.createElement("div");
            var errorHTML = "<h3>Sorry, but a WebGL context could not be created</h3>";
            errorHTML += "Either your browser does not support WebGL, or it may be disabled.<br/>";
            errorHTML += "Please visit <a href=\"http://get.webgl.org\">http://get.webgl.org</a> for ";
            errorHTML += "details on how to get a WebGL enabled browser.";
            errorElement.innerHTML = errorHTML;
            errorElement.id = "gl-error";
            element.parentNode.replaceChild(errorElement, element);
        },
    
        createProgram: function(gl, vertexShaderSource, fragmentShaderSource) {
            var shaderProgram = gl.createProgram(),
                vs = this.compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER),
                fs = this.compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

            gl.attachShader(shaderProgram, vs);
            gl.attachShader(shaderProgram, fs);
            gl.linkProgram(shaderProgram);

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
                console.error("Shader program failed to link");
                gl.deleteProgram(shaderProgram);
                gl.deleteShader(vs);
                gl.deleteShader(fs);
                return null;
            }

            return new ShaderWrapper(gl, shaderProgram);
        },

        compileShader: function(gl, source, type) {
            var shaderHeader = "\n";

            var shader = gl.createShader(type);

            gl.shaderSource(shader, shaderHeader + source);
            gl.compileShader(shader);

            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                var typeString = "";
                switch(type) {
                    case gl.VERTEX_SHADER: typeString = "VERTEX_SHADER"; break;
                    case gl.FRAGMENT_SHADER: typeString = "FRAGMENT_SHADER"; break;
                }
                console.error(typeString, gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }

            return shader;
        }
    };
});