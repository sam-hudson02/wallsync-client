import { Config } from "../utils/config.js";
import { Wrapper } from "../utils/restwrap.js";
import chalk from "chalk";
import ora from "ora";
import { Results } from "./types.js";
import { Select } from "./selector.js";
import { Display } from "../utils/image.js";

type RedditOptions = {
    query: string,
    config: Config,
    wrapper: Wrapper
}

export class Searcher {
    query: string;
    config: Config;
    wrapper: Wrapper;
    page: number = 0;
    display: Display;

    constructor({ query, config, wrapper }: RedditOptions) {
        this.query = query;
        this.config = config;
        this.wrapper = wrapper;
        this.display = new Display(this.config.kitty);
    }

    async search() {
        const spinner = ora({
            text: chalk.red('Searching For Images'),
            discardStdin: false
        }).start()
        const data = await this.wrapper.search(this.query, this.config.id);
        spinner.succeed(chalk.green('Found ' + data.length + ' images'))
        this.startCache(data)

        const options = [
            {
                name: "Set as wallpaper",
                key: "s",
                onPress: this.setWallpaper.bind(this)
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
        const selector = new Select(page, options, this.config.kitty, footer)
        await selector.start()
    }

    async startCache(data: Results[]) {
        for (const image of data) {
            await this.display.addToCache({
                data: image.data,
                id: `${image.location}-${image.metadata.width}-${image.metadata.height}`,
                width: image.metadata.width,
                height: image.metadata.height
            })
        }
    }

    async previousPage(data: Results[]) {
        if (this.page > 0) {
            this.page--
        }
        return await this.getPageData(data)
    }

    async getPageData(data: Results[]) {
        // return 3 images per page from data
        const start = this.page * 3
        let end = start + 3
        if (end > data.length) {
            end = data.length
        }
        return data.slice(start, end)
    }

    async setWallpaper(selected: Results, _: Select) {
        const url = selected.location
        await this.wrapper.setWallpaper(url, this.config.id)
    }
}

