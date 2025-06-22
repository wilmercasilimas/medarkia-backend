@echo off
title Iniciando Medarkia...

:: Iniciar MongoDB en una nueva ventana
start cmd.exe /k "cd /d C:\Program Files\MongoDB\Server\8.0\bin && mongod.exe"

:: Esperar unos segundos para que MongoDB arranque correctamente
timeout /t 5 > nul

:: Bucle para mantener el backend activo, reinicia si se detiene
:reiniciar
cd /d C:\proyectos\www\medarkia\medarkia-backend
echo --------------------------------------
echo 🚀 Iniciando backend de Medarkia...
echo --------------------------------------
npm run dev
echo ❌ Backend detenido. Reinicio en 5 segundos...
timeout /t 5
goto reiniciar
