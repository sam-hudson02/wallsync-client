import { Config } from '../utils/config.js';
import { parseMessage } from '../utils/parser.js';
import { Router, Route } from '../utils/router.js';
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
    afterReady: () => void;
    status: 'disconnected' | 'connecting' | 'connected';
    conTimeout?: NodeJS.Timeout;
    healthCheck?: NodeJS.Timeout;
    lastPing?: number;

    constructor(config: Config) {
        this.config = config;
        this.routes = [
            { key: 'ID', handler: this.onId.bind(this) },
            { key: 'PING', handler: this.onPing.bind(this) },
            { key: 'READYDATA', handler: this.onReadyData.bind(this) },
            { key: 'WALL', handler: this.incomingWall.bind(this) },
            { key: 'EXISTS', handler: this.onExists.bind(this) },
            { key: 'ERROR', handler: this.onError.bind(this) },
        ];
        this.router = new Router(this.routes);
        this.dataQueue = new Map<string, string>();
        this.afterReady = () => { };
        this.status = 'connecting';
    }

    async start(tries: number = 0) {
        try {
            console.log('Attempting to Connect');
            await this.connect();
            console.log('Finished Connecting');
            let oldStatus = this.status;
            while (true) {
                if (oldStatus !== this.status) {
                    console.log(`Status changed to ${this.status}`);
                    oldStatus = this.status;
                }
                if (this.status === 'connected') {
                    tries = 0;
                }
                if (this.status === 'disconnected') {
                    console.log('Disconnected, breaking');
                    break;
                }
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
            console.log(`Connection Closed, status: ${this.status}`);
        } catch (err) {
            console.error(err);
        }
        let sleepTime = tries ** 2 * 1000;
        // max sleep time of 10 minutes
        if (sleepTime > 600000) {
            sleepTime = 600000;
        }
        console.log(`Retrying in ${sleepTime / 1000} seconds`);
        setTimeout(() => {
            this.start(tries + 1);
        }, sleepTime);
    }

    async connect() {
        this.status = 'connecting';
        // connect
        // timeout after 10 seconds
        this.conTimeout = setTimeout(() => {
            console.log('Connection timed out');
            this.close();
        }, 10000);
        console.log(`Connecting to ${this.config.wsServer}`);
        // delete ws if exists
        if (this.ws) {
            this.ws.close();
            this.ws = undefined;
        }
        try {
            const ws = new WebSocket(this.config.wsServer);
            ws.on('error', this.sockError.bind(this));
            ws.on('open', () => {
                console.log('Connected');
                const id = `ID: ${this.config.id}`;
                const name = `NAME: ${this.config.name}`;
                ws.send(id + '\n' + name);
            });
            ws.on('message', (data) => {
                const message = data.toString();
                console.log(`Received: ${message}`);
                const commands = parseMessage(message);
                for (const [key, data] of commands) {
                    if (key == 'ID') {
                        this.onId(data);
                        this.wsReady(ws);
                    } else if (key == 'ERROR') {
                        this.onError(data);
                        console.log('Error received setting status to disconnected');
                        this.close();
                    } else {
                        console.log(`Unexpected message: ${key}`);
                    }
                }
            });
        } catch (err) {
            console.error(err);
            this.status = 'disconnected';
            return;
        }
    }

    onReady(handler: () => void) {
        this.afterReady = handler;
    }

    requestActive() {
        this.send('ACTIVE', 'ACTIVE');
    }

    close() {
        this.lastPing = undefined;
        if (this.healthCheck) {
            clearInterval(this.healthCheck);
            this.healthCheck = undefined;
        }
        if (this.conTimeout) {
            clearTimeout(this.conTimeout);
            this.conTimeout = undefined;
        }
        if (this.ws) {
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.close();
            }
            this.ws = undefined;
        }
        this.status = 'disconnected';
    }


    wsReady(ws: WebSocket) {
        if (this.conTimeout) {
            clearTimeout(this.conTimeout);
            this.conTimeout = undefined;
        }
        console.log('WebSocket authenticated');
        this.status = 'connected';
        this.lastPing = Date.now()
        this.healthCheck = setInterval(() => {
            if (!this.lastPing) {
                this.close();
                return;
            }
            if (Date.now() - this.lastPing > 40000) {
                console.log('No ping in 40 seconds, closing');
                this.close();
            }
        }, 10000);

        // remove old listeners
        ws.removeAllListeners('message');
        ws.on('message', this.onMessage.bind(this));
        this.ws = ws;
        this.afterReady();
        this.requestActive();
    }

    onMessage(data: Buffer) {
        const message = data.toString();
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
        this.lastPing = Date.now();
        this.send('PONG', 'PONG');
    }

    onReadyData(location: string) {
        const data = this.dataQueue.get(location);
        if (!data) {
            console.log(`No data for ${location}`);
            return;
        }
        this.send(location, data);
    }

    onExists(name: string) {
        // remove from data queue
        this.dataQueue.delete(name);
    }

    sockError(err: Error) {
        console.error(`Socket Error: ${err.message}`);
        this.close();
    }

    incomingWall(id: string) {
        console.log(`Received ${id}`);
        if (!this.verifyID(id)) {
            console.log('Invalid ID');
            return;
        }
        // check if exists
        const file = this.config.cache + '/' + id;
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
                downloader(data, id);
                exec(this.config.command.replace('$WALL', file));
            };
            this.config.manageCache();
            this.router.addRoutes([{ key: id, handler }]);
            this.send('REQUESTDATA', id);
        }
    }

    sync(file: string, location: string) {
        if (!fs.existsSync(file)) {
            console.log('File does not exist');
            return;
        }

        const ext = location.split('.').pop();
        if (!ext || !['png', 'jpg', 'jpeg'].includes(ext)) {
            console.log('Not an image');
            return;
        }

        const image = fs.readFileSync(file, { encoding: 'base64' });
        const data = image.toString();

        console.log(`Syncing ${location}`);
        this.send('SYNC', location);
        this.dataQueue.set(location, data);
    }

    onData(data: string, id: string) {
        if (!this.verifyID(id)) {
            console.log(`Invalid ID: ${id}`);
            this.router.deleteRoute(id);
            return;
        }
        const image = Buffer.from(data, 'base64');
        const path = this.config.cache + '/' + id;
        const dir = path.split('/').slice(0, -1).join('/');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(path, image);
        console.log(`Saving image to ${path}`);
        this.router.deleteRoute(id);
    }

    verifyID(id: string) {
        // regex that matches UUIDs + .jpg, .png, .jpeg
        return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.(jpg|png|jpeg)$/.test(id);
    }

    onError(message: string) {
        if (message == 'NotFoundError') {
            this.config.setID('NEWCLIENT');
            this.config.save();
            console.log('ID not found, getting new ID');
        } else {
            console.log(`Error: ${message}`);
        }
    }
}
