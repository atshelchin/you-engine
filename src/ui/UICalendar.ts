/**
 * UI 日历组件
 * 可视化月历选择日期，支持导航
 */

import { UIElement, type UIElementProps } from './UIElement';
import { getNavigationManager } from './UINavigationManager';

/** 日历属性 */
export interface UICalendarProps extends UIElementProps {
  /** 当前选中日期 */
  selectedDate?: Date;
  /** 显示的月份（默认当前月） */
  displayMonth?: Date;
  /** 字体大小 */
  fontSize?: number;
  /** 字体 */
  fontFamily?: string;
  /** 背景色 */
  backgroundColor?: string;
  /** 标题栏背景色 */
  headerBackgroundColor?: string;
  /** 文字颜色 */
  textColor?: string;
  /** 周末文字颜色 */
  weekendColor?: string;
  /** 选中日期背景色 */
  selectedBackgroundColor?: string;
  /** 今天的边框颜色 */
  todayBorderColor?: string;
  /** 非本月日期颜色 */
  otherMonthColor?: string;
  /** 格子大小 */
  cellSize?: number;
  /** 日期改变回调 */
  onChange?: (date: Date) => void;
  /** 是否自动注册到导航系统 */
  autoRegisterNavigation?: boolean;
}

/** 周几的名称 */
const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六'];
const MONTH_NAMES = [
  '一月',
  '二月',
  '三月',
  '四月',
  '五月',
  '六月',
  '七月',
  '八月',
  '九月',
  '十月',
  '十一月',
  '十二月',
];

/**
 * UI 日历
 */
export class UICalendar extends UIElement {
  selectedDate: Date;
  displayMonth: Date;
  fontSize = 14;
  fontFamily = 'sans-serif';
  backgroundColor = '#1a1a1a';
  headerBackgroundColor = '#2a2a2a';
  textColor = '#ffffff';
  weekendColor = '#ff6b6b';
  selectedBackgroundColor = '#4a90d9';
  todayBorderColor = '#4a90d9';
  otherMonthColor = '#666666';
  cellSize = 50;
  onChange?: (date: Date) => void;

  /** 导航焦点状态 */
  private navFocused = false;
  /** 焦点动画进度 */
  private focusAnim = 0;
  /** 是否启用 */
  enabled = true;
  /** 是否自动注册到导航 */
  private autoRegisterNavigation = true;
  /** 是否已注册 */
  private _registered = false;

  /** 当前选中的格子索引（0-41，7x6 网格） */
  private selectedCellIndex = -1;
  /** 日历数据（42天，包含上月末尾和下月开头） */
  private calendarDays: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  constructor(props: UICalendarProps = {}) {
    super(props);

    // 默认选中今天
    this.selectedDate = props.selectedDate || new Date();
    this.displayMonth = props.displayMonth || new Date(this.selectedDate);

    Object.assign(this, props);

    // 自动计算尺寸
    if (!this.width) this.width = this.cellSize * 7 + 20; // 7天 + 边距
    if (!this.height) this.height = this.cellSize * 8 + 40; // 标题栏 + 星期栏 + 6周

    // 生成日历数据
    this.generateCalendarDays();

    // 查找当前选中日期的索引
    this.updateSelectedCellIndex();

    // 自动注册到全局导航管理器
    if (this.autoRegisterNavigation) {
      getNavigationManager().register(this);
      this._registered = true;
    }
  }

