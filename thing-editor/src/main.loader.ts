setTimeout(() => {
	let s = document.createElement('script');
	s.src = '/src/main.ts';
	s.type = 'module';
	document.head.appendChild(s);
}, 1000);

console.log('main.loader');