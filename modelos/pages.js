//Configurar as páginas não-estáticas (login, compras, etc)
//(A concluir. Última edição: Pedro)

import {app, requireAuth, comparePass} from './app.js';
import {database, tabelas} from './db.js';

//Função para carregar as páginas
function pages()
{

    app.get('/', requireAuth, (req, res) => {
        res.redirect('/home');
    });

    app.get('/cadastro', (req, res)=>{
        res.render('cadastro.ejs');
    })

    app.get('/home', (req,res)=>{
        res.render('home.ejs');
    })

    app.get('/login', (req, res)=>{
       res.render('login');
    })
   
    app.post('/login', async (req, res) =>{ 
        const {username, senha} = req.body;

        const user = await tabelas.usuario.findOne({ where: {username}});

        if(user){
            const isValid = await comparePass(senha, user.passhash);

            if(isValid){
                req.session.user =  {
                    id: user.id,
                    name: user.username
                };
            return res.redirect('/home');
            }
        }

        res.send('Usuário ou senha incorretos. Tente novamente');
    });

    app.post('/cadastro', async (req, res)=>{
        const {nome, username, senha} = req.body;

        const user = await tabelas.usuario.findOne({ where: {username}});

        if(!user){
            tabelas.usuario.create({
                name: nome,
                username: username,
                passhash: senha,
            });

            return res.redirect('/login');
        }

        res.send("Usuário", username, "já existente");
    });
}



//Não é necessário incluir o app.listen(), ele já está incluso em outro arquivo :D

export {pages};

/*
    Vide:
    - https://docs.google.com/document/d/1258KS6TAiGOYzZC7bRTUhfBbXZ78Ih1oeVyrmJoQz_U/edit?tab=t.0#heading=h.yw4ptznw8nfs
    - https://docs.google.com/document/d/1258KS6TAiGOYzZC7bRTUhfBbXZ78Ih1oeVyrmJoQz_U/edit?tab=t.0#heading=h.syd4gr4bukwl
*/