import { Wrapper } from "../utils/restwrap.js";
import { Command } from "commander"
import { Config } from "../utils/config.js";
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
        const stdin = process.stdin
        const data = await wrapper.search(searchterm) as searchResults[]
        const selection = await selector(data, stdin)
        try {
            const ind = parseInt(selection)
            for (const element of data) {
                if (ind == element.index) {
                    wrapper.setWallpaper(element.name)
                }
            }
        } catch (e) {
        }
        console.log('Wallpaper set to ' + selection);
        stdin.removeAllListeners('data')
        stdin.destroy()
        return
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

async function selector(data: searchResults[], stdin: NodeJS.ReadStream): Promise<string> {
    // page is 5 elements or the rest of the array if less than 5 elements are left
    const slicelen = data.length < 5 ? data.length : 5;
    const remainder = data.length - slicelen;
    const page = data.slice(0, slicelen);
    await display(page);
    if (remainder == 0) {
        console.log('Select wallpaper:');
    } else {
        console.log('Select wallpaper or load more (l):');
    }
    // get stdin as async iterator
    return new Promise((resolve) => {
        stdin.on('data', (input) => {
            if (remainder > 0) {
                if (input.toString().trim() == 'l') {
                    resolve(selector(data.slice(slicelen), stdin));
                }
            }
            // remove listener
            resolve(input.toString().trim());
        });
    });
}

async function display(page: searchResults[]) {
    for (const element of page) {
        console.log(`${element.index}) ${element.name}`);
        const buffer = Buffer.from(element.data, 'base64');
        try {
            const image = await terminalImage.buffer(buffer, { width: '30%', height: '30%' });
            console.log(image);
        } catch (e) {
            console.log('Could not display image\n');
        }
    }
}

