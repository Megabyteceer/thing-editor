class Button extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {};
		this.onClick = this.onClick.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
	}
	
	componentDidMount() {
		if (this.props.hotkey) {
			window.addEventListener("keydown", this.onKeyDown);
		}
	}
	
	componentWillUnmount() {
		if (this.props.hotkey) {
			window.removeEventListener("keydown", this.onKeyDown);
		}
	}
	
	onKeyDown(e) {
		if (this.props.disabled || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
		
		var needCtrl = this.props.hotkey > 1000;
		if ((e.keyCode === (this.props.hotkey % 1000)) && (needCtrl === e.ctrlKey)) {
			this.onClick(e);
			sp(e);
		}
	}
	
	onMouseDown(ev) {
		if (ev.button === 2) {
			EDITOR.ui.modal.showModal(this.props.onClick.name, 'Button Handler:');
		}
	}
	
	onClick(ev) {
		if (this.props.disabled) return;
		
		this.props.onClick();
		ev.target.blur();
	}
	
	render() {
		return R.button({
			disabled: this.props.disabled,
			className: 'clickable ' + this.props.className,
			onMouseDown: this.onMouseDown,
			title: this.props.title,
			onClick: this.onClick
		}, this.props.label);
	}
}

export default Button;