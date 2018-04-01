var factories = {};
['div', 'span', 'img', 'button', 'input'].some((factoryType) => {
	factories[factoryType] = React.createFactory(factoryType);
});

window.R = factories;
window.log = console.log;

export default {
	
	
	
	
	
	
	
}