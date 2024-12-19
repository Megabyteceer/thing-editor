import { h, type ClassAttributes } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import copyTextByClick from 'thing-editor/src/editor/utils/copy-text-by-click';
import shakeDomElement from 'thing-editor/src/editor/utils/shake-element';
import sp from 'thing-editor/src/editor/utils/stop-propagation';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import Spine, { spineAnimationsSelectList, type SpineSequence, type SpineSequenceItem } from 'thing-editor/src/engine/lib/assets/src/extended/spine.c';
import ComponentDebounced from '../../../component-debounced';
import showContextMenu from '../../../context-menu';
import NumberEditor from '../number-editor';
import SelectEditor from '../select-editor';
import { getWindowElement } from '../timeline/timeline';

const BODY_MARGIN = 10;
const FRAME_WIDTH = 3;

const sequenceWrapperProps = {
	className: 'spine-sequence-wrapper'
};

const animationSelectWrapperProps = {
	className: 'spine-sequence-animations-select-wrapper'
};

const sequencesListBlockProps = {
	className: 'spine-sequence-headers'
};

const sequencePropsEditorProps = {
	className: 'spine-sequence-item-props-editor',
};

const loopPointProps = {
	className: 'spine-sequence-item-loop',
};

const propsFielsProps = {className: 'props-field'};


interface SpineSequencesProps extends ClassAttributes<SpineSequences> {
	onCloseClick: () => void;
	spine: Spine;
}

interface SpineSequencesState {

}

let instance:SpineSequences|undefined;

export default class SpineSequences extends ComponentDebounced<SpineSequencesProps, SpineSequencesState> {
	constructor(props: SpineSequencesProps) {
		super(props);
		this.onAddClick = this.onAddClick.bind(this);
		this.renderSequenceLabel = this.renderSequenceLabel.bind(this);
		this.renderSequenceItem = this.renderSequenceItem.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.addItemClick = this.addItemClick.bind(this);
		this.sequenceBodyProps = {
			onMouseDown: this.onMouseDown,
			className: 'spine-sequence-body'
		};
		this.setActiveSequence(this.activeSequenceName);
	}

	componentDidMount(): void {
		instance = this;
	}

	onMouseDown(ev:MouseEvent) {
		const e = ev.target as HTMLDivElement;
		this.sequenceBody = e.classList.contains('spine-sequence-body') ? e : e.closest('.spine-sequence-body') as HTMLDivElement;
		window.addEventListener('mousemove', this.onMouseMove);
		this.onMouseMove(ev);
	}

	onMouseMove (ev:MouseEvent) {
		if (!ev.buttons) {
			window.removeEventListener('mousemove', this.onMouseMove);
			return;
		}
		const b = this.sequenceBody.getBoundingClientRect();

		let fullTimelineLength = 0;

		for (const item of this.activeSequence.s) {
			fullTimelineLength += this.spine.getItemDurationFrames(item);
		}

		const scrollLimit = fullTimelineLength * FRAME_WIDTH + 60 - this.sequenceBody.offsetWidth;

		const mouseX = ev.x - b.x - BODY_MARGIN;

		if (mouseX < 40 && this.sequenceBody.scrollLeft > 0) {
			this.sequenceBody.scrollLeft = Math.max(this.sequenceBody.scrollLeft - 20, 0);
		} else if (mouseX > (this.sequenceBody.offsetWidth - 40) && this.sequenceBody.scrollLeft < scrollLimit) {
			this.sequenceBody.scrollLeft = Math.min(this.sequenceBody.scrollLeft + 20, scrollLimit);
		}

		let time = Math.max(0, Math.round((mouseX + this.sequenceBody.scrollLeft) / FRAME_WIDTH));
		this.setCurrentTime(time);
	}

	sequenceBody!: HTMLDivElement;

	sequenceBodyProps: any;

	setCurrentTime(time:number) {
		this.currentTime = time;
		for (const item of this.activeSequence.s) {
			const itemTime = this.spine.getItemDurationFrames(item) + (item.delay || 0);
			if (time <= itemTime) {
				if (this.spine.spineContent) {
					this.spine.spineContent.state.setAnimation(0, item.n, false);
					this.spine.spineContent.update(Math.max(0, ((time - (item.delay || 0)) / 60 / (item.speed || 1))));
				}
				break;
			} else {
				time -= itemTime;
			}
		}
		this.refresh();
	}

