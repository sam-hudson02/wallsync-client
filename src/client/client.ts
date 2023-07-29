import { Config } from '../utils/config';
import { parseMessage } from '../utils/parser';
import { Router, Route } from '../utils/router';
import { WebSocket } from 'ws';
import * as fs from 'fs';
// import way to run command
import { exec } from 'child_process';

export class Client {
    config: Config;
    ws?: WebSocket;
    routes: Route[];
    router: Router;
    dataQueue: Map<string, string>;

    constructor(config: Config) {
        this.config = config;
        this.routes = [
            { key: 'ID', handler: this.onId.bind(this) },
            { key: 'PING', handler: this.onPing.bind(this) },
            { key: 'READYDATA', handler: this.onReadyData.bind(this) },
            { key: 'WALL', handler: this.incomingWall.bind(this) },
            { key: 'EXISTS', handler: this.onExists.bind(this) },
        ];
        this.router = new Router(this.routes);
        this.dataQueue = new Map<string, string>();
    }

    async connect() {
        // connect
        console.log(`Connecting to ${this.config.wsServer}`);
        const ws = new WebSocket(this.config.wsServer);
        const onMessage = this.onMessage.bind(this);
        ws.on('open', () => {
            console.log('Connected');
            const id = `ID: ${this.config.id}`;
            const name = `NAME: ${this.config.name}`;
            ws.send(id + '\n' + name);
        });
        ws.on('message', (data) => {
            const message = data.toString();
            onMessage(message);
        });
        this.ws = ws;
    }

    onMessage(message: string) {
        const commands = parseMessage(message);
        for (const [key, data] of commands) {
            this.router.route(key, data);
        }
    }

    onId(id: string) {
        this.config.setID(id);
    }

    send(key: string, data: string) {
        if (!this.ws) {
            throw new Error('No WebSocket connection');
        }
        this.ws.send(`${key}: ${data}`);
    }

    onPing(_: string) {
        this.send('PONG', 'PONG');
    }

    onReadyData(name: string) {
        const data = this.dataQueue.get(name);
        if (!data) {
            console.log(`No data for ${name}`);
            return;
        }
        this.send(name, data);
    }

    onExists(name: string) {
        // remove from data queue
        this.dataQueue.delete(name);
    }

    incomingWall(name: string) {
        console.log(`Received ${name}`);
        // check if exists
        const file = this.config.cache + '/' + name;
        if (fs.existsSync(file)) {
            console.log('File already exists, setting as wallpaper');
            // run command
            const command = this.config.command.replace('$WALL', file)
            console.log(command);
            exec(command);
            return;
        } else {
            console.log('File does not exist, requesting');
            const downloader = this.onData.bind(this);
            const handler = (data: string) => {
                downloader(data, name);
                exec(this.config.command.replace('$WALL', file));
            };
            this.router.addRoutes([{ key: name, handler }]);
            this.send('REQUESTDATA', name);
        }
    }

    sync(file: string) {
        if (!fs.existsSync(file)) {
            console.log('File does not exist');
            return;
        }

        const ext = file.split('.').pop();
        if (!ext || !['png', 'jpg', 'jpeg'].includes(ext)) {
            console.log('Not an image');
            return;
        }

        const image = fs.readFileSync(file, { encoding: 'base64' });
        const data = image.toString();
        const name = file.split('/').slice(-1)[0].split('.')[0];

        console.log(`Syncing ${name}.${ext}`);
        this.send('SYNC', name);
        this.dataQueue.set(name, data);
    }

    onData(data: string, name: string) {
        const image = Buffer.from(data, 'base64');
        const path = this.config.cache + '/' + name;
        console.log(`Saving image to ${path}`);
        fs.writeFile(path, image, (err) => {
            if (err) {
                console.error(err);
            }
        });
        this.router.deleteRoute(name);
    }
}
