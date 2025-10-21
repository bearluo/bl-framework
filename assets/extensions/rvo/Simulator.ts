
import Vector2D from "./Vector2D";
import Obstacle from "./Obstacle";
import Agent from "./Agent";
import RVOMath from "./RVOMath";
import KdTree from "./KdTree";
import Line from "./Line";


export default class Simulator {
  private _nextAgentId = 0;
  
  // agents 数组用于快速遍历（KdTree需要）
  agents: Agent[] = [];
  
  // agentMap 用于通过 ID 快速访问 O(1)
  agentMap: Map<number, Agent> = new Map<number, Agent>();
  
  // goals 用 Map 存储，与 agent ID 对应
  private goalsMap: Map<number, Vector2D> = new Map<number, Vector2D>();
  
  // 脏标记：agents 数组是否需要重建
  private _agentsDirty = false;
  
  obstacles: Obstacle[] = [];
  kdTree: KdTree = new KdTree();

  timeStep = 0.25;

  private defaultAgent: Agent; // Agent

  private time = 0;

  // 临时向量，避免频繁创建对象
  private _tempVec = new Vector2D();

  constructor() {
    this.kdTree.simulator = this;
    this.kdTree.MAXLEAF_SIZE = 1000;
  }

  /**
   * 刷新 agents 数组（从 agentMap 重建）
   * 只在需要时调用（脏标记为 true）
   */
  private _refreshAgents(): void {
    if (!this._agentsDirty) return;
    
    // 从 Map 重建数组
    this.agents = Array.from(this.agentMap.values());
    this._agentsDirty = false;
  }

  /**
   * 手动标记 agents 为脏（通常不需要，内部自动管理）
   */
  markAgentsDirty(): void {
    this._agentsDirty = true;
  }

  getGlobalTime(): number {
    return this.time;
  }

  getNumAgents(): number {
    // 如果数组是脏的，使用 Map 的大小（更准确）
    return this._agentsDirty ? this.agentMap.size : this.agents.length;
  }

  getTimeStep(): number {
    return this.timeStep;
  }

  /**
   * 通过 ID 获取 Agent
   */
  getAgent(agentId: number): Agent | undefined {
    return this.agentMap.get(agentId);
  }

  /**
   * 设置 Agent 的期望速度
   * @param agentId Agent ID
   */
  setAgentPrefVelocity(agentId: number, vx: number, vy: number) {
    const agent = this.agentMap.get(agentId);
    if (!agent) return;
    
    if (!agent.prefVelocity) {
      agent.prefVelocity = new Vector2D();
    }
    agent.prefVelocity.set(vx, vy);
  }

  /**
   * 设置 Agent 位置
   * @param agentId Agent ID
   */
  setAgentPosition(agentId: number, x: number, y: number) {
    const agent = this.agentMap.get(agentId);
    if (!agent) return;
    
    if (!agent.position) {
      agent.position = new Vector2D();
    }
    agent.position.set(x, y);
  }

  /**
   * 设置 Agent 目标
   * @param agentId Agent ID
   */
  setAgentGoal(agentId: number, x: number, y: number) {
    let goal = this.goalsMap.get(agentId);
    if (!goal) {
      goal = new Vector2D();
      this.goalsMap.set(agentId, goal);
    }
    goal.set(x, y);
  }

  setTimeStep(timeStep: number) {
    this.timeStep = timeStep;
  }

  /**
   * 获取 Agent 位置
   * @param agentId Agent ID
   */
  getAgentPosition(agentId: number): Vector2D | undefined {
    const agent = this.agentMap.get(agentId);
    return agent?.position;
  }

  /**
   * 获取 Agent 期望速度
   * @param agentId Agent ID
   */
  getAgentPrefVelocity(agentId: number): Vector2D | undefined {
    const agent = this.agentMap.get(agentId);
    return agent?.prefVelocity;
  }

