//Configurar as páginas não-estáticas (login, compras, etc)
//(A concluir. Última edição: Pedro)
import {app} from './app.js'

//Função para carregar as páginas
function pages()
{
    //Exemplo
    app.get('/', (req, res)=>{
        res.send('Hello World')
    });
}

//Não é necessário incluir o app.listen(), ele já está incluso em outro arquivo :D

export {pages};

/*
    Vide:
    - https://docs.google.com/document/d/1258KS6TAiGOYzZC7bRTUhfBbXZ78Ih1oeVyrmJoQz_U/edit?tab=t.0#heading=h.yw4ptznw8nfs
    - https://docs.google.com/document/d/1258KS6TAiGOYzZC7bRTUhfBbXZ78Ih1oeVyrmJoQz_U/edit?tab=t.0#heading=h.syd4gr4bukwl
*/