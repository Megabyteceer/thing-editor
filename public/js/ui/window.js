const contentProps = {
	className:'window-content'
}


class Window extends React.Component {
	
	constructor(props) {
		super(props);
		const settings = EDITOR.settings;
		const id = 'window-' + props.id;
		this.id = id;
		
		this.state = {
			w: settings.getItem(id + '.w', props.w),
			h: settings.getItem(id + '.h', props.h)
		};
		this.setPosition(settings.getItem(id + '.x', props.x), settings.getItem(id + '.y', props.y));
		this.dragEndHandler = this.dragEndHandler.bind(this);
		this.dragStartHandler = this.dragStartHandler.bind(this);
		this.dragHandler = this.dragHandler.bind(this);
	}
	
	dragStartHandler(ev) {
		const wndPos = $('#'+this.id).offset();
		this.dragXshift = ev.pageX - wndPos.left;
		this.dragYshift = ev.pageY - wndPos.top;
		ev.dataTransfer.setData("text/plain", this.id);
		ev.dataTransfer.dropEffect = "move";
		var img = new Image(); 
		ev.dataTransfer.setDragImage(img, 0, 0);
	}
	
	dragHandler(ev) {
		this.setPosition(ev.pageX - this.dragXshift, ev.pageY - this.dragYshift);
	}
	
	dragEndHandler(ev) {
		this.dragHandler(ev);
	}

	setPosition(x, y) {
		this.state.x = x;
		this.state.y = y;
		$('#'+this.id).css({left: x + 'px', top: y + 'px'});
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
				draggable: true,
			}, this.props.title),
			R.div(contentProps, this.props.content)
			
		);
	}
}

export default Window;