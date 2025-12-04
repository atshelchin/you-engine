/**
 * Component - 组件基类
 *
 * 极简设计 - 只有必要的接口
 */

import type { Node, IComponent } from './Node';

export abstract class Component implements IComponent {
  node!: Node;
  enabled = true;

  onInit(): void {}
  onUpdate(_dt: number): void {}
  onRender(_ctx: CanvasRenderingContext2D): void {}
  onDestroy(): void {}

  enable(): this {
    this.enabled = true;
    return this;
  }

  disable(): this {
    this.enabled = false;
    return this;
  }

  getComponent<T extends Component>(ComponentClass: new () => T): T | null {
    return this.node.getComponent(ComponentClass);
  }

  destroy(): void {
    this.node.removeComponent(this);
  }
}
