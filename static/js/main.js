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
	"modules/LayoutEngine",
	"modules/Tileset",
	"modules/Renderer",
	"modules/Scrollbars",
	"lib/Stats",
	"utils/xhr"
], function (LayoutEngine, Tileset, Renderer, Scrollbars, Stats, xhr) {
	'use strict';

	var tilesetwrapper = document.getElementById('tilesetwrapper');
	var layerwrapper = document.getElementById('layerwrapper');
	var layercanvas = document.getElementById('layercanvas');
	var animcanvas = document.getElementById('animcanvas');
	var parallaxcanvas = document.getElementById('parallaxcanvas');

	var tileset = new Tileset();
	var stats = new Stats();
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.right = '10px';
	stats.domElement.style.bottom = '10px';
	layerwrapper.appendChild(stats.domElement);

	var serverInfo = {};
	var j2tRegEx = /^.*\.?(j2t)$/i;

	var layerRenderer = new Renderer(layercanvas, true);
	//var parallaxRenderer = new Renderer(parallaxcanvas, false);

	var currentLayer = layerRenderer.setTileLayer(0, 256, 64, 1, 1, false);

	var selectedTiles = [[0]];
	var selectedTilesBuf = new Uint8Array([0, 0, 0, 0]);
	tileset.on('selection', function () {
		selectedTiles = tileset.selectedTiles;
		selectedTilesBuf = tileset.selectedTilesBuf;
	});

	var layoutEngine = new LayoutEngine({
		tileset: tileset,
		layerRenderer: layerRenderer
	});

	
	var animScroll = new Scrollbars({
		element: animcanvas,
		revealDistance: 50
	});
	animScroll.contentWidth = 400;
	animScroll.contentHeight = 400;
	var layerScroll = new Scrollbars({
		element: layercanvas,
		revealDistance: 130
	});
	layerScroll.contentWidth = 256*32;
	layerScroll.contentHeight = 64*32;

	animScroll.on('scroll', function () {
		
	});

	layerScroll.on('scroll', function () {
		
	});

	layoutEngine.on('update', function (sizes) {
		animScroll.update();
		layercanvas.width = Math.min(layerwrapper.offsetWidth, currentLayer.width*32);
		layercanvas.height = Math.min(layerwrapper.offsetHeight, currentLayer.height*32);
		layerRenderer.resizeViewport(layercanvas.width, layercanvas.height);
		layerScroll.update();
	});
	layoutEngine.update();

	var tilesetSelect           = document.getElementById('selecttileset');
	var noTilesetOption         = document.createElement('option');
	noTilesetOption.selected    = true;
	noTilesetOption.value       = JSON.stringify(["", "", 0, -1]);
	noTilesetOption.textContent = "« No tileset »";
	tilesetSelect.appendChild(noTilesetOption);
	tilesetSelect.addEventListener('change', tilesetSelectChange);

	function tilesetSelectChange() {
		var info = JSON.parse(tilesetSelect.value);
		
		if (info[0].length > 0) {
			
			tileset.load(info[0] /* filename */, info[3] /* folderIndex */, function () {
				
				if (layerRenderer.useWebGL) {
					layerRenderer.setTileset(tileset.glImg, tileset.j2t.info.info.tileCount);
				} else {
					layerRenderer.setTileset(tileset.image, tileset.j2t.info.info.tileCount);
				}
				layoutEngine.update();

			});
		} else {
			tileset.unload();
			
			
			if (layerRenderer.useWebGL) {
				layerRenderer.setTileset(tileset.glImg, 1);
			} else {
				layerRenderer.setTileset(tileset.image, 1);
			}
			layoutEngine.update();
			
		}

	}

	function reloadTilesetList() {
		
		tilesetSelect.disabled = true;
		
		xhr({uri: '/node/files/list', successCallback: function (x) {
			
			tilesetSelect.innerHTML = "";
			tilesetSelect.appendChild(noTilesetOption);
			//tilesetSelectChange();

			tilesetSelect.disabled = false;

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
	}

	var toggleTilesetImage = document.getElementById('toggleTilesetImage');
	var toggleTilesetMask = document.getElementById('toggleTilesetMask');
	var toggleTilesetTileType = document.getElementById('toggleTilesetTileType');
	var toggleTilesetEvents = document.getElementById('toggleTilesetEvents');
	var maskMode = 0;

	toggleTilesetImage.addEventListener('click', function () {
		if (maskMode === 1) {
			toggleTilesetMask.disabled = false;
			toggleTilesetImage.classList.add('selected');
			tileset.setMaskMode(2);
			maskMode = 2;
		} else if (maskMode === 2) {
			toggleTilesetMask.disabled = true;
			toggleTilesetImage.classList.remove('selected');
			tileset.setMaskMode(1);
			maskMode = 1;
		}
	}, false);
	toggleTilesetMask.addEventListener('click', function () {
		if (maskMode === 0) {
			toggleTilesetImage.disabled = false;
			toggleTilesetMask.classList.add('selected');
			tileset.setMaskMode(2);
			maskMode = 2;
		} else if (maskMode === 2) {
			toggleTilesetImage.disabled = true;
			toggleTilesetMask.classList.remove('selected');
			tileset.setMaskMode(0);
			maskMode = 0;
		}
	}, false);

	toggleTilesetTileType.addEventListener('click', function () {
		toggleTilesetEvents.classList.remove('selected');
		toggleTilesetEvents.disabled = false;
		toggleTilesetTileType.classList.add('selected');
		toggleTilesetTileType.disabled = true;
	}, false);
	toggleTilesetEvents.addEventListener('click', function () {
		toggleTilesetTileType.classList.remove('selected');
		toggleTilesetTileType.disabled = false;
		toggleTilesetEvents.classList.add('selected');
		toggleTilesetEvents.disabled = true;
	}, false);

	var tilesetProgress   = document.createElement('progress');
	tilesetProgress.id = 'tilesetProgress';
	tilesetProgress.value = 0;
	tilesetProgress.min   = 0;
	tilesetProgress.max   = 1;
	tilesetProgress.style.visibility = 'hidden';
	tilesetwrapper.appendChild(tilesetProgress);
	
	tileset.on('progress', function (p) {
		p = isFinite(p) ? p : 0;
		tilesetProgress.value = p;
		if (p === 0) {
			tilesetProgress.style.visibility = 'visible';
		} else if (p === 1) {
			tilesetProgress.style.visibility = 'hidden';
		}
	});

	

	function render() {
		stats.update();

		layerRenderer.draw(layercanvas.width/64 + layerScroll.scrollPosition[0]/32, layercanvas.height/64 + layerScroll.scrollPosition[1]/32);
		
		requestAnimFrame(render, layercanvas);
	};

	var layermdown = false;


	function layerCanvasMouseDown(e) {
		e.preventDefault();
		layermdown = true;
		layerCanvasMouseMove(e);

	}
	function layerCanvasMouseMove(e) {
		if (layermdown) {
			var x = Math.floor((e.pageX - layerwrapper.offsetLeft + layerScroll.scrollPosition[0])/32);
			var y = Math.floor((e.pageY - layerwrapper.offsetTop + layerScroll.scrollPosition[1])/32);

			if (x >= 0 && x < currentLayer.width && y >= 0 && y < currentLayer.height) {
				
				//var tileId = tileset.j2t.info? Math.floor(Math.random()*tileset.j2t.info.images.length) : 0;
				
				currentLayer.setTiles(x, y, selectedTiles, selectedTilesBuf);

				//if (!didRender) {requestAnimFrame(render, layerCanvas); didRender = true;}
			}
			
			
		}
	}
	function layerCanvasMouseUp(e) {
		layermdown = false;
	}
	layercanvas.addEventListener('mousedown', layerCanvasMouseDown);
	window.addEventListener('mousemove', layerCanvasMouseMove);
	window.addEventListener('mouseup', layerCanvasMouseUp);
	


	xhr({uri: '/node/info', successCallback: function (x) {
		serverInfo = JSON.parse(x.response);
		
		reloadTilesetList();

		requestAnimFrame(render, layerCanvas);
	}});






	return;






	var app = document.getElementById('app');

	var serverInfo = {};

	var j2tRegEx = /^.*\.?(j2t)$/i;

	var tileset = new Tileset();

	var tilesetContainer = document.createElement('div');
	tilesetContainer.id  = "tilesetContainer";

	var tilesetSelect       = document.createElement('select');
	tilesetSelect.className = "tileset";
	tilesetSelect.disabled  = true;

	var noTilesetOption         = document.createElement('option');
	noTilesetOption.selected    = true;
	noTilesetOption.value       = JSON.stringify(["", "", 0, -1]);
	noTilesetOption.textContent = "« No tileset »";

	var reloadTilesetListBtn         = document.createElement('button');
	reloadTilesetListBtn.disabled    = true;
	reloadTilesetListBtn.textContent = "Reload";

	var tilesetImageContainer = document.createElement('div');
	tilesetImageContainer.id  = "tilesetImageContainer";

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
	tileset.on('selection', function () {
		selectedTiles = tileset.selectedTiles;
		selectedTilesBuf = tileset.selectedTilesBuf;
	});

	tilesetSelect.appendChild(noTilesetOption);

	tilesetSelect.addEventListener('change', tilesetSelectChange);
	reloadTilesetListBtn.addEventListener('click', reloadTilesetList);

	

	//tilesetImageContainer.appendChild(tileset.mask);
	tilesetImageContainer.appendChild(tilesetProgress);
	tilesetImageContainer.appendChild(tileset.node);
	
	tilesetContainer.appendChild(tilesetSelect);
	tilesetContainer.appendChild(reloadTilesetListBtn);
	tilesetContainer.appendChild(tilesetImageContainer);

	
	var selectedTiles = [[0]];
	var selectedTilesBuf = new Uint8Array([0, 0, 0, 0]);

	app.appendChild(tilesetContainer);
	
	function tilesetSelectChangeXX() {
		var info = JSON.parse(tilesetSelect.value);
		
		if (info[0].length > 0) {
			
			tileset.load(info[0] /* filename */, info[3] /* folderIndex */, function () {
				
				if (layerRenderer.useWebGL) {
					layerRenderer.setTileset(tileset.glImg, tileset.j2t.info.info.tileCount);
				} else {
					layerRenderer.setTileset(tileset.image, tileset.j2t.info.info.tileCount);
				}

			});
		} else {
			tileset.unload();
			
			
			if (layerRenderer.useWebGL) {
				layerRenderer.setTileset(tileset.glImg, 1);
			} else {
				layerRenderer.setTileset(tileset.image, 1);
			}
			
			
			
		}
	};

	function reloadTilesetListXX () {
		
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
	
	var layerCanvas = document.createElement('canvas');

	var layerRenderer = new Renderer(layerCanvas, false);
	//layerRenderer.setTileset(tileset.glImg);
	layerRenderer.setTileLayer(0, 256, 64, 1, 1, false);
	var layer = layerRenderer.layers[0];
	var didRender = false;


	var layerContainer = document.createElement('div');

	layerContainer.appendChild(layerCanvas);

	var layerScroll = new Scrollbars({
		element: layerCanvas
	});
	layerScroll.contentWidth = layer.width*32;
	layerScroll.contentHeight = layer.height*32;

	layerScroll.on('scroll', function () {
		//if (!didRender) {requestAnimFrame(render, layerCanvas); didRender = true;}
	});
	

	function renderXX() {
		//console.log("render");
		stats.update();
		
		didRender = false;
		
		/*levelRenderer.setOffset(-20+2*Math.cos(n), -20+2*Math.sin(n));
		//levelRenderer.setScale(Math.sin(n)/3+2);
		levelRenderer.update();*/

		/*layerCanvas.style.left = Math.min(layerContainer.scrollLeft) + 'px';
		layerCanvas.style.top = Math.min(layerContainer.scrollTop) + 'px';
		console.log(layerCanvas.style.left, layerCanvas.style.top);*/

		
		/*var layer = layerRenderer.layers[0];
		var tileId = tileset.j2t.info? Math.floor(Math.random()*tileset.j2t.info.images.length) : 0;
		gl.bindTexture(gl.TEXTURE_2D, layer.tileTexture);
		gl.texSubImage2D(gl.TEXTURE_2D, 0, Math.floor(Math.random()*layer.width), Math.floor(Math.random()*layer.height), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([tileId % 256, Math.floor(tileId / 256), 0, 255]));*/
		
		


		//layerRenderer.setTileScale(Math.sin(n)/5+1.5);
		layerRenderer.draw(layerCanvas.width/64 + layerScroll.scrollPosition[0]/32, layerCanvas.height/64 + layerScroll.scrollPosition[1]/32);
		
		
		requestAnimFrame(render, layerCanvas);
		didRender = true;
	};
	if (!didRender) {requestAnimFrame(render, layerCanvas); didRender = true;}
	
	

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
	layerContainer.style.left = '323px';
	layerContainer.style.right = '0px';
	layerContainer.style.top = '26px';
	layerContainer.style.bottom = '0px';
	layerContainer.style.backgroundColor = 'rgb(32, 24, 80)';

	
	document.body.appendChild(layerContainer);
	layerContainer.appendChild(stats.domElement);
	



	xhr({uri: '/node/info', successCallback: function (x) {
		serverInfo = JSON.parse(x.response);
		
		reloadTilesetList();

	}});

	//var tileset = new Tileset();

	function winResize() {
		layerCanvas.width = Math.min(layerContainer.offsetWidth, layer.width*32);
		layerCanvas.height = Math.min(layerContainer.offsetHeight, layer.height*32);
		layerRenderer.resizeViewport(layerCanvas.width, layerCanvas.height);

		tileset.scrollbars.update();
		layerScroll.update();

		var lw = layerRenderer.layers[0].width*32;
		var lh = layerRenderer.layers[0].height*32;

		//if (!didRender) {requestAnimFrame(render, layerCanvas); didRender = true;}

		/*layerBg.style.width = lw+'px';
		layerBg.style.height = lh+'px';
		layerBg.style.borderRight = layerCanvas.width-Math.min(lw, layerCanvas.width)+'px solid rgb(32, 24, 80)';
		layerBg.style.borderBottom = layerCanvas.height-Math.min(lh, layerCanvas.height)+'px solid rgb(32, 24, 80)';*/
	};
	winResize();

	window.addEventListener('resize', winResize);

	

	
	
	
});