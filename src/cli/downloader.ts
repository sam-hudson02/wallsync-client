import chalk from "chalk";
import ora from "ora";
import rdl from "readline";
import { Wrapper } from "../utils/restwrap";
import { Select } from "./selector";

export class Downloader {
    url: string;
    wrapper: Wrapper;
    stdin: NodeJS.ReadStream;
    stdout: NodeJS.WriteStream;
    id: string;
    selector: Select;
    set?: boolean;

    constructor(url: string, clientId: string, wrapper: Wrapper, selector: Select, set?: boolean) {
        this.url = url;
        this.id = clientId;
        this.set = set;
        this.stdin = process.stdin;
        this.stdout = process.stdout;
        this.wrapper = wrapper;
        this.selector = selector;
    }
    async download() {
        const given = await this.getInput('Enter a name for wallpaper: ');
        const ext = this.url.split('.').pop();
        const name = given + '.' + ext;
        const spinner = ora({
            text: chalk.blue('Downloading ' + name),
            discardStdin: false
        }).start();
        const location = await this.wrapper.download(name, this.url, this.id);
        spinner.succeed(chalk.green('Downloaded ' + name + ' to ' + location));
        await this.setWallpaper(location, name);
        await this.cleanup();
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
            const rdlInter = rdl.createInterface({
                input: this.stdin,
                output: this.stdout
            });
            rdlInter.question(question, (answer: string) => {
                rdlInter.close();
                resolve(answer);
            });
        });
    }

    async cleanup() {
        this.stdin.removeAllListeners();
        this.stdout.removeAllListeners();
    }
}
