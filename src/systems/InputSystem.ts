/**
 * 输入系统
 * 支持键盘、手柄（Switch/Xbox/PlayStation）、触屏
 */

import { System } from '../core/System';

/** 按键状态 */
export interface KeyState {
  pressed: boolean;
  justPressed: boolean;
  justReleased: boolean;
}

/** 手柄类型 */
export type GamepadType = 'xbox' | 'playstation' | 'switch' | 'steamdeck' | '8bitdo' | 'generic';

/** 手柄按钮标准索引 */
export enum GamepadButton {
  A = 0, // Xbox A / PS X / Switch B
  B = 1, // Xbox B / PS O / Switch A
  X = 2, // Xbox X / PS Square / Switch Y
  Y = 3, // Xbox Y / PS Triangle / Switch X
  LB = 4, // 左肩键
  RB = 5, // 右肩键
  LT = 6, // 左扳机
  RT = 7, // 右扳机
  Select = 8, // Select / Share / -
  Start = 9, // Start / Options / +
  L3 = 10, // 左摇杆按下
  R3 = 11, // 右摇杆按下
  DPadUp = 12,
  DPadDown = 13,
  DPadLeft = 14,
  DPadRight = 15,
  Home = 16, // Xbox / PS / Home
}

/** 各平台按钮名称映射 */
const BUTTON_NAMES: Record<GamepadType, Record<number, string>> = {
  xbox: {
    [GamepadButton.A]: 'A',
    [GamepadButton.B]: 'B',
    [GamepadButton.X]: 'X',
    [GamepadButton.Y]: 'Y',
    [GamepadButton.LB]: 'LB',
    [GamepadButton.RB]: 'RB',
    [GamepadButton.LT]: 'LT',
    [GamepadButton.RT]: 'RT',
    [GamepadButton.Select]: 'View',
    [GamepadButton.Start]: 'Menu',
    [GamepadButton.L3]: 'LS',
    [GamepadButton.R3]: 'RS',
    [GamepadButton.Home]: 'Xbox',
  },
  playstation: {
    [GamepadButton.A]: '✕',
    [GamepadButton.B]: '○',
    [GamepadButton.X]: '□',
    [GamepadButton.Y]: '△',
    [GamepadButton.LB]: 'L1',
    [GamepadButton.RB]: 'R1',
    [GamepadButton.LT]: 'L2',
    [GamepadButton.RT]: 'R2',
    [GamepadButton.Select]: 'Share',
    [GamepadButton.Start]: 'Options',
    [GamepadButton.L3]: 'L3',
    [GamepadButton.R3]: 'R3',
    [GamepadButton.Home]: 'PS',
  },
  switch: {
    [GamepadButton.A]: 'B', // Switch 的 B 在右边（对应标准 A 位置）
    [GamepadButton.B]: 'A', // Switch 的 A 在下边（对应标准 B 位置）
    [GamepadButton.X]: 'Y',
    [GamepadButton.Y]: 'X',
    [GamepadButton.LB]: 'L',
    [GamepadButton.RB]: 'R',
    [GamepadButton.LT]: 'ZL',
    [GamepadButton.RT]: 'ZR',
    [GamepadButton.Select]: '-',
    [GamepadButton.Start]: '+',
    [GamepadButton.L3]: 'LS',
    [GamepadButton.R3]: 'RS',
    [GamepadButton.Home]: 'Home',
  },
  generic: {
    [GamepadButton.A]: '1',
    [GamepadButton.B]: '2',
    [GamepadButton.X]: '3',
    [GamepadButton.Y]: '4',
    [GamepadButton.LB]: 'L1',
    [GamepadButton.RB]: 'R1',
    [GamepadButton.LT]: 'L2',
    [GamepadButton.RT]: 'R2',
    [GamepadButton.Select]: 'Select',
    [GamepadButton.Start]: 'Start',
    [GamepadButton.L3]: 'L3',
    [GamepadButton.R3]: 'R3',
    [GamepadButton.Home]: 'Home',
  },
  steamdeck: {
    [GamepadButton.A]: 'A',
    [GamepadButton.B]: 'B',
    [GamepadButton.X]: 'X',
    [GamepadButton.Y]: 'Y',
    [GamepadButton.LB]: 'L1',
    [GamepadButton.RB]: 'R1',
    [GamepadButton.LT]: 'L2',
    [GamepadButton.RT]: 'R2',
    [GamepadButton.Select]: '...',
    [GamepadButton.Start]: '≡',
    [GamepadButton.L3]: 'L3',
    [GamepadButton.R3]: 'R3',
    [GamepadButton.Home]: 'Steam',
  },
  '8bitdo': {
    [GamepadButton.A]: 'B',
    [GamepadButton.B]: 'A',
    [GamepadButton.X]: 'Y',
    [GamepadButton.Y]: 'X',
    [GamepadButton.LB]: 'L',
    [GamepadButton.RB]: 'R',
    [GamepadButton.LT]: 'ZL',
    [GamepadButton.RT]: 'ZR',
    [GamepadButton.Select]: 'Select',
    [GamepadButton.Start]: 'Start',
    [GamepadButton.L3]: 'L3',
    [GamepadButton.R3]: 'R3',
    [GamepadButton.Home]: 'Home',
  },
};

