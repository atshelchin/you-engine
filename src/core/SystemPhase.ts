/**
 * 系统执行阶段
 * 定义系统的执行顺序，比手动设置 priority 更清晰
 */
export const SystemPhase = {
  /** 最早执行：输入、事件收集 */
  PreUpdate: -100,

  /** 早期执行：摄像机、导航 */
  Early: -50,

  /** 常规执行：游戏逻辑、补间、动画 */
  Update: 0,

  /** 物理执行：物理模拟、流体 */
  Physics: 5,

  /** 后期执行：粒子、后处理 */
  PostUpdate: 50,

  /** 渲染执行：渲染系统 */
  Render: 100,
} as const;

export type SystemPhase = (typeof SystemPhase)[keyof typeof SystemPhase];

/**
 * 根据 SystemPhase 排序系统
 */
export function sortSystemsByPhase<T extends { phase?: SystemPhase }>(systems: T[]): T[] {
  return systems.sort((a, b) => {
    const phaseA = a.phase ?? SystemPhase.Update;
    const phaseB = b.phase ?? SystemPhase.Update;
    return phaseA - phaseB;
  });
}
