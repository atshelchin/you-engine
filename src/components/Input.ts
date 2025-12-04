/**
 * Input Component - 输入系统组件
 *
 * 支持键盘、鼠标、触摸、手柄(Gamepad)
 */

import { Component } from '../core/Component';
import { Signal } from '../core/Signal';

// ==================== 类型定义 ====================

/**
 * 手柄类型
 */
export type GamepadType = 'xbox' | 'playstation' | 'switch' | 'steamdeck' | 'generic';

// ==================== 输入管理器 (单例) ====================

class InputManagerClass {
  // 键盘状态
  private keys: Map<string, boolean> = new Map();
  private keysPressed: Map<string, boolean> = new Map();
  private keysReleased: Map<string, boolean> = new Map();

  // 鼠标状态
  mouseX = 0;
  mouseY = 0;
  mouseButtons: Map<number, boolean> = new Map();
  mouseWheel = 0;

  // 触摸状态
  touches: Map<number, { x: number; y: number }> = new Map();

  // 手柄状态
  private gamepads: Map<number, Gamepad> = new Map();
  private gamepadButtons: Map<string, boolean> = new Map(); // 'pad0-button0'
  private gamepadAxes: Map<string, number> = new Map(); // 'pad0-axis0'

  // 画布引用(用于坐标转换)
  private canvas: HTMLCanvasElement | null = null;

  // 信号
  signals = {
    keyDown: new Signal<string>(),
    keyUp: new Signal<string>(),
    mouseDown: new Signal<{ button: number; x: number; y: number }>(),
    mouseUp: new Signal<{ button: number; x: number; y: number }>(),
    mouseMove: new Signal<{ x: number; y: number }>(),
    gamepadConnected: new Signal<number>(),
    gamepadDisconnected: new Signal<number>(),
  };

