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
	"modules/Scrollbars",
	"lib/Stats",
	"utils/xhr"
], function (Tileset, Renderer, Scrollbars, Stats, xhr) {
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

	var tilesetScroll = new Scrollbars({
		element: tileset.image,
		revealDistance: 130
	});
	tilesetScroll.on('scroll', function () {
		tileset.image.style.top = -tilesetScroll.scrollPosition[1]+'px';
	});
	tilesetScroll.contentWidth = 320;

	app.appendChild(tilesetContainer);
	
	function tilesetSelectChange() {
		var info = JSON.parse(tilesetSelect.value);
		
		if (info[0].length > 0) {
			tileset.load(info[0] /* filename */, info[3] /* folderIndex */, function () {
				layerRenderer.setTileset(tileset.raw, tileset.j2t.info.images.length);
				tilesetScroll.contentHeight = tileset.image.height;
				tilesetScroll.update();

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
	
	var stats = new Stats();

	var n = 0;
	
	
	var layerCanvas = document.createElement('canvas');
	var layerGL = layerCanvas.getContext('webgl') || layerCanvas.getContext('experimental-webgl');

	var layerRenderer = new Renderer(layerGL);

	layerRenderer.setTileLayer(0, 256, 64, 1, 1, false);
	var layer = layerRenderer.layers[0];


	var layerContainer = document.createElement('div');

	layerContainer.appendChild(layerCanvas);

	var layerScroll = new Scrollbars({
		element: layerCanvas
	});
	layerScroll.contentWidth = layer.width*32;
	layerScroll.contentHeight = layer.height*32;
	

	var render = function () {
		requestAnimFrame(render, layerCanvas);
		/*levelRenderer.setOffset(-20+2*Math.cos(n), -20+2*Math.sin(n));
		//levelRenderer.setScale(Math.sin(n)/3+2);
		levelRenderer.update();*/

		/*layerCanvas.style.left = Math.min(layerContainer.scrollLeft) + 'px';
		layerCanvas.style.top = Math.min(layerContainer.scrollTop) + 'px';
		console.log(layerCanvas.style.left, layerCanvas.style.top);*/

		var gl = layerRenderer.gl;
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		
		/*var layer = layerRenderer.layers[0];
		var tileId = tileset.j2t.info? Math.floor(Math.random()*tileset.j2t.info.images.length) : 0;
		gl.bindTexture(gl.TEXTURE_2D, layer.tileTexture);
		gl.texSubImage2D(gl.TEXTURE_2D, 0, Math.floor(Math.random()*layer.width), Math.floor(Math.random()*layer.height), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([tileId % 256, Math.floor(tileId / 256), 0, 255]));*/
		
		


		//layerRenderer.setTileScale(Math.sin(n)/5+1.5);
		layerRenderer.draw(layerCanvas.width/64 + layerScroll.scrollPosition[0]/32, layerCanvas.height/64 + layerScroll.scrollPosition[1]/32);
		n+=0.02;
		stats.update();
	};
	render();
	
	

	layerCanvas.style.position = 'absolute';
	layerCanvas.style.left = '0px';
	layerCanvas.style.top = '0px';
	layerCanvas.style.cursor = 'crosshair';
	layerCanvas.style.backgroundColor = '#4830A8';

	stats.domElement.style.position = 'absolute';
	stats.domElement.style.right = '10px';
	stats.domElement.style.bottom = '10px';

	
	layerContainer.style.overflow = "hidden";
	layerContainer.style.position = 'absolute';
	layerContainer.style.left = '320px';
	layerContainer.style.right = '0px';
	layerContainer.style.top = '26px';
	layerContainer.style.bottom = '0px';
	layerContainer.style.backgroundColor = 'rgb(32, 24, 80)';

	
	document.body.appendChild(layerContainer);
	layerContainer.appendChild(stats.domElement);
	var mdown = false;


	function layerCanvasMouseDown(e) {
		e.preventDefault();
		mdown = true;
		layerCanvasMouseMove(e);

	};
	function layerCanvasMouseMove(e) {
		if (mdown) {
			var x = Math.floor((e.pageX - layerContainer.offsetLeft + layerScroll.scrollPosition[0])/32);
			var y = Math.floor((e.pageY - layerContainer.offsetTop + layerScroll.scrollPosition[1])/32);

			
			var layer = layerRenderer.layers[0];

			if (x >= 0 && x < layer.width && y >= 0 && y < layer.height) {
				var gl = layerRenderer.gl;
				
				var tileId = tileset.j2t.info? Math.floor(Math.random()*tileset.j2t.info.images.length) : 0;
				gl.bindTexture(gl.TEXTURE_2D, layer.tileTexture);
				gl.texSubImage2D(gl.TEXTURE_2D, 0, Math.floor(x), Math.floor(y), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([tileId % 256, Math.floor(tileId / 256), 0, 255]));
			}
			
			
		}
	};
	function layerCanvasMouseUp(e) {
		mdown = false;
	};



	xhr({uri: '/node/info', successCallback: function (x) {
		serverInfo = JSON.parse(x.response);
		
		reloadTilesetList();

	}});

	//var tileset = new Tileset();

	function winResize() {
		layerCanvas.width = Math.min(layerContainer.offsetWidth, layer.width*32);
		layerCanvas.height = Math.min(layerContainer.offsetHeight, layer.height*32);
		layerRenderer.resizeViewport(layerCanvas.width, layerCanvas.height);

		tilesetScroll.update();
		layerScroll.update();

		var lw = layerRenderer.layers[0].width*32;
		var lh = layerRenderer.layers[0].height*32;
		/*layerBg.style.width = lw+'px';
		layerBg.style.height = lh+'px';
		layerBg.style.borderRight = layerCanvas.width-Math.min(lw, layerCanvas.width)+'px solid rgb(32, 24, 80)';
		layerBg.style.borderBottom = layerCanvas.height-Math.min(lh, layerCanvas.height)+'px solid rgb(32, 24, 80)';*/
	};
	winResize();

	window.addEventListener('resize', winResize);

	layerCanvas.addEventListener('mousedown', layerCanvasMouseDown);
	window.addEventListener('mousemove', layerCanvasMouseMove);
	window.addEventListener('mouseup', layerCanvasMouseUp);

	
	
	
});