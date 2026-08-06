//Configurar as páginas não-estáticas (login, compras, etc)
//(A concluir. Última edição: Pedro)

import {app, requireAuth, comparePass, hashPass} from './app.js';
import {database, tabelas} from './db.js';

//Função para carregar as páginas
function pages()
{

    app.get('/', requireAuth, (req, res) => {
        res.redirect('/home');
    });

    app.get('/register', (req, res)=>{
        res.render('register.ejs');
    })

    app.get('/home', (req,res)=>{
        res.render('home.ejs');
    })

    app.get('/login', (req, res)=>{
       res.render('login.ejs');
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

    app.post('/register', async (req, res)=>{
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

    // Alteração de senha e edição de perfil
app.get('profile_information', (req, res) => {
    return res.render('perfil.ejs');
})

app.post('profile_information', requireAuth, (req, res) => {
    const {username, name, password, category, adress} = req.body;
})

app.get('password_change', requireAuth, (req, res) => {
    return res.render('password_change.ejs');
})

app.post('/password_change', async (req, res) => {
    const { oldPassword, newPassword} = req.body;

    const username = req.session.user.name;

    const user = await tabelas.usuario.findOne({where: {username}});

    if(user){
        const isValid = await comparePass(oldPassword, user.passhash);

        if(!isValid){
            res.send('Senha incorreta. Digite novamente');
        }

        user.passhash = await hashPass(newPassword, 10);
        await user.save(); // Salvar os dados atualizados

        res.send('Senha atualizada.');
    }

})

    // Edição de perfil
    app.get('/edit_profile', requireAuth, (req, res) => {

        // Procura o usuário para puxar os dados exatos
        const user = await tabelas.usuario.findByPk(req.session.user.id);

        return res.render('edit_profile.ejs');
    })

    // Alterar username, nome, cpf e número de telefone
    app.post('/edit_profile', (req, res) => {
        const {name, username, cpf, phone_number} = req.body;
    })

    app.get('/adresses', requireAuth, (req, res) => {
        return res.render('adresses.ejs');
    })

    app.post('/adresses', (req, res) => {
        
    })
}


//Não é necessário incluir o app.listen(), ele já está incluso em outro arquivo :D

export {pages};

/*
    Vide:
    - https://docs.google.com/document/d/1258KS6TAiGOYzZC7bRTUhfBbXZ78Ih1oeVyrmJoQz_U/edit?tab=t.0#heading=h.yw4ptznw8nfs
    - https://docs.google.com/document/d/1258KS6TAiGOYzZC7bRTUhfBbXZ78Ih1oeVyrmJoQz_U/edit?tab=t.0#heading=h.syd4gr4bukwl
*/