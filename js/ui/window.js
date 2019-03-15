const contentProps = {
	className: 'window-content'
};

let emptyImage = new Image();

class CornerDragger extends React.Component {
	
	constructor(props) {
		super(props);
		this.dragEndHandler = this.dragEndHandler.bind(this);
		this.dragStartHandler = this.dragStartHandler.bind(this);
		this.dragHandler = this.dragHandler.bind(this);
	}
	
	dragStartHandler(ev) {
		this.prevX = ev.pageX;
		this.prevY = ev.pageY;
		ev.dataTransfer.setDragImage(emptyImage, 0, 0);
	}
	
	dragHandler(ev) {
		if (this.prevX !== ev.pageX || this.prevY !== ev.pageY) {
			if (ev.pageX !== 0 || ev.pageY !== 0) {
				let ret = this.props.onDrag(ev.pageX - this.prevX, ev.pageY - this.prevY);
				if (ret) {
					this.prevX += ret.x;
					this.prevY += ret.y;
				} else {
					this.prevX = ev.pageX;
					this.prevY = ev.pageY;
				}
			}
		}
	}
	
	dragEndHandler() {
		this.props.onDragEnd();
	}
	
	render() {
		return R.div({
			className: this.props.className,
			onDragStart: this.dragStartHandler,
			onDrag: this.dragHandler,
			onDragEnd: this.dragEndHandler,
			draggable: true
		});
	}
}

class Window extends React.Component {
	
	constructor(props) {
		super(props);
		const settings = editor.settings;
		const id = 'window-' + props.id;
		this.id = id;
		
		this.state = {};
		this.setSize(settings.getItem(id + '.w', props.w), settings.getItem(id + '.h', props.h));
		this.setPosition(settings.getItem(id + '.x', props.x), settings.getItem(id + '.y', props.y));
		
		this.saveState = this.saveState.bind(this);
		this.deltaPosition = this.deltaPosition.bind(this);
		this.deltaLBCorner = this.deltaLBCorner.bind(this);
		this.deltaRBCorner = this.deltaRBCorner.bind(this);
		this.deltaRTCorner = this.deltaRTCorner.bind(this);
		this.deltaLTCorner = this.deltaLTCorner.bind(this);
		this.deltaR = this.deltaR.bind(this);
		this.deltaL = this.deltaL.bind(this);
		this.deltaB = this.deltaB.bind(this);
		this.deltaT = this.deltaT.bind(this);
		
		this.onMouseDown = this.onMouseDown.bind(this);
		
		$(window).on('resize', this.onClientResize.bind(this));
	}
	
	componentDidMount() {
		this.$ = $('#' + this.id);
	}
	
	onClientResize() {
		this.setPosition(this.state.x, this.state.y);
		this.setSize(this.state.w, this.state.h);
	}
	
	saveState() {
		const settings = editor.settings;
		let id = this.id;
		settings.setItem(id + '.x', this.state.x);
		settings.setItem(id + '.y', this.state.y);
		settings.setItem(id + '.w', this.state.w);
		settings.setItem(id + '.h', this.state.h);
	}
	
	deltaPosition(x, y) {
		let ret = {x: this.state.x, y: this.state.y};
		this.setPosition(this.state.x + x, this.state.y + y);
		ret.x = this.state.x - ret.x;
		ret.y = this.state.y - ret.y;
		return ret;
	}
	
	deltaL(x, y) { // eslint-disable-line no-unused-vars
		let ret = {x: this.state.w, y: this.state.h};
		this.setSize(this.state.w - x, this.state.h);
		ret.x = -(this.state.w - ret.x);
		ret.y = this.state.h - ret.y;
		this.setPosition(this.state.x + ret.x, this.state.y);
		return ret;
	}
	
	deltaR(x, y) { // eslint-disable-line no-unused-vars
		let ret = {x: this.state.w, y: this.state.h};
		this.setSize(this.state.w + x, this.state.h);
		ret.x = this.state.w - ret.x;
		ret.y = this.state.h - ret.y;
		return ret;
	}
	
	deltaB(x, y) { // eslint-disable-line no-unused-vars
		let ret = {x: this.state.w, y: this.state.h};
		this.setSize(this.state.w, this.state.h + y);
		ret.x = this.state.w - ret.x;
		ret.y = this.state.h - ret.y;
		return ret;
	}
	