  /**
   * 生成日历数据（42天）
   */
  private generateCalendarDays(): void {
    this.calendarDays = [];

    const year = this.displayMonth.getFullYear();
    const month = this.displayMonth.getMonth();

    // 本月第一天
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0-6 (周日-周六)

    // 本月最后一天
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // 上个月的最后几天
    const prevMonthLastDay = new Date(year, month, 0);
    const prevMonthDays = prevMonthLastDay.getDate();

    // 填充上月末尾的日期
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthDays - i);
      this.calendarDays.push({ date, isCurrentMonth: false });
    }

    // 填充本月日期
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      this.calendarDays.push({ date, isCurrentMonth: true });
    }

    // 填充下月开头的日期（凑满 42 天）
    const remainingCells = 42 - this.calendarDays.length;
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(year, month + 1, day);
      this.calendarDays.push({ date, isCurrentMonth: false });
    }
  }

  /**
   * 更新选中格子的索引
   */
  private updateSelectedCellIndex(): void {
    const selectedTime = this.selectedDate.setHours(0, 0, 0, 0);
    this.selectedCellIndex = this.calendarDays.findIndex(
      (day) => day.date.getTime() === selectedTime
    );
  }

  /**
   * 设置显示的月份
   */
  setDisplayMonth(date: Date): this {
    this.displayMonth = new Date(date);
    this.generateCalendarDays();
    this.updateSelectedCellIndex();
    return this;
  }

  /**
   * 上一个月
   */
  previousMonth(): this {
    const newMonth = new Date(this.displayMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    this.setDisplayMonth(newMonth);
    return this;
  }

  /**
   * 下一个月
   */
  nextMonth(): this {
    const newMonth = new Date(this.displayMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    this.setDisplayMonth(newMonth);
    return this;
  }

  /**
   * 选择日期
   */
  selectDate(date: Date): this {
    this.selectedDate = new Date(date);

    // 如果选中的日期不在当前显示月份，切换月份
    if (
      date.getMonth() !== this.displayMonth.getMonth() ||
      date.getFullYear() !== this.displayMonth.getFullYear()
    ) {
      this.setDisplayMonth(date);
    } else {
      this.updateSelectedCellIndex();
    }

    this.onChange?.(this.selectedDate);
    return this;
  }

  /**
   * 设置导航焦点状态
   */
  setFocused(focused: boolean): void {
    this.navFocused = focused;
  }

  /**
   * 获取导航焦点状态
   */
  isFocused(): boolean {
    return this.navFocused;
  }

  /**
   * 获取边界（用于导航系统）
   */
  getBounds(): { x: number; y: number; width: number; height: number } {
    const pos = this.getGlobalPosition();
    return { x: pos.x, y: pos.y, width: this.width, height: this.height };
  }

  /**
   * 点击事件（用于导航系统）
   */
  onClick = (): void => {
    // 导航系统触发确认时，选择当前聚焦的日期
    if (this.selectedCellIndex >= 0 && this.selectedCellIndex < this.calendarDays.length) {
      const day = this.calendarDays[this.selectedCellIndex];
      this.selectDate(day.date);
    }
  };

  /**
   * 处理点击
   */
  handleClick(x: number, y: number): boolean {
    if (!this.visible || !this.enabled) return false;

    const pos = this.getGlobalPosition();
    const relX = x - pos.x;
    const relY = y - pos.y;

    // 检查是否点击标题栏的按钮
    const headerHeight = 40;
    if (relY < headerHeight) {
      // 上一月按钮
      if (relX < 40) {
        this.previousMonth();
        return true;
      }
      // 下一月按钮
      if (relX > this.width - 40) {
        this.nextMonth();
        return true;
      }
      return false;
    }

    // 检查是否点击日期格子
    const weekdayBarHeight = 30;
    const calendarStartY = headerHeight + weekdayBarHeight;

    if (relY < calendarStartY) return false;

    const gridX = Math.floor((relX - 10) / this.cellSize);
    const gridY = Math.floor((relY - calendarStartY) / this.cellSize);

    if (gridX >= 0 && gridX < 7 && gridY >= 0 && gridY < 6) {
      const cellIndex = gridY * 7 + gridX;
      if (cellIndex >= 0 && cellIndex < this.calendarDays.length) {
        const day = this.calendarDays[cellIndex];
        this.selectDate(day.date);
        return true;
      }
    }

    return false;
  }

  update(dt: number): void {
    super.update(dt);

    // 焦点动画
    const targetFocus = this.navFocused ? 1 : 0;
    const animSpeed = dt / 200;

    if (this.focusAnim < targetFocus) {
      this.focusAnim = Math.min(1, this.focusAnim + animSpeed);
    } else if (this.focusAnim > targetFocus) {
      this.focusAnim = Math.max(0, this.focusAnim - animSpeed);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    const pos = this.getGlobalPosition();

    ctx.save();

    // 导航焦点发光效果
    if (this.focusAnim > 0) {
      ctx.shadowColor = `rgba(74, 144, 217, ${this.focusAnim})`;
      ctx.shadowBlur = 20 * this.focusAnim;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // 绘制背景
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(pos.x, pos.y, this.width, this.height);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // 绘制标题栏（年月 + 切换按钮）
    const headerHeight = 40;
    ctx.fillStyle = this.headerBackgroundColor;
    ctx.fillRect(pos.x, pos.y, this.width, headerHeight);

    ctx.fillStyle = this.textColor;
    ctx.font = `bold ${this.fontSize + 4}px ${this.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const year = this.displayMonth.getFullYear();
    const month = this.displayMonth.getMonth();
    const title = `${year}年 ${MONTH_NAMES[month]}`;
    ctx.fillText(title, pos.x + this.width / 2, pos.y + headerHeight / 2);

    // 上一月按钮
    ctx.font = `${this.fontSize + 6}px ${this.fontFamily}`;
    ctx.fillText('‹', pos.x + 20, pos.y + headerHeight / 2);

    // 下一月按钮
    ctx.fillText('›', pos.x + this.width - 20, pos.y + headerHeight / 2);

    // 绘制星期栏
    const weekdayBarY = pos.y + headerHeight;
    const weekdayBarHeight = 30;

    ctx.font = `${this.fontSize}px ${this.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < 7; i++) {
      const x = pos.x + 10 + i * this.cellSize + this.cellSize / 2;
      const y = weekdayBarY + weekdayBarHeight / 2;

      // 周末用红色
      ctx.fillStyle = i === 0 || i === 6 ? this.weekendColor : this.textColor;
      ctx.fillText(WEEKDAY_NAMES[i], x, y);
    }

    // 绘制日期格子
    const calendarStartY = weekdayBarY + weekdayBarHeight;
    const today = new Date();
    const todayTime = today.setHours(0, 0, 0, 0);

    for (let i = 0; i < this.calendarDays.length; i++) {
      const day = this.calendarDays[i];
      const row = Math.floor(i / 7);
      const col = i % 7;

      const cellX = pos.x + 10 + col * this.cellSize;
      const cellY = calendarStartY + row * this.cellSize;

      // 选中状态
      const isSelected = i === this.selectedCellIndex;
      const isToday = day.date.getTime() === todayTime;
      const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;

      // 绘制选中背景
      if (isSelected) {
        ctx.fillStyle = this.selectedBackgroundColor;
        const padding = 4;
        ctx.beginPath();
        ctx.roundRect(
          cellX + padding,
          cellY + padding,
          this.cellSize - padding * 2,
          this.cellSize - padding * 2,
          6
        );
        ctx.fill();
      }

      // 绘制今天的边框
      if (isToday && !isSelected) {
        ctx.strokeStyle = this.todayBorderColor;
        ctx.lineWidth = 2;
        const padding = 4;
        ctx.beginPath();
        ctx.roundRect(
          cellX + padding,
          cellY + padding,
          this.cellSize - padding * 2,
          this.cellSize - padding * 2,
          6
        );
        ctx.stroke();
      }

      // 绘制日期文字
      ctx.font = `${this.fontSize}px ${this.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (!day.isCurrentMonth) {
        ctx.fillStyle = this.otherMonthColor;
      } else if (isSelected) {
        ctx.fillStyle = '#ffffff';
      } else if (isWeekend) {
        ctx.fillStyle = this.weekendColor;
      } else {
        ctx.fillStyle = this.textColor;
      }

      ctx.fillText(
        day.date.getDate().toString(),
        cellX + this.cellSize / 2,
        cellY + this.cellSize / 2
      );
    }

    ctx.restore();
  }

  /**
   * 销毁（从导航系统中移除）
   */
  destroy(): void {
    if (this._registered) {
      getNavigationManager().unregister(this);
      this._registered = false;
    }
  }
}
