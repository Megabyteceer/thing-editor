const PLAY_ICON = R.icon('play');
const STOP_ICON = R.icon('stop');

class Viewport extends React.Component{
    
    constructor(props) {
        super(props);

        this.onTogglePlay = this.onTogglePlay.bind(this);
    }

    onTogglePlay (val) {
        game.paused = !val;
    }

    render () {
        return R.div({className:'editor-viewport-wrapper'},
            R.div({className:'editor-viewport-panel'},
                R.btn(PLAY_ICON, this.onTogglePlay, 'Play/Stop (Space)', 'play-stop-btn', STOP_ICON, 32),
                R.btn(R.icon('recompile'), EDITOR.reloadClasses, 'Recompile .js sources', 'play-stop-btn'),
            ),

            R.div({id:'viewport-root', className:'editor-viewport'})

        );
    }

}



export default Viewport;