import type { ISkeletonData, Spine as TSpine } from 'pixi-spine';

import type { Point, Renderer, Sprite } from 'pixi.js';
import { Assets, Container } from 'pixi.js';
import type { IGoToLabelConsumer } from 'thing-editor/src/editor/editor-env';
import { type FileDesc } from 'thing-editor/src/editor/fs';
import editable from 'thing-editor/src/editor/props-editor/editable';
import { editorEvents } from 'thing-editor/src/editor/utils/editor-events';
import { editorUtils } from 'thing-editor/src/editor/utils/editor-utils';
import EDITOR_FLAGS from 'thing-editor/src/editor/utils/flags';
import { decorateGotoLabelMethods } from 'thing-editor/src/editor/utils/goto-label-consumer';
import assert from 'thing-editor/src/engine/debug/assert';
import game from 'thing-editor/src/engine/game';
import Lib, { unHashedFileToHashed } from 'thing-editor/src/engine/lib';
import type MovieClip from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip.c';
import { ACTION_ICON_STOP } from 'thing-editor/src/engine/lib/assets/src/basic/movie-clip.c';
import callByPath from 'thing-editor/src/engine/utils/call-by-path';

const poolMap = new Map() as Map<string, SpineContent[]>;

const _initSpineParser = () => {
	const atlasLoader = Assets.loader.parsers.find((p) => {
		return p.test && p.test('a.atlas');
	});
	const originalAtlasParser = atlasLoader!.parse!;
	atlasLoader!.parse = (asset: string, options, ...args) => {
		asset = asset.split('\n\n').map((texture) => {
			let imageName = texture.substring(0, texture.indexOf('\n'));
			assert(!imageName.includes('\r'), 'Spine file contain \\r\\n line break styles. Can not parse spine: ' + asset);
			const a = options!.src!.split('/');
			a.pop();
			a.push(imageName);
			const hashedFileName = unHashedFileToHashed.get(a.join('/'))!;
			return texture.replace(imageName, hashedFileName.split('/').pop()!);

		}).join('\n\n');
		return originalAtlasParser(asset, options, ...args);
	};
};

function pool(name:string): SpineContent[] {
	if (!poolMap.has(name)) {
		poolMap.set(name, []);
	}
	return poolMap.get(name)!;
}

function getSpineInstance(name:string):SpineContent {
	let p = pool(name);
	if (p.length === 0) {
		let res = Lib.resources[name];
		/// #if EDITOR
		if (!res) {
			return null as any;
		}
		res.___lastTouch = EDITOR_FLAGS.__touchTime;
		/// #endif
		let ret = new (window as any).PIXI.spine.Spine(res.spineData) as SpineContent;
		ret.autoUpdate = false;
		assert(!(ret as any)._poolName, 'Spine structure changed. Pooling needs refactoring (_poolName field renaming).');
		(ret as any)._poolName = name;
		/// #if EDITOR
		ret.__nodeExtendData = {};

		/// #endif
		return ret;
	}
	return p.pop()!;
}

function disposeSpineInstance(o: SpineContent) {
	o.visible = true;
	o.tint = 0xffffff;
	o.state.clearTrack(0);
	o.skeleton.setToSetupPose();
	pool((o as any)._poolName).push(o);
}

type SpineContent = Container & TSpine;


/// #if EDITOR

export const spineAnimationsSelectList = () => {
	let o = game.editor.selection[0] as Spine;
	let ret = o.spineContent!.state.data.skeletonData.animations.map((a) => {
		return { name: a.name, value: a.name };
	});
	return ret;
};

const animationNamePropDesc : EditablePropertyDescRaw = {
	type: 'string',
	visible: (o) => {
		return !!(o as Spine).spineContent;
	},
	disabled: () => {
		return game.editor.selection.length !== 1;
	},
	select: spineAnimationsSelectList
};

