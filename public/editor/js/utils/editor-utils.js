"use strict";

var factories = {};
window.R = factories;

['div', 'span', 'img', 'button', 'input', 'b', 'a', 'br', 'hr'].some((factoryType) => {
	factories[factoryType] = React.createFactory(factoryType);
});

R.fragment = function(...theArgs) {
	return React.createElement(React.Fragment, null, ...theArgs);
}

R.spinner = () => {
	return R.div(null, 'Loading...'
	);
}

let _iconsCache = {};
R.icon = (name) => {
	if (!_iconsCache.hasOwnProperty(name)) {
		_iconsCache[name] = R.img({src: '/editor/img/' + name + '.png'});
	}
	return _iconsCache[name];
}

R.classIcon = (constructor) => {
	return R.icon(constructor.EDITOR_icon);
}

R.listItem = (view, item, key, parent) => {
	var className = 'list-item';
	if (parent.state.selectedItem === item) {
		className += ' item-selected';
	}
	
	return R.div({
		className: className, key: key, onClick: () => {
			if (parent.state.selectedItem !== item) {
				parent.state.selectedItem = item;
				parent.onSelect(item);
				parent.forceUpdate();
			}
		}
	}, view);
}


let _debouncings = new Map();
window.debouncedCall = (f, timeMs = 0) => {
	if (_debouncings.has(f)) {
		clearTimeout(_debouncings.get(f));
		_debouncings.delete(f);
	}
	_debouncings.set(f, setTimeout(() => {
		_debouncings.delete(f);
		f();
	}, timeMs));
}

window.sp = (ev) => {
	ev.stopPropagation();
	ev.preventDefault();
}

window.check = (expression, message) => {
	if (!expression) {
		editor.ui.modal.showError(message);
	}
}

$(window).on('contextmenu', (ev) => {
	if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA' || ev.target.tagName === 'SELECT') return;
	sp(ev);
	
});

$(window).on('keydown', (ev) => {
	if (ev.key === 'F5') {
		/* sp(ev);
		 editor.reloadAssetsAndClasses();*/
	}
});

window.selectText = function (element) {
	var selection = window.getSelection();
	var range = document.createRange();
	range.selectNodeContents(element);
	selection.removeAllRanges();
	selection.addRange(range);
}


var _definedProps = new WeakMap();
var _valStore = new WeakMap();

var getValStore = (o) => {
	if(!_valStore.has(o)) {
		_valStore.set(o,{});
	}
	return _valStore.get(o);
}

window.wrapPropertyWithNumberChecker = function wrapPropertyWithNumberChecker(constructor, propertyName) {
	
	if(!_definedProps.has(constructor)){
		_definedProps.set(constructor,{});
	}
	var o = _definedProps.get(constructor);
	if(o.hasOwnProperty(propertyName)) return; //wrapped already
	o[propertyName] = true;
	
	
	var newSetter = function (val) {
		assert(!isNaN(val), 'invalid value for "' + propertyName + '". Valid number value expected.');
		originalSetter.call(this, val);
	};
	
	var d = Object.getOwnPropertyDescriptor(constructor.prototype, propertyName);
	if(d) {
		console.log("Property " + propertyName + " wraped.")
		var originalSetter = d.set;
		d.set = newSetter;
	} else {
		console.log("Own property " + propertyName + " wraped.")
		var privValue = '__wrapper_store_' + propertyName;
		
		originalSetter = function(val){
			getValStore(this)[privValue] = val;
		};
		d = {set:newSetter, get:function(){return getValStore(this)[privValue];}};
	}

	Object.defineProperty(constructor.prototype, propertyName, d);
}

export default null;