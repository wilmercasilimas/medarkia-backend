@echo off
title Iniciando Medarkia...

:: Iniciar MongoDB
start cmd.exe /k "cd /d C:\Program Files\MongoDB\Server\8.0\bin && mongod.exe"

:: Esperar unos segundos para que MongoDB arranque
timeout /t 5 > nul

:: Iniciar backend de Medarkia
start cmd.exe /k "cd /d C:\proyectos\www\medarkia\medarkia-backend && npm run dev"

:: Aquí puedes descomentar esto si luego agregas el frontend:
:: start cmd.exe /k "cd /d C:\proyectos\www\medarkia\medarkia-frontend && npm run dev"

exit
