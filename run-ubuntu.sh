echo off
echo "==============================================================================="
echo "==============================================================================="
echo "==   It is reccomended to open 'thing-editor.code-workspace' in vscode       =="
echo "==   and use 'Editor' debug configuration to launch editor under debugger!   =="
echo "==============================================================================="
echo "==============================================================================="
echo but start now anyway
read -p 'Press Enter to continue...' var

gnome-terminal -- sh -c "npx vite"

npx electron "./thing-editor/electron-main"
