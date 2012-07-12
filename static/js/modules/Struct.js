/*
   Author:
     djazz
*/

var utils = utils || {};

utils.Struct = (function (global) {
	'use strict';
	
	// Requirements
	
	// Helpers
	function insertData(dv, pos, type, size, data) {
		//console.log(pos, type, data);
		if (type === 'c') {
			for (var i = 0; i < size; i++) {
				dv.setUint8(pos + i, data.charCodeAt(i) || 0);
			}
		} else if (type === '-') {
			dv['setInt'+size](pos, data, true);
		} else if (type === '+') {
			dv['setUint'+size](pos, data, true);
		} else if (type === 'f') {
			dv['setFloat'+size](pos, data, true);
		}
	};
	
	function readData(dv, pos, type, size) {
		
		var value = null;
		
		if (type === 'c') {
			var str = "";
			for (var i = 0; i < size; i++) {
				var byte = dv.getUint8(pos + i);
				if (byte === 0) {
					break;
				}
				str += String.fromCharCode(byte);
			}
			value = str;
		} else if (type === '-') {
			value = dv['getInt'+size](pos, true);
		} else if (type === '+') {
			value = dv['getUint'+size](pos, true);
		} else if (type === 'f') {
			value = dv['getFloat'+size](pos, true);
		}
		
		return value;
	};
	
	
	// Constructor
	var Struct = function (struct) {
		var self = this;
		
		this.size = 0;
		this.struct = struct;
		this.rawStruct = [];
		
		function recursive(key, subStruct) {
			if (typeof subStruct === 'object' && subStruct.length >= 0) {
				for(var i = 0; i < subStruct.length; i++) {
					recursive(key, subStruct[i]);
				}
			} else {
				var type = subStruct.charAt(0);
				var size = +subStruct.substr(1);
				
				self.rawStruct.push({type: type, size: size});
				
				if (type === 'c') {
					self.size += size;
				} else if (type === '+' || type === '-' || type === 'f') {
					self.size += size/8;
					
				} else {
					
				}
			}
		};
		
		
		for (var i = 0; i < struct.length; i++) {
			var key = Object.keys(struct[i])[0];
			
			if (typeof struct[i][key] !== 'object') {
				
				var type = struct[i][key].charAt(0);
				var size = +struct[i][key].substr(1);
				
				self.rawStruct.push({type: type, size: size});
				
				if (type === 'c') {
					self.size += size;
				} else if (type === '+' || type === '-' || type === 'f') {
					self.size += size/8;
				} else {
					
				}
			} else {
				recursive(key, struct[i][key]);
			}
		}
		
	};

	// Methods
	Struct.prototype.pack = function (data) {
		
		var output = new ArrayBuffer(this.size);
		var dv = new DataView(output);
		
		var struct = this.struct;
		
		var writePosition = 0;
		
		function recursive(key, subStruct, subData) {
			if (typeof subStruct === 'object' && subStruct.length >= 0) {
				for(var i = 0; i < subStruct.length; i++) {
					recursive(key, subStruct[i], subData[i]);
				}
			} else {
				var type = subStruct.charAt(0);
				var size = +subStruct.substr(1);
				
				if (type === 'c') {
					insertData(dv, writePosition, type, size, subData);
					writePosition += size;
				} else if (type === '+' || type === '-' || type === 'f') {
					insertData(dv, writePosition, type, size, subData);
					writePosition += size/8;
				} else {
					
				}
				
			}
		};
		
		for (var i = 0; i < struct.length; i++) {
			var key = Object.keys(struct[i])[0];
			
			if (typeof struct[i][key] !== 'object') {
				var type = struct[i][key].charAt(0);
				var size = +struct[i][key].substr(1);
				
				if (type === 'c') {
					insertData(dv, writePosition, type, size, data[key]);
					writePosition += size;
				} else if (type === '+' || type === '-' || type === 'f') {
					insertData(dv, writePosition, type, size, data[key]);
					writePosition += size/8;
				} else {
					
				}
			} else {
				recursive(key, struct[i][key], data[key]);
			}
		}
		
		return output;
	};
	
	Struct.prototype.unpack = function (buffer) {
		
		var self = this;
		
		var data = {};
		var dv = new DataView(buffer);
		
		var struct = this.struct;
		
		var readPosition = 0;
		
		function recursive(key, subStruct, subData, parentData, index) {
			if (typeof subStruct === 'object' && subStruct.length >= 0) {
				for(var i = 0; i < subStruct.length; i++) {
					subData[i] = [];
					recursive(key, subStruct[i], subData[i], subData, i);
				}
			} else {
				var type = subStruct.charAt(0);
				var size = +subStruct.substr(1);
				
				if (type === 'c') {
					parentData[index] = readData(dv, readPosition, type, size);
					readPosition += size;
				} else if (type === '+' || type === '-' || type === 'f') {
					parentData[index] = readData(dv, readPosition, type, size);
					readPosition += size/8;
				} else {
					
				}
				
			}
		};
		
		for (var i = 0; i < struct.length; i++) {
			var key = Object.keys(struct[i])[0];
			
			if (typeof struct[i][key] !== 'object') {
				var type = struct[i][key].charAt(0);
				var size = +struct[i][key].substr(1);
				
				if (type === 'c') {
					data[key] = readData(dv, readPosition, type, size);
					readPosition += size;
				} else if (type === '+' || type === '-' || type === 'f') {
					data[key] = readData(dv, readPosition, type, size);
					
					readPosition += size/8;
				} else {
					
				}
			} else {
				data[key] = [];
				recursive(key, struct[i][key], data[key], data, 0);
			}
		}
		
		return data;
		
	};
	
	
	return Struct;
}(window));


/*var packed = j2tHeader.pack({
	copyright: 'blahblahblahblahblahblahblahblahblahblahblahblahblahblahblahblahblahblah',
	magic:     'TILE',
	signature: 0xAFBEADDE, // DEAD BEAF
	levelName: 'My level',
	version:   0x200,
	fileSize:  123456789,
	checksum:  1337,
	streamSize: [
		[1, 2],
		[3, 4],
		[5, 6],
		[7, 8],
	]
});*/

