const contentProps = {
	className:'window-content'
}

var emptyImage = new Image();

class CornerDragger extends React.Component {
	
	constructor() {
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
		this.props.onDrag(ev.pageX - this.prevX, ev.pageY - this.prevY);
		this.prevX = ev.pageX;
		this.prevY = ev.pageY;
	}
	
	dragEndHandler(ev) {
		this.dragHandler(ev);
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
		
		
		
		this.dragEndHandler = this.dragEndHandler.bind(this);
		this.dragStartHandler = this.dragStartHandler.bind(this);
		this.dragHandler = this.dragHandler.bind(this);
		this.dragEndHandlerRBCorner = this.dragEndHandlerRBCorner.bind(this);
		this.dragStartHandlerRBCorner = this.dragStartHandlerRBCorner.bind(this);
		this.dragHandlerRBCorner = this.dragHandlerRBCorner.bind(this);
	
	}
	
	saveState() {
		const settings = EDITOR.settings;
		var id = this.id;
		settings.setItem(id + '.x', this.state.x);
		settings.setItem(id + '.y', this.state.y);
		settings.setItem(id + '.w', this.state.w);
		settings.setItem(id + '.h', this.state.h);
	}
	
	deltaPosition(x,y) {
		
	}
	
	deltaLBCorner(x,y) {
		
	}
	
	deltaRBCorner(x,y) {
		
	}


	setPosition(x, y) {
		x = Math.max(0, x);
		y = Math.max(0, y);
		x = Math.min(x, EDITOR.W - this.state.w);
		y = Math.min(y, EDITOR.H - this.state.h);
		this.state.x = x;
		this.state.y = y;
		$('#'+this.id).css({left: x + 'px', top: y + 'px'});
	}

	setSize(w, h) {
		w = Math.max(w, this.props.minW);
		h = Math.max(h, this.props.minH);
		this.state.w = w;
		this.state.h = h;
		$('#'+this.id).css({width: w + 'px', height: h + 'px'});
	}

	
	render(){
		return R.div({id: this.id, className:'window-body', style:{
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
			}, this.props.title),
			R.div(contentProps, this.props.content),
			React.createElement(CornerDragger, {className:'', this.saveState();
			R.div({
				className:'window-rb-corner',
				onDragStart: this.dragStartHandlerRBCorner,
				onDrag: this.dragHandlerRBCorner,
				onDragEnd : this.dragEndHandlerRBCorner,
				draggable: true
			}),
			
			
		);
	}
}

export default Window;