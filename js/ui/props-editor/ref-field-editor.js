import DisplayObject from "thing-engine/js/components/display-object.js";

export default class RefFieldEditor extends React.Component {

	render() {

		let val = this.props.value;

		if(val instanceof DisplayObject) {
			return R.btn(R.sceneNode(val),
				() => {
					if(this.props.value) {
						editor.selection.select(this.props.value);
					}
				}
			);
		} else if(val && typeof val === 'object') {
			return R.btn("[Object...]", () => {
				if(this.props.value) {
					editor.ui.modal.showModal(JSON.stringify(this.props.value, undefined, '\n'). split('\n').map((l) => {
						return R.span(null,l, R.br());
					}));
				}
			});
		} else {
			return R.input({disabled:true, value: JSON.stringify(val)});
		}
	}
}