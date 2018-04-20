import Game from '/engine/js/game.js';
const PLAY_ICON = R.icon('play');
const STOP_ICON = R.icon('stop');

class Viewport extends React.Component{
    
    constructor(props) {
        super(props);

        this.onTogglePlay = this.onTogglePlay.bind(this);
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseDown = this.onMouseDown.bind(this);
    }

    onTogglePlay(val) {
        var play = !val;
        if(play) { // launch game
            Lib.saveScene(game.currentScene, "EDITOR:save");
            

        } else { //stop game



            
        }
        game.__EDITORmode = !play;
    }

    onMouseMove(ev) {
        if(ev.buttons === 2) {
            setSelectedPos(ev);
        }
    }

    onMouseDown(ev) {
        if(ev.buttons === 2) {
            setSelectedPos(ev);
        }
    }

    render () {
        return R.div({className:'editor-viewport-wrapper'},
            R.div({className:'editor-viewport-panel'},
                R.btn(PLAY_ICON, this.onTogglePlay, 'Play/Stop (Space)', 'play-stop-btn', STOP_ICON, 32),
                R.btn(R.icon('recompile'), EDITOR.reloadClasses, 'Rebuild game sources', 'play-stop-btn'),
            ),

            R.div({id:'viewport-root', onMouseDown:this.onMouseDown, onMouseMove:this.onMouseMove, className:'editor-viewport'})

        );
    }

}

function setSelectedPos(ev) {
    var p = Game.mouseEventToGlobalXY(ev);
    EDITOR.onSelectedPropsChange('x', p.x);
    EDITOR.onSelectedPropsChange('y', p.y);
}

export default Viewport;