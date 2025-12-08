// device/Screen.ts
import { Chip } from "../chip/Chip";
import { Keyboard } from "./Keyboard";

export class Screen {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private container: HTMLElement;
    private keyboard: Keyboard;
    private chip: Chip;
    private pixelSize: number = 10;
    private width: number = 64;
    private height: number = 32;

    constructor(chip: Chip, container: HTMLElement) {
        this.chip = chip;
        this.keyboard = new Keyboard();

        // 创建容器
        this.container = container;
        this.container.style.position = "relative";

        // 创建标题
        const title = document.createElement("h2");
        title.textContent = "Chip 8 Emulator";
        title.style.textAlign = "center";
        title.style.margin = "0";
        title.style.padding = "10px";
        title.style.backgroundColor = "#333";
        title.style.color = "white";

        // 创建画布
        this.canvas = document.createElement("canvas");
        this.canvas.width = this.width * this.pixelSize;
        this.canvas.height = this.height * this.pixelSize;
        this.canvas.style.border = "1px solid #333";
        this.canvas.style.backgroundColor = "#000";

        this.ctx = this.canvas.getContext("2d")!;

        // 组装界面
        this.container.appendChild(title);
        this.container.appendChild(this.canvas);

        // 确保画布获得焦点以接收键盘事件
        this.canvas.tabIndex = 0;
        this.canvas.focus();
    }

    public getKeyboard(): Keyboard {
        return this.keyboard;
    }

    public getKeyBuffer(): number[] {
        return this.keyboard.getKeyBuffer();
    }

    public render(): void {
        const display = this.chip.getDisplay();

        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制像素
        for (let i = 0; i < display.length; i++) {
            if (display[i] === 0) {
                this.ctx.fillStyle = "#000000"; // 黑色
            } else {
                this.ctx.fillStyle = "#FFFFFF"; // 白色
            }

            const x = (i % this.width) * this.pixelSize;
            const y = Math.floor(i / this.width) * this.pixelSize;

            this.ctx.fillRect(x, y, this.pixelSize, this.pixelSize);
        }
    }

    public update(): void {
        this.render();
    }

    public setTitle(title: string): void {
        const titleElement = this.container.querySelector("h2");
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    public dispose(): void {
        // 从DOM中移除
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
