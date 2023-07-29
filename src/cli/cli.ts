import { Command } from "commander";
const program = new Command();
import { Wrapper } from "../utils/restwrap";
import { Config } from "../utils/config";

const config = new Config();
const wrapper = new Wrapper(config.restServer);

program
    .name('Wallsync')
    .description('Sync wallpapers across devices')

program.command('search')
    .description('search for wallpapers')
    .argument('<string>', 'string to search')
    .action((searchterm: string) => {
        wrapper.search(searchterm).then((data: string[]) => {
            console.log('Results:');
            data.forEach((element) => {
                console.log(element);
            });
        });
    });

program.command('set')
    .description('set wallpaper')
    .argument('<string>', 'name of wallpaper')
    .action((name: string) => {
        wrapper.setWallpaper(name).then((data) => {
            console.log('Wallpaper set to ' + data);
        });
    });

program.parse();
