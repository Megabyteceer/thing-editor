export default class DataPathEditor extends ReactComponent {
	
	constructor(props) {
		super(props);
		
	}
	
	onEditClicked() {
		debugger;
	}
	
	render() {
		return R.div(null,
			R.input({className:'props-editor-callback', onChange: this.props.onChange, disabled:this.props.disabled, value: this.props.value || ''}),
			R.btn('...', this.onEditClicked, 'Start data source choosing', 'tool-btn')
		);
	}
}
