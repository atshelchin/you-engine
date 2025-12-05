# UI 导航系统使用指南

UI 导航系统让你的游戏支持使用**方向键**或**手柄摇杆**在按钮、输入框等 UI 元素之间导航，提供类似主机游戏或 iPad 的焦点效果。

## 快速开始

### 1. 添加导航系统到场景

```typescript
import { Scene } from 'you-engine';
import { UINavigationSystem, UIButton } from 'you-engine';

export class MyScene extends Scene {
  private navSystem!: UINavigationSystem;

  onCreate(): void {
    // 添加导航系统
    this.navSystem = new UINavigationSystem();
    this.addSystem(this.navSystem);
  }
}
```

### 2. 注册可导航元素

```typescript
// 创建按钮
const button = new UIButton({
  x: 100,
  y: 100,
  text: '开始游戏',
  onClick: () => console.log('点击了按钮'),
});

// 注册到导航系统
this.navSystem.register(button);
```

### 3. 使用不同的焦点效果

```typescript
// 发光效果（默认，类似 iPad）
const glowButton = new UIButton({
  focusStyle: 'glow',
  text: '发光效果',
});

// 外轮廓效果
const outlineButton = new UIButton({
  focusStyle: 'outline',
  text: '轮廓效果',
});

// 缩放效果
const scaleButton = new UIButton({
  focusStyle: 'scale',
  text: '缩放效果',
});
```

## 支持的输入方式

导航系统自动支持以下输入：

- **键盘方向键** - ↑ ↓ ← →
- **WASD 键** - W A S D
- **手柄 D-Pad** - 十字键
- **手柄左摇杆** - 模拟摇杆
- **确认键** - Enter, Space, 手柄 A 键（索引 1）

## 完整示例

```typescript
import { Scene, UINavigationSystem, UIButton, UIInput, UIPanel } from 'you-engine';

export class MenuScene extends Scene {
  private navSystem!: UINavigationSystem;
  private panel!: UIPanel;

  onCreate(): void {
    // 添加导航系统
    this.navSystem = new UINavigationSystem();
    this.addSystem(this.navSystem);

    // 创建面板
    this.panel = new UIPanel({
      x: 400,
      y: 300,
      width: 400,
      height: 300,
      anchor: 'center',
    });

    // 创建多个按钮
    const startButton = new UIButton({
      x: 100,
      y: 50,
      text: '开始游戏',
      focusStyle: 'glow',
      onClick: () => this.startGame(),
    });
    this.panel.addChild(startButton);
    this.navSystem.register(startButton);

    const optionsButton = new UIButton({
      x: 100,
      y: 120,
      text: '设置',
      focusStyle: 'glow',
      onClick: () => this.openOptions(),
    });
    this.panel.addChild(optionsButton);
    this.navSystem.register(optionsButton);

    const quitButton = new UIButton({
      x: 100,
      y: 190,
      text: '退出',
      focusStyle: 'glow',
      onClick: () => this.quit(),
    });
    this.panel.addChild(quitButton);
    this.navSystem.register(quitButton);

    // 添加输入框
    const nameInput = new UIInput({
      x: 100,
      y: 250,
      placeholder: '玩家名称',
    });
    this.panel.addChild(nameInput);
    this.navSystem.register(nameInput);
  }

  onUpdate(dt: number): void {
    this.panel.update(dt);
  }

  onRender(ctx: CanvasRenderingContext2D): void {
    this.panel.renderAll(ctx);
  }

  onDestroy(): void {
    // 清理导航系统
    this.navSystem.clear();
  }

  private startGame(): void {
    console.log('开始游戏');
  }

  private openOptions(): void {
    console.log('打开设置');
  }

  private quit(): void {
    console.log('退出游戏');
  }
}
```

## 高级配置

### 自定义焦点样式

```typescript
const button = new UIButton({
  text: '自定义按钮',
  // 自定义聚焦状态的样式
  focused: {
    backgroundColor: '#ff6b00',
    borderColor: '#ffffff',
    borderWidth: 3,
    textColor: '#ffffff',
  },
  focusStyle: 'glow',
  focusAnimDuration: 300, // 焦点动画时长（毫秒）
});
```

### 手动控制焦点

```typescript
// 设置焦点到第一个元素
this.navSystem.setFocus(0);

// 设置焦点到特定元素
this.navSystem.setFocusElement(myButton);

// 获取当前焦点元素
const focused = this.navSystem.getFocused();

// 手动导航
this.navSystem.navigate('up');
this.navSystem.navigate('down');
this.navSystem.navigate('left');
this.navSystem.navigate('right');

// 手动触发确认
this.navSystem.confirm();
```

### 自定义导航参数

```typescript
const navSystem = new UINavigationSystem();

// 禁用自动聚焦第一个元素
navSystem.autoFocus = false;

// 调整导航重复延迟（毫秒）
navSystem.repeatDelay = 200;

// 调整摇杆死区阈值
navSystem.axisThreshold = 0.6;
```

## 自定义可导航元素

如果你想让自定义 UI 元素支持导航，实现 `INavigable` 接口：

```typescript
import { UIElement, INavigable } from 'you-engine';

export class CustomButton extends UIElement implements INavigable {
  private focused = false;
  enabled = true;
  onClick?: () => void;

  setFocused(focused: boolean): void {
    this.focused = focused;
  }

  isFocused(): boolean {
    return this.focused;
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  render(ctx: CanvasRenderingContext2D): void {
    // 绘制你的自定义按钮
    // 如果 this.focused 为 true，绘制焦点效果
  }
}
```

## 注意事项

1. **导航系统优先级** - UINavigationSystem 的优先级为 50，在 InputSystem 之后运行
2. **焦点与输入焦点** - UIInput 有两种焦点：
   - `navFocused` - 导航系统的焦点（高亮显示）
   - `focused` - 输入焦点（可以输入文字）
   - 当导航焦点到达输入框时，会自动激活输入焦点
3. **清理资源** - 在场景销毁时记得调用 `navSystem.clear()` 清理注册的元素
4. **禁用元素** - 设置 `enabled = false` 的元素会被导航系统跳过

## 运行测试场景

```bash
# 查看完整的测试示例
cd you-engine-test
npm run dev
# 选择 "UI Navigation Test" 场景
```

## 键盘/手柄映射

| 功能 | 键盘 | 手柄 |
|------|------|------|
| 向上导航 | ↑ / W | D-Pad Up / 左摇杆↑ |
| 向下导航 | ↓ / S | D-Pad Down / 左摇杆↓ |
| 向左导航 | ← / A | D-Pad Left / 左摇杆← |
| 向右导航 | → / D | D-Pad Right / 左摇杆→ |
| 确认 | Enter / Space | A 键（索引 1）|
