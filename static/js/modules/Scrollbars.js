/*
   Author:
     djazz
*/

define(function () {

	var isHoldingScrollbar = false;

	function Scrollbars (params) {

		var self = this;

		// Parameters

		this.element = params.element;
		this.revealDistance = params.revealDistance || 250;
		this.minimumSize = params.minimumSize || 16;
		this.contentWidth = 0;
		this.contentHeight = 0;
		this.scrollPosition = [0, 0];

		// Build the scrollbar DOM

		this.parent = this.element.parentNode;

		this.hTrack = document.createElement('div');
		this.hTrack.className = 'scrollbars horizontal track hidden';

		this.vTrack = document.createElement('div');
		this.vTrack.className = 'scrollbars vertical track hidden';

		this.hThumb = document.createElement('div');
		this.hThumb.className = "thumb";
		this.vThumb = document.createElement('div');
		this.vThumb.className = "thumb";

		this.hTrack.appendChild(this.hThumb);
		this.vTrack.appendChild(this.vThumb);

		this.parent.appendChild(this.hTrack);
		this.parent.appendChild(this.vTrack);

		this.state = {
			holdingWhich: null,
			mouseDownPosition: 0,
			isMouseOver: false,
			isMouseDown: false,

			scrollWidth: 0,
			scrollHeight: 0,

			gripPositionX: 0,
			gripPositionY: 0

		};
		var lastMouseEvent = {pageX: 0, pageY: 0};

		function fixScrollbarVisibility (e) {
			if (self.state.isMouseOver && !self.state.isMouseDown) {
				if (!e) {
					e = lastMouseEvent;
				}
				var box = self.parent.getBoundingClientRect();

				if((isHoldingScrollbar === false || isHoldingScrollbar === self) && self.state.holdingWhich !== self.vThumb && (self.state.holdingWhich === self.hThumb || box.height - (e.pageY-box.top) < self.revealDistance) && !self.hTrack.classList.contains('disabled')) {
					self.hTrack.classList.remove('hidden');
				} else {
					self.hTrack.classList.add('hidden');
				}

				if((isHoldingScrollbar === false || isHoldingScrollbar === self) && self.state.holdingWhich !== self.hThumb && (self.state.holdingWhich === self.vThumb || box.width - (e.pageX-box.left) < self.revealDistance) && !self.vTrack.classList.contains('disabled')) {
					self.vTrack.classList.remove('hidden');
				} else {
					self.vTrack.classList.add('hidden');
				}
			}
		}
		this.fixScrollbarVisibility = fixScrollbarVisibility;

		// Event listeners

		this.hThumb.addEventListener('mousedown', function (e) {
			e.preventDefault();
			e.stopPropagation();

			self.state.holdingWhich = self.hThumb;
			self.state.mouseDownPosition = e.pageX - self.state.gripPositionX;

			isHoldingScrollbar = self;

		}, false);
		this.vThumb.addEventListener('mousedown', function (e) {
			e.preventDefault();
			e.stopPropagation();


			self.state.holdingWhich = self.vThumb;
			self.state.mouseDownPosition = e.pageY - self.state.gripPositionY;
			
			isHoldingScrollbar = self;

			

		}, false);
		window.addEventListener('mousedown', function (e) {

			self.hTrack.classList.add('hidden');
			self.vTrack.classList.add('hidden');
			self.state.isMouseDown = true;
		}, false)
		window.addEventListener('mousemove', function (e) {
			lastMouseEvent = e;
			if (self.state.holdingWhich !== null) {

				var mouseDownPosition = self.state.mouseDownPosition;

				if (self.state.holdingWhich === self.hThumb) {
					var containerWidth = self.parent.offsetWidth;

					var box = self.hThumb.getBoundingClientRect();

					var newGripPosition = Math.max(Math.min((e.pageX-box.left)-(mouseDownPosition-box.left), self.state.scrollWidth), 0);
					
					
					
					var newScrollRatio = newGripPosition / self.state.scrollWidth;
					if(isNaN(newScrollRatio)) {
						newScrollRatio = 0;
					}
					self.scrollPosition[0] = newScrollRatio * (self.contentWidth-containerWidth);

				} else if (self.state.holdingWhich === self.vThumb) {
					var containerHeight = self.parent.offsetHeight;

					var box = self.vThumb.getBoundingClientRect();

					var newGripPosition = Math.max(Math.min((e.pageY-box.top)-(mouseDownPosition-box.top), self.state.scrollHeight), 0);
					
					
					
					var newScrollRatio = newGripPosition / self.state.scrollHeight;
					if(isNaN(newScrollRatio)) {
						newScrollRatio = 0;
					}
					self.scrollPosition[1] = newScrollRatio * (self.contentHeight-containerHeight);
					

				}

				self.update();
				self.emit('scroll');

				
			}
			if (self.state.holdingWhich === null && !self.state.isMouseOver) {
				self.hTrack.classList.add('hidden');
				self.vTrack.classList.add('hidden');
			}
			

		}, false);
		function releaseScrollBar (e) {
			self.state.holdingWhich = null;
			self.state.isMouseDown = false;

			if (!self.state.isMouseOver) {
				self.hTrack.classList.add('hidden');
				self.vTrack.classList.add('hidden');
			}

			isHoldingScrollbar = false;

			fixScrollbarVisibility(e);
		};
		window.addEventListener('mouseup', releaseScrollBar, false);
		window.addEventListener('blur', releaseScrollBar, false);
		this.parent.addEventListener('mousewheel', function (e) {
			var deltaX = (e.wheelDeltaX > 0 ? 1 : (e.wheelDeltaX < 0 ? -1 : 0));
			var deltaY = (e.wheelDeltaY > 0 ? 1 : (e.wheelDeltaY < 0 ? -1 : 0));
			var newScrollX = Math.max(Math.min(self.scrollPosition[0] - deltaX*32, self.contentWidth - self.parent.offsetWidth), 0);
			var newScrollY = Math.max(Math.min(self.scrollPosition[1] - deltaY*32, self.contentHeight - self.parent.offsetHeight), 0);

			if (newScrollX !== self.scrollPosition[0] || newScrollY !== self.scrollPosition[1]) {
				self.scrollPosition[0] = newScrollX;
				self.scrollPosition[1] = newScrollY;
				e.preventDefault();
				self.update();
				self.emit('scroll');
			}

			
		}, false);
		
		this.parent.addEventListener('mousemove', function (e) {
			self.state.isMouseOver = true;
			
			fixScrollbarVisibility(e);
		});
		this.parent.addEventListener('mouseout', function (e) {
			//console.log(e.target);
			//self.hTrack.classList.add('hidden');
			//self.vTrack.classList.add('hidden');
			self.state.isMouseOver = false;
		});

		this.events = {};
	};

	Scrollbars.prototype.update = function () {

		var containerWidth = this.parent.offsetWidth;
		var containerHeight = this.parent.offsetHeight;

		var trackWidth = this.hTrack.offsetWidth;
		var trackHeight = this.vTrack.offsetHeight;

		var gripRatioX = containerWidth/(this.contentWidth);
		var gripRatioY = containerHeight/(this.contentHeight);

		var minGripSize = this.minimumSize;
		var maxGripWidth = trackWidth;
		var maxGripHeight = trackHeight;

		var scrollX = Math.max(Math.min(this.scrollPosition[0], this.contentWidth - containerWidth), 0);
		var scrollY = Math.max(Math.min(this.scrollPosition[1], this.contentHeight - containerHeight), 0);

		var gripWidth = Math.max(Math.min(trackWidth * gripRatioX, maxGripWidth), minGripSize);
		var gripHeight = Math.max(Math.min(trackHeight * gripRatioY, maxGripHeight), minGripSize);

		var scrollWidth = trackWidth - gripWidth;
		var scrollHeight = trackHeight - gripHeight;
		this.state.scrollWidth = scrollWidth;
		this.state.scrollHeight = scrollHeight;

		var scrollRatioX = scrollX / (this.contentWidth - containerWidth);
		var scrollRatioY = scrollY / (this.contentHeight - containerHeight);

		if (isNaN(scrollRatioX)) {
			scrollRatioX = 0;
		}
		if (isNaN(scrollRatioY)) {
			scrollRatioY = 0;
		}

		var gripPositionX = scrollWidth * scrollRatioX;
		var gripPositionY = scrollHeight * scrollRatioY;

		this.state.gripPositionX = gripPositionX;
		this.state.gripPositionY = gripPositionY;


		this.hThumb.style.width = gripWidth+'px';
		this.vThumb.style.height = gripHeight+'px';

		if (gripRatioX >= 1) {
			this.hTrack.classList.add('disabled');
		} else {
			this.hTrack.classList.remove('disabled');
		}

		if (gripRatioY >= 1) {
			this.vTrack.classList.add('disabled');
		} else {
			this.vTrack.classList.remove('disabled');
		}

		this.hThumb.style.left = gripPositionX+'px';
		this.vThumb.style.top = gripPositionY+'px';

		if (scrollX !== this.scrollPosition[0] || scrollY !== this.scrollPosition[1]) {
			this.scrollPosition[0] = scrollX;
			this.scrollPosition[1] = scrollY;
			this.emit('scroll');
		}

		this.fixScrollbarVisibility();

	};

	Scrollbars.prototype.emit = function (name, value) {
		var self = this;
		if (self.events[name] && self.events[name].length > 0) {
			for (var i = 0; i < self.events[name].length; i++) {
				self.events[name][i].call(self, value);
			}
		}
	};

	Scrollbars.prototype.on = function (name, callback) {
		this.events[name] = this.events[name] || [];
		this.events[name].push(callback);
	};

	Scrollbars.prototype.unbind = function (name, callback) {
		var index;
		if (this.events[name]) {
			for (var i = 0; i < this.events[name].length; i++) {
				if ((index = this.events[name].indexOf(callback)) > -1) {
					this.events[name].splice(index, 1);
				}
			}
			if (this.events[name].length === 0) {
				delete this.events[name];
			}
		}
	};


	return Scrollbars;

});



