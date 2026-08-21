#!/bin/bash

git remote set-url origin https://github.com/2024951915-coltec/trabalho-daw-2-marketplace.git
echo 'Criou remote "origin"'
echo ''

git remote -v

echo ''
echo 'Agora dá para fazer push usando esse comando:'
echo '  git push origin <branch>'
echo ''

#criar diretório /public/data/uploads/ (diretório ignorado pelo .gitignore mas necessário para o funcionamento)
#o diretório guarda arquivos de imagem/áudio/vídeo upados por usuários
echo 'Criando diretório public/data/uploads/'
mkdir -p public/data/uploads/
echo ''

#por fim, instalar todos os pacotes NPM
echo 'Instalando pacotes NPM:'
npm install express ejs @sequelize/core @sequelize/sqlite3 bcryptjs express-session socket.io multer