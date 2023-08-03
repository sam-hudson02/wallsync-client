import { Config } from "../utils/config.js";
import { Wrapper } from "../utils/restwrap.js";
import chalk from "chalk";
import ora from "ora";
import { Results } from "./types.js";
import { Select } from "./selector.js";
import { Downloader } from "./downloader.js";
import { WebImage, download, redditImage } from "./scrape.js";
import { Display, prepImage } from "../utils/image.js";

type RedditOptions = {
    arg?: string,
    options?: any,
    config: Config,
    wrapper: Wrapper
}

export class Reddit {
    url: string;
    config: Config;
    wrapper: Wrapper;
    page: number = 0;
    imageCache: Map<string, Results>;
    display: Display;

    constructor({ arg, options, config, wrapper }: RedditOptions) {
        if (!options) {
            options = {}
        }
        let sub = options.sub
        if (!sub) {
            sub = config.sub
        }
        if (!sub.startsWith('r/')) {
            sub = 'r/' + sub
        }
        if (!arg) {
            arg = 'https://www.reddit.com/' + sub + '.json'
        }
        if (!arg.startsWith('https://www.reddit.com/')) {
            arg = 'https://www.reddit.com/' + sub + '/search.json?q=' + arg + '&restrict_sr=1'
        }
        this.url = arg
        this.config = config
        this.wrapper = wrapper
        this.imageCache = new Map()
        this.display = new Display(this.config.kitty)
    }

    async search() {
        const spinner = ora({
            text: chalk.red('Searching Reddit For Images'),
            discardStdin: false
        }).start()
        let data: WebImage[];
        try {
            data = await redditImage(this.url)
            spinner.succeed(chalk.green('Found ' + data.length + ' images'))
            // start caching images
            this.getImages(data)
        } catch (e) {
            spinner.fail(chalk.red('Failed to search Reddit'))
            return
        }

        const options = [
            {
                name: 'Download',
                key: 'd',
                onPress: this.download.bind(this)
            },
            {
                name: 'Next Page',
                key: 'l',
                onPress: async (_: Results, selector: Select) => {
                    const pages = Math.ceil(data.length / 3) - 1
                    if (this.page < pages) {
                        this.page++
                    } else {
                        return
                    }
                    const page = await this.getPageData(data)
                    const footer = 'Page ' + (this.page + 1) + ' of ' + (pages + 1)
                    selector.newData(page, footer)
                }
            },
            {
                name: 'Previous Page',
                key: 'h',
                onPress: async (_: Results, selector: Select) => {
                    const page = await this.previousPage(data)
                    const pages = Math.ceil(data.length / 3) - 1
                    const footer = 'Page ' + (this.page + 1) + ' of ' + (pages + 1)
                    selector.newData(page, footer)
                }
            },
        ]

        const page = await this.getPageData(data)
        const footer = 'Page ' + (this.page + 1) + ' of ' + (Math.ceil(data.length / 3))
        const selector = new Select(page, options, this.config.kitty, footer, this.display)
        // set timeout for 500ms to allow for images to be cached
        selector.start()
    }

    async previousPage(data: WebImage[]) {
        if (this.page > 0) {
            this.page--
        }
        return await this.getPageData(data)
    }

    async getPageData(data: WebImage[]) {
        // return 3 images per page from data
        const start = this.page * 3
        let end = start + 3
        if (end > data.length) {
            end = data.length
        }
        data = data.slice(start, end)
        return await this.getImages(data)
    }

    async getImages(webResults: WebImage[], displayCache: boolean = true) {
        const results: Results[] = []
        for (const webResult of webResults) {
            let result = this.imageCache.get(webResult.full)
            if (!result) {
                let data = await download(webResult.full)
                const { width, height } = await prepImage(webResult.aspect, 670, 290)
                result = {
                    title: webResult.title,
                    location: webResult.full,
                    data,
                    metadata: {
                        width,
                        height
                    }
                }
                this.imageCache.set(webResult.full, result)
                if (displayCache) {
                    try {
                        this.display.addToCache({
                            data: result.data,
                            width,
                            height,
                            id: `${webResult.full}-${width}-${height}`
                        })
                    } catch (e) {
                    }
                }
            }
            results.push(result)
        }
        return results
    }

    async download(selected: Results, selector: Select) {
        selector.wipe()
        const downloader = new Downloader(selected.location, this.config.id, this.wrapper, selector)
        await downloader.download()
        selector.start()
    }
}
