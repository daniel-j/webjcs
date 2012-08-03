/*
   Author:
     djazz
*/

var requestAnimFrame = (function(){
	return  window.requestAnimationFrame       || 
			window.webkitRequestAnimationFrame || 
			window.mozRequestAnimationFrame    || 
			window.oRequestAnimationFrame      || 
			window.msRequestAnimationFrame     || 
			function( callback ){
				window.setTimeout(callback, 1000 / 60);
			};
})();

require([
	"modules/Tileset",
	"modules/Renderer",
	"utils/xhr"
], function (Tileset, Renderer, xhr) {
	'use strict';

	var app = document.getElementById('app');

	var serverInfo = {};

	var j2tRegEx = /^.*\.?(j2t)$/i;

	var tileset = new Tileset();

	var tilesetContainer = document.createElement('div');
	tilesetContainer.id  = "tilesetContainer";

	var tilesetSelect       = document.createElement('select');
	tilesetSelect.className = "tileset";
	tilesetSelect.disabled  = true;

	var noTilesetOption             = document.createElement('option');
	noTilesetOption.selected    = true;
	noTilesetOption.value       = JSON.stringify(["", "", 0, -1]);
	noTilesetOption.textContent = "« No tileset »";

	var reloadTilesetListBtn         = document.createElement('button');
	reloadTilesetListBtn.disabled    = true;
	reloadTilesetListBtn.textContent = "Reload";

	var tilesetImageContainer = document.createElement('div');
	tilesetImageContainer.id  = "tilesetImageContainer";

	var tilesetImage = new Image();
	tilesetImage.id = "tilesetImage";

	var tilesetProgress   = document.createElement('progress');
	tilesetProgress.value = 0;
	tilesetProgress.min   = 0;
	tilesetProgress.max   = 1;
	tilesetProgress.style.visibility = 'hidden';
	
	tileset.on('progress', function (p) {
		p = isFinite(p) ? p : 0;
		tilesetProgress.value = p;
		if (p === 0) {
			tilesetProgress.style.visibility = 'visible';
		} else if (p === 1) {
			tilesetProgress.style.visibility = 'hidden';
		}
	});

	tilesetSelect.appendChild(noTilesetOption);

	tilesetSelect.addEventListener('change', tilesetSelectChange);
	reloadTilesetListBtn.addEventListener('click', reloadTilesetList);

	tilesetImageContainer.appendChild(tileset.mask);
	tilesetImageContainer.appendChild(tileset.image);
	tilesetImageContainer.appendChild(tilesetProgress);
	
	tilesetContainer.appendChild(tilesetSelect);
	tilesetContainer.appendChild(reloadTilesetListBtn);
	tilesetContainer.appendChild(tilesetImageContainer);

	app.appendChild(tilesetContainer);
	
	function tilesetSelectChange() {
		var info = JSON.parse(tilesetSelect.value);
		
		if (info[0].length > 0) {
			tileset.load(info[0], info[3], function () {
				layerRenderer.setSpriteSheet(tileset.raw, tileset.j2t.info.images.length);

			});
		} else {
			tileset.unload();
		}
	};

	function reloadTilesetList() {
		
		tilesetSelect.disabled = true;
		reloadTilesetListBtn.disabled = true;

		
		xhr({uri: '/node/files/list', successCallback: function (x) {
			
			tilesetSelect.innerHTML = "";
			tilesetSelect.appendChild(noTilesetOption);
			tilesetSelectChange();

			tilesetSelect.disabled = false;
			reloadTilesetListBtn.disabled = false;

			function handleFile(arr, i, ul) {
				if (j2tRegEx.test(arr[i][0])) {
					var item = document.createElement('option');
					item.textContent = arr[i][1]+' - '+arr[i][0];
					
					item.value = JSON.stringify(arr[i]);
					
					if (arr[i][2] !== 0x200) {
						item.classList.add('warning');
					}
					
					ul.appendChild(item);
				}
			};

			var list = JSON.parse(x.response);

			if (serverInfo.paths.merge_folders) {
				for (var i = 0; i < list.length; i++) {
					handleFile(list, i, tilesetSelect, -1);
				}
			} else {
				var folderIndex = 0;
				for (var f in list) {
					
					if (list[f].length !== 0) {
						
						var folder = document.createElement('optgroup');
						folder.label = f;

						for (var i = 0; i < list[f].length; i++) {
							handleFile(list[f], i, folder);
						}
						tilesetSelect.appendChild(folder);
					}

				}
			}
			

		}});
	};
	
	/*var levelRenderer = new Render({
		texture: tileset.image
	});

	$(levelRenderer.canvas).css({position: "absolute", left: "340px"});

	document.body.appendChild(levelRenderer.canvas);

	*/
	var n = 0;
	
	
	var layerCanvas = document.createElement('canvas');
	var layerGL = layerCanvas.getContext('webgl') || layerCanvas.getContext('experimental-webgl');

	var layerRenderer = new Renderer(layerGL);

	layerRenderer.setTileLayer(0, 50, 50);
	var render = function () {
		requestAnimFrame(render, layerCanvas);
		/*levelRenderer.setOffset(-20+2*Math.cos(n), -20+2*Math.sin(n));
		//levelRenderer.setScale(Math.sin(n)/3+2);
		levelRenderer.update();*/
		var gl = layerRenderer.gl;
		gl.bindTexture(gl.TEXTURE_2D, layerRenderer.layers[0].tileTexture);
		var tileId = tileset.j2t.info? Math.floor(Math.random()*tileset.j2t.info.images.length) : 0;
		gl.texSubImage2D(gl.TEXTURE_2D, 0, Math.floor(Math.random()*50), Math.floor(Math.random()*50), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([tileId % 256, Math.floor(tileId / 256), 0, 255]));
		layerRenderer.setTileScale(Math.sin(n)/5+1.5);
		layerRenderer.draw(25+Math.cos(n*1.5)*5, 25+Math.sin(n)*5);
		n+=0.02;
	};
	render();
	
	

	layerCanvas.style.position = 'absolute';
	layerCanvas.style.left = '337px';
	


	document.body.appendChild(layerCanvas);

	



	xhr({uri: '/node/info', successCallback: function (x) {
		serverInfo = JSON.parse(x.response);
		
		reloadTilesetList();

	}});

	//var tileset = new Tileset();

	function winResize() {
		layerCanvas.width = window.innerWidth - 337;
		layerCanvas.height = window.innerHeight;
		layerRenderer.resizeViewport(layerCanvas.width, layerCanvas.height);
	};
	winResize();
	window.addEventListener('resize', winResize);

	
	
	
});