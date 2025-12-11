import type { Audio } from "../device/Audio";
import { ChipData } from "./ChipData";
import { getLogger } from "loglevel";

const logger = getLogger("Chip");
logger.setLevel("warn");

export class Chip {
	// 内存 4 KB 4096 2 的 12 次方
	private memory: Uint8Array;
	// 数据寄存器 16 个 8 bit
	private V: Uint8Array;
	// 地址寄存器 12 位 用于指向内存地址（基址）
	private I: number;
	// 程序指针寄存器
	private pc: number;

	// 堆栈
	private stack: Uint16Array;
	// 栈顶指针
	private stackPointer: number;

	// 定时器
	private delay_timer: number;
	private sound_timer: number;

	// 键盘输入
	private keys: Uint8Array;
	// 显示输出
	private display: Uint8Array;

	private needRedraw: boolean;

	private audio: Audio | null = null;

	constructor() {
		this.memory = new Uint8Array(4096);
		this.V = new Uint8Array(16);
		this.I = 0x0;
		this.pc = 0x200;

		this.stack = new Uint16Array(16);
		this.stackPointer = 0;

		this.delay_timer = 0;
		this.sound_timer = 0;

		this.keys = new Uint8Array(16);

		this.display = new Uint8Array(64 * 32);

		this.needRedraw = false;

		this.loadFontset();
	}

	linkAudio(audio: Audio) {
		this.audio = audio;
	}

