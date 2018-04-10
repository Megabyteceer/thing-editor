class StringEditor extends React.Component {

    constructor (props) {
        super(props);
        this.state = {};
        this.onChange = this.onChange.bind(this);
    }

    onChange (ev) {
        this.props.onChange;
        this.setState({value:ev.value})
    }

    render () {
        return R.input({onChange:this.onChange, value: this.state.value});
    }


}

export default StringEditor