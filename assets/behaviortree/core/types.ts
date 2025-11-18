/**
 * 行为树类型定义
 */

import { Blackboard } from './Blackboard';
import { NodeStatus } from './NodeStatus';

/**
 * 条件函数类型
 */
export type ConditionFunction = (blackboard: Blackboard) => boolean;

/**
 * 动作函数类型
 */
export type ActionFunction = (blackboard: Blackboard) => NodeStatus;

/**
 * 并行策略
 */
export enum ParallelPolicy {
    /** 全部成功才成功 */
    ALL_SUCCESS = 'all_success',
    /** 全部失败才失败 */
    ALL_FAILURE = 'all_failure',
    /** 任一成功即成功 */
    ANY_SUCCESS = 'any_success',
    /** 任一失败即失败 */
    ANY_FAILURE = 'any_failure'
}

/**
 * 装饰器类型
 */
export enum DecoratorType {
    /** 取反 */
    INVERTER = 'inverter',
    /** 重复 */
    REPEATER = 'repeater',
    /** 直到成功 */
    UNTIL_SUCCESS = 'until_success',
    /** 直到失败 */
    UNTIL_FAILURE = 'until_failure'
}

/**
 * 装饰器配置
 */
export interface DecoratorConfig {
    /** 重复次数（用于 REPEATER） */
    count?: number;
    /** 是否无限重复 */
    infinite?: boolean;
}

