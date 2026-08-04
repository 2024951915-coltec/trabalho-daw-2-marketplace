//Configurar as páginas não-estáticas (login, compras, etc)
//(A concluir. Última edição: Pedro)
import {app, requireAuth} from './app.js';
import {database, tabelas} from './db.js';

//Função para carregar as páginas
function pages()
{

    app.get('/', requireAuth, (req, res) => {
        res.send('Hello World!');
    });

    app.get('/cadastro', (req, res)=>{
        res.render('cadastro.ejs');
    })

    app.post('/cadastro', async (req, res) => {
        const {username, password} = req.body; //Req.body é os dados que o cliente envia para o servidor
    
        const user = await tabelas.usuario.findOne({where : {username}});
    
        if(!user){
            const novoUsuario = await tabelas.usuario.create({username, password});
            res.send('Novo usuário cadastrado.');
            return res.redirect('/login');
        }
    
        res.send('Usuário já existente.');
    })

    app.get('/login', (req, res)=>{
       res.render('login');
    })
   
    app.post('/login', async (req, res) =>{ 
        const {username, password} = req.body;

        const user = await tabelas.usuario.findOne({ where: {username}});

        if(user){
            const isValid = await bcrypt.compare(password, user.password);

            if(isValid){
                req.session.user =  {
                    id: user.id,
                    name: user.username
                };
            return res.redirect('/lobby');
            }
        }

        res.send('Usuário ou senha incorretos. Tente novamente');
    });


}



//Não é necessário incluir o app.listen(), ele já está incluso em outro arquivo :D

export {pages};

/*
    Vide:
    - https://docs.google.com/document/d/1258KS6TAiGOYzZC7bRTUhfBbXZ78Ih1oeVyrmJoQz_U/edit?tab=t.0#heading=h.yw4ptznw8nfs
    - https://docs.google.com/document/d/1258KS6TAiGOYzZC7bRTUhfBbXZ78Ih1oeVyrmJoQz_U/edit?tab=t.0#heading=h.syd4gr4bukwl
*/