	deltaT(x, y) { // eslint-disable-line no-unused-vars
		let ret = {x: this.state.w, y: this.state.h};
		this.setSize(this.state.w, this.state.h - y);
		ret.x = this.state.w - ret.x;
		ret.y = -(this.state.h - ret.y);
		this.setPosition(this.state.x, this.state.y + ret.y);
		return ret;
	}
	
	deltaLBCorner(x, y) {
		let ret = this.deltaL(x, y);
		let ret2 = this.deltaB(x, y);
		ret.y = ret2.y;
		return ret;
	}
	
	deltaRBCorner(x, y) {
		let ret = this.deltaR(x, y);
		let ret2 = this.deltaB(x, y);
		ret.y = ret2.y;
		return ret;
	}
	
	deltaRTCorner(x, y) {
		let ret = this.deltaR(x, y);
		let ret2 = this.deltaT(x, y);
		ret.y = ret2.y;
		return ret;
	}
	
	deltaLTCorner(x, y) {
		let ret = this.deltaL(x, y);
		let ret2 = this.deltaT(x, y);
		ret.y = ret2.y;
		return ret;
	}
	
	setPosition(x, y) {
		x = Math.max(0, x);
		y = Math.max(0, y);
		x = Math.min(x, window.innerWidth - this.state.w);
		y = Math.min(y, window.innerHeight - this.state.h);
		this.state.x = x;
		this.state.y = y;
		if (this.$) {
			this.$.css({left: x + 'px', top: y + 'px'});
		}
	}
	
	setSize(w, h) {
		w = Math.max(w, this.props.minW);
		h = Math.max(h, this.props.minH);
		w = Math.min(w, window.innerWidth);
		h = Math.min(h, window.innerHeight);
		if((this.state.w !== w) || (this.state.h !== h)) {
			if(this.props.onResize) {
				this.props.onResize();
			}
		}
		this.state.w = w;
		this.state.h = h;
		if (this.$) {
			this.$.css({width: w + 'px', height: h + 'px'});
		}
	}
	
	onMouseDown() {
		Window.bringWindowForward(this.$);
	}
	
	render() {
		return R.div({
			id: this.id, onMouseDown: this.onMouseDown, className: 'window-body', style: {
				left: this.state.x,
				top: this.state.y,
				width: this.state.w,
				height: this.state.h
			}
		},
		R.div({
			className: 'window-header',
			onDragStart: this.dragStartHandler,
			onDrag: this.dragHandler,
			onDragEnd: this.dragEndHandler,
			draggable: true
		}, this.props.title,
		React.createElement(CornerDragger, {
			className: 'window-dragger',
			onDragEnd: this.saveState,
			onDrag: this.deltaPosition
		})
		),
		R.div(contentProps, this.props.content),
		React.createElement(CornerDragger, {
			className: 'window-r-dragger',
			onDragEnd: this.saveState,
			onDrag: this.deltaR
		}),
		React.createElement(CornerDragger, {
			className: 'window-l-dragger',
			onDragEnd: this.saveState,
			onDrag: this.deltaL
		}),
		React.createElement(CornerDragger, {
			className: 'window-b-dragger',
			onDragEnd: this.saveState,
			onDrag: this.deltaB
		}),
		React.createElement(CornerDragger, {
			className: 'window-t-dragger',
			onDragEnd: this.saveState,
			onDrag: this.deltaT
		}),
		React.createElement(CornerDragger, {
			className: 'window-rb-corner',
			onDragEnd: this.saveState,
			onDrag: this.deltaRBCorner
		}),
		React.createElement(CornerDragger, {
			className: 'window-lb-corner',
			onDragEnd: this.saveState,
			onDrag: this.deltaLBCorner
		}),
		React.createElement(CornerDragger, {
			className: 'window-rt-corner',
			onDragEnd: this.saveState,
			onDrag: this.deltaRTCorner
		}),
		React.createElement(CornerDragger, {
			className: 'window-lt-corner',
			onDragEnd: this.saveState,
			onDrag: this.deltaLTCorner
		})
		);
	}
}

Window.bringWindowForward = (windowBody) => {
	windowBody = windowBody[0];
	Array.from(document.getElementsByClassName('window-body')).sort((a, b) => {
		return a.style.zIndex - b.style.zIndex;
	}).some((w, i, a) => {
		w.style.zIndex = (w === windowBody) ? a.length + 2 : i;
	});
};

export default Window;