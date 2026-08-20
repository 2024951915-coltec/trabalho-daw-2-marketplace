#!/bin/bash

git remote set-url origin https://github.com/2024951915-coltec/trabalho-daw-2-marketplace.git
echo 'Criou remote "origin"'
echo ''

git remote -v

echo ''
echo 'Agora dá para fazer push usando esse comando:'
echo '  git push origin <branch>'
echo ''

#install NPM packages
echo 'Instalando pacotes NPM:'
npm install express ejs @sequelize/core @sequelize/sqlite3 bcryptjs express-session socket.io multer