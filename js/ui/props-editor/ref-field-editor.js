import DisplayObject from "thing-engine/js/components/display-object.js";

export default class RefFieldEditor extends React.Component {

	render() {

		let val = this.props.value;

		if(val instanceof DisplayObject) {
			return R.span({onMouseEnter: () => {
				if(this.props.value) {
					editor.overlay.highlightObject(this.props.value);
				}
			}},R.btn(R.sceneNode(val),
				() => {
					if(this.props.value) {
						editor.selection.select(this.props.value);
					}
				}
			));
		} else {

			let title;
			if(val) {
				if(typeof val === 'object') {
					title = '[object]';
				} else if(typeof val === 'function') {
					title = 'function: ' + val.name;
				} else {
					title = '' + val;
				}
			} else {
				title = '' + val;
			}

			return R.btn(title, () => {
				if(this.props.value) {
					if(React.isValidElement(this.props.value)) {
						editor.ui.modal.showModal(this.props.value);
					} else {
						try {
							editor.ui.modal.showModal(JSON.stringify(this.props.value, undefined, '\n'). split('\n').map((l) => {
								return R.span(null,l, R.br());
							}));
						} catch (er) {
							editor.ui.modal.showModal('Object has curcular structures');
						}
					}
				}
			});
		}
	}
}