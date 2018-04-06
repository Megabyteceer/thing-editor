var factories = {};
window.R = factories;

['div', 'span', 'img', 'button', 'input'].some((factoryType) => {
	factories[factoryType] = React.createFactory(factoryType);
});