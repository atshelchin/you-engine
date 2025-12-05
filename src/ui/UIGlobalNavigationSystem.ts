/**
 * 全局 UI 导航输入处理系统
 * 自动处理导航输入，无需手动添加到场景
 */

import { System } from '../core/System';
import { SystemPhase } from '../core/SystemPhase';
import { InputSystem } from '../systems/InputSystem';
import { getNavigationManager } from './UINavigationManager';

/**
 * 全局 UI 导航系统
 * 在引擎层面自动启用，处理所有导航输入
 */
export class UIGlobalNavigationSystem extends System {
  static phase = SystemPhase.PostUpdate; // 后期执行：UI 导航

  private inputSystem: InputSystem | null = null;

  /** 导航重复延迟（毫秒） */
  repeatDelay = 150;
  private lastNavTime = 0;

  /** 摇杆死区阈值 */
  axisThreshold = 0.5;
  private lastAxisX = 0;
  private lastAxisY = 0;

  onCreate(): void {
    this.inputSystem = this.engine.system(InputSystem);
  }

  onUpdate(_dt: number): void {
    if (!this.inputSystem) return;

    const navManager = getNavigationManager();
    if (!navManager.enabled) return;

    const now = Date.now();
    const canNavigate = now - this.lastNavTime >= this.repeatDelay;

    // 检查方向键 / D-Pad
    if (canNavigate) {
      if (this.inputSystem.isPressed('dpadUp') || this.inputSystem.isPressed('up')) {
        if (navManager.navigate('up')) {
          this.lastNavTime = now;
        }
      } else if (this.inputSystem.isPressed('dpadDown') || this.inputSystem.isPressed('down')) {
        if (navManager.navigate('down')) {
          this.lastNavTime = now;
        }
      } else if (this.inputSystem.isPressed('dpadLeft') || this.inputSystem.isPressed('left')) {
        if (navManager.navigate('left')) {
          this.lastNavTime = now;
        }
      } else if (this.inputSystem.isPressed('dpadRight') || this.inputSystem.isPressed('right')) {
        if (navManager.navigate('right')) {
          this.lastNavTime = now;
        }
      }
    }

    // 检查左摇杆（使用阈值检测方向切换）
    if (canNavigate) {
      const axisX = this.inputSystem.axisX();
      const axisY = this.inputSystem.axisY();

      // 检测从中立位置到倾斜的变化（边缘触发）
      const wasNeutralX = Math.abs(this.lastAxisX) < this.axisThreshold;
      const wasNeutralY = Math.abs(this.lastAxisY) < this.axisThreshold;

      if (wasNeutralX && axisX > this.axisThreshold) {
        if (navManager.navigate('right')) {
          this.lastNavTime = now;
        }
      } else if (wasNeutralX && axisX < -this.axisThreshold) {
        if (navManager.navigate('left')) {
          this.lastNavTime = now;
        }
      }

      if (wasNeutralY && axisY > this.axisThreshold) {
        if (navManager.navigate('down')) {
          this.lastNavTime = now;
        }
      } else if (wasNeutralY && axisY < -this.axisThreshold) {
        if (navManager.navigate('up')) {
          this.lastNavTime = now;
        }
      }

      this.lastAxisX = axisX;
      this.lastAxisY = axisY;
    }

    // 检查确认按钮（A 键 / Enter / Space）
    if (this.inputSystem.isPressed('confirm')) {
      navManager.confirm();
    }
  }
}
