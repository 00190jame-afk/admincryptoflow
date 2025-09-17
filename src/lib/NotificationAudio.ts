class NotificationAudio {
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private isEnabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    this.initAudio();
  }

  private async initAudio() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      await this.loadAudioBuffer();
    } catch (error) {
      console.warn('Audio initialization failed:', error);
    }
  }

  private async loadAudioBuffer() {
    try {
      const response = await fetch('/notification.wav');
      const arrayBuffer = await response.arrayBuffer();
      this.audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.warn('Failed to load notification sound:', error);
    }
  }

  public async play() {
    if (!this.isEnabled || !this.audioContext || !this.audioBuffer) {
      return;
    }

    try {
      // Resume audio context if suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = this.audioBuffer;
      gainNode.gain.value = this.volume;
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      source.start(0);
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    localStorage.setItem('notifications-enabled', enabled.toString());
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('notifications-volume', this.volume.toString());
  }

  public getEnabled(): boolean {
    const stored = localStorage.getItem('notifications-enabled');
    return stored !== null ? stored === 'true' : this.isEnabled;
  }

  public getVolume(): number {
    const stored = localStorage.getItem('notifications-volume');
    return stored !== null ? parseFloat(stored) : this.volume;
  }
}

export const notificationAudio = new NotificationAudio();