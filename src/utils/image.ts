import * as fs from 'fs';
import { createCanvas, loadImage } from 'canvas';
import terminalImage from 'terminal-image';

type RenderOptions = {
    data: string | Buffer,
    width: number,
    height: number,
    id: string,
    x?: number,
    y?: number,
}

type DisplayOptions = {
    path?: string,
    data: string | Buffer,
    kitty?: boolean,
    width?: number,
    height?: number,
    x?: number,
    y?: number,
}

type RenderIcatOptions = {
    data?: string | Buffer,
    width?: number,
    height?: number,
    id: string,
}

type IcatOptions = {
    path?: string,
    data?: string | Buffer,
    width?: number,
    height?: number,
}

type chunkOptions = {
    payload: string,
    first: boolean,
    m: 0 | 1,
    a: string,
    f: number,
}

type getBufferOptions = {
    path?: string,
    data?: string | Buffer,
}

export class Display {
    cache: Map<string, Buffer[]> = new Map();
    kitty: boolean;

    constructor(kitty: boolean) {
        this.kitty = kitty;
        this.cache = new Map();
    }

    async render({ data, width, height, x, y, id }: RenderOptions) {
        if (!x) x = 0;
        if (!y) y = 0;
        process.stdout.cursorTo(x, y);
        let cache = this.cache.get(id);
        if (cache) {
            for (const chunk of cache) {
                process.stdout.write(chunk);
            }
            return;
        }
        if (this.kitty) {
            await this.icat({ data, width, height, id });
        } else {
            // use terminal-image
            const buffer = getBuffer({ data });
            const image = await terminalImage.buffer(buffer, { height: 13 });
            render(image, x, y);
        }
    }

    async icat({ data, width, height, id }: RenderIcatOptions, print: boolean = true) {
        const buffer = getBuffer({ data });
        let base64 = await resize(buffer, width, height);

        let first = true;
        const f = 100;
        const a: string = 'T';
        const chunkSize = 4096;
        let chunks: Buffer[] = [];

        while (base64.length > 0) {
            // Split data into chunks
            let chunk = base64.slice(0, chunkSize);
            base64 = base64.slice(chunkSize);

            // m is 0 when list chunk, 1 when data chunk
            let m: 0 | 1 = base64.length > 0 ? 1 : 0;

            // Write chunk to stdout
            const out = writeChunk({ payload: chunk, first, m, f, a });
            chunks.push(out);
            if (print) {
                process.stdout.write(out);
            }

            // first is false after first chunk
            first = false;
        }
        this.cache.set(id, chunks);
    }

    async addToCache({ data, width, height, id }: RenderIcatOptions) {
        if (this.cache.has(id)) return;
        if (!data) return;
        if (this.kitty) {
            await this.icat({ data, width, height, id }, false);
        }
    }
}

export async function displayImage({ path, data, kitty, width, height, x, y }: DisplayOptions) {
    if (!x) x = 0;
    if (!y) y = 0;
    process.stdout.cursorTo(x, y);
    if (kitty) {
        await icat({ path, data, width, height });
    } else {
        // use terminal-image
        const buffer = getBuffer({ path, data });
        const image = await terminalImage.buffer(buffer, { height: 13 });
        render(image, x, y);
    }
}

function render(str: string, x: number, y: number) {
    const lines = str.split('\n');
    for (let i = 0; i < lines.length; i++) {
        process.stdout.cursorTo(x, y + i);
        process.stdout.write(lines[i]);
    }
}

export async function icat({ path, data, width, height }: IcatOptions) {
    const buffer = getBuffer({ path, data });
    let base64 = await resize(buffer, width, height);

    let first = true;
    const f = 100;
    const a: string = 'T';
    const chunkSize = 4096;

    while (base64.length > 0) {
        // Split data into chunks
        let chunk = base64.slice(0, chunkSize);
        base64 = base64.slice(chunkSize);

        // m is 0 when list chunk, 1 when data chunk
        let m: 0 | 1 = base64.length > 0 ? 1 : 0;

        // Write chunk to stdout
        const out = writeChunk({ payload: chunk, first, m, f, a });
        process.stdout.write(out);

        // first is false after first chunk
        first = false;
    }
    process.stdout.write('\n');
}

export function getBuffer({ path, data }: getBufferOptions): Buffer {
    if (data) {
        if (typeof data === 'string') {
            return Buffer.from(data, 'base64');
        }
        return data
    }
    if (path) {
        return fs.readFileSync(path);
    }
    throw new Error('No path or buffer provided');
}


function writeChunk({ payload, first, m, a, f }: chunkOptions) {
    const control = controlData({ payload, first, m, a, f });
    let res = escape(control + payload);
    return Buffer.from(res);
}

function controlData({ first, m, a, f }: chunkOptions) {
    if (first) {
        return `m=${m},a=${a},f=${f};`;
    }
    return `m=${m};`;
}

function escape(str: string) {
    return `\x1b_G${str}\x1b\\`;
}

export async function prepImage(aspect: number, widthMax: number, heightMax: number) {
    let height = heightMax;
    let width = height * aspect;

    if (width > widthMax) {
        width = widthMax;
        height = width / aspect;
    }

    return { width, height };
}

export async function resize(buffer: Buffer, width?: number, height?: number) {
    // Load the image using canvas
    const img = await loadImage(buffer);

    if (!width) width = img.width;
    if (!height) height = img.height;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.drawImage(img, 0, 0, width, height);

    // Convert to png buffer
    const image = canvas.toBuffer('image/png');
    const base64 = image.toString('base64');

    return base64;
}