	currentTime = 0;

	timeout = 0;

	componentWillReceiveProps(): void {
		this.timeout = window.setTimeout(() => {
			this.setActiveSequence(this.activeSequenceName);
			this.timeout = 0;
		}, 1);
	}

	componentWillUnmount(): void {
		instance = undefined;
		window.removeEventListener('mousemove', this.onMouseMove);
		if (this.timeout) {
			clearTimeout(this.timeout);
		}
	}

	askForSequenceName(defaultText = '') {
 		return game.editor.ui.modal.showPrompt('Enter sequence label', defaultText, undefined, (val:string) => {
			return this.sequences.find(s => s.n === val) ? 'Sequence with label "' + val + '" already exists' : '';
		});
	}

	onAutoSelect(selectPath: string[]) {
		this.setActiveSequence(this.spine.sequences[parseInt(selectPath[1])].n);
		this.onSequenceItemClick(this.activeSequence.s[parseInt(selectPath[2])]);

		getWindowElement('#sequence-item-' + selectPath[1] + '-' + selectPath[2], '#spine-sequence').then(() => {
			getWindowElement('.spine-sequence-animations-select-wrapper', '#spine-sequence').then((itemView: HTMLDivElement) => {
				shakeDomElement(itemView);
			});
		});
	}

	static onAutoSelect(selectPath: string[]) {
		for (let o of game.editor.selection as any as Spine[]) {
			if (o.sequences) {
				instance?.onAutoSelect(selectPath);
			}
		}
	}

	async onAddClick() {
		const name = await this.askForSequenceName();
		if (!name) {
			return;
		}
		if (!this.spine.sequences) {
			this.spine.sequences = [];
		}
		this.sequences.push({
			n: name,
			s: [
				{
					n: this.spine.currentAnimation!
				}
			]
		});
		this.setActiveSequence(name);
		this.invalidate();
	}

	async addItemClick() {
		const list = spineAnimationsSelectList();

		let selectedAnimation = (await game.editor.ui.modal.showListChoose('Select animation to add', list))?.value;
		const item = {
			n: selectedAnimation
		};
		this.activeSequence.s.push(item);
		this.onSequenceItemClick(item);
		this.invalidate();
	}

	invalidate() {
		Lib.__invalidateSerializationCache(this.spine);
		game.editor.sceneModified(true);
		this.refresh();
	}

	renderSequenceLabel(sequence: SpineSequence) {
		const isActive = sequence.n === this.activeSequence.n;
		const className = isActive ? 'spine-sequence-header spine-sequence-header-active' : 'spine-sequence-header clickable';
		return R.div({
			className,
			title: 'Ctrl+click to copy label`s name',
			onClick: () => {
				this.setActiveSequence(sequence.n);
				this.refresh();
			},
			onMouseDown: copyTextByClick,
			onContextMenu: (ev: PointerEvent) => {
				sp(ev);
				showContextMenu([
					 {
						name: 'Rename...',
						onClick: async () => {
							const name = await this.askForSequenceName(sequence.n);
							if (name) {
								sequence.n = name;
								(this.spine.spineContent?.skeleton as any).__activeEditorSequence = name;
								this.invalidate();
							}
						}
					}, {
						name: R.fragment(R.icon('delete'), 'Delete sequence "' + sequence.n + '"'),
						onClick: () => {
							this.sequences.splice(this.sequences.indexOf(sequence), 1);
							this.setActiveSequence(this.sequences[0]?.n);
							this.invalidate();
						}
					}
				], ev);
			},
		}, sequence.n
		);
	}

	get activeSequenceName(): string {
		return (this.spine.spineContent?.skeleton as any).__activeEditorSequence!;
	}

	_activeSequence!: SpineSequence;

	set activeSequence(s: SpineSequence) {
		this._activeSequence = s;
	}

	get activeSequence():SpineSequence {
		return this.spine.playingSequence || this._activeSequence;
	}

