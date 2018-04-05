"use strict";
import editorUtils from '/js/editor/utils/utils.js';
import engineUtils from '/js/engine/utils/utils.js';
import Settings from '/js/engine/utils/settings.js';
import ws from '/js/editor/utils/socket.js';
import UI from '/js/editor/ui/ui.js';

$(function(){

window.EDITOR = {};
EDITOR.settings = new Settings('EDITOR');

var onResize = function() {
  EDITOR.W = window.innerWidth;
  EDITOR.H = window.innerHeight;
}
$(window).on('resize', onResize);
onResize();




ReactDOM.render(
  React.createElement(UI),
  document.getElementById('root')
);

});
