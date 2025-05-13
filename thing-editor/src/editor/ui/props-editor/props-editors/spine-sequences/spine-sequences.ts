import { h, type ClassAttributes } from 'preact';
import R from 'thing-editor/src/editor/preact-fabrics';
import copyTextByClick from 'thing-editor/src/editor/utils/copy-text-by-click';
import { scrollInToView } from 'thing-editor/src/editor/utils/scroll-in-view';
import shakeDomElement from 'thing-editor/src/editor/utils/shake-element';
import sp from 'thing-editor/src/editor/utils/stop-propagation';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import Lib from 'thing-editor/src/engine/lib';
import type { SpineSequenceItemAction } from 'thing-editor/src/engine/lib/assets/src/extended/spine.c';
import Spine, { spineAnimationsSelectList, type SpineSequence, type SpineSequenceItem } from 'thing-editor/src/engine/lib/assets/src/extended/spine.c';
import { getCallbackIcon } from 'thing-editor/src/engine/utils/get-value-by-path';
import ComponentDebounced from '../../../component-debounced';
import showContextMenu from '../../../context-menu';
import CallbackEditor from '../call-back-editor';
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

const actionsContainerProps = {
	className: 'spine-sequences-actions-body'
};

const propsFieldsProps = {className: 'props-field'};

const sortActionsByTime = (a:SpineSequenceItemAction, b:SpineSequenceItemAction) => {
	return a.t - b.t;
};

interface SpineSequencesProps extends ClassAttributes<SpineSequences> {
	onCloseClick: () => void;
	spine: Spine;
}

interface SpineSequencesState {

}

const actionTimePointer = R.div({
	className: 'spine-sequence-action-time-pointer'
});

let instance:SpineSequences|undefined;