	public run(): void {
		// fetch opcode 16 bit
		const high = this.memory[this.pc];
		const low = this.memory[this.pc + 1];
		if (high === undefined || low === undefined) {
			throw new Error(`Memory read out of bounds at PC=${this.pc.toString(16).toUpperCase()}`);
		}
		const opcode = (high << 8) | low;
		// decode opcode
		logger.info(opcode.toString(16).toUpperCase() + ": ");

		switch (opcode & 0xF000) { // get head 1 type
			// 0NNN
			case 0x0000: {
				switch (opcode & 0x0FFF) {
					// 00E0 清除屏幕
					case 0x00E0: {
						for (let i = 0; i < this.display.length; i++) {
							this.display[i] = 0;
						}
						this.needRedraw = true;
						this.pc += 2;
						logger.info("00E0 Clears the screen");
						break;
					}
					// 00EE 从子例程返回
					case 0x00EE: {
						this.stackPointer--;
						const addr = this.stack[this.stackPointer];
						if (addr === undefined) {
							throw new Error("Stack underflow: no return address");
						}
						this.pc = addr + 2;
						logger.info("00EE Returning to " + this.pc.toString(16).toUpperCase());
						break;
					}
					// 0NNN 在地址 NNN 处调用机器代码例程
					default: {
						console.error("0NNN Unsupported Opcode!");
					}
				}
				break;
			}
			// 1NNN 跳转到地址 NNN
			case 0x1000: {
				const nnn = (opcode & 0x0FFF);
				this.pc = nnn;
				logger.info("1NNN Jumps to address " + this.pc.toString(16).toUpperCase());
				break;
			}
			// 2NNN 在 NNN 处调用子例程。
			case 0x2000: {
				this.stack[this.stackPointer] = this.pc;
				this.stackPointer += 1;
				this.pc = (opcode & 0x0FFF);
				logger.info("2NNN Calls subroutine at " + this.pc.toString(16).toUpperCase());
				break;
			}
			// 3XNN 如果 VX 等于 NN，则跳过下一条指令
			case 0x3000: {
				const x = (opcode & 0x0F00) >> 8;
				const nn = (opcode & 0x00FF);
				if (this.V[x] === nn) {
					this.pc += 4;
					logger.info("3XNN Skipping next instruction if (V[" + x + "] == " + nn + ")");
				} else {
					this.pc += 2;
					logger.info("3XNN Not skipping next instruction if (V[" + x + "] != " + nn + ")");
				}
				break;
			}
			// 4XNN 如果 VX 不等于 NN，则跳过下一条指令
			case 0x4000: {
				const x = (opcode & 0x0F00) >> 8;
				const nn = (opcode & 0x00FF);
				if (this.V[x] !== nn) {
					this.pc += 4;
					logger.info("4XNN Skipping next instruction if (V[" + x + "] != " + nn + ")");
				} else {
					this.pc += 2;
					logger.info("4XNN Not Skipping next instruction if (V[" + x + "] == " + nn + ")");
				}
				break;
			}
			// 5XY0 如果 VX 等于 VY，则跳过下一条指令
			case 0x5000: {
				const x = (opcode & 0x0F00) >> 8;
				const y = (opcode & 0x00F0) >> 4;
				if (this.V[x] === this.V[y]) {
					this.pc += 4;
					logger.info("5XY0 Skipping next instruction (V[" + x + "] == V[" + y + "])");
				} else {
					this.pc += 2;
				}
				break;
			}
			// 6XNN 将 VX 设置为 NN
			case 0x6000: {
				const x = (opcode & 0x0F00) >> 8;
				const nn = (opcode & 0x00FF);
				this.V[x] = nn;
				this.pc += 2;
				logger.info("6XNN Sets V[" + x + "] to NN = " + nn);
				break;
			}
			// 7XNN 将 NN 添加到 VX
			case 0x7000: {
				const x = (opcode & 0x0F00) >> 8;
				const nn = (opcode & 0x00FF);
				this.V[x] = ((this.V[x] ?? 0) + nn) & 0xFF;
				this.pc += 2;
				logger.info("7XNN Adding " + nn + " to V[" + x + "] = " + this.V[x]);
				break;
			}
			// 8XYN
			case 0x8000: {
				switch (opcode & 0x000F) {
					// 8XY0 将 VX 设置为 VY 的值
					case 0x0000: {
						const x = (opcode & 0x0F00) >> 8;
						const y = (opcode & 0x00F0) >> 4;
						if (this.V[y] === undefined) throw new Error("V[y] is undefined");
						this.V[x] = this.V[y];
						this.pc += 2;
						logger.info("8XY0 Set V[" + x + "] to the value of V[" + y + "] = " + this.V[x]);
						break;
					}
					// 8XY1 将 VX 设置为 VX 位或 VY
					case 0x0001: {
						const x = (opcode & 0x0F00) >> 8;
						const y = (opcode & 0x00F0) >> 4;
						if (this.V[y] === undefined) throw new Error("V[y] is undefined");
						if (this.V[x] === undefined || this.V[y] === undefined) throw new Error("V[x] or V[y] is undefined");
						this.V[x] = this.V[x] | this.V[y];
						this.pc += 2;
						logger.info("8XY1 Set V[" + x + "] to V[" + x + "] | V[" + y + "]= " + this.V[x]);
						break;
					}
					// 8XY2 将 VX 设置为 VX 位与 VY
					case 0x0002: {
						const x = (opcode & 0x0F00) >> 8;
						const y = (opcode & 0x00F0) >> 4;
						if (this.V[y] === undefined) throw new Error("V[y] is undefined");
						if (this.V[x] === undefined || this.V[y] === undefined) throw new Error("V[x] or V[y] is undefined");
						this.V[x] = this.V[x] & this.V[y];
						this.pc += 2;
						logger.info("8XY2 Set V[" + x + "] to V[" + x + "] & V[" + y + "]= " + this.V[x]);
						break;
					}
					// 8XY3 将 VX 设置为 VX 位异或 VY
					case 0x0003: {
						const x = (opcode & 0x0F00) >> 8;
						const y = (opcode & 0x00F0) >> 4;
						if (this.V[y] === undefined) throw new Error("V[y] is undefined");
						if (this.V[x] === undefined || this.V[y] === undefined) throw new Error("V[x] or V[y] is undefined");
						this.V[x] = this.V[x] ^ this.V[y];
						this.pc += 2;
						logger.info("8XY3 Set V[" + x + "] to V[" + x + "] ^ V[" + y + "]= " + this.V[x]);
						break;
					}
					// 8XY4 将 VY 添加到 VX 中
					case 0x0004: {
						const x = (opcode & 0x0F00) >> 8;
						const y = (opcode & 0x00F0) >> 4;
						if (this.V[y] === undefined) throw new Error("V[y] is undefined");
						if (this.V[x] === undefined || this.V[y] === undefined) throw new Error("V[x] or V[y] is undefined");
						if (this.V[y] > 0xFF - this.V[x]) {
							this.V[0xF] = 1;
							logger.info("8XY4 Carry!");
						} else {
							this.V[0xF] = 0;
							logger.info("8XY4 No Carry");
						}
						this.V[x] = (this.V[x] + this.V[y]) & 0xFF;
						this.pc += 2;
						logger.info("8XY4 Set V[" + x + "] to V[" + x + "] + V[" + y + "]= " + this.V[x]);
						break;
					}
					// 8XY5 从 VX 中减去 VY
					case 0x0005: {
						const x = (opcode & 0x0F00) >> 8;
						const y = (opcode & 0x00F0) >> 4;
						if (this.V[y] === undefined) throw new Error("V[y] is undefined");
						if (this.V[x] === undefined || this.V[y] === undefined) throw new Error("V[x] or V[y] is undefined");
						if (this.V[x] > this.V[y]) {
							this.V[0xF] = 1;
							logger.info("8XY5 No Borrow");
						} else {
							this.V[0xF] = 0;
							logger.info("8XY5 Borrow");
						}
						this.V[x] = (this.V[x] - this.V[y]) & 0xFF;
						this.pc += 2;
						logger.info("8XY5 Set V[" + x + "] to V[" + x + "] - V[" + y + "]= " + this.V[x]);
						break;
					}
					// 8XY6 将 VX 向右移动 1
					case 0x0006: {
						const x = (opcode & 0x0F00) >> 8;
						if (this.V[x] === undefined) throw new Error("V[x] is undefined");
						this.V[0xF] = this.V[x] & 0x1;
						this.V[x] = this.V[x] >> 1;
						this.pc += 2;
						logger.info("8XY6 Shifts V[" + x + "] to the right by 1");
						break;
					}
					// 8XY7 将 VX 设置为 VY 减去 VX
					case 0x0007: {
						const x = (opcode & 0x0F00) >> 8;
						const y = (opcode & 0x00F0) >> 4;
						if (this.V[y] === undefined) throw new Error("V[y] is undefined");
						if (this.V[x] === undefined || this.V[y] === undefined) throw new Error("V[x] or V[y] is undefined");
						if (this.V[y] > this.V[x]) {
							this.V[0xF] = 1;
						} else {
							this.V[0xF] = 0;
						}
						this.V[x] = this.V[y] - this.V[x];
						this.pc += 2;
						logger.info("8XY7 Sets V[" + x + "] to V[" + y + "] - V[" + x + "] = " + this.V[x]);
						break;
					}
					// 8XYE TODO
					default:
						throw new Error("Unsupported Opcode! 0x8000");
						break;
				}
				break;
			}
			// 9NNN
			case 0x9000: {
				switch (opcode & 0x000F) {
					// 9XY0 如果 VX 不等于 VY，则跳过下一条指令
					case 0x0000: {
						const x = (opcode & 0x0F00) >> 8;
						const y = (opcode & 0x00F0) >> 4;
						if (this.V[x] !== this.V[y]) {
							this.pc += 4;
						} else {
							this.pc += 2;
						}
						logger.info("9XY0 Skips the next instruction if VX does not equal VY.");
						break;
					}
					default: {
						throw new Error("Unsupported Opcode! 0x9000");
						break;
					}
				}
				break;
			}
			// ANNN 将 I 设置为地址 NNN
			case 0xA000: {
				this.I = (opcode & 0x0FFF);
				this.pc += 2;
				logger.info("ANNN Set I to " + this.I.toString(16).toUpperCase());
				break;
			}
			// BNNN 跳转到地址 NNN 加 V0
			case 0xB000: {
				this.stack[this.stackPointer] = this.pc;
				this.stackPointer += 1;
				const nnn = (opcode & 0x0FFF);
				if (this.V[0] === undefined) {
					throw new Error("V[0] is undefined");
				}
				this.pc = (this.V[0] + nnn) & 0xFFF;
				console.error("BNNN Jumps to the address NNN plus V[0] = " + this.pc);
				break;
			}
			// CXNN 将 VX 设置为随机数和 NN 的按位运算的结果
			case 0xC000: {
				const x = (opcode & 0x0F00) >> 8;
				const nn = (opcode & 0x00FF);
				const randomNumber = Math.floor(Math.random() * 256) & nn;
				this.V[x] = randomNumber;
				this.pc += 2;
				logger.info("CXNN Sets V[" + x + "] to the result of a bitwise and operation on a random number");
				break;
			}
			// DXYN 在坐标 (VX, VY) 处绘制一个 sprite
			case 0xD000: {
				const xd = (opcode & 0x0F00) >> 8;
				const vxd = this.V[xd];
				const yd = (opcode & 0x00F0) >> 4;
				const vyd = this.V[yd];
				const height = (opcode & 0x000F);
				this.V[0xF] = 0;
				for (let _y = 0; _y < height; _y++) {
					const line = this.memory[this.I + _y];
					for (let _x = 0; _x < 8; _x++) {
						if (line === undefined) throw new Error("line is undefined");
						const pixel = line & (0x80 >> _x);
						if (pixel !== 0) {
							if (vxd === undefined) throw new Error("vxd is undefined");
							let totalX = (vxd ?? 0) + _x;
							let totalY = (vyd ?? 0) + _y;
							totalX = totalX % 64;
							totalY = totalY % 32;
							const index = totalY * 64 + totalX;
							if (this.display[index] === 1) {
								this.V[0xF] = 1;
							}
							if (this.display[index] !== undefined) {
								this.display[index] ^= 1;
							}
						}
					}
				}
				this.pc += 2;
				this.needRedraw = true;
				logger.info("DXYN Draws a sprite at coordinate (" + vxd + "," + vyd + ")");
				break;
			}
			// ENNN 处理键盘操作
			case 0xE000: {
				switch (opcode & 0x00FF) {
					// EX9E 如果按下 VX 中存储的键，则跳过下一条指令
					case 0x009E: {
						const x = (opcode & 0x0F00) >> 8;
						const key = this.V[x] ?? 0;
						if (this.keys[key] === 1) {
							this.pc += 4;
							logger.info("ENNN Skips the next instruction if the key stored in V[" + x + "] is pressed");
						} else {
							this.pc += 2;
						}
						break;
					}
					// EXA1 如果未按下存储在 VX 中的键，则跳过下一条指令
					case 0x00A1: {
						const x = (opcode & 0x0F00) >> 8;
						const key = this.V[x] ?? 0;
						if (this.keys[key] === 0) {
							this.pc += 4;
							logger.info("EXA1 Skips the next instruction if the key stored in V[" + x + "] is not pressed");
						} else {
							this.pc += 2;
						}
						break;
					}
					default:
						throw new Error("Unexisting Opcode!");
						break;
				}
				break;
			}
			// FNNN
			case 0xF000: {
				switch (opcode & 0x00FF) {
					// FX07 将 VX 设置为延迟计时器的值
					case 0x0007: {
						const x = (opcode & 0x0F00) >> 8;
						this.V[x] = this.delay_timer & 0xFF;
						this.pc += 2;
						logger.info("FX07 Sets V[" + x + "] " + this.V[x] + " to the value of the delay timer.");
						break;
					}
					// FX0A 等待按键，然后存储在 VX 中
					case 0x000A: {
						const x = (opcode & 0x0F00) >> 8;
						for (let i = 0; i < this.keys.length; i++) {
							if (this.keys[i] === 1) {
								this.V[x] = i;
								this.pc += 2;
								break;
							}
						}
						logger.info("FX0A Awaiting a key pressed store to V[" + x + "]");
						break;
					}
					// FX15 将延迟计时器设置为 VX
					case 0x0015: {
						const x = (opcode & 0x0F00) >> 8;
						this.delay_timer = (this.V[x] ?? 0) & 0xFF;
						this.pc += 2;
						logger.info("FX15 Sets the delay timer to V[" + x + "] = " + this.V[x]);
						break;
					}
					// FX18 将声音计时器设置为 VX
					case 0x0018: {
						const x = (opcode & 0x0F00) >> 8;
						this.sound_timer = 1; // 调整为只发一次声音
						this.pc += 2;
						logger.info("FX18 Sets the sound timer to VX." + this.V[x]);
						break;
					}
					// FX29 将 I 设置为字符在 VX 中的 sprite 位置
					case 0x0029: {
						const x = (opcode & 0x0F00) >> 8;
						const character = this.V[x];
						this.I = 0x050 + ((character ?? 0) * 5);
						this.pc += 2;
						logger.info("FX29 Setting I to Character V[" + x + "] = " + this.V[x] + " Offset to 0x" + this.I.toString(16).toUpperCase());
						break;
					}
					// FX1E 将 VX 加到 I
					case 0x001E: {
						const x = (opcode & 0x0F00) >> 8;
						this.I = this.I + this.V[x]!;
						this.pc += 2;
						break;
					}
					// FX33 存储 VX 的二进制编码十进制表示形式
					case 0x0033: {
						const x = (opcode & 0x0F00) >> 8;
						const value = this.V[x];
						const hundreds = Math.floor((value ?? 0) / 100);
						const tens = Math.floor(((value ?? 0) % 100) / 10);
						const ones = (value ?? 0) % 10;
						this.memory[this.I] = hundreds;
						this.memory[this.I + 1] = tens;
						this.memory[this.I + 2] = ones;
						this.pc += 2;
						logger.info("FX33 Stores the binary-coded decimal representation of V[" + x + "]: " + hundreds + tens + ones);
						break;
					}
					// FX55 将 V0 到 VX 存储在内存中
					case 0x0055: {
						const x = (opcode & 0x0F00) >> 8;
						for (let i = 0; i <= x; i++) {
							this.memory[this.I + i] = this.V[i]!;
						}
						this.pc += 2;
						logger.info("FX55 Stores from V0 to VX (including VX) in memory, starting at address I.");
						break;
					}
					// FX65 使用内存中的值从 V0 填充到 VX
					case 0x0065: {
						const x = (opcode & 0x0F00) >> 8;
						for (let i = 0; i <= x; i++) {
							this.V[i] = this.memory[this.I + i]!;
						}
						this.I = this.I + x + 1;
						this.pc += 2;
						logger.info("FX65 Fills from V[0] to V[" + x + "] with values from memory[0x" + (this.I & 0xFF).toString(16).toUpperCase() + "]");
						break;
					}
					default: {
						throw new Error("Unsupported Opcode!");
						break;
					}
				}
				break;
			}
			default: {
				throw new Error("Unsupported Opcode!");
				break;
			}
		}

		if (this.sound_timer > 0) {
			this.sound_timer--;
			this.audio?.playSound();
		}
		if (this.delay_timer > 0) {
			this.delay_timer--;
		}
	}

