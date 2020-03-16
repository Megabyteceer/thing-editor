let requestNum = 0;

self.onmessage = function (event) {
	let d = JSON.parse(event.data);
	if(d.requestNum !== requestNum++) {
		self.postMessage(JSON.stringify({url: d.url, error: [{}, 'assert', 'Request order is wrong', d.url]}));
	} else {
		try {
			var xhr = new XMLHttpRequest();
			xhr.open(d.type, d.url, false);
			xhr.setRequestHeader("Content-Type", d.contentType);
			xhr.send(d.data);
			self.postMessage(JSON.stringify({url: d.url, data: xhr.responseText}));
		} catch(error) {
			/*try {
				xhr = new XMLHttpRequest();
				xhr.open(d.type, d.url, false);
				xhr.setRequestHeader("Content-Type", d.contentType);
				xhr.send(d.data);
				self.postMessage(JSON.stringify({url: d.url, data: xhr.responseText}));
			} catch(error) {*/
				self.postMessage(JSON.stringify({request: d, error}));
			//}
		}
	}
};