const skinNamePropDesc:EditablePropertyDescRaw = {
	type: 'string',
	visible: (o) => {
		return (o as Spine).spineContent?.skeleton.data.skins.length as any;
	},
	disabled: () => {
		return game.editor.selection.length !== 1;
	},
	select: () => {
		let o = game.editor.selection[0] as Spine;
		let ret = o.spineContent!.skeleton.data.skins.map(({ name }) => ({
			name,
			value: name
		}));
		return ret;
	}
};

const filterAssets = (file:FileDesc) => {
	return Lib.resources[file.assetName]?.hasOwnProperty('spineData');
};

/// #endif

const sequencesByNamesCache = new Map() as Map<SpineSequence[], Map<string, SpineSequence>>;

const EMPTY_MAP = new Map();

export default class Spine extends Container implements IGoToLabelConsumer {

	@editable({type: 'btn', name: 'export as PNG...', visible: (o) => !!(o as Spine).spineContent, onClick: () => editorUtils.onExportAsPngClick((game.editor.selection[0] as Spine).spineContent!)})
	_speed = 1;
	spineContent: SpineContent | null = null;
	updateTime = 0;
	_animationIsDirty = false;

	_setImmediately = false;

	_sequencesByNames!: Map<string, SpineSequence>;

	staticView!: Container;

	_goToLabelNextFrame: string | false = false;

	init() {
		super.init();
		this.staticView = this.getChildByName('static-view')!;

		this._goToLabelNextFrame = false;

		this.timeToInitPose = 0;
		this.playingSequence = undefined;

		if (!this._sequencesByNames) {
			this._initSequencesByName();
		}
	}

	private _initSequencesByName() {
		if (this.sequences) {
			if (!sequencesByNamesCache.has(this.sequences)) {
				const names = new Map() as Map<string, SpineSequence>;
				for (const s of this.sequences) {
					names.set(s.n, s);
					for (let i = 0; i < s.s.length; i++) {
						const item = s.s[i];
						item.___next = s.s[i + 1] || s.s[s.l!];
						item.___duration = this.getItemDurationFrames(item)!;
						if (item.actions) {
							for (let i = 0; i < item.actions.length; i++) {
								const action = item.actions[i];
								action.___next = item.actions[i + 1];
							}
						}
					}
				}
				sequencesByNamesCache.set(this.sequences, names);
			}
			this._sequencesByNames = sequencesByNamesCache.get(this.sequences)!;
		} else {
			this._sequencesByNames = EMPTY_MAP;
		}
	}

	getItemDurationFrames(item:SpineSequenceItem) {
		return Math.floor((this._getAnimationDuration(item.n) || 20) / (item.speed || 1));
	}

	_initSpine() {
		assert(!this.spineContent, 'spine content was not disposed released properly.');
		if (this.spineData) {

			/// #if EDITOR
			/*
			/// #endif
			if(!Lib.resources[this.spineData]) {
				this._spineData = null;
				return;
			}
			//*/

			this.updateTime = 0;

			this.spineContent = getSpineInstance(this.spineData);

			/// #if EDITOR
			if (!this.spineContent) {
				return;
			}
			/// #endif
			this.spineContent.state.timeScale = this._speed;
			this._refreshAnimation(true);
			// invalidate transform to apply to spineContent
			(this.spineContent.transform as any)._localID++;
		}
	}

	_refreshAnimation(setImmediately = false) {
		this._animationIsDirty = true;
		this._setImmediately = setImmediately;

		/// #if EDITOR
		if (game.__EDITOR_mode && !this.__isDeserialization) {
			if (this.spineContent) {

				this._applySkin();

				this._applyAnimation();

				this._animationIsDirty = false;
				this.spineContent.update(this.__previewFrame);
			}
		}
		/// #endif
	}
	/// #if EDITOR

	__EDITOR_onCreate() {
		this.spineData = Object.keys(Lib.resources).find((res: any) => Lib.resources[res].spineData)!;
	}

	__beforeDestroy() {
		this._releaseSpine();
	}

	__isDeserialization = false;

	__beforeDeserialization() {
		this.__isDeserialization = true;
	}

