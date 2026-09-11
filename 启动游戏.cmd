@echo off
chcp 65001 >nul
setlocal
set "GAME_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%GAME_NODE%" set "GAME_NODE=node"
"%GAME_NODE%" "%~dp0scripts\launch-game.cjs" %*
if errorlevel 1 pause
endlocal
