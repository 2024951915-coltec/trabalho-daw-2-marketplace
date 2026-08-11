//Banco de dados que deverá ser incluído por todos os arquivos de modelo
//(Concluído. Última edição: Pedro Silva 21/07/2026)

import {Sequelize, DataTypes} from '@sequelize/core';
import {SqliteDialect as SQLite} from '@sequelize/sqlite3';
import bcrypt from 'bcryptjs';

const database = new Sequelize(
    {
        'dialect': SQLite,
        'storage': 'bin/database.sqlite',
        'logging': false
    }
)

const tabelas = {

    usuario : 
    database.define('usuario', 
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                allowNull: false,
                autoIncrement: true,
            },

            username: {
                type: DataTypes.TEXT,
                unique: true,
                allowNull: false,
            },

            name: {
                type: DataTypes.TEXT,
                allowNull: false,
            },

            passhash: {
                type: DataTypes.TEXT,
                allowNull: false,
            },

            category: {
                type: DataTypes.TEXT,
                allowNull: false,
                defaultValue: 'user',
            }
        },

        {
            hooks: {
                //garantir o hashing da senha
                beforeCreate: async (u) => {
                    const salt = await bcrypt.genSalt(10);
                    u.passhash = await bcrypt.hash(u.passhash, salt);
                }
            }
        }
    ),

    // Usar chave estrangeira para conectar ao usuário
    endereco: 
    database.define('endereco', 
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                allowNull: false,
                autoIncrement: true,
            },

            local: {
                type: DataTypes.TEXT,
                allowNull: false,
            }
        }
    ),

    usuario_endereco: database.define('usuario_endereco',
        {
            id_usuario: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },

            id_endereco: {
                type: DataTypes.INTEGER,
                allowNull: false,
            }
        }
    ),

    vendedor_perfil:
    database.define('vendedor', 
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                allowNull: false,
                autoIncrement: true,
            },

            description: {
                type: DataTypes.TEXT,
                allowNull: false, 
                defaultValue: ''
            }
        }
    ),

    categoria: 
    database.define('categoria',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                allowNull: false,
                autoIncrement: true,
            },

            name: {
                type: DataTypes.TEXT,
                allowNull: false, 
            }
        }
    ),

    produto:
    database.define('produto',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                allowNull: false,
                autoIncrement: true,
            },

            name: {
                type: DataTypes.TEXT,
                allowNull: false,
            },

            description: {
                type: DataTypes.TEXT,
                allowNull: false,
                defaultValue: '',
            },

            stock: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
        }
    ),

    item_carrinho:
    database.define('item_carrinho',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                allowNull: false,
                autoIncrement: true,
            },

            qtn: {
                type: DataTypes.INTEGER,
                allowNull: false,
            }
        }
    ),

    carrinho:
    database.define('carrinho',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                allowNull: false,
                autoIncrement: true,
            },
        }
    ),

    item_pedido:
    database.define('item_pedido',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                allowNull: false,
                autoIncrement: true,
            },

            qtn: {
                type: DataTypes.INTEGER,
                allowNull: false,
            }
        }
    ),

    pedido:
    database.define('pedido',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                allowNull: false,
                autoIncrement: true,
            },
        }
    ),

    avaliacao:
    database.define('avaliacao',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                allowNull: false,
                autoIncrement: true,
            },

            message: {
                type: DataTypes.TEXT,
                allowNull: false,
            },

            rating: {
                type: DataTypes.INTEGER,
                allowNull: false
            }
        }
    ),

    historico_produto:
    database.define('historico_produto',
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                allowNull: false,
                autoIncrement: true,
            },

            description: {
                type: DataTypes.TEXT,
                allowNull: false,
                defaultValue: '',
            },

            stock: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
        }
    )
};

//relacionamentos:

//Usuário-avaliacao (1-n)
tabelas.usuario.hasMany(tabelas.avaliacao, {foreignKey: 'poster'});
tabelas.avaliacao.belongsTo(tabelas.usuario, {foreignKey: 'poster'});

//Endereco-usuario (n-n)
tabelas.endereco.belongsToMany(tabelas.usuario, {
    through: tabelas.usuario_endereco // Usa usuario_endereco como tabela intermediária
});
tabelas.usuario.belongsToMany(tabelas.endereco, {
    through: tabelas.usuario_endereco 
});

//Usuário-perfil (1-1)
tabelas.usuario.hasOne(tabelas.vendedor_perfil, {foreignKey: 'user'});
tabelas.vendedor_perfil.belongsTo(tabelas.usuario, {foreignKey: 'user'});

//Categoria-produto (1-n)
tabelas.categoria.hasMany(tabelas.produto, {foreignKey: 'category'});
tabelas.produto.belongsTo(tabelas.categoria, {foreignKey: 'category'});

//Produto-item de carrinho (1-n)
tabelas.produto.hasMany(tabelas.item_carrinho, {foreignKey: 'product'});
tabelas.item_carrinho.belongsTo(tabelas.produto, {foreignKey: 'product'});

//Produto-item de pedido (1-n)
tabelas.produto.hasMany(tabelas.item_pedido, {foreignKey: 'product'});
tabelas.item_pedido.belongsTo(tabelas.produto, {foreignKey: 'product'});

//Produto-histórico (1-n)
tabelas.produto.hasMany(tabelas.historico_produto, {foreignKey: 'product'});
tabelas.historico_produto.belongsTo(tabelas.produto, {foreignKey: 'product'})

//Usuário-carrinho-item (n-m)
tabelas.usuario.belongsToMany(tabelas.item_carrinho, {through: tabelas.carrinho});
tabelas.item_carrinho.belongsToMany(tabelas.usuario, {through: tabelas.carrinho});

//Usuário-pedido-item (n-m)
tabelas.usuario.belongsToMany(tabelas.item_pedido, {through: tabelas.pedido});
tabelas.item_pedido.belongsToMany(tabelas.usuario, {through: tabelas.pedido});

//sincronização
database.sync()
.then(()=>{
    console.log('Banco de dados sincronizado com sucesso!');
})
.catch((error)=>{
    console.error('Não é possível prosseguir com o funcionamento do app devido a um erro de sincronização com o banco de dados:\n');
    console.error('\t> ' + error + '\n');
})

export {database, tabelas};