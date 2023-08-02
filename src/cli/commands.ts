import { Config } from "../utils/config.js";
import { Wrapper } from "../utils/restwrap.js";
import { Reddit } from "./reddit.js";
import { Searcher } from "./searcher.js";

export class Commands {
    config: Config
    wrapper: Wrapper

    constructor(config: Config, wrapper: Wrapper) {
        this.config = config
        this.wrapper = wrapper
    }

    async reddit(arg?: string, options?: any) {
        const redditClient = new Reddit({ arg, options, config: this.config, wrapper: this.wrapper })
        await redditClient.search()
    }

    async search(query: string) {   
        const searcher = new Searcher({ query, config: this.config, wrapper: this.wrapper })
        await searcher.search()
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
