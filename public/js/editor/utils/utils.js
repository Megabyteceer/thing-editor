var factories = {};
['div', 'span', 'img', 'button', 'input'].some((factoryType) => {
	factories[factoryType] = React.createFactory(factoryType);
});

window.R = factories;

export default {
	
	
	
	
	
	
	
}