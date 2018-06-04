var modalRejectProps = {className: 'modal-reject-text'};

export default class Prompt extends React.Component {
	
	constructor(props) {
		super(props);
		this.state = {value: props.defaultText || ''};
		this.onChange = this.onChange.bind(this);
		this.onAcceptClick = this.onAcceptClick.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);
	}
	
	componentDidMount() {
		setTimeout(() => {
			$('.modal-content input').focus();
		},1);
	}
	
	onChange(ev) {
		var val = this.props.filter ? this.props.filter(ev.target.value) : ev.target.value;
		var reject = this.props.accept ? this.props.accept(val) : undefined;
		this.setState({
			value: val,
			rejectReason: reject,
			accepted: val && !reject
		});
	}
	
	onKeyDown(ev) {
		if (ev.keyCode === 13) {
			this.onAcceptClick();
		}
	}
	
	onAcceptClick() {
		if (this.state.accepted) {
			editor.ui.modal.hideModal(this.state.value);
		}
	}
	
	render() {
		return R.fragment(
			R.div(modalRejectProps, this.state.rejectReason || ' '),
			R.div(null,
				R.input({value: this.state.value, onKeyDown: this.onKeyDown, onChange: this.onChange})
			),
			R.btn('Ok', this.onAcceptClick, this.props.title, 'main-btn', 13)
		)
	}
	
}