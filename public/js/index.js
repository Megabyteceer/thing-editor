"use strict";
import utils from '/js/utils/utils.js';
import Settings from '/js/utils/settings.js';
import ws from '/js/utils/socket.js';
import UI from '/js/ui/ui.js';

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
