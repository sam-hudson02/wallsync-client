import * as fs from 'fs';

export class Config {
    private _fileLocation: string;
    id: string;
    ws_port: string;
    rest_port: string;
    server: string;
    wsServer: string;
    restServer: string;
    name: string;
    command: string;
    cache: string;
    sync: string[];

    constructor() {
        // read json file
        const homeDir = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
        const configDir = homeDir + '/.config/wallsync';
        // create config dir if it doesn't exist
        if (!fs.existsSync(configDir)) {
            console.log('Creating config directory');
            fs.mkdirSync(configDir);
        }
        this._fileLocation = configDir + '/config.json';
        // create config file if it doesn't exist
        if (!fs.existsSync(this._fileLocation)) {
            console.log('Creating config file');
            const deafultConfig = this.default();
            fs.writeFileSync(this._fileLocation, JSON.stringify(deafultConfig));
        }
        // read config file
        const config = this.read();
        // set config
        this.cache = configDir + '/cache';
        this.id = config.id || 'NEWCLIENT';
        this.ws_port = config.ws_port || '8080';
        this.rest_port = config.rest_port || '3000';
        this.server = config.server || 'localhost';
        this.wsServer = 'ws://' + config.server + ':' + this.ws_port
        this.restServer = 'http://' + config.server + ':' + this.rest_port
        this.name = config.name || this.getHostName();
        this.sync = config.sync || [];
        this.command = config.command || 'feh --bg-fill $WALL';
    }

    default() {
        return {
            id: 'NEWCLIENT',
            server: 'localhost',
            ws_port: '8080',
            rest_port: '3000',
            sync: [],
            name: this.getHostName(),
        }
    }

    setID(id: string) {
        console.log(`Setting ID to ${id}`);
        this.id = id;
        this.save();
    }

    read() {
        return JSON.parse(fs.readFileSync(this._fileLocation, 'utf8'));
    }

    save() {
        fs.writeFileSync(this._fileLocation, JSON.stringify(
            {
                id: this.id,
                ws_port: this.ws_port,
                rest_port: this.rest_port,
                server: this.server,
                name: this.name,
                command: this.command,
            },
            null,
            4
        ));
    }

    getHostName() {
        // get the system hostname
        return require('os').hostname();
    }
}
