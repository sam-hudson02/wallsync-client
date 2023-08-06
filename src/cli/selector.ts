import { Display, displayImage } from '../utils/image.js';
import { Results } from './types.js';
import chalk from 'chalk';

type Option = {
    name: string;
    key: string;
    onPress: (selected: Results, selector: Select) => void;
};

type Location = {
    x: number;
    y: number;
}

type renderOptions = {
    highlight?: boolean;
    loc?: Location;
    renderImage?: boolean;
}

export class Select {
    data: Results[];
    options: Option[];
    stdin: NodeJS.ReadStream;
    stdout: NodeJS.WriteStream;
    stderr: NodeJS.WriteStream;
    selected: number = 0;
    locations: Map<number, Location> = new Map();
    kitty: boolean;
    width: number;
    height: number;
    footer: string;
    boxWidth: number = 70;
    boxHeight: number = 14;
    pixelPerRowRatio: number = 50;
    pixelsPerColumnRatio: number = 10.2;
    center: number
    display: Display;

    constructor(data: Results[], options: Option[], kitty: boolean = false, footer: string = '', display?: Display) {
        this.data = data;
        this.options = options;
        this.stdin = process.stdin;
        this.stdout = process.stdout;
        this.stderr = process.stderr;
        this.kitty = kitty;
        this.width = this.stdout.columns!;
        this.height = this.stdout.rows!;
        this.footer = footer;
        this.center = Math.floor(this.width / 2);
        this.display = display || new Display(kitty);
    }

    hideCursor() {
        this.stdout.write("\x1B[?25l")
    }

    showCursor() {
        this.stdout.write("\x1B[?25h")
    }

    disableScroll() {
        this.stdout.write("\x1B[?1049h")
    }

    clearScreen() {
        this.stdout.write("\x1B[2J\x1B[0f")
    }

    getLeftPadding(length: number) {
        return Math.floor(this.width / 2 - length / 2);
    }

    async start() {
        this.wipe();
        this.hideCursor();
        this.disableScroll();
        this.stdin.pause();

        for (let i = 0; i < this.data.length; i++) {
            await this.renderElement(this.data[i]);
        }

        const pad = this.center - Math.floor(this.footer.length / 2);
        this.stdout.cursorTo(pad, this.height - 1);
        this.write(this.footer, false);

        this.stdin.resume();
        this.stdin.setRawMode(true);
        this.stdin.setEncoding('utf-8');
        this.stdin.on('data', async (input) => {
            await this.commandHandler(input.toString().trim());
        });
    }

    async renderElement(element: Results, { highlight, renderImage }: renderOptions = { renderImage: true }) {
        const index = this.data.indexOf(element);
        let loc = this.locations.get(index);
        if (highlight === undefined) {
            highlight = this.selected === index;
        }
        if (loc === undefined) {
            if (index === 0) {
                highlight = true;
                this.stdout.cursorTo(0, 1);
            }
            loc = await this.getCursorPos();
            this.locations.set(index, loc);
        }

        // border and title
        this.border(highlight, loc.y - 1);
        this.writeTitle(element, loc.y - 1, highlight);

        // image
        if (renderImage) {
            let xd;
            if (this.kitty) {
                xd = this.getLeftPadding(Math.ceil(element.metadata.width / this.pixelsPerColumnRatio));
            } else {
                const aspectRatio = element.metadata.width / element.metadata.height;
                // height will be 13 rows
                let width = Math.ceil(13 * aspectRatio);
                // one row is about 1.9 cols 
                width = Math.ceil(width * 1.9);
                xd = this.center - Math.ceil(width / 2);
            }
            if (element.data) {
                try {
                    await this.display.render({
                        data: element.data,
                        id: `${element.location}-${element.metadata.width}-${element.metadata.height}`,
                        x: xd,
                        y: loc.y,
                        width: element.metadata.width,
                        height: element.metadata.height
                    });
                } catch (e) {
                    this.failedImage(loc.y);
                }
            } else {
                this.failedImage(loc.y);
            }
        }
        this.stdout.cursorTo(0, loc.y + this.boxHeight);
    }

