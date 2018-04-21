var factories = {};
window.R = factories;

['div', 'span', 'img', 'button', 'input', 'b', 'a', 'br'].some((factoryType) => {
	factories[factoryType] = React.createFactory(factoryType);
});

R.spinner = () => {
	return R.div(null, 'Loading...'
	);
}

var _iconsCache = {};
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


window.sp = (ev) => {
	ev.stopPropagation();
	ev.preventDefault();
}

window.check = (expression, message) => {
	if (!expression) {
		EDITOR.ui.modal.showError(message);
	}
}

$(window).on('contextmenu', (e) => {
	if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
	sp(e);
	
});