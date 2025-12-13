import { Chip } from './chip/Chip';
import { Audio } from './device/Audio';
import { Keyboard } from './device/Keyboard';
import { Screen } from './device/Screen';
import './style/index.css';

export class Emulator {
    private container: HTMLElement;
    private chip8: Chip;
    private audio: Audio;
    private screen: Screen;
    private keyboard: Keyboard;
    private isRunning: boolean = false;

    constructor(container: HTMLElement) {
        // UI
        const $screen = document.createElement('div');
        $screen.classList.add('screen-container')
        const $keyboard = document.createElement('div');
        $keyboard.classList.add('keyboard-container');
        const $box = document.createElement('div');
        $box.appendChild($screen)
        $box.appendChild($keyboard);
        $box.classList.add('c8-container');
        this.container = container;
        this.container.appendChild($box);
        // Device
        this.keyboard = new Keyboard($keyboard);
        this.keyboard.bindToElement(document.documentElement);
        this.screen = new Screen($screen);
        this.audio = new Audio();
        this.chip8 = new Chip();
        this.chip8.linkAudio(this.audio)
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

    public dispose(): void {
        this.stop();
        this.screen.dispose();
        this.keyboard.unbindFromElement(document.documentElement);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}