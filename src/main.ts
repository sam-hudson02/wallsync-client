import { Config } from './utils/config';
import { Client } from './client/client';
import { imageScan } from './utils/folderscan';

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
