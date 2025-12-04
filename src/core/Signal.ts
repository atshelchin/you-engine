/**
 * Signal - 事件系统
 *
 * 极简、高效、类型安全
 */

export type SignalCallback<T> = (data: T) => void;

export class Signal<T = void> {
  private listeners: SignalCallback<T>[] = [];

  on(callback: SignalCallback<T>): () => void {
    this.listeners.push(callback);
    return () => this.off(callback);
  }

  off(callback: SignalCallback<T>): void {
    const index = this.listeners.indexOf(callback);
    if (index >= 0) {
      this.listeners.splice(index, 1);
    }
  }

  emit(data: T): void {
    for (const listener of [...this.listeners]) {
      listener(data);
    }
  }

  clear(): void {
    this.listeners = [];
  }

  get count(): number {
    return this.listeners.length;
  }
}