/** 各平台图标/颜色配置 */
export const GAMEPAD_STYLES: Record<GamepadType, { color: string; icon: string }> = {
  xbox: { color: '#107C10', icon: '🎮' },
  playstation: { color: '#003791', icon: '🎮' },
  switch: { color: '#E60012', icon: '🎮' },
  steamdeck: { color: '#1a9fff', icon: '🎮' },
  '8bitdo': { color: '#ff6b00', icon: '🎮' },
  generic: { color: '#666666', icon: '🎮' },
};

/** 手柄状态 */
export interface GamepadState {
  connected: boolean;
  type: GamepadType;
  name: string;
  axes: number[];
  buttons: boolean[];
  prevButtons: boolean[];
}

/** 输入映射配置 */
export interface InputMapping {
  keyboard?: string[];
  gamepadButton?: number[];
  gamepadAxis?: { axis: number; positive: boolean };
}

/** 默认输入映射 */
const DEFAULT_MAPPINGS: Record<string, InputMapping> = {
  // 移动（左摇杆）
  left: { keyboard: ['ArrowLeft', 'KeyA'], gamepadAxis: { axis: 0, positive: false } },
  right: { keyboard: ['ArrowRight', 'KeyD'], gamepadAxis: { axis: 0, positive: true } },
  up: { keyboard: ['ArrowUp', 'KeyW'], gamepadAxis: { axis: 1, positive: false } },
  down: { keyboard: ['ArrowDown', 'KeyS'], gamepadAxis: { axis: 1, positive: true } },

  // 动作
  jump: { keyboard: ['Space'], gamepadButton: [0] },
  action: { keyboard: ['KeyJ', 'KeyZ', 'Space'], gamepadButton: [0, 2] }, // A/X 按钮
  fire: { keyboard: ['KeyJ', 'KeyZ'], gamepadButton: [0, 1, 2, 3] },
  dash: { keyboard: ['ShiftLeft', 'KeyK'], gamepadButton: [4, 5, 6, 7] },

  // 系统
  pause: { keyboard: ['Escape'], gamepadButton: [9] },
  confirm: { keyboard: ['Enter', 'Space'], gamepadButton: [0] },
  cancel: { keyboard: ['Escape', 'Backspace'], gamepadButton: [1] },

  // 方向键（D-Pad）
  dpadUp: { keyboard: ['ArrowUp'], gamepadButton: [12] },
  dpadDown: { keyboard: ['ArrowDown'], gamepadButton: [13] },
  dpadLeft: { keyboard: ['ArrowLeft'], gamepadButton: [14] },
  dpadRight: { keyboard: ['ArrowRight'], gamepadButton: [15] },

  // 肩键/扳机
  lb: { keyboard: ['KeyQ'], gamepadButton: [4] },
  rb: { keyboard: ['KeyE'], gamepadButton: [5] },
  lt: { keyboard: ['KeyQ'], gamepadButton: [6] },
  rt: { keyboard: ['KeyE'], gamepadButton: [7] },

  // 功能键
  select: { keyboard: ['Tab'], gamepadButton: [8] },
  start: { keyboard: ['Escape'], gamepadButton: [9] },
  home: { keyboard: ['Escape'], gamepadButton: [16] },
};

export class InputSystem extends System {
  static priority = -100; // 最先更新

  /** 键盘状态 */
  private keys = new Map<string, KeyState>();

  /** 手柄状态 */
  private gamepads: GamepadState[] = [];

  /** 输入映射 */
  private mappings: Record<string, InputMapping> = { ...DEFAULT_MAPPINGS };