	setActiveSequence(name?:string) {
		this.currentTime = 0;
		this.activeSequence = this.sequences.find(s => s.n === name)!;
		if (!this.activeSequence) {
			this.activeSequence = this.sequences[0];
			name = this.activeSequence?.n;
		}
		if (this.activeSequence) {
			if (this.spine.spineContent && this.activeSequenceName !== name) {
				(this.spine.spineContent?.skeleton as any).__activeEditorSequence = name;
			}
			this.activeSequenceItem = this.activeSequence.s.find(i => i.n === this.activeSequence.___activeItemName);
		}
		this.refresh();
	}

	get activeSequenceItemName(): string {
		return this.activeSequence.___activeItemName!;
	}
	activeSequenceItem?: SpineSequenceItem;

	onSequenceItemClick(sequence:SpineSequenceItem) {
		this.activeSequenceItem = sequence;
		this.activeSequence.___activeItemName = sequence.n;
		this.refresh();
	}

	renderSequenceItem(item:SpineSequenceItem, itemId:number) {
		const duration = this.spine._getAnimationDuration(item.n);

		const mixDuration = (item.mixDuration || 0) * FRAME_WIDTH;
		const mixDurationView = mixDuration ?
			R.svg({ className: 'spine-sequence-mix-view', height: 30, width: mixDuration },
				R.polyline({ points: '0,0 0,30 ' + (mixDuration) + ',0'})
			) : undefined;

		let className = 'spine-sequence-item';
		if (typeof duration !== 'number') {
			className += ' danger';
		}
		const isActive = this.activeSequenceItem === item;
		if (isActive) {
			className += ' spine-sequence-item-active';
		} else {
			className += ' clickable';
		}

		if (!this.spine.spineContent?.state.data.skeletonData.animations.find((a) => {
			return a.name === item.n;
		})) {
			className += ' spine-sequence-item-invalid';
		}

		const isLoop = (this.activeSequence.l === itemId) ?
			R.div(loopPointProps, 'loop') :
			undefined;

		let playMarker;
		if (item === this.spine.playingSequenceItem && this.spine.timeToNextItem >= 0) {
			playMarker = R.div({
				className: 'timeline-play-indicator',
				style: {left: this.spine.actionsTime * FRAME_WIDTH}
			});
		}

		const delayWidth = (item.delay || 0) * FRAME_WIDTH;

		const delayView = delayWidth ? R.div({
			className: 'spine-sequence-item-delay',
			style: { width: delayWidth}
		}) : undefined;

		return R.div({
			id: 'sequence-item-' + this.spine.sequences.indexOf(this.activeSequence) + '-' + itemId,
			onMouseDown: (ev:MouseEvent) => {
				sp(ev);
				this.onSequenceItemClick(item);
			},
			onContextMenu: (ev: PointerEvent) => {
				sp(ev);
				showContextMenu([{
					name: R.fragment(R.icon('delete'), 'Delete item "' + item.n + '"'),
					onClick: () => {
						this.activeSequence.s.splice(this.activeSequence.s.indexOf(item), 1);
						if (item === this.activeSequenceItem) {
							this.activeSequenceItem = undefined;
							this.activeSequence.___activeItemName = undefined;
						}
						this.invalidate();
					}
				}], ev);
			},
			className,
			style: {
				width: this.spine.getItemDurationFrames(item) * FRAME_WIDTH + delayWidth
			}
		},
		delayView,
		mixDurationView,
		isLoop,
		playMarker,
		R.span({
			className: 'spine-sequence-item-name',
			style: {left: delayWidth},
		}, item.n, ' (', duration, 'f)')
		);
	}

