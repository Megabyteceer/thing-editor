import { Attributes, Component, ComponentChild, ComponentChildren, Ref } from "preact";

export default class ComponentDebounced<P = {}, S = {}> extends Component<P, S> {
	private _refreshTimeout = 0;
	refresh() {
		if(!this._refreshTimeout) {
			this._refreshTimeout = setTimeout(() => {
				this._refreshTimeout = 0;
				this.forceUpdate();
			}, 0);
		}
	}

	componentWillUnmount(): void {
		if(this._refreshTimeout) {
			clearInterval(this._refreshTimeout);
		}
	}

	render(_props?: Readonly<Attributes & { children?: ComponentChildren; ref?: Ref<any> | undefined; }> | undefined): ComponentChild {
		return undefined;
	}
}