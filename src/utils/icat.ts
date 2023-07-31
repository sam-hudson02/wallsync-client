import * as fs from 'fs';

type IcatOptions = {
    path?: string,
    buffer?: string
}

export function icat({ path, buffer }: IcatOptions) {
    process.stdout.write('Testing icat\n');
    if (!path && !buffer) {
        throw new Error('icat: path or buffer must be specified');
    } else if (!buffer && path) {
        buffer = fs.readFileSync(path, 'base64');

    } else if (!buffer) throw new Error('icat: buffer must be specified');
    let data = buffer;
    let first = true;
    while (data.length > 0) {
        let chunk = data.slice(0, 4096);
        data = data.slice(4096);
        // m is 0 when list chunk, 1 when data chunk
        let m: 0 | 1 = data.length > 0 ? 1 : 0;
        process.stdout.write(writeChunk(chunk, first, m));
        first = false;
    }
}


function writeChunk(payload: string, first: boolean, m: 0 | 1, a = 'T', f = 100) {
    let res = '';

    // push bytes \033_G
    res += '\x1b_G'
    if (first) {
        res += `m=${m},a=${a},f=${f}`;
    } else {
        res += `m=${m}`;
    }
    res += ';';
    res += payload;
    res += '\x1b\\'
    return Buffer.from(res);
}
