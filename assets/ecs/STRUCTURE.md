# ECS 框架目录结构

## 核心代码 (extensions/bl-framework/assets/ecs/)

```
ecs/
├── README.md                    # 框架说明文档
├── STRUCTURE.md                 # 目录结构说明（本文件）
├── index.ts                     # 框架总入口，导出所有公共 API
│
├── types/                       # 类型定义
│   └── index.ts                # 所有类型接口定义
│
├── core/                        # 核心模块
│   ├── index.ts                # 核心模块导出
│   ├── Entity.ts               # 实体类
│   ├── Component.ts            # 组件基类
│   ├── System.ts               # 系统基类
│   ├── World.ts                # ECS 世界（框架核心）
│   ├── Query.ts                # 查询器（用于查找符合条件的实体）
│   ├── EntityManager.ts        # 实体管理器
│   ├── ComponentManager.ts     # 组件管理器
│   └── SystemManager.ts        # 系统管理器
│
├── decorators/                  # 装饰器
│   ├── index.ts                # 装饰器导出
│   ├── component.ts            # 组件装饰器
│   └── system.ts               # 系统装饰器
│
└── utils/                       # 工具类
    ├── index.ts                # 工具类导出
    ├── ComponentPool.ts        # 组件对象池
    └── BitSet.ts               # 位集合（用于高性能组件匹配）
```

## 示例和测试 (assets/test/ecs/)

```
test/ecs/
├── README.md                    # 示例说明文档
├── ECSExample.ts               # 基础示例代码
├── ECSExample.scene            # 示例场景（需手动创建）
│
├── components/                  # 示例组件
│   ├── TransformComponent.ts   # 变换组件
│   ├── VelocityComponent.ts    # 速度组件
│   ├── PlayerComponent.ts      # 玩家组件
│   └── HealthComponent.ts      # 生命值组件
│
└── systems/                     # 示例系统
    ├── MovementSystem.ts       # 移动系统
    └── RenderSystem.ts         # 渲染系统
```

## 模块说明

### 核心模块 (core/)

#### Entity（实体）
- 实体是游戏对象的唯一标识符
- 轻量级，仅包含 ID 和基本状态
- 支持对象池复用

#### Component（组件）
- 组件是纯数据容器
- 所有自定义组件都应继承 `Component` 基类
- 支持对象池自动管理
- 提供 `reset()` 方法用于对象池复用

#### System（系统）
- 系统包含游戏逻辑
- 通过 `Query` 查询需要处理的实体
- 支持优先级控制执行顺序
- 提供生命周期钩子：`onInit`, `onUpdate`, `onDestroy`, `onEnable`, `onDisable`

#### World（世界）
- ECS 框架的核心管理器
- 统一管理实体、组件、系统
- 提供查询缓存机制
- 支持调试模式

#### Query（查询器）
- 高性能实体查询
- 支持 `all`（与）、`any`（或）、`none`（非）条件
- 自动缓存查询结果
- 增量更新机制

#### 管理器
- **EntityManager**: 管理实体的创建、销毁、对象池
- **ComponentManager**: 管理组件的注册、附加、移除、对象池
- **SystemManager**: 管理系统的注册、更新、优先级排序

### 类型定义 (types/)

定义了框架所有的 TypeScript 类型接口：
- `EntityId`: 实体ID类型
- `ComponentType`: 组件类型
- `IComponent`: 组件接口
- `ISystem`: 系统接口
- `QueryConfig`: 查询配置
- `WorldConfig`: World配置

### 装饰器 (decorators/)

提供装饰器支持（可选使用）：
- `@component`: 标记组件类
- `@system`: 标记系统类，可设置优先级

### 工具类 (utils/)

#### ComponentPool
- 组件对象池实现
- 自动管理组件对象的创建和复用
- 减少 GC 压力，提升性能

#### BitSet
- 位集合数据结构（已集成到 Query 和 ComponentManager）
- 用于高性能的组件匹配
- 支持位运算优化查询
- 实际应用：
  - ComponentManager 为每个实体维护一个 BitSet 记录其组件
  - Query 使用 BitSet 进行快速组件匹配
  - 相比 Set 遍历，位运算性能提升显著（O(1) vs O(n)）

## 使用流程

1. **创建 World**
   ```typescript
   const world = new World({ debug: true });
   ```

2. **注册系统**
   ```typescript
   world.registerSystem(MovementSystem);
   world.registerSystem(RenderSystem);
   ```

3. **创建实体并添加组件**
   ```typescript
   const entity = world.createEntity('Player');
   world.addComponent(entity.id, TransformComponent);
   world.addComponent(entity.id, VelocityComponent);
   ```

4. **在系统中处理实体**
   ```typescript
   class MovementSystem extends System {
       private query!: Query;
       
       onInit() {
           this.query = this.world.createQuery({
               all: [TransformComponent, VelocityComponent]
           });
       }
       
       onUpdate(dt: number) {
           this.query.forEach(entity => {
               // 处理实体
           });
       }
   }
   ```

5. **更新 World**
   ```typescript
   update(dt: number) {
       world.update(dt);
   }
   ```

6. **清理资源**
   ```typescript
   world.destroy();
   ```

## 设计特点

### 1. 高性能
- 对象池技术减少 GC
- 查询结果缓存
- 位集合优化组件匹配

### 2. 易用性
- 清晰的 API 设计
- TypeScript 类型安全
- 完整的生命周期管理

### 3. 灵活性
- 可配置的对象池大小
- 系统优先级控制
- 支持动态添加/移除组件和系统

### 4. 调试友好
- 可选的调试模式
- 详细的日志输出
- 统计信息查询

## 性能建议

1. 合理设置初始池大小，避免频繁扩容
2. 复用实体和组件，减少创建/销毁
3. 系统按优先级合理分组
4. 避免在热路径中使用 `getComponent`，改用缓存
5. 大量实体场景考虑空间分区优化

## 扩展方向

1. **序列化支持**: 实体和组件的序列化/反序列化
2. **网络同步**: 组件状态同步
3. **预制体系统**: 基于 ECS 的预制体
4. **事件系统**: 组件变更事件通知
5. **并行处理**: 系统并行更新

