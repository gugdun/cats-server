const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Server is running');
});

const wss = new WebSocket.Server({ server });

function broadcast(message, exclude = null) {
    const messageString = JSON.stringify(message);
    wss.clients.forEach(client => {
        if (client !== exclude && client.readyState === WebSocket.OPEN) {
            client.send(messageString);
        }
    });
}

function getAllPlayerStates(exclude = null) {
    const states = [];
    wss.clients.forEach(client => {
        if (client !== exclude && client.id) {
            states.push({
                id: client.id,
                username: client.username,
                position: client.position,
                velocity: client.velocity
            });
        }
    });
    return states;
}

wss.on('connection', ws => {
    ws.on('message', message => {
        try {
            const data = JSON.parse(message.toString());
            if (data.type === 'join') {
                ws.id = uuidv4();
                ws.username = data.username;
                broadcast({
                    type: 'join',
                    id: ws.id,
                    username: data.username
                }, ws);
                ws.send(JSON.stringify({
                    type: 'states',
                    states: getAllPlayerStates(ws)
                }));
            } else if (data.type === 'update') {
                ws.position = data.position;
                ws.velocity = data.velocity;
                broadcast({
                    type: 'update',
                    id: ws.id,
                    position: data.position,
                    velocity: data.velocity
                }, ws);
            }
        } catch (e) {
            console.error('Error parsing message:', e);
        }
    });

    ws.on('close', () => {
        broadcast({
            type: 'leave',
            id: ws.id
        }, ws);   
    });
});

server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
