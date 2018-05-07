export default class TimelineEditor extends React.Component {
	
	constructor(props) {
		super.props(props);
		this.state = {};
		this.toggle = this.toggle.bind(this);
	}
	
	toggle() {
		this.setState({toggled: !this.state.toggled});
	}
	
	render () {
		return R.btn(this.toggled ? 'Close Timeline' : 'Open timeline', this.toggle);
	}
}