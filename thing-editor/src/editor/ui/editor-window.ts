import { ClassAttributes, Component } from "preact";
import game from "thing-editor/src/engine/game";
import { KeyedMap } from "thing-editor/src/editor/env";
import R from "thing-editor/src/editor/preact-fabrics";
import { h } from "preact";
import { ComponentChild } from "preact";
import Help from "thing-editor/src/editor/ui/help";

function getResolutionPrefix() {
	return '_' + Math.round(window.innerWidth / 20) + 'x' + Math.round(window.innerHeight / 20);
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
}

interface WindowState {
	x: number;
	y: number;
	w: number;
	h: number;
}

class Window extends Component<WindowProps, WindowState> {
	id: string;
	renderedScale = 1;

	get $(): HTMLElement {
		return this.base as HTMLElement;
	}

	static all: KeyedMap<Window> = {};

	constructor(props: WindowProps) {
		super(props);
		const id = 'window-' + props.id;
		this.id = id;

		this.state = {
			x: props.x,
			y: props.y,
			w: props.w,
			h: props.h
		};
		this.onClientResize();
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
		this.onClientResize = this.onClientResize.bind(this);
	}

	componentDidMount() {
		window.addEventListener('resize', this.onClientResize);
		Window.all[this.props.id] = this;
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.onClientResize);
		delete Window.all[this.props.id];
	}

	onClientResize() {
		let id = this.id + getResolutionPrefix();
		this.setSize(game.editor.settings.getItem(id + '.w', this.props.w), game.editor.settings.getItem(id + '.h', this.props.h));
		this.setPosition(game.editor.settings.getItem(id + '.x', this.props.x), game.editor.settings.getItem(id + '.y', this.props.y));
	}

	saveState() {
		const settings = game.editor.settings;
		let id = this.id + getResolutionPrefix();
		settings.setItem(id + '.x', this.state.x);
		settings.setItem(id + '.y', this.state.y);
		settings.setItem(id + '.w', this.state.w);
		settings.setItem(id + '.h', this.state.h);
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
		x = Math.min(x, window.innerWidth - this.state.w);
		y = Math.min(y, window.innerHeight - this.state.h);
		//@ts-ignore
		this.state.x = x;
		//@ts-ignore
		this.state.y = y;
		if(this.$) {
			this.$.style.left = x + 'px';
			this.$.style.top = y + 'px';
		}
	}

	setSize(w: number, h: number) {
		w = Math.max(w, 100);
		h = Math.max(h, 120);
		w = Math.min(w, window.innerWidth);
		h = Math.min(h, window.innerHeight);
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
			this.$.style.width = w + 'px';
			this.$.style.height = h + 'px';
			let s = (this.$.querySelector('.window-content') as HTMLElement).style;

			if(this.state.w < this.props.minW || this.state.h < this.props.minH) {
				let scale = Math.min(this.state.w / this.props.minW, this.state.h / this.props.minH);
				this.renderedScale = scale;
				s.transform = 'scale(' + scale + ')';
				s.transformOrigin = 'left top';
				s.width = ((Math.max(this.state.w / scale, this.props.minW)) - 4 / scale) + 'px';
				s.height = (Math.max(this.state.h / scale, this.props.minH) - 20 / scale) + 'px';
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

	render() {

		let contentProps: any = {
			className: 'window-content'
		};
		if(this.state.w < this.props.minW || this.state.h < this.props.minH) {
			let scale = Math.min(this.state.w / this.props.minW, this.state.h / this.props.minH);
			this.renderedScale = scale;
			contentProps.style = {
				transform: 'scale(' + scale + ')',
				transformOrigin: 'left top',
				width: ((Math.max(this.state.w / scale, this.props.minW)) - 4 / scale) + 'px',
				height: (Math.max(this.state.h / scale, this.props.minH) - 20 / scale) + 'px'
			};
		} else {
			this.renderedScale = 1;
		}

		return R.div({
			id: this.id, onMouseDown: this.onMouseDown, className: 'window-body', style: {
				left: this.state.x,
				top: this.state.y,
				width: this.state.w,
				height: this.state.h
			},
			'data-help': 'game.editor.' + this.props.helpId
		},
			R.div({
				className: 'window-header'
			}, this.props.title,
				h(CornerDragger, {
					className: 'window-dragger',
					onDragEnd: this.saveState,
					onDrag: this.deltaPosition
				})
			),
			R.div(contentProps, this.props.content),
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
				let ret = this.props.onDrag(ev.pageX - this.prevX, ev.pageY - this.prevY);
				if(ret) {
					this.prevX += ret.x;
					this.prevY += ret.y;
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