    writeTitle(element: Results, y: number, highlight: boolean = false) {
        let base = element.title
        if (base.length + 6 > this.boxWidth) {
            base = base.slice(0, this.boxWidth - 9) + '...';
        }
        const title = `[ ${base} ]`;
        const xt = this.center - Math.floor(title.length / 2);
        this.stdout.cursorTo(xt, y);
        this.write(title, highlight);
    }

    failedImage(y: number) {
        const text = 'No image available';
        const pad = this.center - Math.floor(text.length / 2);
        this.stdout.cursorTo(pad, y + (this.boxHeight / 2));
    }


    centerText(text: string) {
        const len = text.length;
        const padSize = this.getLeftPadding(len);
        return ' '.repeat(padSize) + text;
    }

    write(text: string, highlight: boolean = false, center: boolean = false) {
        if (center) {
            text = this.centerText(text);
        }
        if (highlight) {
            this.stdout.write(chalk.bold(chalk.green(text)));
            return;
        }
        this.stdout.write(chalk.bold(chalk.gray(text)));
    }

    highlight(text: string) {
        this.write(text, true);
    }

    border(highlight: boolean = false, y: number) {
        // move the cursor to the start x, y
        const x = this.center - Math.floor(this.boxWidth / 2);
        this.stdout.cursorTo(x, y);
        this.write('┌' + '─'.repeat(this.boxWidth - 2) + '┐', highlight);
        this.stdout.cursorTo(x, y);
        for (let i = 0; i < this.boxHeight; i++) {
            this.stdout.cursorTo(x, y + i + 1);
            this.write('│', highlight);
            this.stdout.cursorTo(x + this.boxWidth - 1, y + i + 1);
            this.write('│', highlight);
        }
        // move cursor down
        // write bottom border
        this.stdout.cursorTo(x, y + this.boxHeight);
        this.write('└' + '─'.repeat(this.boxWidth - 2) + '┘', highlight);
        this.stdout.cursorTo(x, y);
    }

    async commandHandler(command: string) {
        switch (command) {
            case 'j': return this.down();
            case 'k': return this.up();
            case 'q': return this.quit();
        }
        for (const option of this.options) {
            if (option.key == command) {
                option.onPress(this.data[this.selected], this);
            }
        }
    }

    async down() {
        if (this.selected < this.data.length - 1) {
            await this.moveSelection(this.selected + 1);
        }
    }

    async up() {
        if (this.selected > 0) {
            await this.moveSelection(this.selected - 1);
        }
    }

    async moveSelection(index: number) {
        const current = this.data[this.selected];
        const next = this.data[index];
        await this.renderElement(current, {
            highlight: false,
            renderImage: false
        });
        await this.renderElement(next, {
            highlight: true,
            renderImage: false
        });
        this.selected = index;
    }

    getCursorPos(): Promise<{ y: number, x: number }> {
        return new Promise((resolve) => {
            const termcodes = { cursorGetPosition: '\u001b[6n' };

            process.stdin.setEncoding('utf8');
            process.stdin.setRawMode(true);

            const readfx = function() {
                const buf = process.stdin.read();
                const str = JSON.stringify(buf); // "\u001b[9;1R"
                const regex = /\[(.*)/g;
                try {
                    const yx = regex.exec(str)![0].replace(/\[|R"/g, '').split(';');
                    const pos = { y: parseInt(yx[0]), x: parseInt(yx[1]) };
                    process.stdin.setRawMode(false);
                    resolve(pos);
                } catch {
                    resolve({ y: 0, x: 0 });
                }
            }

            process.stdin.once('readable', readfx);
            process.stdout.write(termcodes.cursorGetPosition);
        });
    }

    newData(data: Results[], footer: string = '') {
        this.wipe();
        this.data = data;
        this.footer = footer;
        this.locations.clear();
        this.selected = 0;
        this.start();
    }

    wipe() {
        // clear screen and remove listeners
        this.clearScreen();
        this.stdin.removeAllListeners();
        this.stdout.removeAllListeners();
        this.stdin.setRawMode(false);
        this.showCursor();
    }

    quit() {
        this.clearScreen();
        this.showCursor();
        process.exit(0);
    }
}

