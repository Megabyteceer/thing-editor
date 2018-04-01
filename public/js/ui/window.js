const headerProps = {
	className:'window-header'
}
const contentProps = {
	className:'window-content'
}

class Window extends React.Component {
	
	constructor(props) {
		super(props);
		const id = props.id;
		const settings = EDITOR.settings;
		this.state = {
			x: settings.getItem(id + '.x', props.x),
			y: settings.getItem(id + '.y', props.y),
			w: settings.getItem(id + '.w', props.w),
			h: settings.getItem(id + '.h', props.h)
		};
		
	}

	render(){
		return R.div({className:'window-body', style:{
				left:this.state.x,
				top:this.state.y,
				width:this.state.w,
				height:this.state.h
			}},
			R.div(headerProps, this.props.title),
			R.div(contentProps, this.props.content)
			
		);
	}
}

export default Window;