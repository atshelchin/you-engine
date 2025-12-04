/**
 * Audio Component - 音频系统组件
 *
 * 支持音效、背景音乐、3D 音频、音频池等
 */

import { Component } from '../core/Component';
import { Signal } from '../core/Signal';

// ==================== 音频管理器 (单例) ====================

interface AudioAsset {
  buffer: AudioBuffer;
  volume: number;
  loop: boolean;
}

class AudioManagerClass {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private assets: Map<string, AudioAsset> = new Map();
  private activeSounds: Set<AudioBufferSourceNode> = new Set();

  masterVolume = 1.0;
  musicVolume = 0.7;
  sfxVolume = 1.0;

  signals = {
    loaded: new Signal<string>(),
    played: new Signal<string>(),
    stopped: new Signal<string>(),
  };

  constructor() {
    if (typeof window === 'undefined') return;

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.context = new AudioContextClass();

      // 创建主增益节点
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);

      // 音乐通道
      this.musicGain = this.context.createGain();
      this.musicGain.connect(this.masterGain);
      this.musicGain.gain.value = this.musicVolume;

      // 音效通道
      this.sfxGain = this.context.createGain();
      this.sfxGain.connect(this.masterGain);
      this.sfxGain.gain.value = this.sfxVolume;
    } catch (err) {
      console.warn('Web Audio API not supported:', err);
    }
  }

  // ==================== 资源加载 ====================

  /**
   * 加载音频文件
   */
  async load(
    name: string,
    url: string,
    options: { loop?: boolean; volume?: number } = {}
  ): Promise<void> {
    if (!this.context) {
      console.warn('AudioContext not available');
      return;
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);

      this.assets.set(name, {
        buffer: audioBuffer,
        volume: options.volume ?? 1.0,
        loop: options.loop ?? false,
      });

      console.log(`✓ Loaded audio: ${name}`);
      this.signals.loaded.emit(name);
    } catch (err) {
      console.error(`✗ Failed to load audio: ${name}`, err);
    }
  }

  /**
   * 批量加载音频
   */
  async loadAll(
    assets: Record<string, { url: string; loop?: boolean; volume?: number }>
  ): Promise<void> {
    const promises = Object.entries(assets).map(([name, config]) =>
      this.load(name, config.url, config)
    );

    await Promise.all(promises);
  }

  // ==================== 播放控制 ====================

  /**
   * 播放音效
   */
  playSound(
    name: string,
    options: {
      volume?: number;
      loop?: boolean;
      detune?: number; // 音调偏移 (cents)
      playbackRate?: number; // 播放速度
    } = {}
  ): AudioBufferSourceNode | null {
    const asset = this.assets.get(name);
    if (!asset || !this.context || !this.sfxGain) {
      console.warn(`Audio asset not found: ${name}`);
      return null;
    }

    const source = this.context.createBufferSource();
    source.buffer = asset.buffer;
    source.loop = options.loop ?? asset.loop;

    if (options.playbackRate) {
      source.playbackRate.value = options.playbackRate;
    }

    if (options.detune) {
      source.detune.value = options.detune;
    }

    // 音量控制
    const gainNode = this.context.createGain();
    gainNode.gain.value = (options.volume ?? asset.volume) * this.sfxVolume;
    source.connect(gainNode);
    gainNode.connect(this.sfxGain);

    source.start(0);
    this.activeSounds.add(source);

    source.onended = () => {
      this.activeSounds.delete(source);
    };

    this.signals.played.emit(name);
    return source;
  }

  /**
   * 播放背景音乐
   */
  playMusic(
    name: string,
    options: { volume?: number; fadeIn?: number } = {}
  ): AudioBufferSourceNode | null {
    const asset = this.assets.get(name);
    if (!asset || !this.context || !this.musicGain) {
      console.warn(`Music asset not found: ${name}`);
      return null;
    }

    // 停止当前音乐
    this.stopMusic();

    const source = this.context.createBufferSource();
    source.buffer = asset.buffer;
    source.loop = true;

    const gainNode = this.context.createGain();

    // 淡入效果
    if (options.fadeIn && options.fadeIn > 0) {
      gainNode.gain.value = 0;
      gainNode.gain.linearRampToValueAtTime(
        options.volume ?? asset.volume,
        this.context.currentTime + options.fadeIn
      );
    } else {
      gainNode.gain.value = options.volume ?? asset.volume;
    }

    source.connect(gainNode);
    gainNode.connect(this.musicGain);

    source.start(0);
    this.activeSounds.add(source);

    source.onended = () => {
      this.activeSounds.delete(source);
    };

    this.signals.played.emit(name);
    return source;
  }

  /**
   * 停止所有音乐
   */
  stopMusic(fadeOut?: number): void {
    if (fadeOut && fadeOut > 0 && this.context && this.musicGain) {
      this.musicGain.gain.linearRampToValueAtTime(0, this.context.currentTime + fadeOut);

      setTimeout(() => {
        this.activeSounds.forEach((source) => {
          try {
            source.stop();
          } catch (_e) {
            // Already stopped
          }
        });
        this.activeSounds.clear();

        if (this.musicGain) {
          this.musicGain.gain.value = this.musicVolume;
        }
      }, fadeOut * 1000);
    } else {
      this.activeSounds.forEach((source) => {
        try {
          source.stop();
        } catch (_e) {
          // Already stopped
        }
      });
      this.activeSounds.clear();
    }
  }

  /**
   * 停止所有音效
   */
  stopAllSounds(): void {
    this.activeSounds.forEach((source) => {
      try {
        source.stop();
      } catch (_e) {
        // Already stopped
      }
    });
    this.activeSounds.clear();
  }

  // ==================== 音量控制 ====================

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.masterVolume;
    }
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.musicGain) {
      this.musicGain.gain.value = this.musicVolume;
    }
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    if (this.sfxGain) {
      this.sfxGain.gain.value = this.sfxVolume;
    }
  }

  // ==================== 3D 音频 ====================

  /**
   * 播放 3D 音效(距离越远越小声)
   */
  play3DSound(
    name: string,
    x: number,
    y: number,
    listenerX: number,
    listenerY: number,
    maxDistance: number = 500
  ): AudioBufferSourceNode | null {
    const dx = x - listenerX;
    const dy = y - listenerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 距离衰减
    const volume = Math.max(0, 1 - distance / maxDistance);

    if (volume <= 0) return null;

    // 立体声偏移 (-1 左, 0 中, 1 右)
    // TODO: 实现 pan (需要 StereoPannerNode)
    // const pan = Math.max(-1, Math.min(1, dx / (maxDistance / 2)));

    return this.playSound(name, {
      volume,
    });
  }
}

