//Configurar app, servidor e sockets
//(Concluído: Pedro)

import express from 'express';
import session from 'express-session';
import {Server} from 'socket.io';
import http from 'http';


const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORTA = 3000;
const bcrypt = require('bcryptjs');

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({extended: true}))

app.use(session({
    secret: 'eusoumonobola-segredo-secreto',
    resave: false,
    saveUninitialized: false
}));

//Inicializa o servidor (Substitui o app.listen())
function init() {
    server.listen(PORTA, ()=>{console.log('Aberto na porta', PORTA, '\nLink:', 'http://localhost:' + PORTA + '/')})
}

export {app, io, init};