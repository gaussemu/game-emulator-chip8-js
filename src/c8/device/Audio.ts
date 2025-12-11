export class Audio {
    private audioContext: AudioContext | null = null;
    private oscillator: OscillatorNode | null = null;

    constructor() {
        // 初始化音频上下文
        if (typeof window !== 'undefined') {
            this.audioContext = new (window.AudioContext ||
                (window as any).webkitAudioContext)();
        }
    }

    /**
     * 播放蜂鸣声
     * @param frequency 频率（Hz），默认 800
     * @param duration 持续时间（毫秒），默认 200
     */
    public playSound(frequency: number = 800, duration: number = 200): void {
        if (!this.audioContext) {
            console.warn('AudioContext is not available');
            return;
        }

        try {
            // 创建振荡器
            this.oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            // 配置振荡器
            this.oscillator.type = 'sine'; // 正弦波，类似蜂鸣声
            this.oscillator.frequency.setValueAtTime(
                frequency,
                this.audioContext.currentTime
            );

            // 配置增益（音量控制）
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(
                0.01,
                this.audioContext.currentTime + duration / 1000
            );

            // 连接节点
            this.oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            // 播放声音
            this.oscillator.start();
            this.oscillator.stop(
                this.audioContext.currentTime + duration / 1000
            );

            // 清理振荡器
            this.oscillator.onended = () => {
                this.oscillator = null;
            };
        } catch (error) {
            console.error('Error playing sound:', error);
        }
    }

    /**
     * 停止当前播放的声音
     */
    public stopSound(): void {
        if (this.oscillator) {
            this.oscillator.stop();
            this.oscillator = null;
        }
    }

    /**
     * 关闭音频上下文以释放资源
     */
    public close(): void {
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
    }
}
