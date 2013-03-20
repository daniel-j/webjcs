define(function () {
	'use strict';

	function LayoutEngine(config) {
		var self = this;

		var panelwrapper = document.getElementById('panelwrapper');
		var leftpanel = document.getElementById('leftpanel');
		var mainpanel = document.getElementById('mainpanel');

		var tilesetwrapper = document.getElementById('tilesetwrapper');
		var layerwrapper = document.getElementById('layerwrapper');
		var animwrapper = document.getElementById('animwrapper');
		var parallaxwrapper = document.getElementById('parallaxwrapper');

		var tilesettoolbar = document.getElementById('tilesettoolbar');
		var layertoolbar = document.getElementById('layertoolbar');
		var animtoolbar = document.getElementById('animtoolbar');
		var parallaxtoolbar = document.getElementById('parallaxtoolbar');

		var tilesetscrollfix = document.getElementById('tilesetscrollfix');
		var tileset = config.tileset;
		tilesetwrapper.appendChild(tileset.node);

		var layerRenderer = config.layerRenderer;

		var layercanvas = document.getElementById('layercanvas');
		var animcanvas = document.getElementById('animcanvas');
		var parallaxcanvas = document.getElementById('parallaxcanvas');

		var scrollbarWidth  = 0;
		var scrollbarHeight = 0;
		var toolbarHeight = layertoolbar.offsetHeight;

		// Scope
		(function () {

			// Create and prepare the measurement node
			var div = document.createElement("div");
			div.style.overflow = "scroll";
			div.style.position = "absolute";
			div.style.visibility = "hidden";

			// Append the DIV
			document.body.appendChild(div);

			// Get the scrollbar width
			scrollbarWidth = div.offsetWidth - div.clientWidth;
			scrollbarHeight = div.offsetHeight - div.clientHeight;

			// Delete the DIV
			document.body.removeChild(div);

			animwrapper.style.height = (typeof localStorage['webjcs2-animheight'] !== 'undefined'? localStorage['webjcs2-animheight'] : 128)+"px";
			parallaxwrapper.style.height = (typeof localStorage['webjcs2-parallaxheight'] !== 'undefined'? localStorage['webjcs2-parallaxheight'] : 160)+"px";
		}());
		
		var sizes = {
			tileset: tilesetwrapper.offsetHeight,
			anim: animwrapper.offsetHeight,
			layer: layerwrapper.offsetHeight,
			parallax: parallaxwrapper.offsetHeight,
			total: panelwrapper.offsetHeight
		}

		var events = this.events = {};

		this.emit = function (name, value) {
			if (self.events[name] && self.events[name].length > 0) {
				for (var i = 0; i < self.events[name].length; i++) {
					self.events[name][i].call(self, value);
				}
			}
		};

		this.on = function (name, callback) {
			self.events[name] = self.events[name] || [];
			self.events[name].push(callback);
		};

		this.unbind = function (name, callback) {
			var index;
			if (self.events[name]) {
				for (var i = 0; i < self.events[name].length; i++) {
					if ((index = self.events[name].indexOf(callback)) > -1) {
						self.events[name].splice(index, 1);
					}
				}
				if (self.events[name].length === 0) {
					delete self.events[name];
				}
			}
		};


		var mdownpos = false;
		var mdownheight = 0;
		var mtarget = 0;

		function handleMouseDown(e) {
			
			if (e.target !== animtoolbar && e.target !== parallaxtoolbar && e.target !== animtoolbar.firstChild && e.target !== parallaxtoolbar.firstChild) {
				return;
			}

			e.stopPropagation();
			e.preventDefault();
			
			mdownpos = e.pageY;
			
			if (e.target === animtoolbar || e.target === animtoolbar.firstChild) {
				mdownheight = sizes.anim;
				mtarget = self.ANIM;
			} else {
				mdownheight = sizes.parallax;
				mtarget = self.PARALLAX;
			}
		}

		function handleMouseMove(e) {
			if (mdownpos !== false) {
				var y = e.pageY;
				var offset = mdownpos-y;
				var newHeight = Math.min(Math.max(mdownheight+offset, 0), sizes.total-toolbarHeight*2);

				if (mtarget === self.ANIM) {
					animwrapper.style.height = newHeight+'px';
				} else {
					parallaxwrapper.style.height = newHeight+'px';
				}

				self.update();

			}
		}

		function handleMouseUp(e) {
			mdownpos = false;
		}
		
		this.TILESET  = 0;
		this.ANIM     = 1;
		this.LAYER    = 2;
		this.PARALLAX = 3;
		this.sizes = sizes;

		this.update = function () {

			//parallaxcanvas.width = parallaxwrapper.offsetWidth;
			//tilesetcanvas.height = tilesetwrapper.offsetHeight;

			leftpanel.style.height = mainpanel.style.height = panelwrapper.offsetHeight+'px';

			animwrapper.style.height = Math.min(animwrapper.offsetHeight, panelwrapper.offsetHeight-toolbarHeight*2)+'px';
			parallaxwrapper.style.height = Math.min(parallaxwrapper.offsetHeight, panelwrapper.offsetHeight-toolbarHeight*2)+'px';

			if (tileset.scrollbars.contentHeight > tilesetwrapper.offsetHeight) {
				leftpanel.style.width = (320+3)+'px';
			} else {
				leftpanel.style.width = '320px';
			}

			animcanvas.width = animwrapper.offsetWidth;
			animcanvas.height = Math.max(animwrapper.offsetHeight-1, 1); // Minus one pixel because statusbar border-top overlaps

			parallaxcanvas.width = Math.max(parallaxwrapper.offsetWidth, 1);
			parallaxcanvas.height = Math.max(parallaxwrapper.offsetHeight-1, 1); // Same here
			
			sizes.total = panelwrapper.offsetHeight;
			sizes.tileset = tilesetwrapper.offsetHeight;
			sizes.anim = animwrapper.offsetHeight;
			sizes.layer = layerwrapper.offsetHeight;
			sizes.parallax = parallaxwrapper.offsetHeight;

			self.emit('update', sizes);

			tileset.scrollbars.update();

			localStorage['webjcs2-animheight'] = sizes.anim;
			localStorage['webjcs2-parallaxheight'] = sizes.parallax;
		}

		window.addEventListener('mousedown', handleMouseDown);
		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', handleMouseUp);

		window.addEventListener('resize', this.update);

	}

	return LayoutEngine;
});