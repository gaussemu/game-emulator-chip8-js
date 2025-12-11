import './style/index.css';
import { Chip } from './chip/Chip';
import { Audio } from './device/Audio';
import { Screen } from './device/Screen';
import { Keyboard } from './device/Keyboard';

export class Emulator {
    private container: HTMLElement;
    private chip8: Chip;
    private audio: Audio;
    private screen: Screen;
    private keyboard: Keyboard;
    private isRunning: boolean = false;

    constructor(container: HTMLElement) {
        this.audio = new Audio();
        
        const $screen = document.createElement('div');

        $screen.classList.add('screen-container')
        this.screen = new Screen($screen);
        
        const $keyboard = document.createElement('div');
        $keyboard.classList.add('keyboard-container');
        this.keyboard = new Keyboard($keyboard);
        this.keyboard.bindToElement(document.documentElement);

        this.container = container;
        const box = document.createElement('div');
        box.appendChild($screen)
        box.appendChild($keyboard);
        box.classList.add('c8-container')
        this.container.appendChild(box);

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

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

}