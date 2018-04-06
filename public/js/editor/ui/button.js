class Button extends React.Component{
    
    constructor(props) {
        super(props);
        this.state = {};
        
        this.onClick = this.onClick.bind(this);
    }

    onClick() {
        if(this.props.hasOwnProperty('toggledLabel')) {
            this.setState({toggled: !this.state.toggled});
        }
        this.props.onClick(this.state.toggled);
    }

    render () {
        return R.button({className:'clickable ' + this.props.className, onClick:this.onClick}, this.state.toggled ? this.props.toggledLabel : this.props.label);
    }
}

export default Button;