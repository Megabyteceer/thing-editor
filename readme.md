# Thing-editor

Visual game editor for pixi.js 4.

Project in experimental **alpha-version** yet.

## Installation

Please check if you have latest **nodejs**, **npm**, and **chrome** on your computer, **before installlation**.
Use next script to install editor and example project.
After succesfull installation editor should start automaticly as chrome page.
To start editor manually use **npm start** in **thing-editor** folder

```

mkdir game_editor_here
cd game_editor_here
git clone https://github.com/Megabyteceer/thing-editor.git
git clone https://github.com/Megabyteceer/thing-engine.git
git clone https://github.com/Megabyteceer/thing-project-example.git games/thing-project-example
cd thing-engine
npm i
cd ../thing-editor
npm i
npm start

```

## What is ready:
 - Scene tree editor (no drag and drop yet);
 - Property editor;
 - MovieClip component with timeline;
 - Portrait/landscape switching;
 - multilanguage text;
 - build project as release folder;
 - load custom user components form project's js folder
 
 
 
### How it is works:
Editor uses nodejs as local server to access project's filesystem, and chrome as UI.

Documentation is coming-soon. Use example project to understand beginigs.
Use double click on component in scene tree - to open component's source file to view ond edit.
Work still in progress.

![Editor screenshot](https://raw.githubusercontent.com/Megabyteceer/thing-editor/master/img/screenshots/thing-editor.jpg)
