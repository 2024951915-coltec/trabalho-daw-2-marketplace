//Para conexão com WebSockets IO
import {io} from './app.js';

function sockets()
{
    io.on('connection', (socket)=>{

    })
}

export {sockets};