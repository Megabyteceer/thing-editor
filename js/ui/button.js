class Button extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {};
		this.onKeyDown = this.onKeyDown.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
	}
	
	componentDidMount() {
		window.addEventListener("keydown", this.onKeyDown);
	}
	
	componentWillUnmount() {
		window.removeEventListener("keydown", this.onKeyDown);
	}
	
	onKeyDown(e) {
		if(!this.props.hotkey) {
			return;
		}
		let needCtrl = this.props.hotkey > 1000;
		
		if (this.props.disabled || (window.isEventFocusOnInputElement(e) && !needCtrl) || editor.ui.modal.isUIBlockedByModal(ReactDOM.findDOMNode(this))) return;
		
		if ((e.keyCode === (this.props.hotkey % 1000)) && (needCtrl === e.ctrlKey)) {
			this.onMouseDown(e);
			sp(e);
		}
	}
	
	onMouseDown(ev) {
		if (ev.button === 2) {
			editor.ui.modal.showModal(this.props.onClick.name, 'Button Handler:');
		} else {
			if (this.props.disabled) return;
			this.props.onClick();
			ev.target.blur();
		}
		sp(ev);
	}
	
	render() {
		return R.button({
			disabled: this.props.disabled,
			className: (this.props.disabled ? 'unclickable ' : 'clickable ') + this.props.className,
			onMouseDown: this.onMouseDown,
			title: this.props.title,
			onClick: this.onClick
		}, this.props.label);
	}
}

export default Button;