  constructor() {
    if (typeof window === 'undefined') return;

    // 键盘事件
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    // 鼠标事件
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('wheel', this.onWheel);

    // 触摸事件
    window.addEventListener('touchstart', this.onTouchStart);
    window.addEventListener('touchmove', this.onTouchMove);
    window.addEventListener('touchend', this.onTouchEnd);

    // 手柄事件
    window.addEventListener('gamepadconnected', this.onGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected);
  }

  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
  }

  // ==================== 键盘 ====================

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.keys.get(e.key)) {
      this.keysPressed.set(e.key, true);
      this.signals.keyDown.emit(e.key);
    }
    this.keys.set(e.key, true);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.set(e.key, false);
    this.keysReleased.set(e.key, true);
    this.signals.keyUp.emit(e.key);
  };

  isKeyDown(key: string): boolean {
    return this.keys.get(key) || false;
  }

  isKeyPressed(key: string): boolean {
    return this.keysPressed.get(key) || false;
  }

  isKeyReleased(key: string): boolean {
    return this.keysReleased.get(key) || false;
  }

  // ==================== 鼠标 ====================

  private onMouseMove = (e: MouseEvent) => {
    if (this.canvas) {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    } else {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    }

    this.signals.mouseMove.emit({ x: this.mouseX, y: this.mouseY });
  };

  private onMouseDown = (e: MouseEvent) => {
    this.mouseButtons.set(e.button, true);
    this.signals.mouseDown.emit({
      button: e.button,
      x: this.mouseX,
      y: this.mouseY,
    });
  };

  private onMouseUp = (e: MouseEvent) => {
    this.mouseButtons.set(e.button, false);
    this.signals.mouseUp.emit({
      button: e.button,
      x: this.mouseX,
      y: this.mouseY,
    });
  };

  private onWheel = (e: WheelEvent) => {
    this.mouseWheel = e.deltaY;
  };

  isMouseButtonDown(button: number = 0): boolean {
    return this.mouseButtons.get(button) || false;
  }

  // ==================== 触摸 ====================

  private onTouchStart = (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const rect = this.canvas?.getBoundingClientRect();

      this.touches.set(touch.identifier, {
        x: rect ? touch.clientX - rect.left : touch.clientX,
        y: rect ? touch.clientY - rect.top : touch.clientY,
      });
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const rect = this.canvas?.getBoundingClientRect();

      this.touches.set(touch.identifier, {
        x: rect ? touch.clientX - rect.left : touch.clientX,
        y: rect ? touch.clientY - rect.top : touch.clientY,
      });
    }
  };

  private onTouchEnd = (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      this.touches.delete(e.changedTouches[i].identifier);
    }
  };

  getTouch(id: number): { x: number; y: number } | null {
    return this.touches.get(id) || null;
  }

  getTouchCount(): number {
    return this.touches.size;
  }

  // ==================== 手柄 (Gamepad) ====================

  private onGamepadConnected = (e: GamepadEvent) => {
    console.log(`🎮 Gamepad ${e.gamepad.index} connected: ${e.gamepad.id}`);
    this.gamepads.set(e.gamepad.index, e.gamepad);
    this.signals.gamepadConnected.emit(e.gamepad.index);
  };

  private onGamepadDisconnected = (e: GamepadEvent) => {
    console.log(`🎮 Gamepad ${e.gamepad.index} disconnected`);
    this.gamepads.delete(e.gamepad.index);
    this.signals.gamepadDisconnected.emit(e.gamepad.index);
  };

  /**
   * 更新手柄状态(需要在游戏循环中调用)
   */
  updateGamepads(): void {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;

    const gamepads = navigator.getGamepads();

    for (let i = 0; i < gamepads.length; i++) {
      const gamepad = gamepads[i];
      if (!gamepad) continue;

      // 更新按钮状态
      for (let b = 0; b < gamepad.buttons.length; b++) {
        const key = `pad${i}-button${b}`;
        this.gamepadButtons.set(key, gamepad.buttons[b].pressed);
      }

      // 更新摇杆状态
      for (let a = 0; a < gamepad.axes.length; a++) {
        const key = `pad${i}-axis${a}`;
        this.gamepadAxes.set(key, gamepad.axes[a]);
      }

      this.gamepads.set(i, gamepad);
    }
  }

  /**
   * 获取手柄按钮状态
   *
   * 标准映射:
   * - 0: A (Xbox) / Cross (PS)
   * - 1: B (Xbox) / Circle (PS)
   * - 2: X (Xbox) / Square (PS)
   * - 3: Y (Xbox) / Triangle (PS)
   * - 4: LB
   * - 5: RB
   * - 6: LT
   * - 7: RT
   * - 8: Select/Back
   * - 9: Start
   * - 10: Left Stick Press
   * - 11: Right Stick Press
   * - 12: D-Pad Up
   * - 13: D-Pad Down
   * - 14: D-Pad Left
   * - 15: D-Pad Right
   */
  isGamepadButtonDown(padIndex: number, buttonIndex: number): boolean {
    const key = `pad${padIndex}-button${buttonIndex}`;
    return this.gamepadButtons.get(key) || false;
  }

  /**
   * 获取手柄摇杆值 (-1 到 1)
   *
   * 标准映射:
   * - 0: Left Stick X
   * - 1: Left Stick Y
   * - 2: Right Stick X
   * - 3: Right Stick Y
   */
  getGamepadAxis(padIndex: number, axisIndex: number): number {
    const key = `pad${padIndex}-axis${axisIndex}`;
    const value = this.gamepadAxes.get(key) || 0;

    // 死区处理
    return Math.abs(value) < 0.1 ? 0 : value;
  }

  /**
   * 获取左摇杆
   */
  getLeftStick(padIndex: number = 0): { x: number; y: number } {
    return {
      x: this.getGamepadAxis(padIndex, 0),
      y: this.getGamepadAxis(padIndex, 1),
    };
  }

  /**
   * 获取右摇杆
   */
  getRightStick(padIndex: number = 0): { x: number; y: number } {
    return {
      x: this.getGamepadAxis(padIndex, 2),
      y: this.getGamepadAxis(padIndex, 3),
    };
  }

  /**
   * 是否有手柄连接
   */
  hasGamepad(): boolean {
    return this.gamepads.size > 0;
  }

  /**
   * 获取所有已连接的手柄
   */
  getGamepads(): Gamepad[] {
    return Array.from(this.gamepads.values());
  }

  /**
   * 获取手柄类型
   */
  getGamepadType(padIndex: number): GamepadType {
    const gamepad = this.gamepads.get(padIndex);
    if (!gamepad) return 'generic';

    const id = gamepad.id.toLowerCase();

    // Xbox 手柄检测
    if (id.includes('xbox') || id.includes('xinput') || id.includes('microsoft')) {
      return 'xbox';
    }

    // PlayStation 手柄检测
    if (
      id.includes('playstation') ||
      id.includes('dualshock') ||
      id.includes('dualsense') ||
      id.includes('sony')
    ) {
      return 'playstation';
    }

    // Switch 手柄检测
    if (id.includes('pro controller') || id.includes('joy-con') || id.includes('nintendo')) {
      return 'switch';
    }

    // Steam Deck 检测
    if (id.includes('steam') || id.includes('deck')) {
      return 'steamdeck';
    }

    return 'generic';
  }

  /**
   * 获取按钮显示名称（根据手柄类型）
   */
  getButtonName(buttonIndex: number, padIndex: number = 0): string {
    const type = this.getGamepadType(padIndex);

    const buttonNames: Record<GamepadType, string[]> = {
      xbox: [
        'A',
        'B',
        'X',
        'Y',
        'LB',
        'RB',
        'LT',
        'RT',
        'Back',
        'Start',
        'LS',
        'RS',
        '↑',
        '↓',
        '←',
        '→',
        'Home',
      ],
      playstation: [
        '✕',
        '○',
        '□',
        '△',
        'L1',
        'R1',
        'L2',
        'R2',
        'Share',
        'Options',
        'L3',
        'R3',
        '↑',
        '↓',
        '←',
        '→',
        'PS',
      ],
      switch: [
        'B',
        'A',
        'Y',
        'X',
        'L',
        'R',
        'ZL',
        'ZR',
        '-',
        '+',
        'LS',
        'RS',
        '↑',
        '↓',
        '←',
        '→',
        'Home',
      ],
      steamdeck: [
        'A',
        'B',
        'X',
        'Y',
        'L1',
        'R1',
        'L2',
        'R2',
        'View',
        'Menu',
        'L3',
        'R3',
        '↑',
        '↓',
        '←',
        '→',
        'Steam',
      ],
      generic: [
        'Button 0',
        'Button 1',
        'Button 2',
        'Button 3',
        'Button 4',
        'Button 5',
        'Button 6',
        'Button 7',
        'Button 8',
        'Button 9',
        'Button 10',
        'Button 11',
        'Button 12',
        'Button 13',
        'Button 14',
        'Button 15',
        'Button 16',
      ],
    };

    return buttonNames[type][buttonIndex] || `Button ${buttonIndex}`;
  }

  /**
   * 获取轴显示名称
   */
  getAxisName(axisIndex: number): string {
    const axisNames = ['Left Stick X', 'Left Stick Y', 'Right Stick X', 'Right Stick Y'];
    return axisNames[axisIndex] || `Axis ${axisIndex}`;
  }

  /**
   * 手柄震动 (如果支持)
   */
  vibrate(
    padIndex: number,
    options: { weak?: number; strong?: number; duration?: number } = {}
  ): void {
    const gamepad = this.gamepads.get(padIndex);
    if (!gamepad || !gamepad.vibrationActuator) return;

    const { weak = 0, strong = 0, duration = 200 } = options;

    if ('playEffect' in gamepad.vibrationActuator) {
      gamepad.vibrationActuator.playEffect('dual-rumble', {
        startDelay: 0,
        duration,
        weakMagnitude: weak,
        strongMagnitude: strong,
      });
    }
  }

  // ==================== 帧结束清理 ====================

  update(): void {
    // 清理单帧状态
    this.keysPressed.clear();
    this.keysReleased.clear();
    this.mouseWheel = 0;

    // 更新手柄
    this.updateGamepads();
  }
}

