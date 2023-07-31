import { Config } from "../utils/config.js";
import { Wrapper } from "../utils/restwrap.js";
import { selector } from "./selector.js";
import { Downloader } from "./downloader.js";

export class Commands {
    config: Config
    wrapper: Wrapper

    constructor(config: Config, wrapper: Wrapper) {
        this.config = config
        this.wrapper = wrapper
    }

    async reddit(url: string) {
        const data = await this.wrapper.reddit(url, this.config.id)
        const stdin = process.stdin
        const downloader = new Downloader(data, stdin, this.wrapper, this.config)
        await downloader.main()
        stdin.removeAllListeners('data')
        stdin.destroy()
    }

    async search(query: string) {
        const stdin = process.stdin
        const data = await this.wrapper.search(query, this.config.id)
        const selection = await selector(data, stdin)
        try {
            const ind = parseInt(selection)
            for (const element of data) {
                if (ind == element.index) {
                    this.wrapper.setWallpaper(element.location, this.config.id)
                }
            }
        } catch (e) {
        }
        console.log('Wallpaper set to ' + selection);
        stdin.removeAllListeners('data')
        stdin.destroy()
        return
    }

    async setWallpaper(name: string) {
        const data = await this.wrapper.setWallpaper(name, this.config.id)
        console.log('Wallpaper set to ' + data);
        return
    }

    async random() {
        const data = await this.wrapper.random(this.config.id)
        console.log('Wallpaper set to ' + data);
        return
    }
}
