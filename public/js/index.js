"use strict";
import utils from '/js/utils/utils.js';
import Settings from '/js/utils/settings.js';
import ws from '/js/utils/socket.js';
import UI from '/js/ui/ui.js';

window.EDITOR = {};
EDITOR.settings = new Settings('EDITOR');

ReactDOM.render(
  React.createElement(UI),
  document.getElementById('root')
);