// 单例导出
export const InputManager = new InputManagerClass();

// ==================== Input Component ====================

/**
 * Input 组件 - 方便访问输入系统
 *
 * 添加此组件后,节点可以方便地检查输入状态
 */
export class Input extends Component {
  // 快捷方法
  isKeyDown(key: string): boolean {
    return InputManager.isKeyDown(key);
  }

  isKeyPressed(key: string): boolean {
    return InputManager.isKeyPressed(key);
  }

  isMouseDown(button: number = 0): boolean {
    return InputManager.isMouseButtonDown(button);
  }

  getMousePosition(): { x: number; y: number } {
    return { x: InputManager.mouseX, y: InputManager.mouseY };
  }

  isGamepadButtonDown(button: number, padIndex: number = 0): boolean {
    return InputManager.isGamepadButtonDown(padIndex, button);
  }

  getLeftStick(padIndex: number = 0): { x: number; y: number } {
    return InputManager.getLeftStick(padIndex);
  }

  getRightStick(padIndex: number = 0): { x: number; y: number } {
    return InputManager.getRightStick(padIndex);
  }

  hasGamepad(): boolean {
    return InputManager.hasGamepad();
  }

  getGamepadType(padIndex: number = 0): GamepadType {
    return InputManager.getGamepadType(padIndex);
  }

