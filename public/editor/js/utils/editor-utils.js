"use strict";

window.W = 1280;
window.H = 720;

var factories = {};
window.R = factories;

['div', 'span', 'img', 'button', 'input', 'b', 'a', 'br', 'hr', 'svg', 'polyline', 'textarea'].some((factoryType) => {
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
		_iconsCache[name] = R.img({src: '/editor/img/' + name + '.png'});
	}
	return _iconsCache[name];
};

R.classIcon = (constructor) => {
	return R.icon(constructor.EDITOR_icon);
};

R.listItem = (view, item, key, parent) => {
	var className = 'list-item';
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
	if(isEventFocusOnInputElement(ev)) return;
	if($(ev.target).hasClass('selectable-text')) return;
	sp(ev);
	
});

$(window).on('keydown', (ev) => {
	if(ev.key === 'F5') {
		/* sp(ev);
		 editor.reloadAssetsAndClasses();*/
	}
	
	if(!isEventFocusOnInputElement(ev)) {
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
	var selection = window.getSelection();
	var range = document.createRange();
	range.selectNodeContents(element);
	selection.removeAllRanges();
	selection.addRange(range);
};


//======== wrapPropertyWithNumberChecker - make numeric property sensitive for NaN assigning

var _definedProps = new WeakMap();
var _valStore = new WeakMap();

var _getValStore = (o) => {
	if(!_valStore.has(o)) {
		_valStore.set(o, {});
	}
	return _valStore.get(o);
};

window.wrapPropertyWithNumberChecker = function wrapPropertyWithNumberChecker(constructor, propertyName) {
	
	if(!_definedProps.has(constructor)) {
		_definedProps.set(constructor, {});
	}
	var o = _definedProps.get(constructor);
	if(o.hasOwnProperty(propertyName)) return; //wrapped already
	o[propertyName] = true;
	
	
	var newSetter = function(val) {
		assert(!isNaN(val), 'invalid value for "' + propertyName + '". Valid number value expected.');
		originalSetter.call(this, val);
	};
	
	var d = Object.getOwnPropertyDescriptor(constructor.prototype, propertyName);
	if(d) {
		//console.log("Property " + propertyName + " wraped.")
		var originalSetter = d.set;
		d.set = newSetter;
	} else {
		//console.log("Own property " + propertyName + " wraped.")
		var privValue = '__wrapper_store_' + propertyName;
		
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

window.isEventFocusOnInputElement = (ev) => {
	var tag = ev.target.tagName;
	
	if(ev.type === 'keydown') {
		var canBePassed = ev.ctrlKey;
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

window.assert = (expression, message, dontBreakFlow) => {
	message = 'Assert: ' + message;
	if (!expression) {
		debugger;
		if (window.editor) {
			editor.ui.modal.showError(message);
		}
		if (!dontBreakFlow) {
			throw message;
		}
	}
};

window.makeImageSelectEditablePropertyDecriptor = (name, canBeEmpty, important) => {
	var ret = {
		name: name,
		type: String,
		default: canBeEmpty ? '' : 'EMPTY',
		important: important
	};
	Object.defineProperty(ret, 'select', {
		get: () => {
			if(canBeEmpty) {
				var a = Lib.__texturesList.concat();
				a[0] = {
					"name": "none",
					"value": ""
				};
				return a;
			} else {
				return Lib.__texturesList;
			}
		}
	});
	return ret;
};

export default null;