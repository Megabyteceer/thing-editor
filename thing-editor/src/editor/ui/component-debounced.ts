import { Component, ComponentChild } from "preact";

export default class ComponentDebounced<P = object, S = object> extends Component<P, S> {
	private _refreshTimeout = 0;
	refresh() {
		if(!this._refreshTimeout) {
			this._refreshTimeout = window.setTimeout(() => {
				this._refreshTimeout = 0;
				this.forceUpdate();
			}, 0);
		}
	}

	componentDidUpdate() {
		if(this._refreshTimeout) {
			clearTimeout(this._refreshTimeout);
			this._refreshTimeout = 0;
		}
	}

	componentWillUnmount(): void {
		if(this._refreshTimeout) {
			clearInterval(this._refreshTimeout);
		}
	}

	render(): ComponentChild {
		return undefined;
	}
}