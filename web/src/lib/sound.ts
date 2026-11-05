import { Howl } from 'howler';

class SoundManager {
  private tickSounds: Record<number, Howl> = {};
  private winnerSound: Howl | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const durations = [3, 5, 9, 10, 15, 20, 25, 30];
      for (const d of durations) {
        this.tickSounds[d] = new Howl({
          src: [`/audio/${d}tick.mp3`],
          preload: true,
          volume: 0.7,
        });
      }

      this.winnerSound = new Howl({
        src: ['/audio/winner.mp3'],
        preload: true,
        volume: 0.9,
      });
    }
  }

  public playTickForDuration(durationSec: number) {
    if (this.isMuted) return;
    this.stopAllTicks();

    // Map to closest audio duration
    const available = [3, 5, 9, 10, 15, 20, 25, 30];
    const closest = available.reduce((prev, curr) =>
      Math.abs(curr - durationSec) < Math.abs(prev - durationSec) ? curr : prev
    );

    if (this.tickSounds[closest]) {
      this.tickSounds[closest].play();
    }
  }

  public playWinnerFanfare() {
    if (this.isMuted) return;
    this.stopAllTicks();
    if (this.winnerSound) {
      this.winnerSound.play();
    }
  }

  public stopAllTicks() {
    for (const sound of Object.values(this.tickSounds)) {
      sound.stop();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }
}

export const soundManager = new SoundManager();