  /** 死区阈值 */
  deadzone = 0.2;

  /** 最大手柄数 */
  maxGamepads = 4;

  onCreate(): void {
    // 键盘事件
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    // 手柄事件
    window.addEventListener('gamepadconnected', this.onGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected);

    // 初始化手柄数组
    for (let i = 0; i < this.maxGamepads; i++) {
      this.gamepads.push({
        connected: false,
        type: 'generic',
        name: '',
        axes: [0, 0, 0, 0],
        buttons: [],
        prevButtons: [],
      });
    }
  }

  /**
   * 检测手柄类型
   */
  private detectGamepadType(gamepad: Gamepad): GamepadType {
    const id = gamepad.id.toLowerCase();

    // Steam Deck 控制器
    if (
      id.includes('steam deck') ||
      id.includes('steamdeck') ||
      id.includes('valve') ||
      id.includes('28de') // Valve vendor ID
    ) {
      return 'steamdeck';
    }

    // 8BitDo 控制器
    if (
      id.includes('8bitdo') ||
      id.includes('8bit do') ||
      id.includes('2dc8') // 8BitDo vendor ID
    ) {
      return '8bitdo';
    }

    // Xbox 控制器
    if (id.includes('xbox') || id.includes('xinput') || id.includes('045e')) {
      return 'xbox';
    }

    // PlayStation 控制器
    if (
      id.includes('playstation') ||
      id.includes('dualshock') ||
      id.includes('dualsense') ||
      id.includes('054c') || // Sony vendor ID
      id.includes('ps4') ||
      id.includes('ps5')
    ) {
      return 'playstation';
    }

    // Nintendo Switch 控制器
    if (
      id.includes('nintendo') ||
      id.includes('switch') ||
      id.includes('pro controller') ||
      id.includes('joy-con') ||
      id.includes('057e') // Nintendo vendor ID
    ) {
      return 'switch';
    }

    return 'generic';
  }

  onDestroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('gamepadconnected', this.onGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnected);
  }

  onPreUpdate(): void {
    // 重置 justPressed 和 justReleased
    for (const state of this.keys.values()) {
      state.justPressed = false;
      state.justReleased = false;
    }

    // 更新手柄状态
    this.updateGamepads();
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return;

    let state = this.keys.get(e.code);
    if (!state) {
      state = { pressed: false, justPressed: false, justReleased: false };
      this.keys.set(e.code, state);
    }

    if (!state.pressed) {
      state.justPressed = true;
    }
    state.pressed = true;
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    const state = this.keys.get(e.code);
    if (state) {
      state.pressed = false;
      state.justReleased = true;
    }
  };

  private onGamepadConnected = (e: GamepadEvent): void => {
    const index = e.gamepad.index;
    if (index < this.maxGamepads) {
      const type = this.detectGamepadType(e.gamepad);
      this.gamepads[index].connected = true;
      this.gamepads[index].type = type;
      this.gamepads[index].name = e.gamepad.id;
      this.emit('gamepad:connected', { index, type, name: e.gamepad.id });
    }
  };

  private onGamepadDisconnected = (e: GamepadEvent): void => {
    const index = e.gamepad.index;
    if (index < this.maxGamepads) {
      this.gamepads[index].connected = false;
      this.emit('gamepad:disconnected', { index });
    }
  };

  private updateGamepads(): void {
    const gamepads = navigator.getGamepads();

    for (let i = 0; i < this.maxGamepads; i++) {
      const gp = gamepads[i];
      const state = this.gamepads[i];

      if (!gp || !state.connected) continue;

      // 保存上一帧按钮状态
      state.prevButtons = [...state.buttons];

      // 更新轴
      state.axes = gp.axes.map((axis) => (Math.abs(axis) > this.deadzone ? axis : 0));

      // 更新按钮
      state.buttons = gp.buttons.map((b) => b.pressed);
    }
  }

  /**
   * 设置输入映射
   */
  setMapping(action: string, mapping: InputMapping): void {
    this.mappings[action] = mapping;
  }

  /**
   * 检查动作是否按住
   */
  isHeld(action: string, playerIndex = 0): boolean {
    const mapping = this.mappings[action];
    if (!mapping) return false;

    // 检查键盘
    if (mapping.keyboard) {
      for (const key of mapping.keyboard) {
        if (this.keys.get(key)?.pressed) return true;
      }
    }

    // 检查手柄按钮
    const gp = this.gamepads[playerIndex];
    if (gp?.connected && mapping.gamepadButton) {
      for (const btn of mapping.gamepadButton) {
        if (gp.buttons[btn]) return true;
      }
    }

    // 检查手柄轴
    if (gp?.connected && mapping.gamepadAxis) {
      const { axis, positive } = mapping.gamepadAxis;
      const value = gp.axes[axis] || 0;
      if (positive && value > this.deadzone) return true;
      if (!positive && value < -this.deadzone) return true;
    }

    return false;
  }

  /**
   * 检查动作是否刚按下
   */
  isPressed(action: string, playerIndex = 0): boolean {
    const mapping = this.mappings[action];
    if (!mapping) return false;

    // 检查键盘
    if (mapping.keyboard) {
      for (const key of mapping.keyboard) {
        if (this.keys.get(key)?.justPressed) return true;
      }
    }

    // 检查手柄按钮
    const gp = this.gamepads[playerIndex];
    if (gp?.connected && mapping.gamepadButton) {
      for (const btn of mapping.gamepadButton) {
        if (gp.buttons[btn] && !gp.prevButtons[btn]) return true;
      }
    }

    return false;
  }

  /**
   * 检查动作是否刚释放
   */
  isReleased(action: string, playerIndex = 0): boolean {
    const mapping = this.mappings[action];
    if (!mapping) return false;

    // 检查键盘
    if (mapping.keyboard) {
      for (const key of mapping.keyboard) {
        if (this.keys.get(key)?.justReleased) return true;
      }
    }

    // 检查手柄按钮
    const gp = this.gamepads[playerIndex];
    if (gp?.connected && mapping.gamepadButton) {
      for (const btn of mapping.gamepadButton) {
        if (!gp.buttons[btn] && gp.prevButtons[btn]) return true;
      }
    }

    return false;
  }

  /**
   * 获取轴值 (-1 到 1)
   */
  axis(horizontal: boolean, playerIndex = 0): number {
    const positiveAction = horizontal ? 'right' : 'down';
    const negativeAction = horizontal ? 'left' : 'up';

    let value = 0;

    // 键盘
    if (this.isHeld(negativeAction, playerIndex)) value -= 1;
    if (this.isHeld(positiveAction, playerIndex)) value += 1;

    // 手柄轴优先（更精确）
    const gp = this.gamepads[playerIndex];
    if (gp?.connected) {
      const axisIndex = horizontal ? 0 : 1;
      const axisValue = gp.axes[axisIndex] || 0;
      if (Math.abs(axisValue) > this.deadzone) {
        value = axisValue;
      }
    }

    return value;
  }

  /**
   * 获取水平轴值
   */
  axisX(playerIndex = 0): number {
    return this.axis(true, playerIndex);
  }

  /**
   * 获取垂直轴值
   */
  axisY(playerIndex = 0): number {
    return this.axis(false, playerIndex);
  }

  /**
   * 获取右摇杆水平轴值
   */
  rightAxisX(playerIndex = 0): number {
    const gp = this.gamepads[playerIndex];
    if (gp?.connected) {
      const value = gp.axes[2] || 0;
      return Math.abs(value) > this.deadzone ? value : 0;
    }
    return 0;
  }

  /**
   * 获取右摇杆垂直轴值
   */
  rightAxisY(playerIndex = 0): number {
    const gp = this.gamepads[playerIndex];
    if (gp?.connected) {
      const value = gp.axes[3] || 0;
      return Math.abs(value) > this.deadzone ? value : 0;
    }
    return 0;
  }

  /**
   * 检查手柄是否有任意按钮刚按下
   */
  anyButtonPressed(playerIndex = 0): number | null {
    const gp = this.gamepads[playerIndex];
    if (!gp?.connected) return null;

    for (let i = 0; i < gp.buttons.length; i++) {
      if (gp.buttons[i] && !gp.prevButtons[i]) {
        return i;
      }
    }
    return null;
  }

  /**
   * 检查手柄是否有任意按钮按住
   */
  anyButtonHeld(playerIndex = 0): number | null {
    const gp = this.gamepads[playerIndex];
    if (!gp?.connected) return null;

    for (let i = 0; i < gp.buttons.length; i++) {
      if (gp.buttons[i]) {
        return i;
      }
    }
    return null;
  }

  /**
   * 检查手柄特定按钮是否刚按下
   */
  isButtonPressed(button: GamepadButton, playerIndex = 0): boolean {
    const gp = this.gamepads[playerIndex];
    if (!gp?.connected) return false;
    return gp.buttons[button] && !gp.prevButtons[button];
  }

  /**
   * 检查手柄特定按钮是否按住
   */
  isButtonHeld(button: GamepadButton, playerIndex = 0): boolean {
    const gp = this.gamepads[playerIndex];
    if (!gp?.connected) return false;
    return gp.buttons[button];
  }

  /**
   * 检查手柄特定按钮是否刚释放
   */
  isButtonReleased(button: GamepadButton, playerIndex = 0): boolean {
    const gp = this.gamepads[playerIndex];
    if (!gp?.connected) return false;
    return !gp.buttons[button] && gp.prevButtons[button];
  }

  /**
   * 获取原始按键状态
   */
  key(code: string): KeyState {
    return this.keys.get(code) ?? { pressed: false, justPressed: false, justReleased: false };
  }

  /**
   * 获取手柄状态
   */
  gamepad(index: number): GamepadState | null {
    const gp = this.gamepads[index];
    return gp?.connected ? gp : null;
  }

  /**
   * 触发手柄震动
   */
  vibrate(
    playerIndex: number,
    options: { strong?: number; weak?: number; duration?: number } = {}
  ): void {
    const gp = navigator.getGamepads()[playerIndex];
    if (!gp?.vibrationActuator) return;

    try {
      gp.vibrationActuator.playEffect('dual-rumble', {
        startDelay: 0,
        duration: options.duration ?? 100,
        weakMagnitude: Math.min(1, options.weak ?? 0.5),
        strongMagnitude: Math.min(1, options.strong ?? 0.5),
      });
    } catch {
      // 忽略不支持的设备
    }
  }

  /**
   * 获取手柄类型
   */
  getGamepadType(playerIndex = 0): GamepadType {
    return this.gamepads[playerIndex]?.type ?? 'generic';
  }

  /**
   * 获取按钮在当前手柄上的显示名称
   */
  getButtonName(button: GamepadButton, playerIndex = 0): string {
    const type = this.getGamepadType(playerIndex);
    return BUTTON_NAMES[type][button] ?? `Button ${button}`;
  }

  /**
   * 获取动作的显示提示文本
   * 例如：getActionHint('fire', 0) => "按 A 键" (Xbox) 或 "按 B 键" (Switch)
   */
  getActionHint(action: string, playerIndex = 0): string {
    const mapping = this.mappings[action];
    if (!mapping) return '';

    const gp = this.gamepads[playerIndex];

    // 优先显示手柄按钮
    if (gp?.connected && mapping.gamepadButton?.length) {
      const buttonName = this.getButtonName(mapping.gamepadButton[0], playerIndex);
      return `按 ${buttonName}`;
    }

    // 显示键盘按键
    if (mapping.keyboard?.length) {
      const keyName = this.formatKeyName(mapping.keyboard[0]);
      return `按 ${keyName}`;
    }

    return '';
  }

  /**
   * 格式化键盘按键名称
   */
  private formatKeyName(code: string): string {
    // 移除 Key/Digit 前缀
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);

    // 特殊键名映射
    const keyNames: Record<string, string> = {
      Space: '空格',
      Enter: '回车',
      Escape: 'Esc',
      ShiftLeft: 'Shift',
      ShiftRight: 'Shift',
      ControlLeft: 'Ctrl',
      ControlRight: 'Ctrl',
      AltLeft: 'Alt',
      AltRight: 'Alt',
      ArrowUp: '↑',
      ArrowDown: '↓',
      ArrowLeft: '←',
      ArrowRight: '→',
      Backspace: '退格',
      Tab: 'Tab',
    };

    return keyNames[code] ?? code;
  }

  /**
   * 检查是否有任何手柄连接
   */
  hasGamepad(): boolean {
    return this.gamepads.some((gp) => gp.connected);
  }

  /**
   * 获取第一个连接的手柄索引
   */
  getFirstGamepadIndex(): number {
    return this.gamepads.findIndex((gp) => gp.connected);
  }

  /**
   * 获取所有连接的手柄信息
   */
  getConnectedGamepads(): Array<{ index: number; type: GamepadType; name: string }> {
    return this.gamepads
      .map((gp, index) => ({ index, type: gp.type, name: gp.name }))
      .filter((_, i) => this.gamepads[i].connected);
  }
}
