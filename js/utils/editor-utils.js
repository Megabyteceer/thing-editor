import Tip from "./tip.js";

let factories = {};
window.R = factories;

['div', 'span', 'img', 'button', 'input', 'label', 'b', 'a', 'br', 'hr', 'svg', 'polyline', 'textarea'].some((factoryType) => {
	factories[factoryType] = React.createFactory(factoryType);
});

R.fragment = function(...theArgs) {
	return React.createElement(React.Fragment, null, ...theArgs);
};

R.spinner = () => {
	return R.div(null, 'Loading...'
	);
};

let _iconsCache = {};
R.icon = (name) => {
	if(!_iconsCache.hasOwnProperty(name)) {
		_iconsCache[name] = R.img({src: '/thing-editor/img/' + name + '.png'});
	}
	return _iconsCache[name];
};

R.classIcon = (constructor) => {
	return R.icon(constructor.__EDITOR_icon);
};

let nameProps = {className: 'scene-node-name'};
let classProps = {className: 'scene-node-class'};

R.sceneNode = (node) => {
	return R.fragment(R.classIcon(node.constructor), R.span(nameProps, node.name), R.span(classProps, ' (' + node.constructor.name + ') #' + __getNodeExtendData(node).id));
};

R.listItem = (view, item, key, parent) => {
	let className = 'list-item';
	if(parent.state.selectedItem === item) {
		className += ' item-selected';
	}
	
	return R.div({
		className: className, key: key, onClick: () => {
			if(parent.state.selectedItem !== item || parent.reselectAllowed) {
				parent.state.selectedItem = item;
				parent.onSelect(item);
				parent.forceUpdate();
			}
		}
	}, view);
};

R.tip = (id, header, text) => {
	return React.createElement(Tip, {id, header, text});
};

let _debouncings = new Map();
window.debouncedCall = (f, timeMs = 0) => {
	if(_debouncings.has(f)) {
		clearTimeout(_debouncings.get(f));
		_debouncings.delete(f);
	}
	_debouncings.set(f, setTimeout(() => {
		_debouncings.delete(f);
		f();
	}, timeMs));
};

window.sp = (ev) => {
	ev.stopPropagation();
	ev.preventDefault();
};

window.check = (expression, message) => {
	if(!expression) {
		editor.ui.modal.showError(message);
	}
};

$(window).on('contextmenu', (ev) => {
	if(window.isEventFocusOnInputElement(ev)) return;
	if($(ev.target).hasClass('selectable-text')) return;
	sp(ev);
	
});

$(window).on('keydown', (ev) => {
	if(ev.key === 'F5') {
		/* sp(ev);
		 editor.reloadAssetsAndClasses();*/
	}
	
	if(!window.isEventFocusOnInputElement(ev)) {
		switch(ev.key) {
		case "ArrowUp":
			editor.onSelectedPropsChange('y', -1, true);
			break;
		case "ArrowDown":
			editor.onSelectedPropsChange('y', 1, true);
			break;
		case "ArrowLeft":
			editor.onSelectedPropsChange('x', -1, true);
			break;
		case "ArrowRight":
			editor.onSelectedPropsChange('x', 1, true);
			break;
		}
	}
	
});

window.selectText = function(element) {
	let selection = window.getSelection();
	let range = document.createRange();
	range.selectNodeContents(element);
	selection.removeAllRanges();
	selection.addRange(range);
};

window.__EDITOReditableProps = (class_, array) => {
	assert(!class_.hasOwnProperty('__EDITOR_editableProps'), "Editable properties for class" + class_.name + " already assigned.");
	class_.__EDITOR_editableProps = array;
};

//======== wrapPropertyWithNumberChecker - make numeric property sensitive for NaN assigning

let _definedProps = new WeakMap();
let _valStore = new WeakMap();

let _getValStore = (o) => {
	if(!_valStore.has(o)) {
		_valStore.set(o, {});
	}
	return _valStore.get(o);
};

