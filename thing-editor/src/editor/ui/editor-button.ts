import { ClassAttributes, Component, ComponentChild } from "preact";
import R from "thing-editor/src/editor/preact-fabrics";
import Window from "thing-editor/src/editor/ui/editor-window";
import isHotkeyHit, { Hotkey } from "thing-editor/src/editor/utils/hotkey";
import sp from "thing-editor/src/editor/utils/stop-propagation";

const allHotkeyButtons: EditorButton[] = [];
window.addEventListener("keydown", (ev) => {

	for(let w of Window.allOrdered) {
		if(w.props.hotkeysHandlers) {
			for(let menuGroup of w.props.hotkeysHandlers) {
				for(let menuItem of menuGroup) {
					if(menuItem) {
						if(typeof menuItem.disabled !== 'function' || !menuItem.disabled()) {
							if(isHotkeyHit(ev, w.base as HTMLElement, menuItem.hotkey)) {
								menuItem.onClick();
								return;
							}
						}
					}
				}
			}
		}
	}

	for(let b of allHotkeyButtons) {
		if(b.onKeyDown(ev)) { //call only first button with this hotkey
			return;
		}
	}
});

interface EditorButtonProps extends ClassAttributes<EditorButton> {
	label: ComponentChild
	onClick: (ev: PointerEvent) => void
	className?: string
	title?: string
	hotkey?: Hotkey
	disabled?: boolean
}

interface EditorButtonStats {
	title?: string;
}

class EditorButton extends Component<EditorButtonProps, EditorButtonStats> {

	onKeyDown(ev: KeyboardEvent) {
		if(!this.props.disabled && isHotkeyHit(ev, this.base as HTMLElement, this.props.hotkey)) {
			this.onMouseDown(ev as unknown as PointerEvent);
			sp(ev);
			return true;
		}
	}

	constructor(props: EditorButtonProps) {
		super(props);
		this.onMouseDown = this.onMouseDown.bind(this);
	}

	componentWillReceiveProps(props: EditorButtonProps) {
		if(this.props.hotkey !== props.hotkey) {
			this.unregisterHotkey();
			this.registerHotkey(props);
		}
	}

	componentDidMount() {
		this.registerHotkey(this.props);
	}

	registerHotkey(props: EditorButtonProps) {
		if(this.props.hotkey) {
			allHotkeyButtons.unshift(this);
		}

		var title = props.title;
		let hotkey = props.hotkey;
		if(hotkey) {
			let help = [];
			if(hotkey.ctrlKey) {
				help.push('Ctrl');
			}
			if(hotkey.altKey) {
				help.push('Alt');
			}
			if(hotkey.shiftKey) {
				help.push('Shift');
			}
			help.push('"' + ((hotkey.key.length > 1) ? hotkey.key : hotkey.key.toUpperCase()) + '"');
			title = (title || '') + ' (' + help.join(' + ') + ')';
		}
		this.setState({ title });
	}

	unregisterHotkey() {
		if(this.props.hotkey) {
			let i = allHotkeyButtons.indexOf(this);
			if(i >= 0) {
				allHotkeyButtons.splice(i, 1);
			}
		}
	}

	componentWillUnmount() {
		this.unregisterHotkey();
	}

	onMouseDown(ev: PointerEvent) {
		if(ev.button === 2) {
			//             ↓
			this.props.onClick; // hover "onClick" and Ctrl+Click [FunctionLocation] to go to handler declaration
			debugger; //   ↑
		} else {
			if(this.props.disabled) return;
			//TODO:
			//DataPathFixer.onNameBlur();
			this.props.onClick(ev);
			(ev.target as HTMLElement).blur();
		}
		sp(ev);
	}

	render() {
		return R.button({
			disabled: this.props.disabled,
			className: (this.props.disabled ? 'unclickable ' : 'clickable ') + this.props.className,
			onMouseDown: this.onMouseDown,
			title: this.state.title
		}, this.props.label);
	}
}

export default EditorButton;