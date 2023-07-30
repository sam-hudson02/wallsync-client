import * as fs from 'fs';

// scans a directory and returns a list of images
export function imageScan(dir: string): string[] {
    const objs = fs.readdirSync(dir);
    let images: string[] = [];
    for (const obj of objs) {
        const path = `${dir}/${obj}`;
        const stat = fs.statSync(path);
        if (stat.isDirectory()) {
            images = images.concat(imageScan(path));
        } else if (stat.isFile()) {
            if (isImage(path)) {
                images.push(path);
            }
        }
    }
    return images;
}

function isImage(path: string): boolean {
    const ext = path.split('.').pop();
    if (!ext) {
        return false;
    }
    const exts = ['jpg', 'jpeg', 'png', 'gif'];
    return exts.includes(ext.toLowerCase());
}

