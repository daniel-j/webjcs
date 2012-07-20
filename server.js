'use strict';

var http = require('http');
var url  = require('url');
var path = require('path');
var fs   = require('fs');
var mime = require('mime');
var zlib = require('zlib');
var formidable = require('formidable');
var Struct = require(getRelativePath('static/js/modules/Struct.js')).Struct;

var validFileExt = ['j2l', 'j2t'];
var settings = {};

var structs = {
	j2t: {
		header: new Struct([
			{copyright: '180'},
			{magic:     '4'},
			{signature: new Uint32Array(1)},
			{title: '32'},
			{version:   new Uint16Array(1)},
			{fileSize:  new Uint32Array(1)},
			{checksum:  new Int32Array(1)},
			{streamSize: [
				new Uint32Array(2),
				new Uint32Array(2),
				new Uint32Array(2),
				new Uint32Array(2)
			]}
		])
	},
	j2l: {
		header: new Struct([
			{copyright: '180'},
			{magic:     '4'},
			{passwordHash: '3'},
			{hommecooked: new Uint8Array(1)},
			{levelName: '32'},
			{version:   new Uint16Array(1)},
			{fileSize:  new Uint32Array(1)},
			{checksum:  new Int32Array(1)},
			{streamSize: [
				new Uint32Array(2),
				new Uint32Array(2),
				new Uint32Array(2),
				new Uint32Array(2)
			]}
		])
	}
};

var validFileExtRegExp = new RegExp("^.*\.?("+validFileExt.join("|")+")$", "i");

function getRelativePath(filepath) {
	return path.join(__dirname, filepath)
};

fs.readFile(getRelativePath('settings.json'), 'utf8', function (err, data) {
	if (err) {
		console.error('Unable to load settings: '+err);
		return;
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
					'Content-Type': 'text/plain'
				});
				res.end(data);
				break;


				case 'files/list':
				getFileList(settings.paths.merge_folders, function (list) {
					var data = JSON.stringify(list);
					res.writeHead(200, {
						'Content-Type': 'text/plain'
					});
					res.end(data);
				});
				break;

				case 'files/get':
				if (typeof uri.query.n !== 'undefined' && uri.query.n.length > 0 && typeof uri.query.f !== 'undefined') {

					if (typeof uri.query.f !== 'undefined') {
						var filename = path.join(settings.paths.folders[+uri.query.f || 0], uri.query.n);
						console.log('GET:', filename);
						if (uri.query.parse && uri.query.parse.length > 0) {
							httpGetParsedFile(filename, req, res, true, uri.query.parse);
						} else {
							httpGetFile(filename, req, res, true);
						}
						
						
					} /*else if (settings.paths.merge_folders) {
						getFileList(false, function (list) {
							
							var filename = "";
							for (var f = 0; f < settings.paths.folders.length; f++) {
								var files = list[settings.paths.folders[f]];
								for (var i = 0; i < files.length; i++) {
									if (files[i][0] === uri.query.n) {
										filename = path.join(settings.paths.folders[f], uri.query.n);
										break;
									}
									
								}
								if (filename.length > 0) {
									break;
								}
								
							}
							
							if (filename.length > 0) {
								httpGetFile(filename, req, res, true);
							} else {
								notFound(res);
							}
						});
					}*/ else {
						notFound(res);
					}

					
				} else {
					notFound(res);
				}
				break;


				case 'zlib':
				if (typeof uri.query.deflate !== 'undefined' || typeof uri.query.inflate !== 'undefined') {
					var form = new formidable.IncomingForm();
					form.parse(req, function(err, fields, files) {
						if (files && files.data && files.data.path) {
							var filepath = files.data.path;
							fs.readFile(filepath, function (err, file) {
								fs.unlink(filepath);
								if (typeof uri.query.deflate !== 'undefined') {
									zlib.deflate(file, function (err, data) {
										if (err) {
											console.log('zlib deflate error: '+err);
											res.end();
										} else {
											res.writeHead({
												'Content-Length': data.length
											})
											res.end(data);
										}
									});
								} else {
									zlib.inflate(file, function (err, data) {
										if (err) {
											console.log('zlib inflate error: '+err);
											res.end();
										} else {
											res.writeHead({
												'Content-Length': data.length
											})
											res.end(data);
										}
									});
								}
							});
						} else {
							res.end();
						}
					});
				}
				break;


				default:
				notFound(res);
				break;

			}
			return;
		}

		var filename = path.join(__dirname, './static/', uri.pathname);

		if (uri.pathname.substr(-1) === "/") {
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



function httpGetFile(filename, req, res, skipCache) {
	fs.stat(filename, function (err, stats) {
		
		if (err) {
			notFound(res);
			return;
		}
		var type = mime.lookup(filename);
		
		var isCached = false;

		if (req.headers['if-modified-since'] && !skipCache) {
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
					var headers = {
						'Content-Type': type,
						'Content-Length': stats.size
					};
					if (!skipCache) {
						headers['Last-Modified'] = stats.mtime;
					}
					res.writeHead(200, headers);
					res.end(data);
				}
			});
		}
	});
};

