const contentProps = {
	className:'window-content'
}

var emptyImage = new Image();

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
		if(this.prevX != ev.pageX || this.prevY != ev.pageY) {
			if(ev.pageX!= 0 || ev.pageY != 0) {
				var ret = this.props.onDrag(ev.pageX - this.prevX, ev.pageY - this.prevY);
				if(ret) {
					this.prevX += ret.x;
					this.prevY += ret.y;
				} else {
					this.prevX = ev.pageX;
					this.prevY = ev.pageY;
				}
			}
		}
	}
	
	dragEndHandler(ev) {
		this.props.onDragEnd();
	}
	
	render () {
		return R.div({
			className:this.props.className,
			onDragStart: this.dragStartHandler,
			onDrag: this.dragHandler,
			onDragEnd : this.dragEndHandler,
			draggable: true
		});
	}
}
	
class Window extends React.Component {
	
	constructor(props) {
		super(props);
		const settings = EDITOR.settings;
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
		
		this.onMouseDown = this.onMouseDown.bind(this);
		
		$(window).on('resize', this.onClientResize.bind(this));
	}

	componentDidMount(){
		this.$ = $('#'+this.id);
	}
		
	onClientResize() {
		this.setPosition(this.state.x, this.state.y);
		this.setSize(this.state.w, this.state.h);
	}
	
	saveState() {
		const settings = EDITOR.settings;
		var id = this.id;
		settings.setItem(id + '.x', this.state.x);
		settings.setItem(id + '.y', this.state.y);
		settings.setItem(id + '.w', this.state.w);
		settings.setItem(id + '.h', this.state.h);
	}
	
	deltaPosition(x, y) {
		var ret = {x:this.state.x, y:this.state.y};
		this.setPosition(this.state.x + x, this.state.y + y);
		ret.x = this.state.x - ret.x;
		ret.y = this.state.y - ret.y;
		return ret;
	}
	
	deltaLBCorner(x, y) {
		var ret = {x:this.state.w, y:this.state.h};
		this.setSize(this.state.w - x, this.state.h + y);
		this.setPosition(this.state.x - (this.state.w - ret.x), this.state.y);
		ret.x = -(this.state.w - ret.x);
		ret.y = this.state.h - ret.y;
		return ret;
	}
	
	deltaRBCorner(x, y) {
		var ret = {x:this.state.w, y:this.state.h};
		this.setSize(this.state.w + x, this.state.h + y);
		ret.x = this.state.w - ret.x;
		ret.y = this.state.h - ret.y;
		return ret;
	}

	deltaRTCorner(x, y) {
		var ret = {x:this.state.w, y:this.state.y};
		this.setSize(this.state.w + x, this.state.h - y);
		this.setPosition(this.state.x, this.state.y + y);
		ret.x = this.state.w - ret.x;
		ret.y = this.state.y - ret.y;
		return ret;
	}

	deltaLTCorner(x, y) {

	}

	setPosition(x, y) {
		x = Math.max(0, x);
		y = Math.max(0, y);
		x = Math.min(x, EDITOR.W - this.state.w);
		y = Math.min(y, EDITOR.H - this.state.h);
		this.state.x = x;
		this.state.y = y;
		if(this.$) {
			this.$.css({left: x + 'px', top: y + 'px'});
		}
	}

	setSize(w, h) {
		w = Math.max(w, this.props.minW);
		h = Math.max(h, this.props.minH);
		this.state.w = w;
		this.state.h = h;
		if(this.$) {
			this.$.css({width: w + 'px', height: h + 'px'});
		}
	}

	onMouseDown() {
		this.bringForward();
	}

	bringForward() {
		$('.window-body').css({'z-index':1});
		this.$.css({'z-index':2});
	}

	
	render() {
		return R.div({id: this.id, onMouseDown:this.onMouseDown, className:'window-body', style:{
				left:this.state.x,
				top:this.state.y,
				width:this.state.w,
				height:this.state.h
			}},
			R.div({
				className: 'window-header',
				onDragStart: this.dragStartHandler,
				onDrag: this.dragHandler,
				onDragEnd : this.dragEndHandler,
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
			})
			
			
		);
	}
}

export default Window;