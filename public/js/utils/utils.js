var factorues = {};
['div', 'span', 'img', 'button', 'input'].some((factoryType) => {
	factorues[factoryType] = React.createFactory(factoryType);
});

window.R = factorues;
window.log = console.log;

export default {
	
	
	
	
	
	
	
}