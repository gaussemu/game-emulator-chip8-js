export class Screen {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private container: HTMLElement;
    private pixelSize: number = 10;
    private width: number = 64;
    private height: number = 32;

    constructor(container: HTMLElement) {
        // 创建容器
        this.container = container;
        this.container.style.position = "relative";
        // 创建画布
        this.canvas = document.createElement("canvas");
        this.canvas.width = this.width * this.pixelSize;
        this.canvas.height = this.height * this.pixelSize;
        this.canvas.style.border = "1px solid #333";
        this.canvas.style.backgroundColor = "#000";

        this.ctx = this.canvas.getContext("2d")!;

        // 组装界面
        this.container.appendChild(this.canvas);

        // 确保画布获得焦点以接收键盘事件
        this.canvas.tabIndex = 0;
        this.canvas.focus();
    }

    public render(display: Uint8Array): void {
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

    public dispose(): void {
        // 从DOM中移除
        if (this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}
