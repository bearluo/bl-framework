/**
 * 节点状态枚举
 * 定义行为树节点的执行状态
 */
export enum NodeStatus {
    /** 准备状态（初始状态） */
    READY = 'ready',
    /** 成功状态 */
    SUCCESS = 'success',
    /** 失败状态 */
    FAILURE = 'failure',
    /** 运行中状态 */
    RUNNING = 'running'
}

/**
 * 检查节点状态是否为最终状态
 * @param status 节点状态
 * @returns 是否为最终状态（成功或失败）
 */
export function isTerminalStatus(status: NodeStatus): boolean {
    return status === NodeStatus.SUCCESS || status === NodeStatus.FAILURE;
}

/**
 * 检查节点状态是否为运行中
 * @param status 节点状态
 * @returns 是否为运行中
 */
export function isRunningStatus(status: NodeStatus): boolean {
    return status === NodeStatus.RUNNING;
}