  /**
   * 获取 Agent 速度
   * @param agentId Agent ID
   */
  getAgentVelocity(agentId: number): Vector2D | undefined {
    const agent = this.agentMap.get(agentId);
    return agent?.velocity;
  }

  /**
   * 获取 Agent 半径
   * @param agentId Agent ID
   */
  getAgentRadius(agentId: number): number | undefined {
    const agent = this.agentMap.get(agentId);
    return agent?.radius;
  }

  /**
   * 获取 Agent ORCA 线
   * @param agentId Agent ID
   */
  getAgentOrcaLines(agentId: number): Line[] | undefined {
    const agent = this.agentMap.get(agentId);
    return agent?.orcaLines;
  }

  /**
   * 添加 Agent
   * @param position 初始位置
   * @returns Agent ID
   */
  addAgent(position: Vector2D = null): number {
    if (!this.defaultAgent) {
      throw new Error("no default agent");
    }

    if (!position) position = new Vector2D(0, 0);

    const agent = new Agent();

    agent.position = position;
    agent.maxNeighbors = this.defaultAgent.maxNeighbors;
    agent.radius = this.defaultAgent.radius;
    agent.maxSpeed = this.defaultAgent.maxSpeed;
    agent.neighborDist = this.defaultAgent.neighborDist;
    agent.timeHorizon = this.defaultAgent.timeHorizon;
    agent.timeHorizonObst = this.defaultAgent.timeHorizonObst;
    agent.velocity = this.defaultAgent.velocity.clone();
    agent.simulator = this;

    // 分配唯一 ID
    agent.id = this._nextAgentId++;

    // 添加到 Map（O(1) 查找）
    this.agentMap.set(agent.id, agent);
    
    // 设置初始目标
    this.goalsMap.set(agent.id, position.clone());

    // 标记数组为脏（需要重建）
    this._agentsDirty = true;

    return agent.id;
  }

  /**
   * 通过 ID 移除 Agent
   * @param agentId Agent ID
   */
  removeAgent(agentId: number): boolean {
    const agent = this.agentMap.get(agentId);
    if (!agent) return false;

    // 从 Map 中删除 O(1)
    this.agentMap.delete(agentId);
    this.goalsMap.delete(agentId);

    // 标记数组为脏（需要重建）
    // 不立即操作数组，延迟到 run() 时刷新
    this._agentsDirty = true;

    return true;
  }

  /**
   * 通过 Agent 对象移除（兼容旧API）
   */
  removeAgentByObject(agent: Agent): boolean {
    return this.removeAgent(agent.id);
  }

  //  /** float */ neighborDist, /** int */ maxNeighbors, /** float */ timeHorizon, /** float */ timeHorizonObst, /** float */ radius, /** float*/ maxSpeed, /** Vector2 */ velocity)
  /**
   * 设置默认代理
   * @param neighborDist 周围邻居距离
   * @param maxNeighbors 最大邻居数
   * @param timeHorizon 模拟计算的新代理的速度相对于其他代理是安全的默认最小时间。这个数字越大，代理体对其他代理体的存在做出响应的速度就越快，但代理体选择其速度的自由度就越小。必须为正数。
   * @param timeHorizonObst 模拟计算的新代理的速度相对于障碍物是安全的默认最小时间。这个数字越大，代理对障碍物的存在做出反应的速度就越快，但代理在选择速度方面的自由度就越小。必须为正数。
   * @param radius 代理半径
   * @param maxSpeed 最大速度
   * @param velocityX 初始速度X
   * @param velocityY 初始速度Y
   */
  setAgentDefaults(neighborDist: number,
    maxNeighbors: number,
    timeHorizon: number,
    timeHorizonObst: number,
    radius: number,
    maxSpeed: number,
    velocityX: number = 0, velocityY: number = 0) {
    if (!this.defaultAgent) {
      this.defaultAgent = new Agent();
    }

    this.defaultAgent.maxNeighbors = maxNeighbors;
    this.defaultAgent.maxSpeed = maxSpeed;
    this.defaultAgent.neighborDist = neighborDist;
    this.defaultAgent.radius = radius;
    this.defaultAgent.timeHorizon = timeHorizon;
    this.defaultAgent.timeHorizonObst = timeHorizonObst;
    if (!this.defaultAgent.velocity) {
      this.defaultAgent.velocity = new Vector2D();
    }
    this.defaultAgent.velocity.set(velocityX, velocityY);
    this.defaultAgent.simulator = this;
  }

