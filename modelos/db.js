//Banco de dados que deverá ser incluído por todos os arquivos de modelo
//(A concluir. Última edição: Pedro Silva)

import {Sequelize} from '@sequelize/core';
import {SqliteDialect as SQLite} from '@sequelize/sqlite3';

const database = new Sequelize(
    {
        'dialect': SQLite,
        'storage': 'database.sqlite',
        'logging': false
    }
)

const tabelas = {};

export default {database, tabelas};