import terminalImage from 'terminal-image';
import { Results } from './types.js';
import { icat } from '../utils/icat.js';

export async function selector(data: Results[], stdin: NodeJS.ReadStream): Promise<string> {
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

export async function display(page: Results[]) {
    for (const element of page) {
        console.log(`${element.index}) ${element.location}`);
        const buffer = element.data
        try {
            icat({ buffer });
        } catch (e) {
            console.log(e);
            console.log('Could not display image\n');
        }
    }
}


