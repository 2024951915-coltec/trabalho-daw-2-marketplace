//Configurar as páginas não-estáticas (login, compras, etc)
//(A concluir. Última edição: Pedro)

import {app, requireAuth, comparePass, hashPass} from './app.js';
import {database, tabelas} from './db.js';

//set com categorias válidas
const CATEGORIAS = new Set(['admin', 'vendedor', 'user']);

const E_UMA_CATEGORIA_VALIDA = (cat)=>{return CATEGORIAS.has(cat)};

//Função para carregar as páginas
function pages()
{

    // CARREGAMENTO DE PÁGINAS 

    app.get('/', requireAuth, (req, res) => {
        res.redirect('/home');
    });

    app.get('/home', async (req, res) => {
        const produtos = await tabelas.produto.findAll({
            include: [
                {
                    model: tabelas.loja,
                    attributes: ['id', 'name']
                }
            ]
        });

        res.render('home.ejs', {
            USER: req.session.user,
            produtos: produtos
        });
    });

    app.get('/vendedor', async (req, res) => {
        try {
            const lojaId = req.session.user.lojaId;

            const produtos = await tabelas.produto.findAll({
                where: {
                    lojaId: lojaId
                },
                include: [
                    {
                        model: tabelas.loja,
                        required: false
                    }
                ]
            });

            const categorias = await tabelas.categoria.findAll({
                order: [['name', 'ASC']]
            });

            res.render('vendedor', {
                produtos,
                categorias,
                USER: req.session.user
            });

        } catch (error) {
            console.error(error);
            res.status(500).send('Erro ao carregar a página do vendedor.');
        }
    });

    
    //Páginas de usuário

    app.get('/login', (req, res)=>{
       res.render('login.ejs');
    })


    app.post('/login', async (req, res) => {
        const { username, senha } = req.body;

        // Procura o usuário pelo username
        const user = await tabelas.usuario.findOne({
            where: { username }
        });


        // Usuário não encontrado
        if (!user) {
            return res.send('Usuário ou senha incorretos. Tente novamente');
        }

        // Verifica a senha
        const isValid = await comparePass(senha, user.passhash);

        if (!isValid) {
            return res.send('Usuário ou senha incorretos. Tente novamente');
        }

        // Procura o vendedors
        const vendedor = await tabelas.vendedor_perfil.findOne({
        where: {
            user: user.id
        }
        });

        console.log('USUÁRIO LOGADO:', user.id, user.username, user.category);
        console.log('VENDEDOR ENCONTRADO:', vendedor);
        console.log('LOJA ID:', vendedor ? vendedor.lojaId : null);

        // Cria a sessão
        req.session.user = {
            id: user.id,
            name: user.name,
            username: user.username,
            category: user.category,
            lojaId: vendedor ? vendedor.lojaId : null
        };

        // Decide para onde enviar de acordo com o banco
        if (user.category === 'user') {
            return res.redirect('/home');
        }

        if (user.category === 'vendedor') {
            return res.redirect('/vendedor');
        }

        // Caso exista uma categoria inválida
        return res.status(403).send('Categoria de usuário inválida');
    });

    // Cadastro
    app.get('/sign-in', (req, res)=>{
        res.render('signin.ejs');
    })

    app.post('/sign-in', async (req, res) => {
        try {
            const { nome, username, senha, category } = req.body;

            const userExistente = await tabelas.usuario.findOne({
                where: { username }
            });

            // Usuário já existe
            if (userExistente) {
                return res.send(`Usuário ${username} já existente`);
            }

            // Cria o usuário
            const user = await tabelas.usuario.create({
                name: nome,
                username: username,
                passhash: senha,
                category: category
            });

            // Se for vendedor, cria automaticamente a loja
            // e o perfil de vendedor
            if (category === 'vendedor') {

                const loja = await tabelas.loja.create({
                    name: `Loja de ${nome}`,
                    description: ''
                });

                await tabelas.vendedor_perfil.create({
                    user: user.id,
                    lojaId: loja.id,
                    description: ''
                });
            }

            return res.redirect('/login');

        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            return res.status(500).send('Erro ao criar usuário.');
        }
    });

    app.post('/vendedor/produto', requireAuth, async (req, res) => {
        try {
            const { name, description, stock, categoriaId, preco } = req.body;
            const lojaId = req.session.user.lojaId;

            // console.log('LOJA ID:', lojaId);
            // console.log('CATEGORIA ID:', categoriaId);

            const loja = await tabelas.loja.findByPk(lojaId);
            const categoria = await tabelas.categoria.findByPk(categoriaId);

            // console.log('LOJA ENCONTRADA:', loja);
            // console.log('CATEGORIA ENCONTRADA:', categoria);

            await tabelas.produto.create({
                name,
                preco,
                description,
                stock,
                lojaId,
                categoriaId
            });

            // Redireciona apenas uma vez após criar o produto com sucesso
            res.redirect('/vendedor');

        } catch (error) {
            // Bloco CATCH que estava faltando para capturar erros
            console.error("Erro ao criar produto:", error);
            res.status(500).send('Erro ao salvar o produto.');
        }
    }); // <-- Fechamento correto da rota app.post


    app.get('/vendedor/produto/:id/editar', async (req, res) => {

    try{
        const produto = await tabelas.produto.findOne({
            where: {
                id: req.params.id,
                lojaId: req.session.user.lojaId
            }
        });

         if (!produto){
                return res.status(404).send(
                    'Produto não encontrado ou não habilitado para edicao'
                );
            }

        const categorias = await tabelas.categoria.findAll();

            res.render('editar-produto', {
                produto,
                categorias
            });
        } catch (error) {
            console.error(error);

            res.status(500).send(
                'Erro ao carregar o produto.'
            )
        }
    });

    app.post('/vendedor/produto/:id/editar', async (req, res) => {
        try {
            const { name, description, stock, categoriaId, preco } = req.body;

            const produto = await tabelas.produto.findOne({
                where: {
                    id: req.params.id,
                    lojaId: req.session.user.lojaId
                }
            });

            if (!produto) {
                return res.status(404).send(
                    'Produto não encontrado ou não habilitado para edição.'
                );
            }

            await produto.update({
                name,
                description,
                stock,
                categoriaId,
                preco
            });

            res.redirect('/vendedor');

        } catch (error) {
            console.error(error);

            res.status(500).send(
                'Erro ao editar o produto.'
            );
        }
    });

    app.get('/:user', requireAuth, (req, res)=>{
        const u = req.params.user;
        res.redirect('/' + u + '/view-profile');
    })



    app.get('/:user/view-profile', requireAuth, (req, res) => {
        const u = req.params.user;
        return res.render('profile_information.ejs');
    })

    app.get('/create-addresses', requireAuth, (req, res) => {
        return res.render('create_addresses.ejs');
    })

    app.get('/config/change-password', requireAuth, (req, res) => {
        const user = req.session.user;
        return res.render('password_change.ejs');
    })

    app.get('/config/edit-profile', requireAuth, async (req, res) => 
    {
        return res.render('edit_profile.ejs', {USER: req.session.user});
    })

    app.get('/config/view-addresses', requireAuth, (req, res) => {
        return res.render('view_addresses.ejs');
    })

    app.get('/config/edit-addresses', requireAuth, (req, res) => {
        return res.render('edit_addresses.ejs');
    })

    //página de configuração de conta
    app.get('/config', requireAuth, (req, res)=>{
        const user = req.session.user;

        return res.render('config.ejs', {USER : user});
    })

    // CADASTRO E LOGIN

    // Login

    // Criar endereço
    // Verificar se o endereço existe dentro dessa conta, pq senão pode verificar todo o BD e bugar
    app.post('/create-addresses', async (req, res) => {

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
    app.post('/password-change', async (req, res) => {
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
    app.post('/edit-profile', async (req, res) => {
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

    app.get('/leave', requireAuth, (req, res)=>{
        req.session.user = undefined;
        res.redirect('/login');
    });
}


//Não é necessário incluir o app.listen(), ele já está incluso em outro arquivo :D

export {pages};

/*
    Vide:
    - https://docs.google.com/document/d/1258KS6TAiGOYzZC7bRTUhfBbXZ78Ih1oeVyrmJoQz_U/edit?tab=t.0#heading=h.yw4ptznw8nfs
    - https://docs.google.com/document/d/1258KS6TAiGOYzZC7bRTUhfBbXZ78Ih1oeVyrmJoQz_U/edit?tab=t.0#heading=h.syd4gr4bukwl
*/