	__afterDeserialization() {
		this.tint = this.tint; // eslint-disable-line no-self-assign
		this.__isDeserialization = false;
		this._refreshAnimation();
	}

	/// #endif

	setCurrentAnimation(v:string) {
		this.currentAnimation = v;
	}

	_spineData: string | null = null;

	@editable({ type: 'resource', important: true, filterAssets})
	set spineData(v:string) {
		if (this.spineData !== v) {
			this._releaseSpine();
			this._spineData = v;
			this._initSpine();
		}
	}

	get spineData():string {
		return this._spineData!;
	}

	_currentAnimation: string | null = null;
	@editable(animationNamePropDesc)
	set currentAnimation(v) {
		/// #if DEBUG
		if (v) {
			this.__checkAnimationName(v);
		}
		/// #endif

		if (this._currentAnimation === v) return;

		const isNeedSetInitialAnimation = !this._currentAnimation && this.spineContent;
		this._currentAnimation = v;

		if (isNeedSetInitialAnimation) {
			this._applyAnimation();

			let frame = 0;
			/// #if EDITOR
			if (game.__EDITOR_mode) {
				frame = this.__previewFrame;
			}
			/// #endif

			this.spineContent!.update(frame);
		} else {
			this._refreshAnimation();
		}
	}

	get currentAnimation() {
		return this._currentAnimation;
	}

	setCurrentSkin(v:string) {
		this.currentSkin = v;
	}

	_currentSkin = 'default';

	@editable(skinNamePropDesc)
	set currentSkin(v:string) {
		/// #if DEBUG
		if (v) {
			 this.__checkSkinName(v);
		}
		/// #endif
		if (this._currentSkin !== v) {
			this._currentSkin = v;
			this._refreshAnimation();
		}
	}

	get currentSkin() {
		return this._currentSkin;
	}
	@editable(editorUtils.makePreviewModeButton('Preview ▶', 'components.Trigger#preview-switched'))
	@editable()
	isPlaying = true;

	_loop = true;
	@editable()
	get loop() {
		return this._loop;
	}

	set loop(v) {
		if (this._loop !== v) {
			this._loop = v;
			this._refreshAnimation();
		}
	}

	/// #if EDITOR
	containsPoint(p:Point) {
		let ret = false;
		if (this.spineContent?.visible) {
			this.spineContent.parent = this;
			this.spineContent.forAllChildren((c) => {
				if ((c as Sprite).containsPoint) {
					if (!ret) {
						ret = (c as Sprite).containsPoint(p);
					}
				}
			});
			this.spineContent.parent = null!;
		}
		return ret;
	}

	__sequences!: SpineSequence[];

	@editable({type: 'spine-sequence', name: 'sequences'})
	set sequences(val :SpineSequence[]) {
		this.__sequences = JSON.parse(JSON.stringify(val));
	}

	get sequences(): SpineSequence[] | undefined {
		return this.__isSerialization ? JSON.parse(JSON.stringify(this.__sequences)) : this.__sequences;
	}

	__isSerialization = false;

	__beforeSerialization(): void {
		this.__isSerialization = true;
	}

	__afterSerialization(data: SerializedObject): void {
		this.__isSerialization = false;
		if (this.__nodeExtendData.isPrefabReference) {
			delete data.p.sequences;
		}
	}
	/// #endif

	setLoop(v:boolean) {
		this.loop = v;
	}

	@editable({min: -1, step: 0.01})
	get speed() {
		return this._speed;
	}

	set speed(v) {
		this._speed = v;
		if (this.spineContent) {
			this.spineContent.state.timeScale = v;
		}
	}

	_tint = 0xffffff;

	get tint() {
		return this.useParentTint && this.parent && !isNaN((this.parent as MovieClip).tint as number) ? (this.parent as MovieClip).tint as number : this._tint;
	}

	set tint(v:number) {
		this._tint = v;
		if (this.spineContent) {
			this.spineContent.tint = this.tint;
			this._refreshAnimation();
		}
	}

