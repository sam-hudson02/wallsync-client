import { Config } from './utils/config.js';
import { Client } from './client/client.js';
import { imageScan } from './utils/folderscan.js';

function main() {
    const config = new Config();
    const client = new Client(config);
    client.afterReady = () => {
        upload(client);
    }
    client.start();
}

function upload(client: Client) {
    const folder = '/home/sam/.config/wallpapers';
    const files = imageScan(folder);
    for (const file of files) {
        console.log(`Uploading ${file}`);
        client.sync(file);
    }
}

main();
