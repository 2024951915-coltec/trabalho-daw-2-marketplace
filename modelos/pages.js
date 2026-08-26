//Configurar as páginas não-estáticas (login, compras, etc)
//(A concluir. Última edição: Pedro)

import {app, requireAuth, comparePass, hashPass, upload} from './app.js';
import {database, tabelas, Op} from './db.js';
import bcrypt from 'bcryptjs';

//set com categorias válidas
const CATEGORIAS = new Set(['admin', 'vendedor', 'user']);

const E_UMA_CATEGORIA_VALIDA = (cat)=>{return CATEGORIAS.has(cat)};

//Função para carregar as páginas
function pages()
{

    // CARREGAMENTO DE PÁGINAS 

    app.get('/', (req, res) => {
        res.redirect('/home');
    });

    app.get('/home', async (req, res) => {
        const user = req.session.user;

        if (user && user.category === 'admin') {
        return res.redirect('/admin');
        }

        const produtos = await tabelas.produto.findAll({
            include: [
                {
                    model: tabelas.loja,
                    attributes: ['id', 'name']
                }
            ]
        });

        const categorias = await tabelas.categoria.findAll({
            order: [['name', 'ASC']]
        });

        res.render('home.ejs', {
            USER: (user !== undefined) ? user : null,
            produtos: produtos,
            CATEGORIAS: categorias
        });
    });

    app.get('/admin', requireAuth.admin, async (req, res) => {
        res.render('admin.ejs', {
            USER: req.session.user
        });
    });

    app.get('/admin/usuarios', requireAuth.admin, async (req, res) => {

        const usuarios = await tabelas.usuario.findAll({
            order: [['id', 'ASC']]
        });

        res.render('admin-usuarios.ejs', {
            USER: req.session.user,
            USUARIOS: usuarios
        });
    });


    app.get('/admin/usuarios/:id/editar', requireAuth.admin, async (req, res) => {

            const usuario = await tabelas.usuario.findByPk(
                req.params.id
            );

            if (!usuario) {
                return res.status(404).send(
                    'Usuário não encontrado.'
                );
            }

            res.render('admin-editar-usuario.ejs', {
                USER: req.session.user,
                USUARIO_EDITAR: usuario
            });
        }
    );

    app.post('/admin/usuarios/:id/editar',requireAuth.admin,async (req, res) => {

            const { id } = req.params;

            const {
                name,
                username,
                category,
                senha
            } = req.body;

            const usuario = await tabelas.usuario.findByPk(id);

            if (!usuario) {
                return res.status(404).send(
                    'Usuário não encontrado.'
                );
            }

            usuario.name = name;
            usuario.username = username;
            usuario.category = category;

            // Só altera a senha se o campo foi preenchido
            if (senha && senha.trim() !== '') {

                const salt = await bcrypt.genSalt(10);

                usuario.passhash = await bcrypt.hash(
                    senha,
                    salt
                );
            }

            await usuario.save();

            return res.redirect('/admin/usuarios');
        }
    );

    app.post('/admin/usuarios/:id/excluir', requireAuth.admin, async (req, res) => {

            const id = req.params.id;

            // Impede o administrador de excluir a própria conta
            if (Number(id) === req.session.user.id) {
                return res.status(403).send(
                    'Você não pode excluir sua própria conta.'
                );
            }

            const usuario = await tabelas.usuario.findByPk(id);

            if (!usuario) {
                return res.status(404).send(
                    'Usuário não encontrado.'
                );
            }

            await usuario.destroy();

            return res.redirect('/admin/usuarios');
        }
    );

    app.get('/admin/categorias', requireAuth.admin, async (req, res) => {

        const categorias = await tabelas.categoria.findAll({
            order: [['name', 'ASC']]
        });

        res.render('admin-categorias.ejs', {
            USER: req.session.user,
            CATEGORIAS: categorias
        });

    });

    app.post('/admin/categorias/:id/excluir', requireAuth.admin, async (req, res) => {

            const categoria = await tabelas.categoria.findByPk(
                req.params.id
            );

            if (!categoria) {
                return res.status(404).send(
                    'Categoria não encontrada.'
                );
            }

            const quantidadeProdutos = await tabelas.produto.count({
                where: {
                    categoriaId: categoria.id
                }
            });

            if (quantidadeProdutos > 0) {
                return res.status(400).send(
                    'Não é possível excluir uma categoria que possui produtos.'
                );
            }

            await categoria.destroy();

            return res.redirect('/admin/categorias');
        }
    );

    app.get('/admin/categorias/criar', requireAuth.admin, (req, res) => {

            res.render('admin-criar-categoria.ejs', {
                USER: req.session.user
            });

        }
    );

    app.post('/admin/categorias/criar', requireAuth.admin, async (req, res) => {

            const { name } = req.body;

            await tabelas.categoria.create({
                name: name
            });

            return res.redirect('/admin/categorias');
        }
    );

    app.get('/admin/categorias/:id/editar', requireAuth.admin, async (req, res) => {

            const categoria = await tabelas.categoria.findByPk(
                req.params.id
            );

            if (!categoria) {
                return res.status(404).send(
                    'Categoria não encontrada.'
                );
            }

            res.render('admin-editar-categoria.ejs', {
                USER: req.session.user,
                CATEGORIA_EDITAR: categoria
            });

        }
    );

    app.post('/admin/categorias/:id/editar', requireAuth.admin, async (req, res) => {

            const categoria = await tabelas.categoria.findByPk(
                req.params.id
            );

            if (!categoria) {
                return res.status(404).send(
                    'Categoria não encontrada.'
                );
            }

            categoria.name = req.body.name;

            await categoria.save();

            return res.redirect('/admin/categorias');
        }
    );

    app.get('/admin/produtos', requireAuth.admin, async (req, res) => {

        const produtos = await tabelas.produto.findAll({
            include: [
                {
                    model: tabelas.loja,
                    attributes: ['id', 'name']
                },
                {
                    model: tabelas.categoria,
                    attributes: ['id', 'name']
                }
            ],
            order: [['id', 'ASC']]
        });

        res.render('admin-produtos.ejs', {
            USER: req.session.user,
            PRODUTOS: produtos
        });

    });

    app.post('/admin/produtos/:id/excluir', requireAuth.admin, async (req, res) => {

            const produto = await tabelas.produto.findByPk(
                req.params.id
            );

            if (!produto) {
                return res.status(404).send(
                    'Produto não encontrado.'
                );
            }

            await produto.destroy();

            return res.redirect('/admin/produtos');
        }
    );

    app.get('/admin/produtos/:id/editar', requireAuth.admin, async (req, res) => {

            const produto = await tabelas.produto.findByPk(
                req.params.id
            );

            if (!produto) {
                return res.status(404).send(
                    'Produto não encontrado.'
                );
            }

            const categorias = await tabelas.categoria.findAll({
                order: [['name', 'ASC']]
            });

            const lojas = await tabelas.loja.findAll({
                order: [['name', 'ASC']]
            });

            res.render('admin-editar-produto.ejs', {
                USER: req.session.user,
                PRODUTO_EDITAR: produto,
                CATEGORIAS: categorias,
                LOJAS: lojas
            });

        }
    );

    app.post('/admin/produtos/:id/editar', requireAuth.admin, async (req, res) => {

            const produto = await tabelas.produto.findByPk(
                req.params.id
            );

            if (!produto) {
                return res
                    .status(404)
                    .send('Produto não encontrado.');
            }

            const {
                name,
                description,
                preco,
                stock,
                categoriaId,
                lojaId
            } = req.body;


            produto.name = name;

            produto.description = description;

            produto.preco = preco;

            produto.stock = stock;

            produto.categoriaId = categoriaId;

            produto.lojaId = lojaId;


            await produto.save();


            return res.redirect('/admin/produtos');
        }
    );

    app.get('/admin/vendedores', requireAuth.admin, async (req, res) => {

        const vendedores = await tabelas.vendedor_perfil.findAll({
            include: [
                {
                    model: tabelas.usuario,
                    attributes: ['id', 'name', 'username', 'category']
                },
                {
                    model: tabelas.loja,
                    attributes: ['id', 'name']
                }
            ],
            order: [['id', 'ASC']]
        });

        res.render('admin-vendedores.ejs', {
            USER: req.session.user,
            VENDEDORES: vendedores
        });

    });

    app.get('/admin/vendedores/:id/editar', requireAuth.admin, async (req, res) => {

            const vendedor = await tabelas.vendedor_perfil.findByPk(
                req.params.id
            );

            if (!vendedor) {
                return res
                    .status(404)
                    .send('Vendedor não encontrado.');
            }


            const lojas = await tabelas.loja.findAll({
                order: [['name', 'ASC']]
            });


            const usuario = await tabelas.usuario.findByPk(
                vendedor.user
            );


            res.render('admin-editar-vendedor.ejs', {

                USER: req.session.user,

                VENDEDOR_EDITAR: vendedor,

                USUARIO_VENDEDOR: usuario,

                LOJAS: lojas

            });

        }
    );

    app.post('/admin/vendedores/:id/editar', requireAuth.admin, async (req, res) => {

            const vendedor = await tabelas.vendedor_perfil.findByPk(
                req.params.id
            );

            if (!vendedor) {
                return res
                    .status(404)
                    .send('Vendedor não encontrado.');
            }


            const {
                description,
                lojaId
            } = req.body;


            vendedor.description = description;

            vendedor.lojaId = lojaId;


            await vendedor.save();


            return res.redirect('/admin/vendedores');
        }
    );

    app.get('/busca', async (req, res)=>{
        const query = {
            search: req.query.search,
            preco_max: parseFloat(req.query.preco_max),
            preco_min: parseFloat(req.query.preco_min),
            categoria: parseFloat(req.query.categoriaId)
        };
        
        const user = req.session.user;
        
        let busca = {
            preco: {},
            categoria: {}
        }
        if(query.preco_min > query.preco_max)
        {
            busca.preco = {[Op.gte]: 0}
        }
        else if(query.preco_max > 100)
        {
            busca.preco = {
                [Op.gte]: query.preco_min
            }
        }
        else
        {
            busca.preco = {
                [Op.and]: {
                    [Op.gte]: query.preco_min,
                    [Op.lte]: query.preco_max
                }
            }
        }

        if(!isNaN(query.categoria))
        {
            busca.categoria = {
                [Op.eq]: query.categoria
            }
        }

        const produtos = await tabelas.produto.findAll({
            where:{
                name: {
                    [Op.like]: '%' + query.search + '%'
                },
                preco: busca.preco,
                categoriaId: busca.categoria
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

        res.render('busca.ejs', {USER: (user !== undefined) ? user : null, QUERY: query, PRODUTOS: produtos, CATEGORIAS: categorias})
    })

    app.get('/config/vendedor/criar-produto', requireAuth.vendedor, async (req, res) => {
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

            res.render('criar_produto', {
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
        if (E_UMA_CATEGORIA_VALIDA(user.category)) {
            return res.redirect('/home');
        }

        // Caso exista uma categoria inválida
        return res.status(403).send('Categoria de usuário inválida');
    });

    app.get('/logout', requireAuth.default, (req, res)=>{
        req.session.user = undefined;
        res.redirect('/login');
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

    app.post('/config/vendedor/criar-produto', upload.single('foto') , async (req, res) => {
        try {
            const { name, description, stock, categoriaId, preco } = req.body;
            const lojaId = req.session.user.lojaId;

            console.log(req.file);

            // console.log('LOJA ID:', lojaId);
            // console.log('CATEGORIA ID:', categoriaId);

            const loja = await tabelas.loja.findByPk(lojaId);
            const categoria = await tabelas.categoria.findByPk(categoriaId);
            const photo_id = req.file.filename;

            // console.log('LOJA ENCONTRADA:', loja);
            // console.log('CATEGORIA ENCONTRADA:', categoria);

            await tabelas.produto.create({
                name,
                photo_id,
                preco,
                description,
                stock,
                lojaId,
                categoriaId
            });

            // Redireciona apenas uma vez após criar o produto com sucesso
            res.redirect('/config/vendedor/criar-produto');

        } catch (error) {
            // Bloco CATCH que estava faltando para capturar erros
            console.error("Erro ao criar produto:", error);
            res.status(500).send('Erro ao salvar o produto.');
        }
    }); // <-- Fechamento correto da rota app.post

    app.get('/config/vendedor/ver-produto', requireAuth.vendedor, async (req, res) => {
        const produtos = await tabelas.produto.findAll({
            where: {
                lojaId: req.session.user.lojaId
            },
            include: [
                {
                    model: tabelas.loja,
                    required: false
                }
            ]
        });

        return res.render('vendedor_produtos', {USER: req.session.user, PRODUTOS: produtos})
    })

    app.get('/config/vendedor/ver-produto/:id/editar', requireAuth.vendedor, async (req, res) => {

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

                res.render('editar_produto', {
                    USER: req.session.user,
                    produto: produto,
                    categorias: categorias
                });
        } catch (error) {
            console.error(error);

            res.status(500).send(
                'Erro ao carregar o produto.'
            )
        }
    });

    app.post('/config/vendedor/ver-produto/:id/editar', requireAuth.vendedor, async (req, res) => {
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

            res.redirect('/config/vendedor/ver-produto');

        } catch (error) {
            console.error(error);

            res.status(500).send(
                'Erro ao editar o produto.'
            );
        }
    });

    app.get('/config/vendedor/ver-produto/:id/deletar', requireAuth.vendedor, async(req, res)=>{
        tabelas.produto.destroy({
            where:{
                id: req.params.id,
                lojaId: req.session.user.lojaId
            }
        })

        res.redirect('/config/vendedor/ver-produto');
    });


    app.get('/:user/view-profile', requireAuth.default, (req, res) => {
        const u = req.params.user;
        return res.render('profile_information.ejs');
    })

    app.get('/config/vendedor', requireAuth.vendedor, (req, res)=>{
        res.render('vendedor', {USER: req.session.user});
    })

    app.get('/:user/create_addresses', requireAuth.default, async(req, res) => {

        // Carregar os endereços do usuário
        const user = await tabelas.usuario.findByPk(
            req.session.user.id, {
                include: tabelas.endereco,
            }
        )
        return res.render('create_addresses.ejs', {
            USER: req.session.user,
            ENDERECOS: user.enderecos,
     } );
    })

    app.get('/password_change', requireAuth.default, (req, res) => {
        const user = req.session.user;
        return res.render('password_change.ejs',{
            USER: user
        });
    })

    app.get('/edit_profile', requireAuth.default, async (req, res) => 
    {
        return res.render('edit_profile.ejs', {USER: req.session.user});
    })

    app.get('/config/view-addresses', requireAuth.default, (req, res) => {
        return res.render('view_addresses.ejs');
    })

    app.get('/config/edit-addresses', requireAuth.default, (req, res) => {
        return res.render('edit_addresses.ejs');
    })

    //página de configuração de conta
    app.get('/config', requireAuth.default, (req, res)=>{
        const user = req.session.user;

        return res.render('config.ejs', {USER : user});
    })

   app.get('/profile_information', (req, res) => {
        const user = req.session.user;  
        return res.render('profile_information.ejs', {user : user});
    });

    // CADASTRO E LOGIN

    // Login

    // Criar endereço
    // Verificar se o endereço existe dentro dessa conta, pq senão pode verificar todo o BD e bugar
    app.post('/:user/create_addresses', requireAuth.default, async (req, res) => {

        console.log('ENTREI NA FUNÇÃO DE ENDERECO: ')
        const {local} = req.body;

        let isValid = true; 

        // Procura todas as associações do usuário e faz com que apenas o usuário atual seja verificado
        const relacoes = await tabelas.usuario_endereco.findAll({where: {
            usuarioId: req.session.user.id
        }})

        // For para comparação
        for(const relacao of relacoes){

            // endereco é um objeto (id = x, local = referente ao x)
            const endereco = await tabelas.endereco.findByPk(relacao.enderecoId);

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

        console.log("usuarioId:", req.session.user.id);
console.log("enderecoId:", endereco.id);

console.log(
    await tabelas.usuario_endereco.findOne({
        where: {
            usuarioId: req.session.user.id,
            enderecoId: endereco.id
        }
    })
);

        await tabelas.usuario_endereco.create({
            usuarioId: req.session.user.id,
            enderecoId: endereco.id,
        })

        console.log('ENDERECO CADASTRADO: ', endereco.local);
    res.redirect(`/${req.session.user.username}/create_addresses`);             
    });

    // EDIÇÃO PEFIL

    // Alterar senha
app.post('/password_change', requireAuth.default, async (req, res) => {
    try {
        const {
            oldPassword,
            newPassword,
            confirmPassword
        } = req.body;

        // Verifica se as novas senhas são iguais
        if (newPassword !== confirmPassword) {
            return res.status(400).send(
                'As novas senhas não são iguais.'
            );
        }

        const user = await tabelas.usuario.findByPk(
            req.session.user.id
        );

        if (!user) {
            return res.status(404).send(
                'Usuário não encontrado.'
            );
        }

        // Verifica a senha atual
        const isValid = await comparePass(
            oldPassword,
            user.passhash
        );

        if (!isValid) {
            return res.status(400).send(
                'Senha atual incorreta.'
            );
        }

        // Cria o hash da nova senha
        user.passhash = await hashPass(
            newPassword,
            10
        );

        // Salva no banco
        await user.save();

        return res.send('Senha atualizada com sucesso.');

    } catch (error) {

        console.error(
            'ERRO AO ALTERAR SENHA:',
            error
        );

        return res.status(500).send(
            'Erro ao alterar a senha.'
        );
    }
});

    // Alterar username, nome, cpf e número de telefone (Perfil)
    app.post('/edit_profile', requireAuth.default, async (req, res) => {
    try {
        const { name, username } = req.body;

        console.log('DADOS RECEBIDOS:', req.body);

        const user = await tabelas.usuario.findByPk(req.session.user.id);

        if (!user) {
            return res.status(404).send('Usuário não encontrado.');
        }

        // Verifica se o novo username já pertence a OUTRO usuário
        const usernameExistente = await tabelas.usuario.findOne({
            where: {
                username: username
            }
        });

        if (usernameExistente && usernameExistente.id !== user.id) {
            return res.status(400).send('Esse nome de usuário já está sendo usado.');
        }

        user.name = name;
        user.username = username;

        await user.save();

        // Atualiza a sessão
        req.session.user.name = user.name;
        req.session.user.username = user.username;

        console.log('USUÁRIO ATUALIZADO:', user.toJSON());

        return res.redirect('/config');

    } catch (error) {
        console.error('ERRO AO ATUALIZAR PERFIL:', error);

        return res.status(500).send(
            'Erro ao atualizar os dados: ' + error.message
        );
    }
});

    // Editar endereço (Está errado)

    // Pegar a tabela intermediária e editar ela caso o endereço seja igual ao de outra pessoa
    app.post('/:user/edit-addresses', requireAuth.default, async (req, res) => {
        const { local } = req.body;

        let isValid = true;
        let idEnderecoAlterado = null;
        let idUsuarioAlterado = null;

        const relacoes = await tabelas.usuario_endereco.findAll({
            where : {
                usuarioId : req.session.user.id,
            }
        })

        // For para comparação
            for(const relacao of relacoes){

                const endereco = await tabelas.endereco.findByPk(relacao.enderecoId);

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

       app.get('/:user/shopping-cart', requireAuth.default, async (req, res) => {

    const user = await tabelas.usuario.findByPk(req.session.user.id);

    // Procura o carrinho do usuário
    let carrinho = await tabelas.carrinho.findOne({
        where: {
            id_usuario: user.id
        }
    });

    // Se não existir, cria o carrinho
    if (!carrinho) {
        carrinho = await tabelas.carrinho.create({
            id_usuario: user.id,
            valorTotalCompra: 0
        });
    }

    // Busca os itens do carrinho
    const itens = await tabelas.item_carrinho.findAll({
        where: {
            id_carrinho: carrinho.id
        },
        include: tabelas.produto
    });

    // Recalcula o total do carrinho
    let total = 0;

    for (const item of itens) {
        total += item.produto.preco * item.quantidade;
    }

    // Se não tiver itens, total será 0
    carrinho.valorTotalCompra = total;
    await carrinho.save();

    res.render('shopping-cart.ejs', {
        USER: user,
        CARRINHO: carrinho,
        ITENS: itens
    });
});

    app.post('/:user/shopping-cart/:idCarrinho', async (req, res) => {

    console.log('ENTREI NO POST DO CARRINHO');

    const { itemCarrinhoId, quantidade, acao } = req.body;
    const { idCarrinho } = req.params;

    console.log('ITEM:', itemCarrinhoId);
    console.log('CARRINHO:', idCarrinho);

    // Busca o carrinho
    const carrinho = await tabelas.carrinho.findByPk(idCarrinho);

    if (!carrinho) {
        return res.status(404).send('Carrinho não encontrado.');
    }

    // Busca o item
    const itemCarrinho = await tabelas.item_carrinho.findByPk(
        itemCarrinhoId,
        {
            include: tabelas.produto
        }
    );

    if (!itemCarrinho) {
        return res.status(404).send('Item não encontrado.');
    }

  

    if (acao === "atualizar") {

        // Não deixa quantidade menor que 1
        const novaQuantidade = Math.max(1, Number(quantidade));

        itemCarrinho.quantidade = novaQuantidade;

        await itemCarrinho.save();
    }

    

    if (acao === "remover") {

        console.log('ENTREI NA FUNÇÃO DE REMOVER');

        await itemCarrinho.destroy();
    }


    const itens = await tabelas.item_carrinho.findAll({
        where: {
            id_carrinho: carrinho.id
        },
        include: tabelas.produto
    });

    let total = 0;

    for (const item of itens) {

        const valorItem =
            Number(item.produto.preco) * Number(item.quantidade);

        total += valorItem;
    }

    // Se não houver itens, total = 0
    carrinho.valorTotalCompra = total;

    await carrinho.save();

    console.log('TOTAL FINAL:', carrinho.valorTotalCompra);



    if (acao === 'comprar') {
        return res.redirect(
            `/${req.session.user.username}/checkout`
        );
    }

    // Volta para o carrinho
    return res.redirect(
        `/${req.session.user.username}/shopping-cart`
    );
});

    app.get('/product/:id/view', requireAuth.default, async (req, res)=>{
        const user = req.session.user;
        const produto_id = parseInt(req.params.id, 16)
        const produto = await tabelas.produto.findOne({
            where: {
                id: produto_id
            },
            include: [
                {
                    model: tabelas.loja,
                    required: false
                }
            ]
        });

        const reviews = await tabelas.avaliacao.findAll({
            where: {
                product: produto_id
            },
            include: [
                {
                    model: tabelas.usuario,
                    required: false
                }
            ]
        })

        console.log(reviews[0]);

        res.render('produto.ejs', {
            USER: (user !== undefined) ? user : null,
            PRODUTO: produto,
            REVIEWS: reviews,
        });
    })

    app.post('/product/:id/submit-review', async (req, res)=>{
        const {rating, msg} = req.body;
        const user = req.session.user;
        const produto_id = parseInt(req.params.id, 16)

        const produto = await tabelas.produto.findOne({
            where: {
                id: produto_id
            },
            include: [
                {
                    model: tabelas.loja,
                    required: false
                }
            ]
        });

        const review = await tabelas.avaliacao.create({
            poster: user.id,
            product: produto_id,
            message: msg,
            rating: rating
        });

        console.log(review);

        if(review)
        {
            res.redirect('/product/' + req.params.id + '/view');
        }
        else
        {
            res.send("Erro ao enviar");
        }
        
    });

    app.post('/products/:produtoId/shopping-cart', async (req, res) => {

    const { produtoId } = req.params;
    const { quantidade, acao } = req.body;

    let carrinho = await tabelas.carrinho.findOne({
        where: {
            id_usuario: req.session.user.id
        }
    });

    if (!carrinho) {

        carrinho = await tabelas.carrinho.create({
            id_usuario: req.session.user.id,
            valorTotalCompra: 0
        });
    }

    const produto = await tabelas.produto.findByPk(produtoId);

    if (!produto) {
        return res.status(404).send('Produto não encontrado.');
    }


    if (produto.stock <= 0) {
        return res.send('Produto fora de estoque.');
    }

    let buscaItem = await tabelas.item_carrinho.findOne({
        where: {
            id_produto: produto.id,
            id_carrinho: carrinho.id
        }
    });

    if (!buscaItem) {

        buscaItem = await tabelas.item_carrinho.create({
            id_carrinho: carrinho.id,
            id_produto: produto.id,
            quantidade: Number(quantidade),
            valorItem: produto.preco
        });

    } else {

        // Se já existe, aumenta a quantidade
        buscaItem.quantidade += Number(quantidade);

        await buscaItem.save();
    }

    const itens = await tabelas.item_carrinho.findAll({
        where: {
            id_carrinho: carrinho.id
        },
        include: tabelas.produto
    });

    let total = 0;

    for (const item of itens) {

        const valorItem =
            Number(item.produto.preco) * Number(item.quantidade);

        total += valorItem;
    }

    carrinho.valorTotalCompra = total;

    await carrinho.save();

    console.log(
        'VALOR TOTAL APÓS ADICIONAR:',
        carrinho.valorTotalCompra
    );

    if (acao === 'comprar') {
        return res.redirect(
            `/${req.session.user.username}/checkout`
        );
    }

    return res.redirect(
        `/${req.session.user.username}/shopping-cart`
    );
});

    // CHECK-OUT

    // CHECK-OUT DA PÁGINA DO PRODUTO

    // CARREGA A PÁGINA DE CARTÕES E OS CARTÕES DO USUÁRIO
    // CARREGA A PÁGINA DE CARTÕES E OS CARTÕES DO USUÁRIO
    app.get('/:user/cartoes/', requireAuth.default, async(req, res) => {

        const usuarioCartao = await tabelas.usuario.findByPk(
            req.session.user.id,
            {
                include: tabelas.cartoes,
            }
        )

        res.render('cartoes.ejs', {
            USER: req.session.user,
            CARTOES: usuarioCartao.cartoes, // Guarda o array de cartões
     });
    }),
    
    // VERIFICA OS CARTÕES DO USUÁRIO E CRIA OUTROS CASO PRECISE
    app.post('/:user/cartoes', async(req, res) => {
        const {numero, cvv, vencimento, nomeTitular} = req.body;

        // console.log('REQ.BODY: ', req.body);
        // console.log('TESTE CVV: ', cvv);

        // NaN = Not a Number
        if(String(cvv).length < 3 || isNaN(cvv)){
        if(String(cvv).length < 3 || isNaN(cvv)){
            return res.send('O cvv deve conter 3 digitos.');
        }

        if(String(numero).length < 16 || isNaN(numero)){
        if(String(numero).length < 16 || isNaN(numero)){
            return res.send('O número do cartão deve conter 16 digitos');
        }

        // Encontra todas as relações desse usuário
        const usuarioCartao = await tabelas.usuario.findByPk(req.session.user.id,
            {
                include: tabelas.cartoes,
            }
        ); 

        // Verificar para ver se o cartão está na conta
        // For para passar por dentro do array de cartões, pois usuário tem N cartões
        for(const cartao of usuarioCartao.cartoes){

            if(cartao.numero == numero){
               return res.send('Cartão já cadastrado na conta.');
               return res.send('Cartão já cadastrado na conta.');
            }

        }

       const cartoes = await tabelas.cartoes.create({
                numero: numero,
                cvv: cvv,
                cvv: cvv,
                vencimento: vencimento,
                nomeTitular: nomeTitular,
            }
        )

        console.log('PELO MENOS CRIOU O CARTAO???: ', cartoes.numero);
        console.log('PELO MENOS CRIOU O CARTAO???: ', cartoes.cvv);
        console.log('PELO MENOS CRIOU O CARTAO???: ', cartoes.vencimento);
        console.log('PELO MENOS CRIOU O CARTAO???: ', cartoes.nomeTitular);


        const salvaUsuarioCartao = await tabelas.usuario_cartao.create({
            id_cartao: cartoes.id,
            id_usuario: req.session.user.id,
        })

        res.redirect(`/${req.session.user.username}/cartoes`);
    });

    app.get('/cartoes/:id/remover', async(req, res) => {
        const idCartaoRemovido = req.params.id;

        // REMOVER CARTAO
        const removeCartao = await tabelas.cartoes.findOne({
            where: {
                id: idCartaoRemovido,
            }
        })

        if(removeCartao){

            await tabelas.usuario_cartao.destroy({
                where: {
                    id_cartao: removeCartao.id,
                    id_usuario: req.session.user.id,
                }
            })

            await tabelas.cartoes.destroy({
                where: {
                    id: removeCartao.id
                }
            })
        }

        res.redirect(`/${req.session.user.username}/cartoes`);
    })

    // CHECK-OUT VINDO DO CARRINHO
    app.get('/:user/checkout/', requireAuth.default, async(req, res) => {

        // Saber de qual carrinho veio a compra 
        const carrinho = await tabelas.carrinho.findOne({
            where: {
                id_usuario: req.session.user.id,
            },
            include: {
                model: tabelas.item_carrinho,
            }
        }
        )

        // "Procura o usuário cujo ID é req.session.user.id e traz os endereços dele através da tabela intermediária
        const user = await tabelas.usuario.findByPk(
            req.session.user.id, {
                include: tabelas.endereco,
            }
        )

        // Procura cartoes do usuario
        const usuarioCartoes = await tabelas.usuario.findByPk(
            req.session.user.id, {
                include: tabelas.cartoes,
            }
        )

        const cartoes = usuarioCartoes.cartoes; // Recebe os cartões do usuário vindos da tabela intermediária

        res.render('checkout.ejs', {
            USER: req.session.user,
            CARRINHO: carrinho,
            ENDERECOS: user.enderecos,
            CARTOES: cartoes,
            TIPO_COMPRA: 'carrinho',
        })
    })

    // CHECKK-OUT VINDO DA PÁGINA DE PRODUTO
    app.get('/:user/checkout/:produtoId', async(req, res) => {
        const {produtoId} = req.params; // Saber qual produto o usuário está comprando

        // Carregar endereços
        const user = await tabelas.usuario.findByPk(
            req.session.user.id, {
                include: tabelas.endereco,
            }
        )

        // Carregar cartões
        const usuarioCartoes = await tabelas.usuario.findByPk(
            req.session.user.id, {
                include: tabelas.cartoes,
            }
        )

        const cartoes = usuarioCartoes.cartoes;

        // Pegar o produto e o preço dele
        const produto = await tabelas.produto.findByPk(produtoId);

        res.render('/checkout.ejs', {
            USER: req.session.user,
            PRODUTO: produto,
            ENDERECOS: user.enderecos,
            CARTOES: cartoes,
            TIPO_COMPRA: 'comprarAgora'
        })
    })

     app.post('/:user/checkout', async(req, res) => {
        // tipoCompra é a variável para guardar de onde o usuário veio
        const {tipoCompra, produtoId, qtd} = req.body;


        // COMPRAR APENAS O PRODUTO
        if(tipoCompra === 'comprarAgora'){
            const produto = await tabelas.produto.findByPk(produtoId);

            // Evita que a quantidade chegue como string
            const quantidade = parseInt(qtd); // parseInt transforma String em Int

            if(quantidade > produto.stock){
                return res.send('Quantidade indisponível.');
            }

            // Diminui o estoque
            produto.stock -= qtd;
            await produto.save();

            // Cria o pedido
            const itemPedido = await tabelas.item_pedido.create({
                product: produto.id,
                quantidade: quantidade,                
            })

            // Relaciona tabela pedido com item_pedido
            const pedido = await tabelas.pedido.create({
                usuarioId: req.session.user.id,
                id_item_pedido: itemPedido.id,
            })

            const valorProduto = produto.preco * quantidade;

        }   


        // COMPRA VINDO DO CARRINHO
        if(tipoCompra === 'carrinho'){
            
            // Carrinho do usuário
            const carrinho = await tabelas.carrinho.findOne({
                where: {
                    id_usuario: req.session.user.id,
                }
            })

            // Itens do carrinho do usuário
            const itensCarrinho = await tabelas.item_carrinho.findAll({
                where: {
                    id_carrinho: carrinho.id,
                }, include: tabelas.produto
            })

            if(itensCarrinho.length == 0){
                return res.send("O carrinho está vazio. Compra não autorizada");
            }

            // VERIFICAR TODOS OS PRODUTOS ANTES 
            for(const item of itensCarrinho){

                if(item.quantidade > item.produto.stock){
                    return res.send(`Quantidade indisponível para o produto /${produto.name}`);
                }
            }

            // REALIZAR EFETIVAMENTE A COMPRA
            for(const item of itensCarrinho){

                // Diminui o estoque
                item.produto.stock -= item.quantidade;
                await item.produto.save();

                // Cria o pedido
                const itensPedidos = await tabelas.item_pedido.create({
                    product: item.produto.id,
                    quantidade: item.quantidade,
                })

                // Cria relação na tabela pedidos
                const pedido = await tabelas.pedido.create({
                    usuarioId: req.session.user.id,
                    id_item_pedido: itensPedidos.id,
                })
            }

            let valorCompraCarrinho = carrinho.valorTotalCompra;

            carrinho.valorTotalCompra = 0;
            await carrinho.save();
        }

         return res.redirect(`/${req.session.user.username}/order-completed`);
    })

        app.get('/leave', requireAuth.default, (req, res)=>{
        req.session.user = undefined;
        res.redirect('/login');
    })

    app.get('/:user/order-completed', requireAuth.default, async(req, res) => {
        const carrinho = await tabelas.carrinho.findOne({
        where: {
            id_usuario: req.session.user.id
        }
    });

    if (!carrinho) {
        return res.render('order-completed.ejs', {
            USER: req.session.user,
            ITEMS: []
        });
    }

    const itens = await tabelas.item_carrinho.findAll({
        where: {
            id_carrinho: carrinho.id
        },
        include: tabelas.produto
    });

    res.render('order-completed.ejs', {
        USER: req.session.user,
        ITEMS: itens
    });
    })

    app.post('/:user/order-completed', requireAuth.default, async (req, res) => {
        const carrinho = await tabelas.carrinho.findOne({
            where: {
                id_usuario: req.session.user.id
            }
        })
        const itens = await tabelas.item_carrinho.findAll({
            where: {
                id_carrinho: carrinho.id
            },
            include: tabelas.produto
        })

        res.render('order-completed.ejs', {
            USER: req.session.user,
            ITEMS: itens
        });

        itens.forEach((item)=>{
            item.produto.stock -= item.quantidade;
            item.produto.save();
        })

        await tabelas.item_carrinho.destroy({
            where: {
                id_carrinho: carrinho.id
            }
        })

        await tabelas.carrinho.destroy({
            where: {
                id_usuario: req.session.user.id
            }
        })
    })
}

//Não é necessário incluir o app.listen(), ele já está incluso em outro arquivo :D

export {pages};

/*
    Vide:
    - https://docs.google.com/document/d/1258KS6TAiGOYzZC7bRTUhfBbXZ78Ih1oeVyrmJoQz_U/edit?tab=t.0#heading=h.yw4ptznw8nfs
    - https://docs.google.com/document/d/1258KS6TAiGOYzZC7bRTUhfBbXZ78Ih1oeVyrmJoQz_U/edit?tab=t.0#heading=h.syd4gr4bukwl
*/