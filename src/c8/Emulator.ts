import { Chip } from './chip/Chip';
import { Audio } from './device/Audio';
import { Keyboard } from './device/Keyboard';
import { Screen } from './device/Screen';
import './style/index.css';

function toHex(num: number = 0) {
    return num.toString(16).padStart(2, '0').toUpperCase();
}

class DebugUI {
    public container: HTMLElement = document.createElement('div');
    public $fps: HTMLElement = document.createElement('div');
    public $reg: HTMLElement = document.createElement('div');
    public $pc: HTMLElement = document.createElement('div');
    public frames: number[] = [];
    private chip8: Chip;
    
    constructor(chip8: Chip) {
        this.chip8 = chip8;
        this.$fps.classList.add('fps');
        this.$reg.classList.add('reg');
        this.$pc.classList.add('pc');
        this.container.classList.add('debug-container');
        this.container.appendChild(this.$fps);
        this.container.appendChild(this.$reg);
        this.container.appendChild(this.$pc);
        this.update();
    }
    
    record() {
        this.frames.push(Date.now());
        if (this.frames.length > 100) {
            this.frames.shift();
        }
        const firstFrame = this.frames[0];
        const lastFrame = this.frames[this.frames.length - 1];
        const fps = this.frames.length / (lastFrame - firstFrame) * 1000;
        this.$fps.innerText = `FPS: ${fps.toFixed(0)}`;
    }

    updateRegister() {
        const register = this.chip8.getRegisters();
        const text = Array.from(register).map(item => toHex(item)).join(' ');       
        this.$reg.innerText = `REG: ${text}`;
    }

    updatePC() {
        const high = toHex(this.chip8.getPC() >> 8);
        const low = toHex(this.chip8.getPC() & 0xFF);
        this.$pc.innerText = `PC : ${high} ${low}`;
    }

    update() {
        this.record();
        this.updateRegister();
        this.updatePC();
    }
}

export class Emulator {
    private container: HTMLElement;
    private debugUI: DebugUI;
    private chip8: Chip;
    private audio: Audio;
    private screen: Screen;
    private keyboard: Keyboard;
    private isRunning: boolean = false;

    constructor(container: HTMLElement) {
        // UI     
        const $head = document.createElement('div');
        $head.classList.add('c8-head');
        const $body = document.createElement('div');
        $body.classList.add('c8-body');
        const $screen = document.createElement('div');
        $screen.classList.add('screen-container')
        const $keyboard = document.createElement('div');
        $keyboard.classList.add('keyboard-container');
        $body.appendChild($screen)
        $body.appendChild($keyboard);
        
        this.container = document.createElement('div');
        this.container.classList.add('c8-container');
        this.container.appendChild($head);
        this.container.appendChild($body);
        container.appendChild(this.container);
        
        // Device
        this.keyboard = new Keyboard($keyboard);
        this.keyboard.bindToElement(document.documentElement);
        this.screen = new Screen($screen);
        this.audio = new Audio();
        this.chip8 = new Chip();
        this.chip8.linkAudio(this.audio)
        this.chip8.loadProgram("./programs/pong2.c8");

        // Debug
        this.debugUI = new DebugUI(this.chip8);
        $head.appendChild(this.debugUI.container);
    }

    public async run(): Promise<void> {
        this.isRunning = true;
        while (this.isRunning) {
            this.chip8.setKeyBuffer(this.keyboard.getKeyBuffer());
            this.chip8.run();
            if (this.chip8.isNeedRedraw()) {
                this.screen.render(this.chip8.getFrameBuffer());
                this.chip8.removeDrawFlag();
                this.debugUI.update();
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