	_releaseSpine() {
		if (this.spineContent) {
			this.removeChild(this.spineContent);
			if (!this.spinesPooling) {
				this.spineContent.destroy();
			} else {
				disposeSpineInstance(this.spineContent);
			}
			this.spineContent = null;
			this._spineData = null!;
		}
	}

	onRemove() {
		this._releaseSpine();
		super.onRemove();
		this._sequencesByNames = undefined!;
		this._spineData = null;
		this._currentAnimation = null;
		this._currentSkin = null!;
		this.playingSequence = undefined;
		this.playingSequenceItem = undefined;
	}

	play(animationName:string, mixDuration = this.mixDuration) {
		if (!this.spineContent) return;

		if (animationName) {
			this.currentAnimation = animationName;
			const trackEntry = this._applyAnimation();
			trackEntry.mixDuration = mixDuration;
		}
		this.isPlaying = true;
		this.playingSequenceItem = undefined;
		this.timeToInitPose = 0;
	}

	playFromFrame(frame:number, animationName = this._currentAnimation, mixDuration = this.mixDuration) {
		if (!this.spineContent) return;

		if (animationName) {
			this.currentAnimation = animationName;
			this._animationIsDirty = false;
			const trackEntry = this._applyAnimation();
			trackEntry.mixDuration = mixDuration;
			trackEntry.trackTime = frame;
		}
		this.isPlaying = true;
		this.playingSequenceItem = undefined;
		this.timeToInitPose = 0;
	}

	playIfDifferent(animationName:string, mixDuration:number, playIfStopped = true) {
		/// #if DEBUG
		this.__checkAnimationName(animationName);
		/// #endif

		const isSameAnimationPlayed = this.isPlaying && animationName === this.currentAnimation;
		const isStoppedAndCantPlay = !this.isPlaying && !playIfStopped;

		if (isSameAnimationPlayed || isStoppedAndCantPlay) return;

		this.play(animationName, mixDuration);
		this.playingSequenceItem = undefined;
		this.timeToInitPose = 0;
	}

	playIfNot(animationName:string, mixDuration:number, playIfStopped = true, animationNamesRegexp:string) {
		/// #if DEBUG
		this.__checkAnimationName(animationName);
		/// #endif

		if (RegExp(animationNamesRegexp).test(this.currentAnimation!)) return;

		if (!this.isPlaying && !playIfStopped) return;

		this.play(animationName, mixDuration);
		this.playingSequenceItem = undefined;
		this.timeToInitPose = 0;
	}

	timeToInitPose = 0;

	toInitPose(timeFrames: number) {
		if (this._currentAnimation) {
			if (this.timeToInitPose || !this.isPlaying) {
				return;
			}
			this.play(this._currentAnimation!, timeFrames / 60 * 0.0000000001);
			this.speed = 0.0000000001;
			this.timeToInitPose = timeFrames;
		}
	}

	stop(isNeedRefresh = false) {
		if (!this.isPlaying) return;

		this.isPlaying = false;
		if (isNeedRefresh) {
			this._refreshAnimation(true);
		}
		this.timeToInitPose = 0;
		this.playingSequenceItem = undefined;
	}

	stopByName(animationName:string, isNeedRefresh = false) {
		/// #if DEBUG
		this.__checkAnimationName(animationName);
		/// #endif
		if (!this.isPlaying) return;
		if (animationName !== this.currentAnimation) return;
		this.stop(isNeedRefresh);
	}

	_stopIfAllPlayed() {
		/*if (!this.isPlaying || !this.spineContent?.state?.tracks) return;
		const hasPlayingAnimations = this.spineContent.state.tracks.some(
			(track) => track && (track.loop || !track.isComplete())
		);

		if (!hasPlayingAnimations) {
			this.stop();
		}*/ // TODO:
	}

