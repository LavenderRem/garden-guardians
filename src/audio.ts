export class GardenAudio {
  private music: HTMLAudioElement | null = null;
  private pool = new Map<string, HTMLAudioElement[]>();
  private lastPlayed = new Map<string, number>();
  private enabled = false;
  volume = 0.45;
  unlock() { this.enabled = true; }
  setVolume(value: number) {
    this.volume = value;
    if (this.music) this.music.volume = value * 0.3;
    for (const group of this.pool.values()) for (const sound of group) sound.volume = value * 0.65;
  }
  play(name: string) {
    if (!this.enabled || this.volume === 0) return;
    const now = performance.now();
    if (now - (this.lastPlayed.get(name) ?? -1000) < (name === 'shoot' || name === 'hit' ? 100 : 60)) return;
    this.lastPlayed.set(name, now);
    const group = this.pool.get(name) ?? [];
    let sound = group.find(s => s.paused || s.ended);
    if (!sound && group.length < 3) {
      sound = new Audio(`${import.meta.env.BASE_URL}assets/audio/${name}.wav`);
      group.push(sound); this.pool.set(name, group);
    }
    if (!sound) return;
    sound.volume = this.volume * 0.65;
    sound.currentTime = 0;
    void sound.play().catch(() => {});
  }
  startMusic(rush = false) {
    this.stopMusic();
    if (!this.enabled) return;
    this.music = new Audio(`${import.meta.env.BASE_URL}assets/audio/music-${rush ? 'rush' : 'garden'}.wav`);
    this.music.loop = true;
    this.music.volume = this.volume * 0.3;
    void this.music.play().catch(() => {});
  }
  pause() { this.music?.pause(); for (const group of this.pool.values()) for (const sound of group) sound.pause(); }
  resume() { if (this.music && this.enabled) void this.music.play().catch(() => {}); }
  stopMusic() { this.music?.pause(); this.music = null; }
}
