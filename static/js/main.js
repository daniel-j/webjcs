/*
   Author:
     djazz
*/

(function (global) {
	'use strict';

	var Tileset = modules.Tileset;
	var xhr = utils.xhr;

	var app = $('#app');

	var serverInfo = {};

	var j2tRegEx = /^.*\.?(j2t)$/i;


	var tilesetContainer      = $('<div id="tilesetContainer"></div>');
	var tilesetSelect         = $('<select class="tileset" disabled></select>');
	var noTilesetOption       = $('<option selected value=\'[\"\",\"\",0,-1]\'>« No tileset »</option>');
	var reloadTilesetListBtn  = $('<button disabled>Reload</button>');
	var tilesetImageContainer = $('<div id="tilesetImageContainer"></div>');
	var tilesetImage          = $('<img id="tilesetImage">');
	var tilesetProgress       = $('<progress min=0 max=1 value=0 />');

	var tileset = new Tileset();

	tilesetProgress.css({visibility: 'hidden'});
	tileset.on('progress', function (p) {
		p = isFinite(p) ? p : 0;
		tilesetProgress.val(p);
		if (p === 0) {
			tilesetProgress.css({visibility: 'visible'});
		} else if (p === 1) {
			tilesetProgress.css({visibility: 'hidden'});
		}
	});

	tilesetSelect.append(noTilesetOption);

	tilesetSelect.bind('change', tilesetSelectChange);
	reloadTilesetListBtn.click(reloadTilesetList);

	tilesetImageContainer.append(tileset.mask, tileset.image, tilesetProgress);
	
	tilesetContainer.append(tilesetSelect, reloadTilesetListBtn, tilesetImageContainer);

	app.append(tilesetContainer);
	
	function tilesetSelectChange() {
		var info = JSON.parse(tilesetSelect.val());
		
		if (info[0].length > 0) {
			tileset.load(info[0], info[3]);
		} else {
			tileset.unload();
		}
	};

	function reloadTilesetList() {
		
		tilesetSelect.attr('disabled', 'disabled');
		reloadTilesetListBtn.attr('disabled', 'disabled');

		
		xhr({uri: '/node/files/list', successCallback: function (x) {
			
			tilesetSelect.html('');
			tilesetSelect.append(noTilesetOption);
			tilesetSelectChange();

			tilesetSelect.removeAttr('disabled');
			reloadTilesetListBtn.removeAttr('disabled');

			function handleFile(arr, i, ul) {
				if (j2tRegEx.test(arr[i][0])) {
					var item = $('<option/>');
					item.text(arr[i][1]+' - '+arr[i][0]);
					
					item.val(JSON.stringify(arr[i]));
					
					if (arr[i][2] !== 0x200) {
						item.addClass('warning');
					}
					
					ul.append(item);
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
						
						var folder = $('<optgroup/>');
						folder.attr('label', f);

						for (var i = 0; i < list[f].length; i++) {
							handleFile(list[f], i, folder);
						}
						tilesetSelect.append(folder);
					}

				}
			}
			

		}});
	};
	
	xhr({uri: '/node/info', successCallback: function (x) {
		serverInfo = JSON.parse(x.response);
		
		reloadTilesetList();

	}});

	//var tileset = new Tileset();
	
	
	
}(window));