	update() {
		if (this.spineContent) {

			if (this._goToLabelNextFrame) {
				this.playingSequence = this._sequencesByNames.get(this._goToLabelNextFrame)!;
				this._playSequenceItem(this.playingSequence!.s[0]);
				this._goToLabelNextFrame = false;
			}

			let isNeedUpdate = false;

			//this._stopIfAllPlayed(); TODO ?

			if (this.tint !== this.spineContent.tint) {
				this.spineContent.tint = this.tint;
				if (!this.isPlaying) {
					isNeedUpdate = true;
				}
			}

			if (this._animationIsDirty && this._currentAnimation) {
				this._applySkin();

				const trackEntry = this._applyAnimation();
				trackEntry.mixDuration = this._setImmediately ? 0 : this.mixDuration;
				this.updateTime = 0;
				this._animationIsDirty = false;
				this._setImmediately = false;
				if (!this.isPlaying) {
					isNeedUpdate = true;
				}
			}
			if (this.isPlaying) {
				if (this.playingSequenceItem) {
					if (this.sequenceDelayAdd) {
						this.sequenceDelayAdd--;
					} else {
						this.actionsTime++;
						while ((this.nextAction?.t as number) <= this.actionsTime) {
							callByPath(this.nextAction!.a, this);
							if (!this.parent) {
								return;
							}
							this.nextAction = this.nextAction!.___next;
						}
						if (this.sequenceDelay) {
							this.sequenceDelay--;
						} else {
							this.timeToNextItem--;
							if (this.timeToNextItem === 0) {
								if (!this.playingSequenceItem!.___next) {
									this.stop();
									this.actionsTime = 0;
									this.playingSequenceItem = undefined;
								} else {
									this._playSequenceItem(this.playingSequenceItem!.___next);
								}
							}
							this.updateTime += 0.01666666666667;
						}
					}
				} else {
					this.updateTime += 0.01666666666667;
				}
				if (this.timeToInitPose > 0) {
					this.timeToInitPose--;
					if (!this.timeToInitPose) {
						this.isPlaying = false;
						this.stop(false);
					}
				}
			} else if (isNeedUpdate) {
				this.spineContent.update(0);
			}

			if (this.staticView) {
				if (this.isPlaying) {
					this.spineContent.visible = true;
					this.staticView.visible = false;
				} else {
					this.spineContent.visible = false;
					this.staticView.visible = true;
				}
			}
		}

		if (game.isUpdateBeforeRender && this.updateTime > 0) {
			this.spineContent!.update(this.updateTime);
			this.updateTime = 0;
		}
		super.update();
	}


	updateTransform(): void {
		super.updateTransform();
		if (this.spineContent) {
			this.spineContent.parent = this;
			this.spineContent.updateTransform();
			this.spineContent.parent = null!;
		}
	}

	render(renderer: Renderer): void {
		if (this.spineContent?.visible && this.visible) {
			/// #if EDITOR
			this.spineContent.filters = this.filters;
			Spine.__touchedSpines.set(this.spineData, EDITOR_FLAGS.__touchTime);
			/// #endif
			this.spineContent.render(renderer);
		}
		super.render(renderer);
	}

	static __spineLoadingPromise: Promise<true>;

	static _loadSpineRuntime() {
		if (!this.__spineLoadingPromise) {
			game.loadingAdd('pixi-spine/dist/pixi-spine.js');
			this.__spineLoadingPromise = new Promise((resolve) => {
				const s = window.document.createElement('script');
				// pixi-spine loading via script attachment because ES module pixi-spine causes double pixi.js bundling.
				//@ts-ignore
				s.src = SPINE_SRC_PATH;
				s.onload = () => {
					game.loadingRemove('pixi-spine/dist/pixi-spine.js');
					/// #if EDITOR
					if (false) {
					/// #endif
						_initSpineParser();
					/// #if EDITOR
					}
					/// #endif

					// fix Mesh+Sequence crash https://github.com/pixijs/spine/pull/560/files
					//@ts-ignore
					const originCreateMesh = window.PIXI.spine.SpineBase.prototype.createMesh as any;
					//@ts-ignore
					window.PIXI.spine.SpineBase.prototype.createMesh = function(slot: ISlot, attachment: IMeshAttachment) {
						if (!attachment.region && attachment.sequence) {
							attachment.sequence.apply(slot, attachment as any);
						}
						return originCreateMesh.call(this, slot, attachment);
					};

					resolve(true);
				};
				s.onerror = () => {
				//@ts-ignore
					game.showLoadingError(SPINE_SRC_PATH);
				};
				document.body.appendChild(s);
			});
			Lib.__parsersLoadingPromises.push(this.__spineLoadingPromise);
		}
		return this.__spineLoadingPromise;
	}