	public getFrameBuffer(): Uint8Array {
		return this.display;
	}

	public isNeedRedraw(): boolean {
		return this.needRedraw;
	}

	public removeDrawFlag(): void {
		this.needRedraw = false;
	}

	public async loadProgram(file: string): Promise<void> {
		try {
			// 在浏览器环境中，可以使用 fetch API
			// 在 Node.js 环境中，可以使用 fs 模块
			const response = await fetch(file);
			const buffer = await response.arrayBuffer();
			const data = new Uint8Array(buffer);

			for (let i = 0; i < data.length; i++) {
				this.memory[0x200 + i] = data[i]!;
			}
		} catch (error) {
			console.error("Error loading program:", error);
			throw error;
		}
	}

	public loadFontset(): void {
		for (let i = 0; i < ChipData.fontset.length; i++) {
			this.memory[0x50 + i] = ChipData.fontset[i]!;
		}
	}

	public setKeyBuffer(keyBuffer: number[]): void {
		for (let i = 0; i < this.keys.length; i++) {
			this.keys[i] = keyBuffer[i]!;
		}
	}

	// 添加一个方法来设置单个按键状态
	public setKey(key: number, pressed: boolean): void {
		if (key >= 0 && key < 16) {
			this.keys[key] = pressed ? 1 : 0;
		}
	}

	// 添加一个方法来获取当前 PC 值（用于调试）
	public getPC(): number {
		return this.pc;
	}

	// 添加一个方法来获取寄存器值（用于调试）
	public getRegisters(): Uint8Array {
		return this.V;
	}

	// 添加一个方法来获取 I 寄存器值（用于调试）
	public getI(): number {
		return this.I;
	}
}