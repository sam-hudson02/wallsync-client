import * as fs from 'fs';
import https from 'https';

export type WebImage = {
    full: string;
    preview: string;
    aspect: number;
    title: string;
};

export async function redditImage(url: string) {
    if (url.includes('/comments/')) {
        return await redditPost(url);
    } else {
        return await subImages(url);
    }
}

export async function redditPost(url: string) {
    const splitQuery = url.split('?');
    const mainUrl = splitQuery[0];
    const query = splitQuery[1];
    let fetchUrl: string;
    // check if mainUrl ends in .json
    if (mainUrl.endsWith('.json')) {
        fetchUrl = `${mainUrl}?${query}`;
    } else {
        fetchUrl = `${mainUrl}.json?${query}`;
    }
    const res = await fetch(fetchUrl);
    const json = await res.json();
    // save json to file
    fs.writeFileSync('reddit.json', JSON.stringify(json, null, 2));
    return [];
}

export async function subImages(url: string) {
    const res = await fetch(url);
    const json = await res.json();
    fs.writeFileSync('reddit.json', JSON.stringify(json, null, 2));
    const posts = json.data.children;
    let images: WebImage[] = [];
    for (const post of posts) {
        const data = post.data;
        
        const mediaMetadata = data.media_metadata;
        const title = data.title;
        if (mediaMetadata) {
            const postImages = await getImageFromMeta(title, mediaMetadata);
            images = images.concat(postImages);
            continue;
        }
        const preview = data.thumbnail;
        if (!preview) {
            continue;
        }
        let full = data.url_overridden_by_dest;
        if (!full) {
            continue;
        }
        try {
            const imageData = data.preview!.images![0].source;
            const aspect = imageData!.width / imageData!.height;
            full = await validateUrl(full);
            images.push({
                full,
                preview,
                title,
                aspect
            });
        }
        catch (e) {
            continue;
        }
    }
    return images;
}

export async function getImageFromMeta(postTitle: string, meta: any) {
    const images: WebImage[] = [];
    let count = 1;
    for (const key of Object.keys(meta)) {
        const data = meta[key];
        const preview = data.p?.[0]?.u;
        if (preview) {
            const title = `${postTitle}-${count}`;
            const aspect = data.p![0]!.x / data.p![0]!.y;
            const imageObj = await parseImageUrl(preview, title, aspect);
            images.push(imageObj);
            count++;
        }
    }
    return images;
}

async function validateUrl(url: string) {
    url = url.replace('http://', 'https://');
    if (url.includes('imgur.com')) {
        const split = url.split('/').pop()!;
        if (!split.includes('.')) {
            throw new Error(`Invalid imgur url ${url}`);
        }
    }
    return url;
}

async function parseImageUrl(url: string, title: string, aspect: number): Promise<WebImage> {
    if (url.startsWith('https://preview.redd.it/')) {
        const full = refactorRedditLink(url);
        const preview = url;
        return {
            full,
            aspect,
            preview,
            title,
        };
    }
    return {
        full: url,
        aspect,
        preview: url,
        title,
    };
}


function refactorRedditLink(url: string) {
    const tail = url.split('redd.it/').pop();
    // id is between the last - and the first ?
    const id = tail?.split('-').pop()?.split('?').shift();
    return `https://i.redd.it/${id}`;
}

export const download = async (url: string, dest?: string): Promise<Buffer | undefined> => {
    return new Promise((resolve) => {
        https.get(url, (response) => {
            // pipe into a buffer
            const data: Buffer[] = [];
            response.on('data', (chunk) => {
                data.push(chunk);
            });
            response.on('end', () => {
                const buffer = Buffer.concat(data);
                if (dest) {
                    fs.writeFile(dest, buffer, (error) => {
                        if (error) {
                            console.error(error);
                            resolve(undefined);
                        } else {
                            
                            resolve(buffer);
                        }
                    });
                } else {
                    resolve(buffer);
                }
            });
        }).on('error', (error) => {
            console.error(error);
            resolve(undefined);
        });
    });
};