	_applySkin() {
		if (this.currentSkin) {
			/// #if EDITOR
			if (!this.spineContent!.skeleton.data.skins.find((s) => s.name === this.currentSkin)) {
				this._currentSkin = this.spineContent!.skeleton.data.skins[0].name;
				Lib.__invalidateSerializationCache(this);
			}
			/// #endif
			this.spineContent!.skeleton.setSkinByName(this.currentSkin);
		}
	}

	timeToNextItem = -1;
	actionsTime = 0;
	nextAction?: SpineSequenceItemAction;
	playingSequence?: SpineSequence;
	playingSequenceItem?: SpineSequenceItem;
	sequenceDelay = 0;
	sequenceDelayAdd = 0;


	gotoLabel(labelName: string) {
		assert(this.hasLabel(labelName), 'Label \'' + labelName + '\' not found in Spine.', 99999);
		this._goToLabelNextFrame = labelName;
	}

	_playSequenceItem(item?:SpineSequenceItem) {
		if (!item) {
			this.toInitPose(Math.round(this.mixDuration * 60));
		} else {
			this.play(item.n, (item.mixDuration || 0) / 60);
			this.loop = false;
			this.sequenceDelay = item.delay || 0;
			if (item.delayRandom) {
				this.sequenceDelayAdd = Math.floor(Math.random() * item.delayRandom);
			} else {
				this.sequenceDelayAdd = 0;
			}
			this.speed = (item.hasOwnProperty('speed') ? item.speed : 1) as number;
			this.timeToNextItem = item.___duration!;
			if (item.actions) {
				this.nextAction = item.actions[0];
			}
		}
		this.actionsTime = 0;
		this.playingSequenceItem = item;
	}

	hasLabel(labelName: string) {
		if (!this._sequencesByNames) {
			this._initSequencesByName();
		}
		return this._sequencesByNames.has(labelName);
	}

	gotoLabelRecursive(labelName: string): void {
		if (this.hasLabel(labelName)) {
			this.gotoLabel(labelName);
		}
		super.gotoLabelRecursive(labelName);
	}

	_applyAnimation() {
		/// #if EDITOR
		let currentAnimation = this._currentAnimation!;
		if (!currentAnimation || !this.spineContent!.state.data.skeletonData.findAnimation(currentAnimation)) {
			currentAnimation = this.spineContent!.state.data.skeletonData.animations[0].name;
		}
		return this.spineContent!.state.setAnimation(0, currentAnimation, this._loop);
		/// #endif
		return this.spineContent!.state.setAnimation(0, this._currentAnimation!, this._loop); //eslint-disable-line no-unreachable
	}

	static allocatePool(name:string, count:number) {
		if (count > 0) {
			let a = [];
			let i;
			while (count-- > 0) {
				i = getSpineInstance(name);
				i.update(1);
				a.push(i);
			}
			while (a.length > 0) {
				disposeSpineInstance(a.pop()!);
			}
		}
	}

	static clearPool(name = null) {
		if (name) {
			let a = pool(name);
			while (a.length > 0) {
				a.pop()!.destroy();
			}
		} else {
			for (let a of poolMap.values()) {
				while (a.length > 0) {
					a.pop()!.destroy();
				}
			}
			poolMap.clear();
		}
	}

	/// #if DEBUG
	__checkAnimationName(animationName:string) {
		if (game.__EDITOR_mode) {
			return;
		}
		if (!this.spineContent!.skeleton.data.animations.find((a) => a.name == animationName)) {
			assert(false, 'Spine \'' + this.spineData + '\' does not have animation \'' + animationName + '\'', 99999);
		}
	}

