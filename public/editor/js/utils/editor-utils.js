"use strict";

var factories = {};
window.R = factories;

['div', 'span', 'img', 'button', 'input', 'b', 'a', 'br'].some((factoryType) => {
	factories[factoryType] = React.createFactory(factoryType);
});

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
	return R.icon(constructor.EDITOR_icon || 'tree/game-obj');
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
    if(_debouncings.has(f)) {
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
		EDITOR.ui.modal.showError(message);
	}
}

$(window).on('contextmenu', (ev) => {
	if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA' || ev.target.tagName === 'SELECT') return;
	sp(ev);
	
});

$(window).on('keydown', (ev) => {
    if(ev.key === 'F5') {
       /* sp(ev);
        EDITOR.reloadAssetsAndClasses();*/
    }
});

window.selectText = function(element) {
    var selection = window.getSelection();
    var range = document.createRange();
    range.selectNodeContents(element);
    selection.removeAllRanges();
    selection.addRange(range);
}

export default null;