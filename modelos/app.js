//Configurar app, servidor e sockets
//(Concluído: Pedro)

import express from 'express';
import session from 'express-session';
import {Server} from 'socket.io';
import http from 'http';
import bcrypt from 'bcryptjs';

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORTA = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({extended: true}))

app.use(session({
    secret: 'patosaladosnadadores',
    resave: false,
    saveUninitialized: false
}));

//Inicializa o servidor (Substitui o app.listen())
function init() 
{
    app.use((req,res,next)=>{
        res.status(404);
        res.render('404'); //Criar EJS da página 404
    })

    server.listen(PORTA, ()=>{console.log('Aberto na porta', PORTA, '\nLink:', 'http://localhost:' + PORTA + '/')})
}

function requireAuth(req, res, next)
{
    if(req.session.user !== undefined)
    {
        next();
    }
    else res.redirect('/login');
}

const comparePass = bcrypt.compare;
const hashPass = bcrypt.hash;

export {app, io, init, requireAuth, comparePass, hashPass};