let actionY = 0;
let lastActionTime = -10;

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
		this.setActiveItem(undefined);
		this.setActiveAction(undefined);
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

	setAnimationViewFrame(item: SpineSequenceItem, time: number) {
		if (this.spine.spineContent) {
			this.spine.spineContent.state.setAnimation(0, item.n, false);
			this.spine.spineContent.update(Math.max(0, ((time - (item.delay || 0)) / 60 * (item.speed || 1))));
		}
	}

	setCurrentTime(time:number) {
		this.currentTime = time;
		for (const item of this.activeSequence.s) {
			const itemTime = this.spine.getItemDurationFrames(item) + (item.delay || 0);
			if (time <= itemTime) {
				this.setAnimationViewFrame(item, time);
				break;
			} else {
				time -= itemTime;
			}
		}
		this.refresh();
	}

	currentTime = 0;

	componentWillUnmount(): void {
		instance = undefined;
		window.removeEventListener('mousemove', this.onMouseMove);
	}

	askForSequenceName(defaultText = '') {
 		return game.editor.ui.modal.showPrompt('Enter sequence label', defaultText, undefined, (val:string) => {
			return this.sequences.find(s => s.n === val) ? 'Sequence with label "' + val + '" already exists' : '';
		});
	}

	onAutoSelect(selectPath: string[]) {
		if (this.spine.sequences) {
			this.setActiveSequence(this.spine.sequences[parseInt(selectPath[1])].n);
			if (selectPath[2]) {
				this.setActiveItem(this.activeSequence.s[parseInt(selectPath[2])]);
			}
			if (selectPath[3]) {
				this.setActiveAction(this.activeSequenceItem?.actions![parseInt(selectPath[3])]);
			}

			getWindowElement('#sequence-item-' + selectPath[1] + '-' + selectPath[2], '#spine-sequence').then(() => {
				getWindowElement('.spine-sequence-animations-select-wrapper', '#spine-sequence').then((itemView: HTMLDivElement) => {
					shakeDomElement(itemView);
				});
			});
		}
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
		if (selectedAnimation) {
			const item = {
				n: selectedAnimation
			};
			this.activeSequence.s.push(item);
			this.setActiveItem(item);
			this.invalidate();
		}
	}

	invalidate() {
		if (this.activeSequenceItem?.actions) {
			this.activeSequenceItem?.actions.sort(sortActionsByTime);
		}
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
		return (this.spine.spineContent?.skeleton as any)?.__activeEditorSequence!;
	}

	_activeSequence!: SpineSequence;

	set activeSequence(s: SpineSequence) {
		this._activeSequence = s;
	}

	get activeSequence():SpineSequence {
		return this.spine.playingSequence || this._activeSequence;
	}

	setActiveSequence(name?:string) {
		const isChanged = this.activeSequence?.n !== name;
		if (isChanged) {
			this.currentTime = 0;
		}
		this.activeSequence = this.sequences.find(s => s.n === name)!;
		if (!this.activeSequence) {
			this.activeSequence = this.sequences[0];
			name = this.activeSequence?.n;
		}
		if (this.activeSequence) {
			if (this.spine.spineContent && this.activeSequenceName !== name) {
				(this.spine.spineContent?.skeleton as any).__activeEditorSequence = name;
			}
			if (isChanged) {
				this.activeSequenceItem = this.activeSequence.s.find(i => i.n === this.activeSequence.___activeItemName);
				this.activeSequenceAction = this.activeSequenceItem?.actions?.find((_a, i) => i === this.activeSequence.___activeActionId);
			}
		}
		this.refresh();
	}

	get activeSequenceItemName(): string {
		return this.activeSequence.___activeItemName!;
	}

	activeSequenceItem?: SpineSequenceItem;
	activeSequenceAction?: SpineSequenceItemAction;

	setActiveItem(item?:SpineSequenceItem) {
		this.activeSequenceItem = item;
		this.activeSequence.___activeItemName = item ? item.n : '';
		this.setActiveAction();
		this.refresh();
	}

	setActiveAction(action?: SpineSequenceItemAction) {
		this.activeSequenceAction = action;
		if (action) {
			this.activeSequence.___activeActionId = this.activeSequenceItem!.actions!.indexOf(action);
			this.setAnimationViewFrame(this.activeSequenceItem!, action.t);
		} else {
			this.activeSequence.___activeActionId = -1;
		}
		this.refresh(() => {
			const e = document.querySelector('.spine-sequence-item-props-editor .props-editor-callback') as HTMLInputElement;
			if (e) {
				shakeDomElement(e);
			}
		});
	}

	renderSequenceItem(item:SpineSequenceItem, itemId:number) {

		actionY = 0;
		lastActionTime = -10;

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
		if (isActive && !this.activeSequenceAction) {
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

		const width = this.spine.getItemDurationFrames(item) * FRAME_WIDTH + delayWidth;
		const id = 'sequence-item-' + this.spine.sequences!.indexOf(this.activeSequence) + '-' + itemId;

		if (isActive) {
			setTimeout(() => {
				const e = window.document.querySelector('#' + id) as HTMLDivElement;
				if (e) {
					scrollInToView(e);
				}
			}, 20);
		}

		const actions = item.actions ?
			R.div(actionsContainerProps, item.actions.map((action: SpineSequenceItemAction) => {

				let className = 'spine-sequence-action';
				if (action === this.activeSequenceAction) {
					className += ' spine-sequence-action-active';
				}
				if (!action.a) {
					className += ' spine-sequence-action-empty';
				}

				if (lastActionTime >= (action.t - 3)) {
					actionY += 20;
				} else {
					actionY = 0;
					lastActionTime = action.t;
				}

				return R.div({
					className,
					style: {
						left: action.t * FRAME_WIDTH,
						top: actionY
					},
					onContextMenu: () => {
						const actions = this.activeSequenceItem?.actions!;
						actions.splice(actions.indexOf(action), 1);
						if (!actions.length) {
							delete this.activeSequenceItem?.actions;
						}
						this.setActiveAction();
						this.invalidate();
					},
					onMouseDown: (ev:PointerEvent) => {
						sp(ev);
						if (ev.altKey) {
							action = JSON.parse(JSON.stringify(action));
							item.actions?.push(action);
						}
						this.setActiveItem(item);
						this.setActiveAction(action);

						const startTime = action.t;
						const startX = game.editor.mouseX; /// 99999 - sequence items drag left right
						const dragTimeout = () => {
							if (!game.mouse.click) {
								return;
							}

							const dragToTime = startTime + (game.editor.mouseX - startX) / FRAME_WIDTH;
							const time = Math.round(Math.max(0, Math.min(this.maxActiveActionTime(), dragToTime)));
							if (this.activeSequenceAction?.t !== time) {
								this.activeSequenceAction!.t = time;
								this.setAnimationViewFrame(this.activeSequenceItem!, time);
								this.invalidate();
							}
							setTimeout(dragTimeout, 30);
						};
						setTimeout(dragTimeout, 30);
					}
				}, getCallbackIcon(action.a, this.spine), actionTimePointer);
			})) : undefined;

		return R.div(
			{
				className: 'spine-sequence-item-wrapper',
				style: {
					width
				}
			},
			R.div({
				id,
				onMouseDown: (ev:MouseEvent) => {
					sp(ev);
					this.setActiveItem(item);

					let startX = game.editor.mouseX; /// 99999 - sequence items drag left right
					const dragTimeout = () => {
						if (!game.mouse.click) {
							return;
						}
						const d = game.editor.mouseX - startX;
						if (d < (Math.min(width / -2, -60))) {
							if (this.moveItemLeft()) {
								startX = game.editor.mouseX;
							}
						} else if (d > (Math.max(width / 2, 60))) {
							if (this.moveItemRight()) {
								startX = game.editor.mouseX;
							}
						}
						setTimeout(dragTimeout, 100);
					};
					setTimeout(dragTimeout, 100);
				},
				onContextMenu: (ev:PointerEvent) => this.onItemContextMenu(ev, item),
				title: 'Drag left right to change item priority.',
				className,

			},
			delayView,
			mixDurationView,
			isLoop,
			playMarker,
			R.span({
				className: 'spine-sequence-item-name',
				style: {left: delayWidth},
			}, item.n, ' (', duration, 'f)')
			),
			actions);
	}

	onItemContextMenu(ev: PointerEvent, item:SpineSequenceItem) {
		const clickedTime = Math.round(ev.offsetX / FRAME_WIDTH);
		this.setAnimationViewFrame(item, clickedTime);
		sp(ev);
		showContextMenu([ {
			name: 'Add event callback',
			onClick: () => {
				if (!item.actions) {
					item.actions = [];
				}
				const action = {
					t: clickedTime,
					a: ''
				};
				item.actions?.push(action);
				this.setActiveAction(action);
				this.invalidate();
			}
		}, {
			name: R.fragment(R.icon('delete'), 'Delete item "' + item.n + '"'),
			onClick: () => {
				this.activeSequence.s.splice(this.activeSequence.s.indexOf(item), 1);
				if (item === this.activeSequenceItem) {
					this.setActiveItem();
				}
				this.invalidate();
			}
		}], ev);
	}


	moveItemLeft() {
		assert(this.activeSequenceItem, 'No sequence item selected.');
		const items = this.activeSequence.s;
		const i = items.indexOf(this.activeSequenceItem!);
		if (i > 0) {
			const tmp = items[i - 1];
			items[i - 1] = items[i];
			items[i] = tmp;
			this.invalidate();
			return true;
		}
	}

	moveItemRight() {
		assert(this.activeSequenceItem, 'No sequence item selected.');
		const items = this.activeSequence.s;
		const i = items.indexOf(this.activeSequenceItem!);
		if (i >= 0 && i < items.length - 1) {
			const tmp = items[i + 1];
			items[i + 1] = items[i];
			items[i] = tmp;
			this.invalidate();
			return true;
		}
	}

	maxActiveActionTime() {
		return this.spine.getItemDurationFrames(this.activeSequenceItem!) + (this.activeSequenceItem!.delay || 0);
	}

	renderSequenceItemPropsEditor() {
		if (!this.activeSequence) {
			return undefined;
		}

		let additionalProps;

		if (this.activeSequenceAction) {
			const timeValue = this.activeSequenceAction.t;
			additionalProps = R.fragment(
				'Action time: ',
				h(NumberEditor, {
					value: timeValue,
					min: 0,
					max: this.maxActiveActionTime(),
					onChange: (time) => {
						this.activeSequenceAction!.t = time;
						this.setAnimationViewFrame(this.activeSequenceItem!, time);
						this.invalidate();
					}
				}),
				'Action callback: ',
				h(CallbackEditor, {
					value: this.activeSequenceAction.a || null,
					onChange: (val: string | InputEvent) => {
						if (val && (val as InputEvent).target) {
							val = ((val as InputEvent).target as HTMLInputElement).value;
						}
						this.activeSequenceAction!.a = val as CallBackPath;
						this.invalidate();
					},
					title: ' ' + this.activeSequenceAction.a
				})
			);

		} else {

			const mixValue = this.activeSequenceItem?.hasOwnProperty('mixDuration') ? this.activeSequenceItem?.mixDuration : 0;
			const delayValue = this.activeSequenceItem?.hasOwnProperty('delay') ? this.activeSequenceItem?.delay : 0;
			const speedValue = this.activeSequenceItem?.hasOwnProperty('speed') ? this.activeSequenceItem?.speed : 1;

			additionalProps = R.fragment(
				this.activeSequenceItem ? R.fragment(
					R.div(propsFieldsProps,
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
					R.div(propsFieldsProps,
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

		const loopValue = this.activeSequence.hasOwnProperty('l') ? this.activeSequence.l : -1;

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
			additionalProps
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
		if (!(game.editor.selection[0] as Spine)?.spineData) {
			return R.btn('spineData is not set.', () => {
				game.editor.ui.propsEditor.selectField('spineData');
			});
		}

		this.setActiveSequence(this.activeSequenceName);

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
				R.btn('+', this.addItemClick, 'Add animation item to sequence'),
				timeMarker
			);
		}

		return R.fragment(
			R.btn('×', this.props.onCloseClick, 'Hide timeline', 'close-window-btn', { key: 'Escape' }),
			R.div(sequenceWrapperProps,
				R.div(sequencesListBlockProps,
					this.sequences.map(this.renderSequenceLabel),
					R.btn('+', this.onAddClick, 'Add sequence')
				),
				sequenceView,
				this.renderSequenceItemPropsEditor()
			)
		);
	}
}
