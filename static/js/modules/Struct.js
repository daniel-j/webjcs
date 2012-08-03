/*
   Author:
     djazz
*/

var StructConstructor = function () {
	'use strict';
	
	// Helpers
	function insertData(dv, pos, type, data) {
		

		var size = 0;

		if (typeof type === 'string') {
			size = +type;
			for (var i = 0; i < size; i++) {
				dv.setUint8(pos + i, data.charCodeAt(i) || 0);
			}
		} else {
			size = type.byteLength;
			var partSize = size/type.length;
			var cmd = type.toString();
			cmd = cmd.substring(8, cmd.length-6);
			
			for (var i = 0; i < type.length; i++) {
				dv['set'+cmd](pos + partSize*i, data[i] || data, true);
			}

		}

		//console.log(pos, size, type, data);

		return size;
	};
	
	function readData(dv, pos, type) {
		
		var size = 0;
		var value = null;

		

		if (typeof type === 'string') {
			size = +type;
			var str = '';
			for (var i = 0; i < size; i++) {
				var byte = dv.getUint8(pos + i);
				if (byte === 0) {
					break;
				}
				str += String.fromCharCode(byte);
			}
			value = str;
			
		} else {
			size = type.byteLength;
			var partSize = size/type.length;
			var cmd = type.constructor.toString();
			cmd = cmd.substring(9, cmd.indexOf("() ")-5);
			

			for (var i = 0; i < type.length; i++) {
				type[i] = dv['get'+cmd](pos + partSize*i, true);

			}

			if (type.length === 1) {
				value = type[0];
			} else {
				value = type;
			}
			

		}
		
		//console.log(pos, size, cmd, value);

		return {data: value, size: size};
	};
	
	
	// Constructor
	var Struct = function (struct) {
		var self = this;
		
		this.size = 0;
		this.struct = struct;
		
		
		function recursive(key, subStruct) {
			if (Array.isArray(subStruct)) {
				for(var i = 0; i < subStruct.length; i++) {
					recursive(key, subStruct[i]);
				}
			} else {
				
				if (typeof subStruct === 'string') {
					self.size += +subStruct;
				} else {
					self.size += subStruct.byteLength;
				}

			}
		};
		
		
		for (var i = 0; i < struct.length; i++) {
			var key = Object.keys(struct[i])[0];
			
			if (!Array.isArray(struct[i][key])) {

				if (typeof struct[i][key] === 'string') {
					self.size += +struct[i][key];
				} else {
					self.size += struct[i][key].byteLength;
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
			if (Array.isArray(subStruct)) {
				for(var i = 0; i < subStruct.length; i++) {
					recursive(key, subStruct[i], subData[i]);
				}
			} else {
				writePosition += insertData(dv, writePosition, subStruct, subData);
			}
		};
		
		for (var i = 0; i < struct.length; i++) {
			var key = Object.keys(struct[i])[0];
			
			if (!Array.isArray(struct[i][key])) {
				writePosition += insertData(dv, writePosition, struct[i][key], data[key]);
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
			if (Array.isArray(subStruct)) {
				for(var i = 0; i < subStruct.length; i++) {
					subData[i] = [];
					recursive(key, subStruct[i], subData[i], subData, i);
				}
			} else {

				var result = readData(dv, readPosition, subStruct);

				parentData[index] = result.data;
				readPosition += result.size;
				
			}
		};
		
		for (var i = 0; i < struct.length; i++) {
			var key = Object.keys(struct[i])[0];
			
			if (!Array.isArray(struct[i][key])) {
				//var type = struct[i][key].charAt(0);
				//var size = +struct[i][key].substr(1);
				
				var result = readData(dv, readPosition, struct[i][key]);

				data[key] = result.data;
				readPosition += result.size;

			} else {
				data[key] = [];
				recursive(key, struct[i][key], data[key], data, 0);
			}
		}
		
		return data;
		
	};
	
	
	return Struct;
};

if (typeof exports !== 'undefined') {
	exports.Struct = StructConstructor();
} else {
	define(StructConstructor);
}

/*var headerStruct = new utils.Struct([
	{copyright: '180'},
	{magic:     '4'},
	{signature: new Uint32Array(1)},
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
]);

var packed = headerStruct.pack({
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
});

console.log(new Uint16Array(packed));

console.log(headerStruct.unpack(packed));*/