window.wrapPropertyWithNumberChecker = function wrapPropertyWithNumberChecker(constructor, propertyName) {
	
	if(!_definedProps.has(constructor)) {
		_definedProps.set(constructor, {});
	}
	let o = _definedProps.get(constructor);
	if(o.hasOwnProperty(propertyName)) return; //wrapped already
	o[propertyName] = true;
	
	let originalSetter;
	
	let newSetter = function wrapPropertyWithNumberCheckerSetter(val) {
		assert(!isNaN(val), 'invalid value for "' + propertyName + '". Valid number value expected.');
		originalSetter.call(this, val);
	};
	
	let d = Object.getOwnPropertyDescriptor(constructor.prototype, propertyName);
	if(d) {
		//console.log("Property " + propertyName + " wraped.")
		originalSetter = d.set;
		assert(originalSetter.name !== 'wrapPropertyWithNumberCheckerSetter', "Already wrapped");
		d.set = newSetter;
	} else {
		//console.log("Own property " + propertyName + " wraped.")
		let privValue = '__wrapper_store_' + propertyName;
		
		originalSetter = function(val) {
			_getValStore(this)[privValue] = val;
		};
		d = {
			set: newSetter, get: function() {
				return _getValStore(this)[privValue];
			}
		};
	}
	
	Object.defineProperty(constructor.prototype, propertyName, d);
};

PIXI.ObservablePoint.__EDITOR_selectableProps = ['x','y'];
PIXI.Point.__EDITOR_selectableProps = ['x','y'];
PIXI.mesh.Plane.__EDITOR_selectableProps = [];

window.isEventFocusOnInputElement = (ev) => {
	let tag = ev.target.tagName;
	let canBePassed;
	if(ev.type === 'keydown') {
		canBePassed = ev.ctrlKey;
		if(canBePassed) {
			switch(ev.keyCode) {  //block cpypaste hotkeys foxused on text inputs only
			case 67:
			case 86:
			case 88:
			case 89:
			case 90:
				canBePassed = false;
				break;
			default:
				canBePassed = true;
			}
		}
	}
	return !canBePassed && (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT');
};

window.makePreviewModeButton = function(title) {
	let previewBtnProperty = {
		type: 'btn',
		title: title,
		name: title,
		onClick: (o) => {
			if(o.__EDITOR_component_in_previewMode) {
				o.__EDITOR_inner_exitPreviewMode();
				previewBtnProperty.className = undefined;
			} else {
				o.__EDITOR_inner_goToPreviewMode();
				previewBtnProperty.className = 'danger-btn';
			}
			editor.refreshPropsEditor();
		}
	};
	return previewBtnProperty;
};

window.makePrefabSelector = function makePrefabSelector(startsWith, canBeEmty = true, filter = null) {
	return () => {
		let ret = [];
		if(canBeEmty) {
			ret.push({name:' ', value:''});
		}
		let a = editor.Lib._getAllPrefabs();
		for(let name in a) {
			if(!startsWith || name.startsWith(startsWith)) {
				ret.push({name:name, value:name});
			}
		}
		if(filter) {
			return ret.filter(filter);
		}
		return ret;
	};
};

window.makeSoundSelector = function makeSoundSelector(startsWith, canBeEmty = true) {
	return () => {
		let ret = [];
		if(canBeEmty) {
			ret.push({name:' ', value:''});
		}
		let a = editor.Lib.__soundsList;
		for(let i of a) {
			if(!startsWith || i.name.startsWith(startsWith)) {
				ret.push(i);
			}
		}
		return ret;
	};
};

window.makeImageSelectEditablePropertyDecriptor = (name, canBeEmpty, important) => {
	let ret = {
		name: name,
		type: String,
		default: canBeEmpty ? '' : 'EMPTY',
		important: important
	};
	Object.defineProperty(ret, 'select', {
		get: () => {
			if(canBeEmpty) {
				let a = editor.Lib.__texturesList.concat();
				a.unshift({
					"name": "none",
					"value": ""
				});
				return a;
			} else {
				return editor.Lib.__texturesList;
			}
		}
	});
	return ret;
};

export default {
	protectAccessToSceneNode: (o, debugName) => {
		o.remove = () => {
			assert(false, "Attempt to remove " + debugName);
		};
		o.destroy  = () => {
			assert(false, "Attempt to destroy " + debugName);
		};
		o.detachFromParent  = () => {
			assert(false, "Attempt to detachFromParent " + debugName);
		};
		o.__EDITOR_isHiddenForChooser = true;
	}
};