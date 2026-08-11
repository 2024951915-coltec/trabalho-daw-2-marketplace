//Configurar as páginas não-estáticas (login, compras, etc)
//(A concluir. Última edição: Pedro)

import {app, requireAuth, comparePass, hashPass} from './app.js';
import {database, tabelas} from './db.js';

//Função para carregar as páginas
function pages()
{

    // CARREGAMENTO DE PÁGINAS 

    app.get('/', requireAuth, (req, res) => {
        res.redirect('/home');
    });

    app.get('/home', (req,res)=>{
        res.render('home.ejs');
    })
    

    //Páginas de usuário

    app.get('/:user', requireAuth, (req, res)=>{
        const u = req.params.user;
        res.redirect('/' + u + '/view-profile');
    })


    app.get('/:user/create-addresses', requireAuth, (req, res) => {
        const u = req.params.user;
        return res.render('create_addresses.ejs');
    })

    app.get('/:user/view-profile', requireAuth, (req, res) => {
        const u = req.params.user;
        return res.render('profile_information.ejs');
    })

    app.get('/:user/password-change', requireAuth, (req, res) => {
        const u = req.params.user;
        return res.render('password_change.ejs');
    })

    // Edição de perfil
    app.get('/:user/edit-profile', async, requireAuth, (req, res) => 
    {
        const u = req.params.user;
        return res.render('edit_profile.ejs', {USER: req.session.user});
    })

    // Apenas carregar a página e passar pelo requireAuth
    app.get('/:user/view-addresses', requireAuth, (req, res) => {
        return res.render('view_addresses.ejs');
    })

    app.get('/:user/edit-addresses', requireAuth, (req, res) => {
        return res.render('edit_addresses.ejs');
    })

    // CADASTRO E LOGIN

    // Login

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

    // Cadastro

    app.get('/sign-in', (req, res)=>{
        res.render('signin.ejs');
    })

    app.post('/sign-in', async (req, res)=>{
        const {nome, username, senha} = req.body;

        const user = await tabelas.usuario.findOne({ where: {username}});

        // Se o usuário não existir em todo o BD, ele é criado
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

    // Criar endereço
    // Verificar se o endereço existe dentro dessa conta, pq senão pode verificar todo o BD e bugar
    app.post('/:user/create-addresses', async (req, res) => {

        const {local} = req.body;

        let isValid = true; 

        // Procura todas as associações do usuário e faz com que apenas o usuário atual seja verificado
        const relacoes = await tabelas.usuario_endereco.findAll({where: {
            id_usuario : req.session.user.id
        }})

        // For para comparação
        for(const relacao of relacoes){

            // endereco é um objeto (id = x, local = referente ao x)
            const endereco = await tabelas.endereco.findByPk(relacao.id_endereco);

            if(endereco.local == local){
                isValid = false;
            }

        }

        if(isValid == false){
            return res.send('Endereço já cadastrado.');
        }
        
    const endereco = await tabelas.endereco.create({
            local:local,
        })

    await tabelas.usuario_endereco.create({
            id_usuario: req.session.user.id,
            id_endereco: endereco.id,
        })
            
        // Essa lógica está errada pq ta verificando o bd todo e tem que limitar ao usuário
    });

    // EDIÇÃO PEFIL

    // Alterar senha
    app.post('/:user/password-change', async (req, res) => {
        const { oldPassword, newPassword} = req.body;

        const username = req.session.user.username;

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
    });

    // Alterar username, nome, cpf e número de telefone (Perfil)
    app.post('/:user/edit-profile', async (req, res) => {
        const {name, username, cpf, phone_number} = req.body;

        const user = await tabelas.usuario.findByPk(req.session.user.id);

        // Receber os dados atualizados
        user.name = name;
        user.username = username;
        user.cpf = cpf;
        user.phone_number = phone_number;

        // Salvar os dados atualizados
        await user.save();

        res.send('Dados atualizados.');
    });

    // Editar endereço (Está errado)

    // Pegar a tabela intermediária e editar ela caso o endereço seja igual ao de outra pessoa
    app.post('/:user/edit-addresses', async (req, res) => {
        const { local } = req.body;

        let isValid = true;
        let idEnderecoAlterado = null;
        let idUsuarioAlterado = null;

        const relacoes = await tabelas.usuario_endereco.findAll({
            where : {
                id_usuario : req.session.user.id,
            }
        })

        // For para comparação
            for(const relacao of relacoes){

                const endereco = await tabelas.endereco.findByPk(relacao.id_endereco);

                // Verifica se existe dentro da conta
                if(endereco.local == local){
                    isValid = false;
                }

                else{
                     // Verifica se o endereço existe cadastrado com outro usuário
                    const verificaBD = await tabelas.endereco.findOne({where:{local}});

                    if(verificaBD){
                        // relacao.id_endereco = verificaBD.id; 
                        idEnderecoAlterado = verificaBD.id;
                    }
                }

            }

            if(isValid == false){
                return res.send('Endereco já cadastrado nesta conta.');
            }

           // const idEnderecoUser = await tabelas.ender    relacoes.id_endereco = idEnderecoAlterado;
            tabelas.endereco.local = local; // Alterar o registro específico
            await relacoes.save();
            await tabelas.endereco.save();

            return res.send('Endereço atualizado.');
    });
}


//Não é necessário incluir o app.listen(), ele já está incluso em outro arquivo :D

export {pages};

/*
    Vide:
    - https://docs.google.com/document/d/1258KS6TAiGOYzZC7bRTUhfBbXZ78Ih1oeVyrmJoQz_U/edit?tab=t.0#heading=h.yw4ptznw8nfs
    - https://docs.google.com/document/d/1258KS6TAiGOYzZC7bRTUhfBbXZ78Ih1oeVyrmJoQz_U/edit?tab=t.0#heading=h.syd4gr4bukwl
*/