function httpGetParsedFile(filename, req, res, skipCache, type) {
	fs.stat(filename, function (err, stats) {
		
		if (err) {
			notFound(res);
			return;
		}
		
		var isCached = false;

		if (req.headers['if-modified-since'] && !skipCache) {
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
			
			fs.readFile(filename, function (err, file) {

				if (err) {
					notFound(res);
					return;
				}
				
				var headers = {
					//'content-type': 'application/octet-stream'
				};

				var streams = new Array(4);
				var loaded = 0;
				var totalSize = 262;
				var offset = 262;
				for (var i = 0; i < 4; i++) {
					var size = file.readUInt32LE(230+i*8);
					zlib.inflate(file.slice(offset, offset+size), inflateCallback(i));
					offset += size;
				}

				function inflateCallback(i) {
					return function (err, data) {
						streams[i] = data;
						totalSize += data.length;
						loaded++;
						if (loaded === 4) {
							
							var outputBuffer = new Buffer(totalSize);
							
							file.copy(outputBuffer, 0, 0, 262);
							var offset = 262;
							for (var j = 0; j < 4; j++) {
								streams[j].copy(outputBuffer, offset);
								offset += streams[j].length;
							}
							var acceptEncoding = req.headers['accept-encoding'];
							if (!acceptEncoding) {
								acceptEncoding = [];
							} else {
								acceptEncoding = acceptEncoding.split(",");
							}

							headers['X-Total-Content-Length'] = outputBuffer.length;

							if (acceptEncoding.indexOf('deflate')) {
								 headers['Content-Encoding'] = 'deflate';
								 zlib.deflate(outputBuffer, compressCallback);
							} else if (acceptEncoding.indexOf('gzip')) {
								 headers['Content-Encoding'] = 'gzip';
								 zlib.gzip(outputBuffer, compressCallback);
							} else {
								compressCallback(null, outputBuffer);
							}

							
						}
					};
				};
				
				function compressCallback(err, data) {
					if (err) {
						notFound(res);
						return;
					}
					headers['Content-Length'] = data.length;
					if (!skipCache) {
						headers['Last-Modified'] = stats.mtime;
					}
					
					res.writeHead(200, headers);
					res.end(data);
				};

			});
		}
	});
};

function alphabeticSort(a, b) {
	a = a[1].toLowerCase();
	b = b[1].toLowerCase();
	
	if (a < b) {
		return -1;
	} else if (a > b) {
		return 1;
	} else {
		return 0;
	}
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
	var addedFiles = [];
	var counter = 0;
	var total = 0;

	function getFileHeaderCallback(arr, filename, folderIndex) {
		total++;
		
		return function (err, data) {
			if (err) {
				//console.log(err);
			} else {
				
				if ((merge_folders && addedFiles.indexOf(filename) === -1) || !merge_folders) {
					arr.push([filename, data.title, data.version, folderIndex]);
					if (merge_folders) {
						addedFiles.push(filename);
					}
				}
				

				
			}
			counter++;
			if (counter === total) { // All loaded

				if (merge_folders) {
					filelist.sort(alphabeticSort);
				} else {
					for (var f in filelist) {
						filelist[f].sort(alphabeticSort);
					}
				}

				callback(filelist);
			}
		};

	};

	function readdirCallback(folder, folderIndex) {
		return function (err, files) {

			if (err) {
				//console.error("Path not found/is not a directory: "+err.path);
			} else {
				
				for (var i = 0; i < files.length; i++) {
					if (validFileExtRegExp.test(files[i])) {

						if (merge_folders) {
							getFileHeader(path.join(folder, files[i]), getFileHeaderCallback(filelist, files[i], folderIndex));
						} else {
							getFileHeader(path.join(folder, files[i]), getFileHeaderCallback(filelist[folder], files[i], folderIndex));
						}
						
						
					}
					
				}
			}
			
		};
	};

	for(var i = 0; i < folders.length; i++) {
		if (!merge_folders) {
			filelist[folders[i]] = [];
		}
		
		fs.readdir(folders[i], readdirCallback(folders[i], i));
	}
};

function getFileHeader(filename, callback) {
	
	fs.open(filename, 'r', function (err, fd) {
		if (err) {
			callback(err);
		} else {
			fs.read(fd, new Buffer(262), 0, 262, 0, function (err, bytesRead, buffer) {
				if (err) {
					callback(err);
				} else {
					fs.close(fd);
					callback(null, structs.j2t.header.unpack(new Uint8Array(buffer).buffer));
				}
			});
		}
	});
	
};


