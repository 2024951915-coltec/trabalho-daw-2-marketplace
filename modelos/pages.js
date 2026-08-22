//Configurar as páginas não-estáticas (login, compras, etc)
//(A concluir. Última edição: Pedro)

import {app, requireAuth, comparePass, hashPass, upload} from './app.js';
import {database, tabelas, Op} from './db.js';

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

    app.get('/create-addresses', requireAuth.default, (req, res) => {
        return res.render('create_addresses.ejs');
    })

    app.get('/config/change-password', requireAuth.default, (req, res) => {
        const user = req.session.user;
        return res.render('password_change.ejs');
    })

    app.get('/config/edit-profile', requireAuth.default, async (req, res) => 
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

    // CADASTRO E LOGIN

    // Login

    // Criar endereço
    // Verificar se o endereço existe dentro dessa conta, pq senão pode verificar todo o BD e bugar
    app.post('/create-addresses', requireAuth.default, async (req, res) => {

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
    app.post('/password-change', requireAuth.default, async (req, res) => {
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
    app.post('/edit-profile', requireAuth.default, async (req, res) => {
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
    app.post('/:user/edit-addresses', requireAuth.default, async (req, res) => {
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

    app.get('/:user/shopping-cart', requireAuth.default, async(req, res) => {
        const user = await tabelas.usuario.findByPk(req.session.user.id);

        // Encontra carrinho do usuario
        const carrinho = await tabelas.carrinho.findOne({
            where: {
                id_usuario: user.id
            }
        })

        if(!carrinho){
            await tabelas.carrinho.create({
                id_usuario: user.id,
                valorTotalCompra: 0,
            })

        }
        // Lista para guardar as compras do carrinho
        let itens = [];

        if(carrinho){
            itens = await tabelas.item_carrinho.findAll({
                where: {
                    id_carrinho: carrinho.id
                },
                // útil para mostrar o produto na página com as informações corretamente
                include: tabelas.produto // Faz cada item trazer o produto relacionado
            })
        }
        
        console.log("CARRINHO ANTES DO RENDER:", carrinho);
console.log("ITENS ANTES DO RENDER:", itens);
console.log("VALOR TOTAL:", carrinho ? carrinho.valorTotalCompra : "SEM CARRINHO");

        // Carrega o carrinho do usuário ao entrar na página 
        res.render('shopping-cart.ejs', {
            USER: user,
            CARRINHO: carrinho,
            ITENS: itens,
        });
    })

    app.post('/:user/shopping-cart/:idCarrinho', async(req, res) => {

        // Quantidade vem do botão de aumentar ou dimuinuir a quantidade
        const {itemCarrinhoId, quantidade} = req.body;
        const {idCarrinho} = req.params;

        // Pega o id pelo formulário ao usuário clicar em alterar quantidade ou remover o item
        const itemCarrinho = await tabelas.item_carrinho.findByPk(itemCarrinhoId);

        // Verifica se a quantidade é maior que o estoque disponível
        if(itemCarrinho){
            itemCarrinho.quantidade = quantidade; // Quantidade atualizada
            itemCarrinho.save(); // Salva a nova quantidade
        }
        
        const carrinho = await tabelas.carrinho.findByPk(idCarrinho);

        // Relaciona id_produto de item_carrinho com o id do produto da tabela produtos
        // itens é um registro de item_carrinho e estou dentro das propriedades dele
        const itens = await tabelas.item_carrinho.findAll({
            where: {
                id_carrinho: carrinho.id
            },
            include: tabela.produto 
        })

        let total = 0;

        // Calcular valor do item
        for(const item of itens){

            let valorItem = item.produto.preco * item.quantidade;

            total += valorItem;

        }

        carrinho.valorTotalCompra = total;
        await carrinho.save();

        console.log("TOTAL CALCULADO NO POST:", total);
console.log("TOTAL DO CARRINHO APÓS SAVE:", carrinho.valorTotalCompra);


        // Remover item do carrinho 
        let removerItem = false;

        // Se clicar no botão de remover, ele vira true
        if(!removerItem){
            // Já peguei o item em itemCarrinho
            // Já tenho o objeto itens e o valor total da compra

            // Subtrair o valor do item do valor total
            let total = carrinho.valorTotalCompra;

            for(const item of itens){

                // Usa itemCarrinho porque estou pegando apenas um item específico e não todos como na soma
                let valorItem = itemCarrinho.produto.preco * itemCarrinho.quantidade; // Valor total do item

                total -= valorItem;

            }

            carrinho.valorTotalCompra = total;
            await carrinho.save();

            // Por fim, remover o item das tabelas item_carrinho e carrinho

            const itemTabelaCarrinho = tabelas.carrinho.findByPk(itemCarrinhoId);

            await itemTabelaCarrinho.destroy();
            await itemCarrinho.destroy();
        
        }
        // Desmarcar e marcar itens
    })

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

        res.render('produto.ejs', {
            USER: (user !== undefined) ? user : null,
            PRODUTO: produto
        });
    })

     app.post('/products/:produtoId/shopping-cart', async(req, res) => {

        const {produtoId} = req.params; // Params pega o ID pela URL
        const {quantidade} = req.body;

        // Verifica carrinho e vê qual o carrinho do usuário
        const carrinho = await tabelas.carrinho.findOne({
            where:{
                id_usuario: req.session.user.id,
            }
        });

        // Se o usuário não possui carrinho, cria um
        if(!carrinho){
            await tabelas.carrinho.create({
                id_usuario: req.session.user.id,
                valorTotalCompra: null,
            })
        }

        console.log("VALOR TOTAL APÓS O CARRINHO SER VERIFICADO: ", carrinho.valorTotalCompra);

         // Verifica qual é o produto para pegar seu preço e o estoque
        const produto = await tabelas.produto.findOne({
            where: {
                id: produtoId,
        }
    });

        if(produto.stock == 0){
            res.send('Produto fora de estoque.');
        }

        // Verifica se o produto já existe dentro do carrinho 
        const buscaItem = await tabelas.item_carrinho.findOne({
            where: {
                id_produto: produto.id,
                id_carrinho: carrinho.id,
            }
        }); 

        // Se o item não existir dentro do carrinho, cria ele

        if(!buscaItem){ 
           await tabelas.item_carrinho.create({
                id_carrinho: carrinho.id,
                id_produto: produtoId, // id do produto antes de adicionar ao carrinho
                quantidade: quantidade,
                valorItem: produto.preco, // Não trás o valor dele para ser carregado na hora de somar
            })
        }

        else {
            buscaItem.quantidade += 1;

            await buscaItem.save();
        }

        res.redirect(`/${req.session.user.username}/shopping-cart`);

        // OPÇÃO COMPRAR AGORA (VOU MEXER NISSO QUANDO FIZER CHECK-OUT)
    })

        app.get('/leave', requireAuth.default, (req, res)=>{
        req.session.user = undefined;
        res.redirect('/login');
    })

}


//Não é necessário incluir o app.listen(), ele já está incluso em outro arquivo :D

export {pages};

/*
    Vide:
    - https://docs.google.com/document/d/1258KS6TAiGOYzZC7bRTUhfBbXZ78Ih1oeVyrmJoQz_U/edit?tab=t.0#heading=h.yw4ptznw8nfs
    - https://docs.google.com/document/d/1258KS6TAiGOYzZC7bRTUhfBbXZ78Ih1oeVyrmJoQz_U/edit?tab=t.0#heading=h.syd4gr4bukwl
*/
