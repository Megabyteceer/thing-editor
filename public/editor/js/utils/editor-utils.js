var factories = {};
window.R = factories;

['div', 'span', 'img', 'button', 'input'].some((factoryType) => {
	factories[factoryType] = React.createFactory(factoryType);
});

R.spinner = () => {
	return R.div(null, 'Loading...'
	);
}

var _iconsCache = {};
R.icon = (name) => {
	if(!_iconsCache.hasOwnProperty(name)){
		_iconsCache[name] = R.img({src:'/editor/img/' + name + '.png'});
	}
	return _iconsCache[name];
}

R.classIcon = (constructor) => {
	return R.icon(constructor.EDITOR_icon || 'tree/game-obj');
}



R.listItem = (view, item, key, parent) => {

	var className = (parent.state.__selectedItem === item) ? 'item-selected' : 'clickable';

	return R.div({className:className, key:key, onClick:() => {
		parent.state.__selectedItem = item;
		parent.onSelect(item);
	}}, view);
}



window.sp = (ev) => {
	ev.stopPropagation();
	ev.preventDefault();
}

window.check = (expression, message) => {
	if(!expression) {
		EDITOR.ui.modal.showError(message);
	}
}