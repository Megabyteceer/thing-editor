const allHotkeyedButtons = [];
window.addEventListener("keydown", (ev) => {
	for(let b of allHotkeyedButtons) {
		if(b.onKeyDown(ev)) { //call only first button with this hotkey
			return;
		}
	}
});

const hotheysBlockedWhenInputFocused = {
	8: true,
	37: true,
	38: true,
	39: true,
	40: true,
	46: true,
	1067: true,
	1088: true,
	1086: true
};
function isCopyPasteBtn(btn) {
	return btn.props.hotkey && hotheysBlockedWhenInputFocused.hasOwnProperty(btn.props.hotkey);
}

class EditorButton extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {};
		this.onKeyDown = this.onKeyDown.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
	}
	
	componentWillReceiveProps(props) {
		if(this.props.hotkey !== props.hotkey) {
			if(!props.hotkey && this.props.hotkey) {
				this.unregisterHotkey();
			} else if(props.hotkey && !this.props.hotkey) {
				this.registerHotkey();
			}
		}
	}

	componentDidMount() {
		if(this.props.hotkey) {
			this.registerHotkey();
		}
	}

	registerHotkey() {
		allHotkeyedButtons.unshift(this);
	}

	unregisterHotkey() {
		if(this.props.hotkey) {
			let i = allHotkeyedButtons.indexOf(this);
			if(i >= 0) {
				allHotkeyedButtons.splice(i, 1);
			}
		}
	}
	
	componentWillUnmount() {
		this.unregisterHotkey();
	}
	
	onKeyDown(e) {
		if(!this.props.hotkey) {
			return;
		}
		let needCtrl = this.props.hotkey > 1000;
		
		if (
			this.props.disabled || 
			(window.isEventFocusOnInputElement(e) && (isCopyPasteBtn(this))) ||
			editor.ui.modal.isUIBlockedByModal(ReactDOM.findDOMNode(this))
		) {
			return;
		}
		
		if ((e.keyCode === (this.props.hotkey % 1000)) && (needCtrl === e.ctrlKey)) {
			this.onMouseDown(e);
			sp(e);
			return true;
		}
	}
	
	onMouseDown(ev) {
		if (ev.button === 2) {
			editor.ui.modal.showModal(this.props.onClick.name, 'Button Handler:');
		} else {
			if (this.props.disabled) return;
			this.props.onClick(ev);
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

export default EditorButton;