class Button extends React.Component{
    
    constructor(props) {
        super(props);
        this.state = {};
        this.onClick = this.onClick.bind(this);
        this.onKeyPress = this.onKeyPress.bind(this);
    }

    componentDidMount() {
        if(this.props.hotkey) {
            window.addEventListener("keypress", this.onKeyPress);
        }
    }

    componentWillUnmount() {
         if(this.props.hotkey) {
            window.removeEventListener("keypress", this.onKeyPress);
        }
    }

    onKeyPress(e) {
        if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
        
        if(e.keyCode == this.props.hotkey) {
            this.onClick();
        }
    }

    onClick() {
        var newState = !this.state.toggled;
        if(this.props.hasOwnProperty('toggledLabel')) {
            this.setState({toggled:newState });
        }
        this.props.onClick(newState);
    }

    render () {
        return R.button({className:'clickable ' + this.props.className, onClick:this.onClick}, this.state.toggled ? this.props.toggledLabel : this.props.label);
    }
}

export default Button;