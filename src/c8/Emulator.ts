// 假设这些是已存在的 TypeScript 模块
import { Chip } from './chip/Chip';
import { Audio } from './device/Audio';
import { Screen } from './device/Screen';
import { Keyboard } from './device/Keyboard';

export class Emulator {
    private chip8: Chip;
    private screen: Screen;
    private keyboard: Keyboard;
    private isRunning: boolean = false;

    constructor(container: HTMLElement) {
        this.chip8 = new Chip(new Audio());
        this.screen = new Screen(container);
        this.keyboard = new Keyboard();
        this.keyboard.bindToElement(document.documentElement);
        this.chip8.loadProgram("./programs/pong2.c8");
    }

    public async run(): Promise<void> {
        this.isRunning = true;
        while (this.isRunning) {
            this.chip8.setKeyBuffer(this.keyboard.getKeyBuffer());
            this.chip8.run();
            if (this.chip8.isNeedRedraw()) {
                this.screen.render(this.chip8.getFrameBuffer());
                this.chip8.removeDrawFlag();
            }
            await this.sleep(8);
        }
    }

    public stop(): void {
        this.isRunning = false;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public static launch(container: HTMLElement): void {
        const emulator = new Emulator(container);
        emulator.run().catch(console.error);
    }
}