	__checkSkinName(skinName:string) {
		if (game.__EDITOR_mode) {
			return;
		}
		if (!this.spineContent!.skeleton.data.skins.find((s) => s.name == skinName)) {
			assert(false, 'Spine \'' + this.spineData + '\' does not have skin \'' + skinName + '\'', 99999);
		}
	}
	/// #endif

	@editable({min: 0, step: 0.01})
	mixDuration = 0.1;

	@editable()
	spinesPooling = true;

	@editable({name: 'tint', basis: 16, type: 'number', default: 0xffffff, max: 0xffffff, min: 0, disabled: (node) => node.useParentTint})

	@editable()
	useParentTint = false;

	_getAnimationDuration(animationName?:string) {
		let anim = this.spineContent?.state.data.skeletonData.animations.find((a) => {
			return a.name === animationName;
		});
		if (anim) {
			return Math.ceil(anim.duration * 60);
		}
	}
	/// #if EDITOR

	static __touchedSpines = new Map() as Map<string, number>;

	@editable({max: 255, min: 0, notSerializable: true, disabled: (node) => node.useParentTint})
	get tintR () {
		return this.tint >> 16;
	}

	set tintR (v) {
		this.tint = (this.tint & 0xffff) | (v << 16);
	}

	@editable({max: 255, min: 0, notSerializable: true, disabled: (node) => node.useParentTint})
	get tintG () {
		return (this.tint & 0xff00) >> 8;
	}

	set tintG (v) {
		this.tint = (this.tint & 0xff00ff) | (v << 8);
	}

	@editable({max: 255, min: 0, notSerializable: true, disabled: (node) => node.useParentTint})
	get tintB () {
		return this.tint & 0xff;
	}

	set tintB (v) {
		this.tint = (this.tint & 0xffff00) | v;
	}

	@editable({type: 'ref'})
	set __duration(_v) {}

	get __duration() {
		return this._getAnimationDuration(this.currentAnimation!);
	}

	___previewFrame = 0;

	set __previewFrame(v) {
		this.___previewFrame = v;
		if (game.__EDITOR_mode && this.spineContent) {
			this._applyAnimation();
			this.spineContent.update(this.__previewFrame);
		}
	}

	__getLabels():undefined | string[] {
		if (this.sequences) {
			return this.sequences.map(s => s.n);
		}
	}

	@editable({min: 0, step: 0.001})
	get __previewFrame() {
		return this.___previewFrame || 0;
	}
	__goToPreviewMode() {
		if (this.spineContent) {
			this._applyAnimation();
			this.spineContent.autoUpdate = true;
		}
	}

	__exitPreviewMode() {
		if (this.spineContent) {
			this.spineContent.autoUpdate = false;
			this._applyAnimation();
			this.spineContent.update(this.__previewFrame);
		}
	}

	static __validateSpineHasAnimation(data:any, animationName:string, fieldName:string): SerializedDataValidationError | undefined {
		if (
			!(Lib.resources[data.spineData].spineData as ISkeletonData).animations.find((a) => a.name == animationName)
		) {
			return {
				message: 'Spine \'' + data.spineData + '\' does not have animation \'' + animationName + '\'',
				findObjectCallback: (o:Container) => {
					if ((o as Spine).spineData === data.spineData) {
						return (o as Spine).currentAnimation === animationName ||
						(o as Spine).sequences?.some(s => s.s.some(i => i.n === animationName));
					}
					return false;
				},
				fieldName,
				errorCode: 99999
			};
		}

	}

