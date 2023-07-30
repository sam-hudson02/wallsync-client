import { Wrapper } from "../utils/restwrap";
import { Command } from "commander"
import { Config } from "../utils/config";
import terminalImage from "terminal-image";

const program = new Command();
const config = new Config();
const wrapper = new Wrapper(config.restServer);

type searchResults = {
    index: number
    name: string
    data: string
}

program
    .name('Wallsync')
    .description('Sync wallpapers across devices')

program.command('search')
    .description('search for wallpapers')
    .argument('<string>', 'string to search')
    .action(async (searchterm: string) => {
        const data = await wrapper.search(searchterm) as searchResults[]
        const selection = await selector(data)
        try {
            const ind = parseInt(selection)
            for (const element of data) {
                if (ind == element.index) {
                    wrapper.setWallpaper(element.name)
                }
            }
        } catch (e) {
        }
    });

program.command('set')
    .description('set wallpaper')
    .argument('<string>', 'name of wallpaper')
    .action((name: string) => {
        wrapper.setWallpaper(name).then((data) => {
            console.log('Wallpaper set to ' + data);
        });
    });

program.parse();

async function selector(data: searchResults[]): Promise<string> {
    for (const element of data) {
        console.log(`${element.index}) ${element.name}`);
        const buffer = Buffer.from(element.data, 'base64');
        console.log(await terminalImage.buffer(buffer));
    }
    console.log('Select wallpaper: ');
    // get stdin as async iterator
    const stdin = process.stdin;
    return new Promise((resolve) => {
        stdin.on('data', (data) => {
            resolve(data.toString().trim());
        });
    });
}
