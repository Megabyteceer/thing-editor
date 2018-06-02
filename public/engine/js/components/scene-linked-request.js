// automatically cancels request if parent sceneNode is destroyed
// also freezes request if current scene is frozen by modal object or game is paused
import Container from "/engine/js/components/container.js";

export default class SceneLinkedRequest extends Container {
/// #if EDITOR
	init() {
		__getNodeExtendData(this).hidden = true;
	}

/// #endif
	
	fetch(url, options) {
		assert(this.parent, "Please attach request to scene or display object before fetch.");
		this.waitUrlToRequest = url;
		this.options = options;
		return new Promise((resolve, reject) => {
			this.resolve = resolve;
			this.reject = reject;
		});
	}
	
	update() {
		if(this.waitUrlToRequest) {
			
			this.requestId = requestsIdCounter++;
			this.result = null;
			this.error = null;
			var requestId = this.requestId;
			
			fetch(this.waitUrlToRequest, this.options).then((result) => {
				if(this.requestId === requestId) {
					this.result = result;
				}
			}).catch((error) => {
				if(this.requestId === requestId) {
					this.error = error;
				}
			});
			this.waitUrlToRequest = null;
			this.options = null;
		} else if(this.error) {
			this.reject(this.error);
			this.remove();
		} else if(this.result) {
			this.resolve(this.result);
			this.remove();
		}
	}
	
	onRemove() {
		this.waitUrlToRequest = null;
		this.options = null;
		this.requestId = -1;
	}
}

var requestsIdCounter = 0;