	static __validateObjectData(data:SerializedObjectProps):SerializedDataValidationError | undefined {
		if (data.spineData) {
			if (!Lib.resources[data.spineData]) {
				return {
					message: 'Spine resource is not found: \'' + data.spineData + '\'',
					findObjectCallback: (o:Container) => {
						return (o as Spine).spineData === data.spineData;
					},
					fieldName: 'spineData',
					errorCode: 99999
				};
			} else {
				if (data.currentAnimation) {
					let ret = this.__validateSpineHasAnimation(data, data.currentAnimation, 'currentAnimation');
					if (!ret) {
						if (data.sequences) {
							const sequences = data.sequences as SpineSequence[];
							sequences.forEach((sequence, sequenceId) => {
								sequence.s.forEach((item, itemId) => {
									if (!ret) {
										ret = this.__validateSpineHasAnimation(data, item.n, 'sequences,' + sequenceId + ',' + itemId);

										if (!ret && item.actions) {
											item.actions.forEach((action, actionId) => {
												if (!action.a && !ret) {
													ret = {
														message: 'Spine sequence action has empty callback path. Please delete the action or set the callback path.',
														findObjectCallback: (o:Container) => {
															if ((o as Spine).spineData === data.spineData) {
																return (o as Spine).sequences?.some(s => s.s.some(i => i.actions?.some(a => !a.a)));
															}
															return false;
														},
														fieldName: 'sequences,' + sequenceId + ',' + itemId + ',' + actionId,
														errorCode: 99999
													};
												}
											});
										}
									}
								});
							});
						}
					}
					return ret;
				}
				if (
					data.currentSkin &&
					!Lib.resources[data.spineData].spineData.skins.find((a: any) => a.name == data.currentSkin)
				) {
					return {
						message: 'Spine \'' + data.spineData + '\' does not have skin \'' + data.currentSkin + '\'',
						findObjectCallback: (o) => {
							return (o as Spine).spineData === data.spineData && (o as Spine).currentSkin == data.currentSkin;
						},
						fieldName: 'currentSkin',
						errorCode: 99999
					};
				}
			}
		}
	}

	/// #endif
}

Spine._loadSpineRuntime();

/// #if EDITOR
editorEvents.on('playToggle', Spine.clearPool);

Spine.__EDITOR_icon = 'tree/spine';
(Spine.prototype.toInitPose as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;
(Spine.prototype.play as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;
(Spine.prototype.stop as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;
(Spine.prototype.setCurrentAnimation as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;
(Spine.prototype.setCurrentAnimation as SelectableProperty).___EDITOR_callbackParameterChooserFunction = (context: Spine) => {
	const spineContent = context.spineContent;
	const list = spineContent!.skeleton.data.animations.map((a) => ({
		name: a.name
	}));
	return game.editor.ui.modal.showListChoose('Choose spine skin', list).then((choose) => (choose ? choose.name : null));
};
(Spine.prototype.toInitPose as SelectableProperty).___EDITOR_actionIcon = ACTION_ICON_STOP;

(Spine.prototype.setCurrentSkin as SelectableProperty).___EDITOR_isGoodForCallbackChooser = true;
(Spine.prototype.setCurrentSkin as SelectableProperty).___EDITOR_callbackParameterChooserFunction = (context: Spine) => {
	const spineContent = context.spineContent;
	if (!context.spineContent || !context.spineContent.skeleton.data.skins) {
		return Promise.resolve('enterSkinNameHere');
	}

	const list = spineContent!.skeleton.data.skins.map((skin) => ({
		name: skin.name
	}));
	return game.editor.ui.modal.showListChoose('Choose spine skin', list).then((choose) => (choose ? choose.name : null));
};

export interface SpineSequenceItemAction {
	/** call-back action */
	a: CallBackPath;
	/** time */
	t: number;

	___next?: SpineSequenceItemAction;
}

export interface SpineSequenceItem {
	/** name */
	n: string;
	mixDuration?: number;
	delay?: number;
	delayRandom?: number;
	speed?: number;
	actions?: SpineSequenceItemAction[]; // TODO: add actions (callbacks) editor

	/** runtime next item reference */
	___next?: SpineSequenceItem;
	/** runtime duration */
	___duration?: number;
}

export interface SpineSequence {
	/** name */
	n: string;
	/** sequences */
	s: SpineSequenceItem[];
	/** loop sequence index */
	l?: number;
	___activeItemName?: string;
	___activeActionId?: number;
}

decorateGotoLabelMethods(Spine);
/// #endif
