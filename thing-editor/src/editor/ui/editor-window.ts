import type { ClassAttributes, ComponentChild } from 'preact';
import { Component, h } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import ComponentDebounced from 'thing-editor/src/editor/ui/component-debounced';
import type { ContextMenuItem } from 'thing-editor/src/editor/ui/context-menu';
import Help from 'thing-editor/src/editor/ui/help';
import { editorUtils } from 'thing-editor/src/editor/utils/editor-utils';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';

const MENU_HEIGHT = 24;
const CLAMP_POW = 5;

interface CornerDraggerProps extends ClassAttributes<CornerDragger> {
	onDrag: (deltaX: number, deltaY: number) => { x: number; y: number };
	onDragEnd: () => void;
	className: string;
	type?: DraggerType;
	owner: Window;
}

interface WindowProps extends ClassAttributes<Window> {
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
	hotkeysHandlers?: ContextMenuItem[][];
}

interface WindowState {
	title: ComponentChild;
	x: number;
	y: number;
	w: number;
	h: number;
}

class Window<P extends WindowProps = WindowProps, S extends WindowState = WindowState> extends ComponentDebounced<P, S> {

	renderedScale = 1;

	static all: KeyedMap<Window> = {};
	static allOrdered: Window[] = [];

	constructor(props: P) {
		super(props);

		const state: WindowState = {} as WindowState;
		for (let key in props) {
			let val = props[key];
			if (typeof val === 'number' || typeof val === 'boolean') {
				(state as KeyedObject)[key] = val;
			}
		}
		state.x;
		state.y;
		state.w = props.w - props.x;
		state.h = props.h - props.y;

		Object.assign(state, game.editor.settings.getItem('editor_window_state_' + props.id, {}));

		(this as any).state = state;

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

		if (props.hotkeysHandlers) {
			for (let handlers of props.hotkeysHandlers) {
				for (let item of handlers) {
					if (item) {
						editorUtils.preCacheImages(item.name);
					}
				}
			}
		}
	}

	componentDidMount() {
		if (!this.isModal()) {
			Window.all[this.props.id] = this as Window;
			Window.allOrdered.push(this as Window);
		}
	}

	componentWillUnmount() {
		if (this.saveStateTimeout) {
			clearTimeout(this.saveStateTimeout);
			this.saveStateTimeout = 0;
		}
		if (!this.isModal()) {
			delete Window.all[this.props.id];
			Window.allOrdered.splice(Window.allOrdered.indexOf(this as Window), 1);
		}
	}

	eraseSettings() {
		game.editor.settings.removeItem('editor_window_state_' + this.props.id);
	}

	resetLayout() {
		this.refresh();
	}

	saveStateTimeout = 0;

	setState<K extends keyof S>(state: ((prevState: Readonly<S>, props: Readonly<P>) => Pick<S, K> | Partial<S> | null) | Pick<S, K> | Partial<S> | null): void {
		super.setState(state);
		if (this.saveStateTimeout) {
			clearTimeout(this.saveStateTimeout);
		}
		this.saveStateTimeout = window.setTimeout(() => {
			this.saveState();
			this.saveStateTimeout = 0;
		}, 10);
	}

	saveState() {
		Window.saveWindowState(this.props.id, this.state);
	}

	static saveWindowState(windowId: string, state: WindowState) {
		game.editor.settings.setItem('editor_window_state_' + windowId, state);
	}

	deltaPosition(x: number, y: number) {
		let ret = { x: this.state.x, y: this.state.y };
		this.setPosition(this.state.x + x, this.state.y + y);
		ret.x = this.state.x - ret.x;
		ret.y = this.state.y - ret.y;
		return ret;
	}

	deltaL(x: number, _y: number) {
		let ret = { x: this.state.w, y: this.state.h };
		this.setSize(this.state.w - x, this.state.h);
		ret.x = -(this.state.w - ret.x);
		ret.y = this.state.h - ret.y;
		this.setPosition(this.state.x + ret.x, this.state.y);
		return ret;
	}

	deltaR(x: number, _y: number) {
		let ret = { x: this.state.w, y: this.state.h };
		this.setSize(this.state.w + x, this.state.h);
		ret.x = this.state.w - ret.x;
		ret.y = this.state.h - ret.y;
		return ret;
	}

	deltaB(_x: number, y: number) {
		let ret = { x: this.state.w, y: this.state.h };
		this.setSize(this.state.w, this.state.h + y);
		ret.x = this.state.w - ret.x;
		ret.y = this.state.h - ret.y;
		return ret;
	}