  run() {
    // 刷新 agents 数组（如果有添加/删除操作）
    this._refreshAgents();

    // 构建 KdTree
    this.kdTree.buildAgentTree();

    // 更新所有 Agent
    for (let i = 0; i < this.agents.length; i++) {
      this.agents[i].computeNeighbors();
      this.agents[i].computeNewVelocity();
      this.agents[i].update();
    }

    this.time += this.timeStep;
  }
  /**
   * 检查是否到达目标点
   * @returns 是否到达目标点
   */
  reachedGoal(): boolean {
    for (const agent of this.agents) {
      const goal = this.goalsMap.get(agent.id);
      if (!goal) continue;
      
      // 使用临时向量避免创建新对象
      this._tempVec.copy(goal).subSelf(agent.position);
      if (RVOMath.absSq(this._tempVec) > RVOMath.RVO_EPSILON) {
        return false;
      }
    }
    return true;
  }

  /**
   * 获取 Agent 的目标
   * @param agentId Agent ID
   */
  getGoal(agentId: number): Vector2D | undefined {
    return this.goalsMap.get(agentId);
  }

  /**
   * 获取所有 Agent ID
   */
  getAllAgentIds(): number[] {
    return Array.from(this.agentMap.keys());
  }

  /**
   * 遍历所有 Agent
   */
  forEachAgent(callback: (agent: Agent, agentId: number) => void) {
    this.agentMap.forEach((agent, agentId) => callback(agent, agentId));
  }
  /**
   * 添加障碍物
   * @param vertices 障碍物顶点
   * @returns 障碍物ID
   */
  addObstacle(vertices: Vector2D[]): number {
    if (vertices.length < 2) {
      return -1;
    }

    var obstacleNo = this.obstacles.length;

    for (var i = 0, len = vertices.length; i < len; ++i) {
      var obstacle = new Obstacle();
      obstacle.point = vertices[i];
      if (i != 0) {
        obstacle.previous = this.obstacles[this.obstacles.length - 1];
        obstacle.previous.next = obstacle;
      }
      if (i == vertices.length - 1) {
        obstacle.next = this.obstacles[obstacleNo];
        obstacle.next.previous = obstacle;
      }
      obstacle.unitDir = RVOMath.normalize(vertices[(i == vertices.length - 1 ? 0 : i + 1)].minus(vertices[i]))

      if (vertices.length == 2) {
        obstacle.isConvex = true;
      } else {
        obstacle.isConvex = (
          RVOMath.leftOf(vertices[(i == 0 ? vertices.length - 1 : i - 1)],
            vertices[i], vertices[(i == vertices.length - 1 ? 0 : i + 1)]) >= 0);
      }

      obstacle.id = this.obstacles.length;

      this.obstacles.push(obstacle);
    }

    return obstacleNo;
  }

  /**
   * 处理障碍物
   */
  processObstacles() {
    this.kdTree.buildObstacleTree();
  }

  /**
   * 查询两点之间是否可见
   * @param point1 起点
   * @param point2 终点
   * @param radius 半径
   * @returns 是否可见
   */
  queryVisibility(point1: Vector2D, point2: Vector2D, radius: number): boolean {
    return this.kdTree.queryVisibility(point1, point2, radius);
  }

  getObstacles(): Obstacle[] {
    return this.obstacles;
  }

}
