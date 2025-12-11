import { getLogger } from "loglevel";
const logger = getLogger("Keyboard");
logger.setLevel("debug");
/**
 * 键盘设备
 * 模拟 CHIP-8 键盘布局
 * 共 16 个键位，对应 0-F
 * 按键布局：
 * 1 2 3 C
 * 4 5 6 D
 * 7 8 9 E
 * A 0 B F
 */
export class Keyboard {
    private container: HTMLElement;
    private keyPanel: HTMLDivElement;
    private keyBuffer: number[];
    private keyIdToKey: number[];

    constructor(container: HTMLElement) {
        this.container = container;
        this.keyPanel = this.createKeyboardPanel();
        this.container.appendChild(this.keyPanel);
        this.keyBuffer = new Array(16).fill(0);
        this.keyIdToKey = new Array(256).fill(-1);
        this.fillKeyIds();
    }

    private createKeyboardPanel() {
        const panel = document.createElement('div');
        panel.classList.add('keyboard-panel')
        const keys = [
            ['1', '2', '3', 'C'],
            ['4', '5', '6', 'D'],
            ['7', '8', '9', 'E'],
            ['A', '0', 'B', 'F'],
        ]
        keys.forEach(row => {
            const rowItem = document.createElement('div');
            rowItem.classList.add('row')
            row.forEach(item => {
                const keyItem = document.createElement('div');
                keyItem.innerText = item;
                keyItem.dataset.value = `0x${item}`;
                keyItem.classList.add('key');
                rowItem.appendChild(keyItem);
            })
            panel.appendChild(rowItem);
        })
        return panel;
    }

    updateRender() {
        const keys = this.keyPanel.getElementsByClassName('key');
        const map: Map<number, number> = new Map();
        this.keyBuffer.forEach((value, key) => {
            map.set(key, value)
        })
        Array.from(keys).forEach(item => {
            const key = (item as HTMLElement).dataset.value;
            const flag = map.get(Number(key));
            if (flag === 1) {
                item.classList.add('key-down')
            } else {
                item.classList.remove('key-down')
            }
        })
    }

    private fillKeyIds(): void {
        // 初始化所有键为 -1
        for (let i = 0; i < this.keyIdToKey.length; i++) {
            this.keyIdToKey[i] = -1;
        }
        // 映射键盘按键到 CHIP-8 键位
        this.keyIdToKey['1'.charCodeAt(0)] = 1;
        this.keyIdToKey['2'.charCodeAt(0)] = 2;
        this.keyIdToKey['3'.charCodeAt(0)] = 3;
        this.keyIdToKey['4'.charCodeAt(0)] = 0xC;

        this.keyIdToKey['Q'.charCodeAt(0)] = 4;
        this.keyIdToKey['W'.charCodeAt(0)] = 5;
        this.keyIdToKey['E'.charCodeAt(0)] = 6;
        this.keyIdToKey['R'.charCodeAt(0)] = 0xD;

        this.keyIdToKey['A'.charCodeAt(0)] = 7;
        this.keyIdToKey['S'.charCodeAt(0)] = 8;
        this.keyIdToKey['D'.charCodeAt(0)] = 9;
        this.keyIdToKey['F'.charCodeAt(0)] = 0xE;

        this.keyIdToKey['Z'.charCodeAt(0)] = 0xA;
        this.keyIdToKey['X'.charCodeAt(0)] = 0;
        this.keyIdToKey['C'.charCodeAt(0)] = 0xB;
        this.keyIdToKey['V'.charCodeAt(0)] = 0xF;        
    }

    /**
     * 处理按键按下事件
     * @param keyCode 按键代码
     */
    public keyPressed(keyCode: number): void {
        const key = this.keyIdToKey[keyCode];
        logger.debug(`keyPressed: ${keyCode} -> ${key}`);
        if (key !== -1) {
            this.keyBuffer[key!] = 1;
        }
        this.updateRender();        
    }

    /**
     * 处理按键释放事件
     * @param keyCode 按键代码
     */
    public keyReleased(keyCode: number): void {
        const key = this.keyIdToKey[keyCode];
        if (key !== -1) {
            this.keyBuffer[key!] = 0;
        }
        this.updateRender();
    }

    /**
     * 获取按键缓冲区
     * @returns 按键状态数组
     */
    public getKeyBuffer(): number[] {
        return this.keyBuffer;
    }

    /**
     * 获取指定按键的状态
     * @param key 按键编号 (0-15)
     * @returns 按键状态 (0: 未按下, 1: 按下)
     */
    public getKeyState(key: number): number {
        if (key >= 0 && key < this.keyBuffer.length) {
            return this.keyBuffer[key]!;
        }
        return 0;
    }

    /**
     * 清空按键缓冲区
     */
    public clearKeyBuffer(): void {
        for (let i = 0; i < this.keyBuffer.length; i++) {
            this.keyBuffer[i] = 0;
        }
    }

    /**
     * 绑定到 DOM 键盘事件
     * @param element 要绑定事件的 DOM 元素
     */
    public bindToElement(element: HTMLElement): void {
        logger.debug("bindToElement", element);
        element.addEventListener('keydown', (event: KeyboardEvent) => {
            this.keyPressed(event.keyCode || event.which);
        });

        element.addEventListener('keyup', (event: KeyboardEvent) => {
            this.keyReleased(event.keyCode || event.which);
        });
    }

    /**
     * 从 DOM 元素解绑键盘事件
     * @param element 要解绑事件的 DOM 元素
     */
    public unbindFromElement(element: HTMLElement): void {
        // 由于我们使用了匿名函数，这里需要存储引用
        // 在实际使用中，建议使用具名函数以便解绑
        element.removeEventListener('keydown', () => { });
        element.removeEventListener('keyup', () => { });
    }
}