export default class Timeline extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {};
	}
	
	render() {
		return R.div(null,
			R.btn('×', this.props.onCloseClick, 'Hide timeline', 'close-window-btn'),
			'Timeline here'
		)
	}
}