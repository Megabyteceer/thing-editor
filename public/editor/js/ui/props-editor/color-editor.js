var ColorEditor = (props) => {
    var val = props.value || 0;
    
    return R.input({onChange:props.onChange, className:'clickable', type:'color', defaultValue: '#'+val.toString(16)});
}

export default ColorEditor