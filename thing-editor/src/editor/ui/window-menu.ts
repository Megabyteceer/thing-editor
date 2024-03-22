import type { ComponentChild } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import ComponentDebounced from 'thing-editor/src/editor/ui/component-debounced';

const windowMenuBodyProps = { className: 'window-menu-body' };

interface WindowMenuProps {
	menu: ComponentChild;
}

interface WindowMenuState {
	toggled?: boolean;
}

export default class WindowMenu extends ComponentDebounced<WindowMenuProps, WindowMenuState> {

	constructor(props: WindowMenuProps) {
		super(props);
		this.onMouseLeave = this.onMouseLeave.bind(this);
	}
	onMouseLeave() {
		if (this.state.toggled) {
			this.setState({ toggled: false });
		}
	}

	render() {
		let body: ComponentChild;
		if (this.state.toggled) {
			body = R.div(windowMenuBodyProps, this.props.menu);
		}
		return R.div({
			className: 'window-menu',
			onMouseLeave: this.onMouseLeave
		}, R.btn('...', () => {
			this.setState({ toggled: !this.state.toggled });
		}, undefined, 'window-menu-btn'), body);
	}

}
