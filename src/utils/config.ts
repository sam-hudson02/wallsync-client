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
    sub: string;
    command: string;
    cache: string;
    kitty: boolean;
    sync: string[];
    cacheLimit: number = 1000;

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
            fs.writeFileSync(this._fileLocation, JSON.stringify({}));
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
        this.sub = config.sub || 'r/wallpaper';
        this.sync = config.sync || [];
        this.command = config.command || 'feh --bg-fill $WALL';
        this.kitty = config.kitty || false;
        this.cacheLimit = config.cacheLimit || 100;
        this.save();
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
                sync: this.sync,
                sub: this.sub,
                kitty: this.kitty,
                cacheLimit: this.cacheLimit,
            },
            null,
            4
        ));
    }

    getHostName() {
        // get the system hostname
        return require('os').hostname();
    }

    manageCache() {
        // check if cache directory exists
        if (!fs.existsSync(this.cache)) {
            console.log('Creating cache directory');
            fs.mkdirSync(this.cache);
        }
        // get all files in cache directory
        const files = fs.readdirSync(this.cache);
        const sortedFiles = files.sort((a, b) => {
            // sort files by date modified
            return fs.statSync(this.cache + '/' + a).mtime.getTime() - fs.statSync(this.cache + '/' + b).mtime.getTime();
        });
        // check if cache is over limit in megabytes
        while (this.getCacheSize() > this.cacheLimit) {
            // delete oldest file
            console.log(`Deleting ${sortedFiles[0]}`);
            fs.unlinkSync(this.cache + '/' + sortedFiles[0]);
            // remove file from array
            sortedFiles.shift();
        }
    }

    getCacheSize() {
        // get all files in cache directory
        const files = fs.readdirSync(this.cache);
        // get total size of all files
        const totalSize = files.reduce((prev, curr) => {
            return prev + fs.statSync(this.cache + '/' + curr).size;
        }, 0);
        // convert to megabytes
        const mb = totalSize / 1000000;
        console.log(`Cache size: ${mb} MB`);
        return mb;
    }
}