	deltaT(_x: number, y: number) {
		if (this.state.y + y < 0) {
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

		(this.state as any).x = x;
		(this.state as any).y = y;
		if (this.base) {
			(this.base as HTMLDivElement).style.left = x + '%';
			(this.base as HTMLDivElement).style.top = y + '%';
		}
	}

	setSize(w: number, h: number) {
		w = Math.max(w, 5);
		h = Math.max(h, 5);
		w = Math.min(w, 100);
		h = Math.min(h, 100);
		if ((this.state.w !== w) || (this.state.h !== h)) {
			if (this.props.onResize) {
				this.props.onResize();
			}
		}
		(this.state as any).w = w;
		(this.state as any).h = h;
		if (this.base) {
			(this.base as HTMLDivElement).style.width = w + '%';
			(this.base as HTMLDivElement).style.height = h + '%';
			let s = ((this.base as HTMLDivElement).querySelector('.window-content') as HTMLElement).style;

			const contentWpx = this.state.w * window.innerWidth / 100;
			const contentHpx = this.state.h * (window.innerHeight - MENU_HEIGHT) / 100 - 17;
			const minW = this.props.minW;
			const minH = this.props.minH;

			if (contentWpx < minW || contentHpx < minH) {
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

	clamp() {
		const div = this.base as HTMLDivElement;
		if (div) {
			div.getClientRects();
			let bounds = div.getBoundingClientRect();

			const W = window.innerWidth / 100;
			const H = (window.innerHeight - MENU_HEIGHT) / 100;
			let clamped = false;
			for (let w of noDragWindows) {
				const otherBounds = (w.base as HTMLDivElement).getBoundingClientRect();
				let d = bounds.left - otherBounds.right;
				if (Math.abs(d) > 0.55 && Math.abs(d) < CLAMP_POW) {
					this.setPosition(otherBounds.right / W, this.state.y);
					this.setSize(this.state.w + d / W, this.state.h);
					clamped = true;
				}
				d = bounds.right - otherBounds.left;
				if (Math.abs(d) > 0.55 && Math.abs(d) < CLAMP_POW) {
					this.setSize(this.state.w - d / W, this.state.h);
					clamped = true;
				}
				d = bounds.top - otherBounds.bottom;
				if (Math.abs(d) > 0.55 && Math.abs(d) < CLAMP_POW) {
					this.setPosition(this.state.x, (otherBounds.bottom - MENU_HEIGHT) / H);
					this.setSize(this.state.w, this.state.h + d / window.innerHeight * 100);
					clamped = true;
				}
				d = bounds.bottom - otherBounds.top;
				if (Math.abs(d) > 0.55 && Math.abs(d) < CLAMP_POW) {
					this.setSize(this.state.w, this.state.h - d / window.innerHeight * 100);
					clamped = true;
				}
				if (clamped) {
					return;
				}
			}
		}
	}

	isModal() {
		return editorUtils.isInModal(this.base as any);
	}

	onMouseDown() {
		if (!this.isModal()) {
			Window.bringWindowForward((this.base as HTMLDivElement));
		}
	}

	renderWindowContent(): ComponentChild {
		return this.props.content;
	}

	render(): ComponentChild {

		let contentProps: any = {
			className: 'window-content'
		};

		const contentWpx = this.state.w * window.innerWidth / 100;
		const contentHpx = this.state.h * (window.innerHeight - MENU_HEIGHT) / 100 - 17;
		const minW = this.props.minW;
		const minH = this.props.minH;

		if (contentWpx < minW || contentHpx < minH) {
			let scale = Math.min(contentWpx / minW, contentHpx / minH);
			this.renderedScale = scale;
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
			id: this.props.id,
			onMouseDown: this.onMouseDown,
			className: 'window-body',
			style: {
				left: this.state.x + '%',
				top: this.state.y + '%',
				width: this.state.w + '%',
				height: this.state.h + '%'
			},
			'data-help': 'game.editor.' + this.props.helpId
		},
		R.div({
			className: 'window-header'
		}, this.state.title || this.props.title,
		h(CornerDragger, {
			className: 'window-dragger',
			onDragEnd: this.saveState,
			onDrag: this.deltaPosition,
			owner: this as Window
		})
		),
		R.div(contentProps, this.renderWindowContent()),
		h(CornerDragger, {
			className: 'window-r-dragger',
			onDragEnd: this.saveState,
			onDrag: this.deltaR,
			type: 'v',
			owner: this as Window
		}),
		h(CornerDragger, {
			className: 'window-l-dragger',
			onDragEnd: this.saveState,
			onDrag: this.deltaL,
			type: 'v',
			owner: this as Window
		}),
		h(CornerDragger, {
			className: 'window-b-dragger',
			onDragEnd: this.saveState,
			onDrag: this.deltaB,
			type: 'h',
			owner: this as Window
		}),
		h(CornerDragger, {
			className: 'window-t-dragger',
			onDragEnd: this.saveState,
			onDrag: this.deltaT,
			type: 'h',
			owner: this as Window
		}),
		h(CornerDragger, {
			className: 'window-rb-corner',
			onDragEnd: this.saveState,
			onDrag: this.deltaRBCorner,
			owner: this as Window
		}),
		h(CornerDragger, {
			className: 'window-lb-corner',
			onDragEnd: this.saveState,
			onDrag: this.deltaLBCorner,
			owner: this as Window
		}),
		h(CornerDragger, {
			className: 'window-rt-corner',
			onDragEnd: this.saveState,
			onDrag: this.deltaRTCorner,
			owner: this as Window
		}),
		h(CornerDragger, {
			className: 'window-lt-corner',
			onDragEnd: this.saveState,
			onDrag: this.deltaLTCorner,
			owner: this as Window
		})
		);
	}

	static bringWindowForward(windowBody: HTMLElement | string, setCurrentHelp?: boolean) {
		window.setTimeout(() => {
			if (typeof windowBody === 'string') {
				windowBody = document.querySelector(windowBody) as HTMLElement;
			}
			if (windowBody) {
				if (setCurrentHelp) {
					Help.setCurrentHelp((windowBody as HTMLElement).dataset.help as string);
				}

				let w = Window.allOrdered.find(wnd => wnd.base === windowBody) as Window;
				assert(w, 'Wrong window to bring forward.');
				Window.allOrdered.splice(Window.allOrdered.indexOf(w), 1);
				Window.allOrdered.unshift(w);

				Window.allOrdered.forEach((w, i) => {
					(w.base as HTMLElement).style.zIndex = (Window.allOrdered.length - i).toString();
				});
			}
		}, 1);
	}
}


export default Window;

export type { WindowProps, WindowState };


let emptyImage = new Image();

type DraggerType = 'v' | 'h';


const allDraggers: CornerDragger[] = [];
const activeDraggers: CornerDragger[] = [];
let noDragWindows: Window[] = [];


const addNeighborDraggersAsActive = (thisBounds: DOMRect, ev: DragEvent, draggerType?: DraggerType) => {
	for (let dragger of allDraggers) {
		if (dragger.props.type === draggerType) {
			if (activeDraggers.indexOf(dragger) < 0) {
				const b = (dragger.base as HTMLDivElement).getBoundingClientRect();

				let isDraggersNeighbors = false;

				isDraggersNeighbors =
					((thisBounds.left) <= b.right) &&
					((thisBounds.right) >= b.left) &&
					((thisBounds.top) <= b.bottom) &&
					((thisBounds.bottom) >= b.top);

				if (isDraggersNeighbors) {
					activeDraggers.push(dragger);
					dragger.prevX = ev.pageX;
					dragger.prevY = ev.pageY;
					addNeighborDraggersAsActive(b, ev, draggerType,);
					continue;
				}
			}
		}
	}
};


class CornerDragger extends Component<CornerDraggerProps> {

	prevX = 0;
	prevY = 0;

	constructor(props: CornerDraggerProps) {
		super(props);
		this.dragEndHandler = this.dragEndHandler.bind(this);
		this.dragStartHandler = this.dragStartHandler.bind(this);
		this.dragHandler = this.dragHandler.bind(this);
	}

	componentDidMount(): void {
		if (this.props.type) {
			allDraggers.push(this);
		}
	}

	componentWillUnmount(): void {
		if (this.props.type) {
			allDraggers.splice(allDraggers.indexOf(this), 1);
		}
	}

	dragStartHandler(ev: DragEvent) {
		this.prevX = ev.pageX;
		this.prevY = ev.pageY;
		(ev.dataTransfer as DataTransfer).setDragImage(emptyImage, 0, 0);
		activeDraggers.length = 0;
		activeDraggers.push(this);

		if (!ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
			let thisBounds = (this.base as HTMLDivElement).getBoundingClientRect();
			addNeighborDraggersAsActive(thisBounds, ev, this.props.type);
		}

		noDragWindows = Window.allOrdered.filter((w) => {
			return !activeDraggers.some(d => d.props.owner === w);
		});
	}

	drag(ev: DragEvent) {
		if (this.prevX !== ev.pageX || this.prevY !== ev.pageY) {
			if (ev.pageX !== 0 || ev.pageY !== 0) {
				let ret = this.props.onDrag((ev.pageX - this.prevX) / window.innerWidth * 100, (ev.pageY - this.prevY) / window.innerHeight * 100);
				this.prevX += Math.round(ret.x * window.innerWidth / 100);
				this.prevY += Math.round(ret.y * window.innerHeight / 100);
			}
		}
	}

	dragHandler(ev: DragEvent) {
		if (ev.x === 0 && ev.y === 0) {
			return; // drag finish generates zero positioned event bug.
		}
		for (let dragger of activeDraggers) {
			dragger.drag(ev);
		}
		if (!ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
			for (let dragger of activeDraggers) {
				dragger.props.owner.clamp();
			}
		}
	}

	dragEndHandler() {
		for (let dragger of activeDraggers) {
			dragger.props.onDragEnd();
		}
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