	renderSequenceItemPropsEditor() {
		if (!this.activeSequence) {
			return undefined;
		}
		const loopValue = this.activeSequence.hasOwnProperty('l') ? this.activeSequence.l : -1;
		const mixValue = this.activeSequenceItem?.hasOwnProperty('mixDuration') ? this.activeSequenceItem?.mixDuration : 0;
		const delayValue = this.activeSequenceItem?.hasOwnProperty('delay') ? this.activeSequenceItem?.delay : 0;
		const speedValue = this.activeSequenceItem?.hasOwnProperty('speed') ? this.activeSequenceItem?.speed : 1;

		return R.div(sequencePropsEditorProps,
			'Loop item (-1 to disable): ',
			h(NumberEditor, {
				value: loopValue,
				min: -1,
				max: this.activeSequence.s.length - 1,
				onChange: (val) => {
					if (val >= 0) {
						this.activeSequence.l = val;
					} else {
						delete this.activeSequence.l;
					}
					this.invalidate();
				}
			}),
			R.hr(),
			this.activeSequenceItem ? R.fragment(
				R.div(propsFielsProps,
					R.div({callsName: 'props-label'}, 'Animation:'),
					R.div({className: 'props-wrapper'},
						R.div(animationSelectWrapperProps,
							h(SelectEditor, {
								select: spineAnimationsSelectList,
								onChange: (value: string) => {
					this.activeSequenceItem!.n = value;
					this.activeSequence.___activeItemName = value;
					this.invalidate();
								}, value: this.activeSequenceItemName
							})))),
				R.div(propsFielsProps,
					R.div({callsName: 'props-label'}, 'Mix time:'),
					R.div({className: 'props-wrapper'},
						h(NumberEditor, {
							value: mixValue,
							min: 0,
							onChange: (val) => {
								if (val > 0) {
							this.activeSequenceItem!.mixDuration = val;
								} else {
									delete this.activeSequenceItem!.mixDuration;
								}
								this.invalidate();
							}
						}))),
				R.div({className: 'props-field'},
					R.div({callsName: 'props-label'}, 'Delay:'),
					R.div({className: 'props-wrapper'},
						h(NumberEditor, {
							value: delayValue,
							min: 0,
							onChange: (val) => {
								if (val > 0) {
							this.activeSequenceItem!.delay = val;
								} else {
									delete this.activeSequenceItem!.delay;
								}
								this.invalidate();
							}
						}))),
				R.div({className: 'props-field'},
					R.div({callsName: 'props-label'}, 'Speed:'),
					R.div({className: 'props-wrapper'},
						h(NumberEditor, {
							value: speedValue,
							min: 0,
							step: 0.01,
							onChange: (val) => {
								if (val !== 1) {
							this.activeSequenceItem!.speed = val;
								} else {
									delete this.activeSequenceItem!.speed;
								}
								this.invalidate();
							}
						}))),
			) : undefined
		);
	}

	get sequences ():SpineSequence[] {
		return (game.editor.selection[0] as Spine)?.sequences || [];
	}

	get spine ():Spine {
		return this.props.spine;
	}

	render() {
		if (!(game.editor.selection[0] instanceof Spine)) {
			return 'No Spine element elected.';
		}
		let sequenceView;
		if (this.activeSequence) {

			const timeMarker = R.div(
				{
					className: 'time-marker',
					style: {left: this.currentTime * FRAME_WIDTH + BODY_MARGIN}
				},
				R.div({className: 'time-marker-v-line'}),
				R.div({className: 'time-marker-label'},
					R.b(null, this.currentTime),
					R.span({className: 'time-marker-label'}, ' frames (' + (this.currentTime / 60).toFixed(2) + ' seconds)')
				)
			);

			sequenceView = R.div(this.sequenceBodyProps,
				this.activeSequence?.s.length ?
				 this.activeSequence?.s.map(this.renderSequenceItem) :
				 R.div({className: 'spine-sequence-item semi-transparent', style: {width: 340}}, R.div({className: 'spine-sequence-item-name'}, 'Empty sequence (initial pose).')),
				R.btn('+', this.addItemClick),
				timeMarker
			);
		}

		return R.fragment(
			R.btn('×', this.props.onCloseClick, 'Hide timeline', 'close-window-btn', { key: 'Escape' }),
			R.div(sequenceWrapperProps,
				R.div(sequencesListBlockProps,
					this.sequences.map(this.renderSequenceLabel),
					R.btn('+', this.onAddClick)
				),
				sequenceView,
				this.renderSequenceItemPropsEditor()
			)
		);
	}
}
