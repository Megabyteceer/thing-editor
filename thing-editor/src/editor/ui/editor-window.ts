import { ClassAttributes, Component, ComponentChild, h } from "preact";
import { KeyedMap, KeyedObject } from "thing-editor/src/editor/env";
import R from "thing-editor/src/editor/preact-fabrics";
import ComponentDebounced from "thing-editor/src/editor/ui/component-debounced";
import Help from "thing-editor/src/editor/ui/help";
import game from "thing-editor/src/engine/game";

const MENU_HEIGHT = 24;

interface WindowProps extends ClassAttributes<Window<WindowProps, WindowState>> {
	onResize?: () => void;
	id: string;
	x: number;
	y: number;
	w: number;
	h: number;
	minW: number;
	minH: number;
	content: ComponentChild;
	helpId: string;
	title: ComponentChild;
}

interface WindowState {
	title: ComponentChild;
	x: number;
	y: number;
	w: number;
	h: number;
}

class Window<P extends WindowProps, S extends WindowState> extends ComponentDebounced<P, S> {

	renderedScale = 1;

	get $(): HTMLElement {
		return this.base as HTMLElement;
	}

	static all: KeyedMap<Window<WindowProps, WindowState>> = {};

	constructor(props: P) {
		super(props);

		const state: WindowState = {} as WindowState;
		for(let key in props) {
			let val = props[key];
			if(typeof val === 'number' || typeof val === 'string') {
				(state as KeyedObject)[key] = val;
			}
		}
		state.x += 0.05;
		state.y += 0.05;
		state.w = props.w - props.x - 0.1;
		state.h = props.h - props.y - 0.1;


		Object.assign(state, game.editor.settings.getItem('editor_window_state_' + props.id, {}));

		//@ts-ignore
		this.state = state;

		this.setSize(state.w, state.h);
		this.setPosition(state.x, state.y);

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
	}

	componentDidMount() {
		//@ts-ignore
		Window.all[this.props.id] = this;
	}

	componentWillUnmount() {
		if(this.saveStateTimeout) {
			clearTimeout(this.saveStateTimeout);
			this.saveStateTimeout = undefined;
		}
		delete Window.all[this.props.id];
	}

	eraseSettings() {
		game.editor.settings.removeItem('editor_window_state_' + this.props.id);
	}

	saveStateTimeout: number | undefined;
	setState<K extends keyof S>(state: ((prevState: Readonly<S>, props: Readonly<P>) => Pick<S, K> | Partial<S> | null) | Pick<S, K> | Partial<S> | null): void {
		super.setState(state);
		if(this.saveStateTimeout) {
			clearTimeout(this.saveStateTimeout);
		}
		this.saveStateTimeout = setTimeout(() => {
			this.saveState();
			this.saveStateTimeout = undefined;
		}, 10);
	}

	saveState(forAnotherWindowId?: string, state?: WindowState) {
		game.editor.settings.setItem('editor_window_state_' + (forAnotherWindowId || this.props.id), state || this.state);
	}

	deltaPosition(x: number, y: number) {
		let ret = { x: this.state.x, y: this.state.y };
		this.setPosition(this.state.x + x, this.state.y + y);
		ret.x = this.state.x - ret.x;
		ret.y = this.state.y - ret.y;
		return ret;
	}

	deltaL(x: number, _y: number) { // eslint-disable-line no-unused-vars
		let ret = { x: this.state.w, y: this.state.h };
		this.setSize(this.state.w - x, this.state.h);
		ret.x = -(this.state.w - ret.x);
		ret.y = this.state.h - ret.y;
		this.setPosition(this.state.x + ret.x, this.state.y);
		return ret;
	}

	deltaR(x: number, _y: number) { // eslint-disable-line no-unused-vars
		let ret = { x: this.state.w, y: this.state.h };
		this.setSize(this.state.w + x, this.state.h);
		ret.x = this.state.w - ret.x;
		ret.y = this.state.h - ret.y;
		return ret;
	}