// 单例导出
export const AudioManager = new AudioManagerClass();

// ==================== Audio Component ====================

/**
 * Audio 组件 - 音频播放器
 *
 * 可以播放音效、背景音乐
 * 支持循环、淡入淡出等
 */
export class AudioPlayer extends Component {
  private currentSound: AudioBufferSourceNode | null = null;

  /**
   * 播放音效
   */
  playSound(name: string, options?: { volume?: number; loop?: boolean }): void {
    this.currentSound = AudioManager.playSound(name, options);
  }

  /**
   * 播放背景音乐
   */
  playMusic(name: string, options?: { volume?: number; fadeIn?: number }): void {
    this.currentSound = AudioManager.playMusic(name, options);
  }

  /**
   * 播放 3D 音效(相对于节点位置)
   */
  play3DSound(name: string, listenerNode: import('../core/Node').Node, maxDistance?: number): void {
    AudioManager.play3DSound(
      name,
      this.node.x,
      this.node.y,
      listenerNode.x,
      listenerNode.y,
      maxDistance
    );
  }

  /**
   * 停止播放
   */
  stop(): void {
    if (this.currentSound) {
      try {
        this.currentSound.stop();
      } catch (_e) {
        // Already stopped
      }
      this.currentSound = null;
    }
  }

  onDestroy(): void {
    this.stop();
  }
}

/**
 * 背景音乐播放器组件
 *
 * 自动管理背景音乐切换、循环等
 */
export class MusicPlayer extends Component {
  private playlist: string[] = [];
  private currentIndex = 0;
  private isPlaying = false;

  /**
   * 设置播放列表
   */
  setPlaylist(musicNames: string[]): void {
    this.playlist = musicNames;
    this.currentIndex = 0;
  }

  /**
   * 播放播放列表
   */
  play(shuffle: boolean = false): void {
    if (this.playlist.length === 0) return;

    if (shuffle) {
      this.currentIndex = Math.floor(Math.random() * this.playlist.length);
    }

    this.playCurrentTrack();
    this.isPlaying = true;
  }

  /**
   * 下一首
   */
  next(): void {
    this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
    this.playCurrentTrack();
  }

  /**
   * 上一首
   */
  previous(): void {
    this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
    this.playCurrentTrack();
  }

  /**
   * 暂停
   */
  pause(): void {
    AudioManager.stopMusic(0.5);
    this.isPlaying = false;
  }

  /**
   * 继续
   */
  resume(): void {
    if (!this.isPlaying) {
      this.playCurrentTrack();
      this.isPlaying = true;
    }
  }

  private playCurrentTrack(): void {
    if (this.currentIndex >= this.playlist.length) return;

    const musicName = this.playlist[this.currentIndex];
    AudioManager.playMusic(musicName, {
      fadeIn: 1.0,
    });
  }

  onDestroy(): void {
    AudioManager.stopMusic();
  }
}

// ==================== 使用示例 ====================

/*
// 1. 初始化并加载音频
await AudioManager.loadAll({
  // 音效
  explosion: { url: '/sounds/explosion.mp3', volume: 0.8 },
  jump: { url: '/sounds/jump.mp3', volume: 0.6 },
  coin: { url: '/sounds/coin.mp3', volume: 0.7 },

  // 背景音乐
  menuMusic: { url: '/music/menu.mp3', loop: true, volume: 0.5 },
  gameMusic: { url: '/music/game.mp3', loop: true, volume: 0.5 }
});

// 2. 播放音效
AudioManager.playSound('explosion');
AudioManager.playSound('jump', { detune: 100 }); // 音调高一点

// 3. 播放背景音乐
AudioManager.playMusic('gameMusic', { fadeIn: 2.0 });

// 4. 在节点中使用
class Coin extends Node {
  onReady() {
    this.addComponent(AudioPlayer);
  }

  collect() {
    const audio = this.getComponent(AudioPlayer);
    audio.playSound('coin');
  }
}

// 5. 3D 音效
class Enemy extends Node {
  onReady() {
    this.addComponent(AudioPlayer);
  }

  onUpdate() {
    const audio = this.getComponent(AudioPlayer);
    audio.play3DSound('enemySound', player, 300);
  }
}

// 6. 音乐播放器
const musicPlayer = root.addComponent(MusicPlayer);
musicPlayer.setPlaylist(['track1', 'track2', 'track3']);
musicPlayer.play(true); // 随机播放
*/
