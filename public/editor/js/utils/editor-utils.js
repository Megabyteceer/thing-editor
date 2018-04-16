var factories = {};
window.R = factories;

['div', 'span', 'img', 'button', 'input'].some((factoryType) => {
	factories[factoryType] = React.createFactory(factoryType);
});

R.spinner = () => {
	return R.div(null, 
	);
}

var _iconsCache = {};
R.icon = (name) => {
	if(!_iconsCache.hasOwnProperty(name)){
		_iconsCache[name] = R.img({src:'/editor/img/' + name + '.png'});
	}
	return _iconsCache[name];
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