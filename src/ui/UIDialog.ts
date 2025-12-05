/**
 * UI 对话框组件
 * 支持 alert、confirm、custom 类型
 */

import { UIElement, type UIElementProps } from './UIElement';
import { UIButton } from './UIButton';
import { UIPanel } from './UIPanel';
import { UIText } from './UIText';

export type UIDialogType = 'alert' | 'confirm' | 'custom';

/** 对话框属性 */
export interface UIDialogProps extends UIElementProps {
  type?: UIDialogType;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  titleFontSize?: number;
  messageFontSize?: number;
  buttonFontSize?: number;
  fontFamily?: string;
  titleColor?: string;
  messageColor?: string;
  backgroundColor?: string;
  overlayColor?: string;
  borderRadius?: number;
  padding?: number;
}

/**
 * UI 对话框
 */
export class UIDialog extends UIElement {
  type: UIDialogType = 'alert';
  title = '';
  message = '';
  confirmText = 'OK';
  cancelText = 'Cancel';
  onConfirm?: () => void;
  onCancel?: () => void;

  titleFontSize = 24;
  messageFontSize = 16;
  buttonFontSize = 16;
  fontFamily = 'sans-serif';
  titleColor = '#ffffff';
  messageColor = '#cccccc';
  backgroundColor = '#1a1a1a';
  overlayColor = 'rgba(0, 0, 0, 0.7)';
  borderRadius = 8;
  padding = 20;

  private overlay!: UIPanel;
  private panel!: UIPanel;
  private titleText!: UIText;
  private messageText!: UIText;
  private confirmButton!: UIButton;
  private cancelButton?: UIButton;

  constructor(props: UIDialogProps = {}) {
    super(props);
    Object.assign(this, props);

    // 对话框默认居中且填满屏幕
    if (!this.width) this.width = 800;
    if (!this.height) this.height = 600;

    this.setupDialog();
  }

  /**
   * 设置对话框内容
   */
  private setupDialog(): void {
    // 计算对话框尺寸
    const dialogWidth = Math.min(500, this.width - 100);
    const dialogHeight = 200;
    const dialogX = (this.width - dialogWidth) / 2;
    const dialogY = (this.height - dialogHeight) / 2;

    // 创建半透明遮罩
    this.overlay = new UIPanel({
      x: 0,
      y: 0,
      width: this.width,
      height: this.height,
      backgroundColor: this.overlayColor,
    });

    // 创建对话框面板
    this.panel = new UIPanel({
      x: dialogX,
      y: dialogY,
      width: dialogWidth,
      height: dialogHeight,
      backgroundColor: this.backgroundColor,
      borderRadius: this.borderRadius,
    });

    // 标题
    this.titleText = new UIText({
      x: dialogX + this.padding,
      y: dialogY + this.padding,
      text: this.title,
      fontSize: this.titleFontSize,
      fontFamily: this.fontFamily,
      color: this.titleColor,
      textAlign: 'left',
    });

    // 消息
    this.messageText = new UIText({
      x: dialogX + this.padding,
      y: dialogY + this.padding + this.titleFontSize + 20,
      text: this.message,
      fontSize: this.messageFontSize,
      fontFamily: this.fontFamily,
      color: this.messageColor,
      textAlign: 'left',
    });

    // 按钮
    const buttonWidth = 100;
    const buttonHeight = 40;
    const buttonY = dialogY + dialogHeight - this.padding - buttonHeight;

    if (this.type === 'confirm') {
      // 确认和取消按钮
      const totalButtonWidth = buttonWidth * 2 + 10;
      const startX = dialogX + (dialogWidth - totalButtonWidth) / 2;

      this.cancelButton = new UIButton({
        x: startX,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight,
        text: this.cancelText,
        fontSize: this.buttonFontSize,
        onClick: () => {
          this.onCancel?.();
          this.close();
        },
      });

      this.confirmButton = new UIButton({
        x: startX + buttonWidth + 10,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight,
        text: this.confirmText,
        fontSize: this.buttonFontSize,
        onClick: () => {
          this.onConfirm?.();
          this.close();
        },
      });
    } else {
      // 只有确认按钮
      this.confirmButton = new UIButton({
        x: dialogX + (dialogWidth - buttonWidth) / 2,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight,
        text: this.confirmText,
        fontSize: this.buttonFontSize,
        onClick: () => {
          this.onConfirm?.();
          this.close();
        },
      });
    }
  }

  /**
   * 显示对话框
   */
  show(): this {
    this.visible = true;
    return this;
  }

  /**
   * 关闭对话框
   */
  close(): this {
    this.visible = false;
    return this;
  }

  /**
   * 设置消息
   */
  setMessage(message: string): this {
    this.message = message;
    this.messageText.text = message;
    return this;
  }

  /**
   * 设置标题
   */
  setTitle(title: string): this {
    this.title = title;
    this.titleText.text = title;
    return this;
  }

  /**
   * 处理点击
   */
  handleClick(x: number, y: number): boolean {
    if (!this.visible) return false;

    const pos = this.getGlobalPosition();
    const relativeX = x - pos.x;
    const relativeY = y - pos.y;

    // 检查确认按钮点击
    if (this.confirmButton.containsPoint(relativeX, relativeY)) {
      this.onConfirm?.();
      this.close();
      return true;
    }

    // 检查取消按钮点击
    if (this.cancelButton?.containsPoint(relativeX, relativeY)) {
      this.onCancel?.();
      this.close();
      return true;
    }

    // 点击遮罩外部不关闭对话框
    return true; // 阻止事件传递
  }

  update(dt: number): void {
    if (!this.visible) return;

    super.update(dt);
    this.confirmButton.update(dt);
    this.cancelButton?.update(dt);
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    const pos = this.getGlobalPosition();

    ctx.save();
    ctx.translate(pos.x, pos.y);

    // 绘制遮罩
    this.overlay.render(ctx);

    // 绘制对话框面板
    this.panel.render(ctx);

    // 绘制标题
    if (this.title) {
      this.titleText.render(ctx);
    }

    // 绘制消息
    if (this.message) {
      this.messageText.render(ctx);
    }

    // 绘制按钮
    this.confirmButton.render(ctx);
    this.cancelButton?.render(ctx);

    ctx.restore();
  }

  destroy(): void {
    this.confirmButton?.destroy();
    this.cancelButton?.destroy();
  }
}

/**
 * 快捷方法：显示 alert 对话框
 */
export function showAlert(message: string, title = 'Alert', onConfirm?: () => void): UIDialog {
  const dialog = new UIDialog({
    type: 'alert',
    title,
    message,
    onConfirm,
  });
  dialog.show();
  return dialog;
}

/**
 * 快捷方法：显示 confirm 对话框
 */
export function showConfirm(
  message: string,
  title = 'Confirm',
  onConfirm?: () => void,
  onCancel?: () => void
): UIDialog {
  const dialog = new UIDialog({
    type: 'confirm',
    title,
    message,
    onConfirm,
    onCancel,
  });
  dialog.show();
  return dialog;
}
