import { Wrapper } from "../utils/restwrap.js";
import { Command } from "commander"
import { Config } from "../utils/config.js";
import { Commands } from "./commands.js";

const program = new Command();
const config = new Config();
const wrapper = new Wrapper(config.restServer);
const commands = new Commands(config, wrapper);

program
    .name('Wallsync')
    .description('Sync wallpapers across devices')

program.command('search')
    .description('search for wallpapers')
    .argument('<string>', 'string to search')
    .action(commands.search.bind(commands));

program.command('reddit')
    .description('get wallpapers from reddit')
    .argument('<string>', 'url of post')
    .action(commands.reddit.bind(commands));

program.command('set')
    .description('set wallpaper')
    .argument('<string>', 'name of wallpaper')
    .action(commands.setWallpaper.bind(commands));

program.parse();
