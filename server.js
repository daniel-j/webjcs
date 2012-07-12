'use strict';

var http = require('http');
var url  = require('url');
var path = require('path');
var fs   = require('fs');
var mime = require('mime');

var validFileExt = ['j2l', 'j2t'];
var settings = {};

var validFileExtRegExp = new RegExp("^.*\.?("+validFileExt.join("|")+")$", "i");

function getRelativePath(filepath) {
	return path.join(__dirname, filepath)
};

fs.readFile(getRelativePath('settings.json'), 'utf8', function (err, data) {
	if (err) {
		console.error('Unable to load settings: '+err);
	}
	settings = JSON.parse(data);

	startServer();
});

function startServer() {

	var httpServer = http.createServer(function (req, res) {
		
		var username = "";

		var isLoggedIn = false;

		if (req.headers.authorization) {
			var details = new Buffer(req.headers.authorization.split(" ")[1], 'base64').toString('utf8').split(':');
			if (details[0].length > 0 && (settings.server.password.length === 0 || details[1] === settings.server.password)) {
				isLoggedIn = true;
				username = details[0];
			}
		}

		if (!isLoggedIn) {
			res.writeHead(401, {
				'WWW-Authenticate': 'Basic realm="WebJCS"',
				'Content-Type':     'text/plain'
			});
			res.end('401 Unauthorized');
			return;
		}
		
		var uri = url.parse(req.url, true);

		if (uri.pathname.indexOf('/node/') === 0) {
			switch (uri.pathname.substr(6)) {


				case 'info':
				var data = JSON.stringify({
					server: {
						collaboration: settings.server.collaboration
					},
					paths: {
						merge_folders: settings.paths.merge_folders
					}
				});
				res.writeHead(200, {
					'Content-Type': 'text/plain',
					'Content-Length': data.length
				});
				res.end(data);
				break;


				case 'files/list':
				getFileList(settings.paths.merge_folders, function (list) {
					var data = JSON.stringify(list);
					res.writeHead(200, {
						'Content-Type': 'text/plain',
						'Content-Length': data.length
					});
					res.end(data);
				});
				break;

				case 'files/get':
				if (typeof uri.query.n !== 'undefined' && uri.query.n.length > 0) {
					if (settings.paths.merge_folders) {
						getFileList(false, function (list) {
							var filename = "";
							for (var f = 0; f < settings.paths.folders.length; f++) {
								var files = list[settings.paths.folders[f]];
								if (files.indexOf(uri.query.n) !== -1) {
									filename = path.join(settings.paths.folders[f], uri.query.n);
									break;
								}
							}
							if (filename.length > 0) {
								httpGetFile(filename, req, res);
							} else {
								notFound(res);
							}
						});
					} else if (typeof uri.query.f !== 'undefined') {
						var filename = path.join(settings.paths.folders[+uri.query.f || 0], uri.query.n);
						httpGetFile(filename, req, res);
					} else {
						notFound(res);
					}
					
				} else {
					notFound(res);
				}
				break;


				default:
				notFound(res);
				break;

			}
			return;
		}

		var filename = path.join(__dirname, './static/', uri.pathname);

		if (filename.substr(-1) === "/") {
			filename += "index.html";
		}
		httpGetFile(filename, req, res);
		
	}).listen(settings.server.port, function () {
		console.log('WebJCS server started on port '+settings.server.port);
	});
};

function notFound(res) {
	res.writeHead(404, {'Content-Type': 'text/plain'});
	res.end('404 Not found');
};

function httpGetFile(filename, req, res) {
	fs.stat(filename, function (err, stats) {
		
		if (err) {
			notFound(res);
			return;
		}
		var type = mime.lookup(filename);
		
		var isCached = false;

		if (req.headers['if-modified-since']) {
			var req_date = new Date(req.headers['if-modified-since']);
			if (stats.mtime <= req_date && req_date <= Date.now()) {
				res.writeHead(304, {
					'Last-Modified': stats.mtime
				});
				res.end();
				isCached = true;
			}
		}

		if (!isCached) {
			fs.readFile(filename, function (err, data) {
				if (err) {
					/*res.writeHead(404, {'Content-Type': 'text/plain'});
					res.end('404 Not found\r\n'+err);*/
					notFound(res);
				} else {
					res.writeHead(200, {
						'Content-Type': type,
						'Content-Length': stats.size,
						'Last-Modified': stats.mtime
					});
					res.end(data);
				}
			});
		}
	});
};

function getFileList(merge_folders, callback) {
	var folders = settings.paths.folders;

	if (merge_folders) {
		var filelist = [];
	} else {
		var filelist = {};
	}
	
	if (folders.length === 0) {
		callback(filelist);
	}

	var counter = 0;

	function readdirCallback(folder) {
		return function (err, files) {
			if (err) {
				//console.error("Path not found/is not a directory: "+err.path);
			} else {
				for (var i = 0; i < files.length; i++) {
					if (validFileExtRegExp.test(files[i])) {
						if (merge_folders && filelist.indexOf(files[i]) === -1) {
							filelist.push(files[i]);
						} else if (!merge_folders) {
							filelist[folder].push(files[i]);
						}
					}
					
				}
			}
			
			counter++;
			if (counter === folders.length) { // All loaded
				callback(filelist);
			}
		};
	};

	for(var i = 0; i < folders.length; i++) {
		if (!merge_folders) {
			filelist[folders[i]] = [];
		}
		
		fs.readdir(folders[i], readdirCallback(folders[i]));
	}
};
