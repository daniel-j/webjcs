/*
   Author:
     djazz
*/

var modules = modules || {};
modules.formats = modules.formats || {};

modules.formats.J2T = (function (global) {
	'use strict';

	// Requirements
	var zlib   = utils.zlib;
	var Struct = utils.Struct;
	
	// Private variables
	var j2tHeaderStruct = new utils.Struct([
		{copyright: 'c180'},
		{magic:     'c4'},
		{signature: '+32'},
		{levelName: 'c32'},
		{version:   '+16'},
		{fileSize:  '+32'},
		{checksum:  '-32'},
		{streamSize: [
			['+32', '+32'],
			['+32', '+32'],
			['+32', '+32'],
			['+32', '+32']
		]}
	]);

	// Constructor
	var J2T = function () {
		
		j2tHeaderStruct.unpack(packed);
	};

	// Methods
	J2T.prototype.method_name = function () {
		// body...
	};


	return J2T;
}(window));