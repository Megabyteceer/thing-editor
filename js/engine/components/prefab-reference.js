/// #if EDITOR
import PrefabsList from "thing-editor/js/editor/ui/prefabs-list.js";
import game from "../game.js";
import MovieClip from "./movie-clip/movie-clip.js";

const allRefs = {};
/// #endif

import Container from "./container.js";
import Lib from "../lib.js";

export default class PrefabReference extends Container {

	/// #if EDITOR

	__getPrefabName() {
		return PrefabsList.getPrefabNameFromPrefabRef(this);
	}

	set prefabName(n) {
		this._prefabName = n;
		if(game.__EDITOR_mode) {
			this.__exitPreview();
			this.__refreshPreview();
		}
	}

	get prefabName() {
		return this._prefabName;
	}

	__goToPreview() {
		if(this.__previewNode) {
			return;
		}
		let prefabName = this.__getPrefabName();

		if(prefabName && (this.scale.x !== 0) && (this.scale.y !== 0)) {

			if(!Lib.hasPrefab(prefabName)) {
				editor.ui.status.warn("Prefab with name " + prefabName + " is not exists.", 32024, this, 'prefabName');
			} else {
				Lib.__isPrefabPreviewLoading++;
				this.__previewNode = Lib.loadPrefab(prefabName);
				Lib.__isPrefabPreviewLoading--;
				if(!allRefs[prefabName]) {
					allRefs[prefabName] = [];
				}
				allRefs[prefabName].push(this);
				this.__appliedPreviewName = prefabName;

				__getNodeExtendData(this.__previewNode).hidden = true;
				if(this.inheritProps) {
					this.__previewNode.x = 0;
					this.__previewNode.y = 0;
					this.__previewNode.rotation = 0;
					this.__previewNode.scale.x = 1;
					this.__previewNode.scale.y = 1;
					this.__previewNode.skew.x = 0;
					this.__previewNode.skew.y = 0;
					this.__previewNode.pivot.x = 0;
					this.__previewNode.pivot.y = 0;
					if((this.__previewNode instanceof MovieClip) && this.__previewNode._timelineData) {
						for(let fn in editor.ClassesLoader.classesDefaultsById['PrefabReference']) {
							for(let f of this.__previewNode._timelineData.f) {
								if(fn === f.n && this[fn] !== f.t[0].v) {
									this[fn] = f.t[0].v;
									editor.ui.status.warn('Value of PrefabReference property "' + fn + '" was changed to ' + this[fn] + ' because its refers to MovieClip where animation starts with that value.', 30018, this, fn);
									editor.sceneModified();
								}
							}
						}
					}
				}
				this.addChildAt(this.__previewNode, 0);
				editor.game.__loadDynamicTextures();
			}
		}
	}

	__exitPreview() {
		if(this.__previewNode) {
			let a = allRefs[this.__appliedPreviewName];
			let i = a.indexOf(this);
			if(i < 0) {
				editor.ui.status.warn("Reference to prefab " + this.__appliedPreviewName + " is not registered.");
			} else {
				a.splice(i, 1);
			}
			this.__previewNode.remove();
			this.__previewNode = null;
			editor.game.__loadDynamicTextures();
		}
	}

	__beforeDeserialization() {
		this.__exitPreview();
		this.__canApplyPreview = false;

		//cleanup visible editable properties from target prefab
		if(this.___appliedEditableFields) {
			let fields = this.___appliedEditableFields;
			for(let f of fields) {
				if(f.showInPrefabReference) {
					delete this[f.name];
				}
			}
		}
	}

	__afterDeserialization() {
		this.__canApplyPreview = true;
		this.__refreshPreview();

		//get visible editable properties from target prefab
		let prefab = Lib.prefabs[this.prefabName];
		if(prefab) {
			let props = prefab.p;
			let fields = this.__EDITOR_propsListCache;
			this.___appliedEditableFields = fields;
			for(let f of fields) {
				if(f.showInPrefabReference && (typeof this[f.name] === 'undefined')) {
					if(props.hasOwnProperty(f.name)) {
						this[f.name] = props[f.name];
					} else if(f.hasOwnProperty('default')) {
						this[f.name] = f.default;
					} else {
						let defaults = editor.ClassesLoader.classesDefaultsById[prefab.c];
						if(defaults.hasOwnProperty(f.name)) {
							this[f.name] = defaults[f.name];
						}
					}
				}
			}
		}
	}

	__EDITOR_onCreate() {
		this.__canApplyPreview = true;
	}

	__beforeDestroy() {
		this.__exitPreview();
	}

	get __preview() {
		return this.__isPreviewModeEnabled;
	}

	set __preview(v) {
		this.__isPreviewModeEnabled = v;
		this.__refreshPreview();
	}

	__refreshPreview() {

		if(game.__EDITOR_mode) {
			PrefabsList.checkPrefabReferenceForLoops(this);
		}

		if(this.__isPreviewModeEnabled && this.__canApplyPreview) {
			this.__goToPreview();
		} else {
			this.__exitPreview();
		}
	}

	static __refreshPrefabRefs(name) {
		let a = allRefs[name];
		if(!a) {
			return;
		}
		a = a.slice(0);
		for(let r of a) {
			r.__exitPreview();
			r.__refreshPreview();
		}
	}

	set __EDITOR_propsListCache(a) {
		this.constructor.prototype.___EDITOR_propsListCachePrefabReferences = a;
	}

	get __EDITOR_propsListCache() {
		let prefab = Lib.prefabs[this.prefabName];
		if(prefab) {
			let c = game.classes[prefab.c];
			if(c) {
				if(!c.prototype.___EDITOR_propsListCacheForPrefabReference) {
					let a = this.constructor.prototype.___EDITOR_propsListCachePrefabReferences.slice();
					let separator;
					let classFields = c.prototype.__EDITOR_propsListCache;
					for(let f of classFields) {
						if(f.type === "splitter") {
							separator = f;
						} else if(f.showInPrefabReference) {
							if(separator) {
								a.push(separator);
								separator = null;
							}
							a.push(f);
						}
					}
					c.prototype.___EDITOR_propsListCacheForPrefabReference = a;
				}
				return c.prototype.___EDITOR_propsListCacheForPrefabReference;
			}
		}
		return this.constructor.prototype.___EDITOR_propsListCachePrefabReferences;
	}

	__afterSerialization(data) {
		//remove properties equal with target prefab
		let prefab = Lib.prefabs[this.prefabName];
		if(prefab) {
			let props = prefab.p;
			for(let n in props) {
				if(props[n] === data[n]) {
					delete data[n];
				}
			}
		}
	}

	/// #endif
}

/// #if EDITOR

PrefabReference.__EDITOR_group = 'Basic';
__EDITOR_editableProps(PrefabReference, [
	{
		type: 'splitter',
		title: 'Prefab:',
		name: 'prefab'
	},
	{
		type: 'btn',
		name: 'EDIT',
		hotkey: 1069,
		title: "Edit prefab (Ctrl+E)",
		onClick: (o) => {
			PrefabsList.editPrefab(o.__getPrefabName(), true);
		}
	},
	{
		type: String,
		select: window.makePrefabSelector(undefined, true),
		name: 'prefabName'
	},
	{
		name: 'dynamicPrefabName',
		type: 'data-path'
	},
	{
		type: Boolean,
		name: 'inheritProps',
		tip: 'if false - prefab will be added on stage as is. If true - properties of this reference component will be applied to loaded prefab.',
		default: true
	},
	{
		name: '__preview',
		type: Boolean,
		default: true
	}
]);

PrefabReference.__EDITOR_icon = 'tree/ref';
/// #endif