	deltaB(_x: number, y: number) { // eslint-disable-line no-unused-vars
		let ret = { x: this.state.w, y: this.state.h };
		this.setSize(this.state.w, this.state.h + y);
		ret.x = this.state.w - ret.x;
		ret.y = this.state.h - ret.y;
		return ret;
	}

	deltaT(_x: number, y: number) { // eslint-disable-line no-unused-vars
		if(this.state.y + y < 0) {
			y -= (this.state.y + y);
		}

		let ret = { x: this.state.w, y: this.state.h };
		this.setSize(this.state.w, this.state.h - y);
		ret.x = this.state.w - ret.x;
		ret.y = -(this.state.h - ret.y);
		this.setPosition(this.state.x, this.state.y + ret.y);

		return ret;
	}

	deltaLBCorner(x: number, y: number) {
		let ret = this.deltaL(x, y);
		let ret2 = this.deltaB(x, y);
		ret.y = ret2.y;
		return ret;
	}

	deltaRBCorner(x: number, y: number) {
		let ret = this.deltaR(x, y);
		let ret2 = this.deltaB(x, y);
		ret.y = ret2.y;
		return ret;
	}

	deltaRTCorner(x: number, y: number) {
		let ret = this.deltaR(x, y);
		let ret2 = this.deltaT(x, y);
		ret.y = ret2.y;
		return ret;
	}

	deltaLTCorner(x: number, y: number) {
		let ret = this.deltaL(x, y);
		let ret2 = this.deltaT(x, y);
		ret.y = ret2.y;
		return ret;
	}

	setPosition(x: number, y: number) {
		x = Math.max(0, x);
		y = Math.max(0, y);
		x = Math.min(x, 100 - this.state.w);
		y = Math.min(y, 100 - this.state.h);
		//@ts-ignore
		this.state.x = x;
		//@ts-ignore
		this.state.y = y;
		if(this.$) {
			this.$.style.left = x + '%';
			this.$.style.top = y + '%';
		}

	}

	setSize(w: number, h: number) {
		w = Math.max(w, 5);
		h = Math.max(h, 5);
		w = Math.min(w, 100);
		h = Math.min(h, 100);
		if((this.state.w !== w) || (this.state.h !== h)) {
			if(this.props.onResize) {
				this.props.onResize();
			}
		}
		//@ts-ignore
		this.state.w = w;
		//@ts-ignore
		this.state.h = h;
		if(this.$) {
			this.$.style.width = w + '%';
			this.$.style.height = h + '%';
			let s = (this.$.querySelector('.window-content') as HTMLElement).style;

			const contentWpx = this.state.w * window.innerWidth / 100;
			const contentHpx = this.state.h * (window.innerHeight - MENU_HEIGHT) / 100 - 17;
			const minW = this.props.minW;
			const minH = this.props.minH;

			if(contentWpx < minW || contentHpx < minH) {
				let scale = Math.min(contentWpx / minW, contentHpx / minH);
				this.renderedScale = scale;
				s.transform = 'scale(' + scale + ')';
				s.transformOrigin = 'left top';
				s.width = Math.max(contentWpx / scale, minW) + 'px';
				s.height = Math.max(contentHpx / scale, minH) + 'px';
			} else {
				this.renderedScale = 1;
				s.transform = '';
				s.transformOrigin = '';
				s.width = '';
				s.height = '';
			}
		}
	}

	onMouseDown() {
		Window.bringWindowForward(this.$);
	}

	renderWindowContent(): ComponentChild {
		return this.props.content;
	}

