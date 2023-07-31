import { Results } from "./types.js";
import { display } from "./selector.js";
import { Wrapper } from "../utils/restwrap.js";
import { Config } from "../utils/config.js";

export class Downloader {
    data: Results[];
    page: Results[];
    stdin: NodeJS.ReadStream;
    start: number;
    remainder: number;
    slicelen: number;
    finished: boolean;
    wrapper: Wrapper;
    config: Config;

    constructor(data: Results[], stdin: NodeJS.ReadStream, wrapper: Wrapper, config: Config) {
        this.data = data;
        this.stdin = stdin;
        this.page = [];
        this.start = 0;
        this.remainder = data.length;
        this.slicelen = data.length < 5 ? data.length : 5;
        this.finished = false;
        this.wrapper = wrapper;
        this.config = config;
    }

    async main() {
        this.page = this.data.slice(this.start, this.start + this.slicelen);
        let newPage = true;
        while (!this.finished) {
            if (newPage) {
                await display(this.page);
                newPage = false;
            }
            const input = await getInput('Select wallpaper to download, load more (l) or quit (q):', this.stdin);
            if (input === 'q') {
                this.finished = true;
                return;
            }
            if (input === 'l') {
                await this.nextPage();
                newPage = true;
                continue;
            }
            await this.download(input);
        }
    }

    async nextPage() {
        if (this.remainder <= 0) {
            return;
        }
        this.slicelen = this.remainder < 5 ? this.remainder : 5;
        this.start += this.slicelen;
        this.remainder -= this.slicelen;
        if (this.remainder < 5) {
            this.slicelen = this.remainder;
        }
        this.page = this.data.slice(this.start, this.start + this.slicelen);
    }

    async download(input: string) {
        const index = parseInt(input);
        for (const element of this.page) {
            if (element.index !== index) {
                continue;
            }
            const given = await getInput('Enter a name for wallpaper:', this.stdin);
            const ext = element.location.split('.').pop();
            const name = given + '.' + ext;
            await this.wrapper.download(name, element.location, this.config.id);
        }
    }
}

export async function getInput(promt: string, stdin: NodeJS.ReadStream): Promise<string> {
    console.log(promt);
    return new Promise((resolve) => {
        stdin.on('data', (input) => {
            resolve(input.toString().trim());
        });
    });
}