  getButtonName(buttonIndex: number, padIndex: number = 0): string {
    return InputManager.getButtonName(buttonIndex, padIndex);
  }

  getAxisName(axisIndex: number): string {
    return InputManager.getAxisName(axisIndex);
  }

  vibrate(
    padIndex: number,
    options: { weak?: number; strong?: number; duration?: number } = {}
  ): void {
    return InputManager.vibrate(padIndex, options);
  }
}

// ==================== 预定义按键映射 ====================

export const Keys = {
  // 字母
  A: 'a',
  B: 'b',
  C: 'c',
  D: 'd',
  E: 'e',
  F: 'f',
  G: 'g',
  H: 'h',
  I: 'i',
  J: 'j',
  K: 'k',
  L: 'l',
  M: 'm',
  N: 'n',
  O: 'o',
  P: 'p',
  Q: 'q',
  R: 'r',
  S: 's',
  T: 't',
  U: 'u',
  V: 'v',
  W: 'w',
  X: 'x',
  Y: 'y',
  Z: 'z',

  // 方向键
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',

  // 空格和回车
  Space: ' ',
  Enter: 'Enter',

  // 控制键
  Shift: 'Shift',
  Control: 'Control',
  Alt: 'Alt',
  Escape: 'Escape',
  Tab: 'Tab',
};

export const GamepadButtons = {
  A: 0, // Xbox A / PS Cross
  B: 1, // Xbox B / PS Circle
  X: 2, // Xbox X / PS Square
  Y: 3, // Xbox Y / PS Triangle
  LB: 4, // Left Bumper
  RB: 5, // Right Bumper
  LT: 6, // Left Trigger
  RT: 7, // Right Trigger
  Select: 8,
  Start: 9,
  LeftStick: 10, // Left Stick Press
  RightStick: 11, // Right Stick Press
  DPadUp: 12,
  DPadDown: 13,
  DPadLeft: 14,
  DPadRight: 15,
};

// ==================== 使用示例 ====================

/*
// 1. 在引擎启动时初始化
const engine = new Engine(canvas);
InputManager.setCanvas(canvas);

// 2. 在游戏循环中更新
engine.onUpdate = (dt) => {
  InputManager.update();  // 必须调用!
  // ... 其他更新
};

// 3. 在节点中使用
class Player extends Node {
  speed = 200;

  onReady() {
    this.addComponent(Input);
  }

  onUpdate(dt: number) {
    const input = this.getComponent(Input);

    // 键盘控制
    if (input.isKeyDown(Keys.W)) this.y -= this.speed * dt;
    if (input.isKeyDown(Keys.S)) this.y += this.speed * dt;
    if (input.isKeyDown(Keys.A)) this.x -= this.speed * dt;
    if (input.isKeyDown(Keys.D)) this.x += this.speed * dt;

    // 手柄控制
    if (input.hasGamepad()) {
      const leftStick = input.getLeftStick();
      this.x += leftStick.x * this.speed * dt;
      this.y += leftStick.y * this.speed * dt;

      if (input.isGamepadButtonDown(GamepadButtons.A)) {
        this.jump();
      }
    }
  }
}

// 4. 监听输入事件
InputManager.signals.keyDown.on((key) => {
  console.log('Key pressed:', key);
});

InputManager.signals.gamepadConnected.on((index) => {
  console.log('Gamepad connected:', index);
});
*/
