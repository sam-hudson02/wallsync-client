import chalk from "chalk";
import ora from "ora";
import rdl from "readline";
import { Wrapper } from "../utils/restwrap";
import { Select } from "./selector";

export class Downloader {
    wrapper: Wrapper;
    stdin: NodeJS.ReadStream;
    stdout: NodeJS.WriteStream;
    id: string;
    selector: Select;
    set?: boolean;
    inter: rdl.Interface;

    constructor(clientId: string, wrapper: Wrapper, selector: Select, set?: boolean) {
        this.id = clientId;
        this.set = set;
        this.stdin = process.stdin;
        this.stdout = process.stdout;
        this.wrapper = wrapper;
        this.selector = selector;
        this.inter = rdl.createInterface({
            input: this.stdin,
            output: this.stdout
        });
    }

    async download(url: string) {
        const given = await this.getInput('Enter a name for wallpaper: ');
        const ext = url.split('.').pop();
        const name = given + '.' + ext;
        const spinner = ora({
            text: chalk.blue('Downloading ' + name),
            discardStdin: false
        }).start();
        const location = await this.wrapper.download(name, url, this.id);
        spinner.succeed(chalk.green('Downloaded ' + name + ' to ' + location));
        await this.setWallpaper(location, name);
    }

    async setWallpaper(location: string, name: string) {
        if (this.set === undefined) {
            const set = await this.getInput('Set as wallpaper? [y/n]: ');
            if (set.toLowerCase() === 'y') {
                const setSpinner = ora({
                    text: chalk.blue('Setting ' + name + ' as wallpaper'),
                    discardStdin: false
                }).start();
                await this.wrapper.setWallpaper(location, this.id);
                setSpinner.succeed(chalk.green('Set ' + name + ' as wallpaper'));
            }
        } else if (this.set) {
            const setSpinner = ora({
                text: chalk.blue('Setting ' + name + ' as wallpaper'),
                discardStdin: false
            }).start();
            await this.wrapper.setWallpaper(location, this.id);
            setSpinner.succeed(chalk.green('Set ' + name + ' as wallpaper'));
        }
    }

    async getInput(question: string): Promise<string> {
        return new Promise((resolve) => {
            this.inter.question(question, (answer: string) => {
                resolve(answer);
            });
        });
    }

    async cleanup() {
        this.inter.close();
        this.stdin.destroy();
    }
}