	render() {

		let contentProps: any = {
			className: 'window-content'
		};

		const contentWpx = this.state.w * window.innerWidth / 100;
		const contentHpx = this.state.h * (window.innerHeight - MENU_HEIGHT) / 100 - 17;
		const minW = this.props.minW;
		const minH = this.props.minH;

		if(contentWpx < minW || contentHpx < minH) {
			let scale = Math.min(contentWpx / minW, contentHpx / minH);
			contentProps.style = {
				transform: 'scale(' + scale + ')',
				transformOrigin: 'left top',
				width: Math.max(contentWpx / scale, minW) + 'px',
				height: Math.max(contentHpx / scale, minH) + 'px'
			};
		} else {
			this.renderedScale = 1;
		}

		return R.div({
			id: this.props.id, onMouseDown: this.onMouseDown, className: 'window-body', style: {
				left: this.state.x + '%',
				top: this.state.y + '%',
				width: this.state.w + '%',
				height: this.state.h + '%'
			},
			'data-help': 'game.editor.' + this.props.helpId
		},
			R.div({
				className: 'window-header'
			}, this.state.title,
				h(CornerDragger, {
					className: 'window-dragger',
					onDragEnd: this.saveState,
					onDrag: this.deltaPosition
				})
			),
			R.div(contentProps, this.renderWindowContent()),
			h(CornerDragger, {
				className: 'window-r-dragger',
				onDragEnd: this.saveState,
				onDrag: this.deltaR
			}),
			h(CornerDragger, {
				className: 'window-l-dragger',
				onDragEnd: this.saveState,
				onDrag: this.deltaL
			}),
			h(CornerDragger, {
				className: 'window-b-dragger',
				onDragEnd: this.saveState,
				onDrag: this.deltaB
			}),
			h(CornerDragger, {
				className: 'window-t-dragger',
				onDragEnd: this.saveState,
				onDrag: this.deltaT
			}),
			h(CornerDragger, {
				className: 'window-rb-corner',
				onDragEnd: this.saveState,
				onDrag: this.deltaRBCorner
			}),
			h(CornerDragger, {
				className: 'window-lb-corner',
				onDragEnd: this.saveState,
				onDrag: this.deltaLBCorner
			}),
			h(CornerDragger, {
				className: 'window-rt-corner',
				onDragEnd: this.saveState,
				onDrag: this.deltaRTCorner
			}),
			h(CornerDragger, {
				className: 'window-lt-corner',
				onDragEnd: this.saveState,
				onDrag: this.deltaLTCorner
			})
		);
	}

	static bringWindowForward(windowBody: HTMLElement | string, setCurrentHelp?: boolean) {
		setTimeout(() => {
			if(typeof windowBody === 'string') {
				windowBody = document.querySelector(windowBody) as HTMLElement;
			}
			if(setCurrentHelp && windowBody) {
				Help.setCurrentHelp((windowBody as HTMLElement).dataset.help as string);
			}
			(Array.from(document.getElementsByClassName('window-body')) as HTMLHtmlElement[]).sort((a, b) => {
				return parseInt(a.style.zIndex) - parseInt(b.style.zIndex);
			}).forEach((w, i, a) => {
				(w as HTMLElement).style.zIndex = String((w === windowBody) ? a.length + 2 : i);
			});
		}, 1);
	};
}


export default Window;

export type { WindowProps, WindowState };


let emptyImage = new Image();


interface CornerDraggerProps extends ClassAttributes<CornerDragger> {
	onDrag: (deltaX: number, deltaY: number) => { x: number, y: number } | null;
	onDragEnd: () => void;
	className: string;
}

interface CornerDraggerState {
}

class CornerDragger extends Component<CornerDraggerProps, CornerDraggerState> {

	prevX = 0;
	prevY = 0;

	constructor(props: CornerDraggerProps) {
		super(props);
		this.dragEndHandler = this.dragEndHandler.bind(this);
		this.dragStartHandler = this.dragStartHandler.bind(this);
		this.dragHandler = this.dragHandler.bind(this);
	}

	dragStartHandler(ev: DragEvent) {
		this.prevX = ev.pageX;
		this.prevY = ev.pageY;
		(ev.dataTransfer as DataTransfer).setDragImage(emptyImage, 0, 0);
	}

	dragHandler(ev: DragEvent) {
		if(this.prevX !== ev.pageX || this.prevY !== ev.pageY) {
			if(ev.pageX !== 0 || ev.pageY !== 0) {
				let ret = this.props.onDrag((ev.pageX - this.prevX) / window.innerWidth * 100, (ev.pageY - this.prevY) / window.innerHeight * 100);
				if(ret) {
					this.prevX += Math.round(ret.x * window.innerWidth / 100);
					this.prevY += Math.round(ret.y * window.innerHeight / 100);
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