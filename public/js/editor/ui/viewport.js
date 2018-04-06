const PLAY_ICON = R.span({style:{color:'#070'}}, '▶');
const STOP_ICON = R.span({style:{color:'#d00'}}, '■');

class Viewport extends React.Component{
    
    constructor(props) {
        super(props);

        this.onTogglePlay = this.onTogglePlay.bind(this);
    }

    onTogglePlay (val) {
        game.paused = val;
    }

    render () {
        return R.div({className:'editor-viewport-wrapper'},
            R.div({className:'editor-viewport-panel'},
                R.btn(PLAY_ICON, this.onTogglePlay, 'play-stop-btn', STOP_ICON)
            ),

            R.div({id:'viewport-root', className:'editor-viewport'})

        );
    }

}



export default Viewport;