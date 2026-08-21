//Configurar app, servidor e sockets
//(Concluído: Pedro)

import express from 'express';
import session from 'express-session';
import {Server} from 'socket.io';
import http from 'http';
import bcrypt from 'bcryptjs';
import multer from 'multer';

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORTA = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({extended: true}))

//variáveis de sessão
app.use(session({
    secret: 'patosaladosnadadores',
    resave: false,
    saveUninitialized: false
}));

//multer (middleware para tratar arquivos de imagem upados)
//diferente de dados comuns, imagens são arquivos complexos 
//que não podem ser guardados no banco de dados
const storage = multer.diskStorage({
    //definir diretório onde os arquivos serão guardados (/public/data/uploads/)
    destination: (req, file, callback) => {
        callback(null, 'public/data/uploads/')
    },
    //definir nome do arquivo (hash aleatório + .png/.jpeg./.gif...)
    filename: (req, file, callback) => {
        const arquivo_original = file.originalname.split('.');
        const extensao = arquivo_original[arquivo_original.length - 1]; //pegar a extensão no final do arquivo
        callback(null, file.fieldname + '-produto-' + Date.now() + '-' + Math.floor(Math.random() * 0xffffffff).toString(16) + '.' + extensao);
    }
});

const upload = multer({storage: storage});

//Inicializa o servidor (Substitui o app.listen())
function init()
{
    app.get('/access-denied', (req, res)=>{
        res.status(403)
        res.render('error/access_denied');
    })
    app.use((req,res,next)=>{
        res.status(404);
        res.render('error/404');
    })

    server.listen(PORTA, ()=>{console.log('Aberto na porta', PORTA, '\nLink:', 'http://localhost:' + PORTA + '/')})
}

const requireAuth = {
    default: (req, res, next) => {
        if(req.session.user !== undefined)
        {
            return next();
        } 
        res.redirect('/login');
    },
    vendedor: (req, res, next) => {
        if(req.session.user !== undefined)
        {
            if(req.session.user.category == 'vendedor')
            {
                return next();
            }
            return res.redirect('/access-denied');
        }

        res.redirect('/login');
    }
};

const comparePass = bcrypt.compare;
const hashPass = bcrypt.hash;

export {app, io, init, requireAuth, comparePass, hashPass, upload};