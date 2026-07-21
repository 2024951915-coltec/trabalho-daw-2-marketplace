/* 
    NOTA: NÃO É NECESSÁRIO MEXER EM NADA AQUI.
    Tá tudo separado em arquivos diferentes, na pasta "modelos"

     - app.js (concluído): Configuração básica do Express e do SocketIO
     - db.js (a concluir): Inicializa o banco de dados, as tabelas, e o relacionamento entre elas
     - pages.js (a concluir): Inicializa as páginas
     - 

    - Pedro

    Vide:
        https://docs.google.com/document/d/1258KS6TAiGOYzZC7bRTUhfBbXZ78Ih1oeVyrmJoQz_U/edit?tab=t.0#heading=h.vfg99mbme1yk
*/

import {init} from './modelos/app.js'
import {pages} from './modelos/pages.js'
import {sockets} from './modelos/sockets.js'

pages();
sockets();
init();