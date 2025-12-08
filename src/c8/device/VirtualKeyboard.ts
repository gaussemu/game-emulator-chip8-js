import type { Keyboard } from "./Keyboard";

export class VirtualKeyboard {
    private keyboard: Keyboard;
    private container: HTMLElement;
    private keyboardElement: HTMLElement;
    constructor(keyboard: Keyboard, container: HTMLElement) {
        this.keyboard = keyboard;
        this.container = container;
        this.keyboardElement = this.createVirtualKeyboard();
        container.appendChild(this.keyboardElement);
        this.bindEventListeners();
    }
    
    createVirtualKeyboard(): HTMLElement {
        const keyboardElement = document.createElement("div");
        keyboardElement.classList.add("virtual-keyboard");
        // 按键布局
        const keyLayout = [
            ["1", "2", "3", "C"],
            ["4", "5", "6", "D"],
            ["7", "8", "9", "E"],
            ["A", "0", "B", "F"],
        ];
        // 创建按键元素
        for (const row of keyLayout) {
            for (const key of row) {
                const keyElement = document.createElement("div");
                keyElement.classList.add("virtual-key");
                keyElement.textContent = key;
                keyboardElement.appendChild(keyElement);
            }
        }
        return keyboardElement;
    }

    bindEventListeners(): void {
        this.container.addEventListener("click", (event) => {
            const target = event.target as HTMLElement;
            if (target.classList.contains("virtual-key")) {
                const key = target.textContent!;
                this.keyboard.keyPressed(key.charCodeAt(0));
                target.classList.add("pressed");
                setTimeout(() => {
                    target.classList.remove("pressed");
                }, 100);
            }
        });
    }

    destroy(): void {
        this.container.removeChild(this.keyboardElement);
    }
}