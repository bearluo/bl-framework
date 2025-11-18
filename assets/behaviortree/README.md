# 行为树系统

## 📋 概述

行为树（Behavior Tree）是一种用于控制 AI 行为的树状结构，通过组合不同的节点类型来实现复杂的行为逻辑。

## 🚀 快速开始

### 基本使用

```typescript
import { BehaviorTreeBuilder, NodeStatus } from 'bl-framework/behaviortree';

// 创建行为树
const builder = new BehaviorTreeBuilder();
const tree = builder
    .selector('root')
        .condition('hasHealth', (bb) => bb.get('health', 0) > 0)
        .sequence('attack')
            .condition('hasTarget', (bb) => bb.get('hasTarget', false))
            .action('attack', (bb) => {
                // 执行攻击
                return NodeStatus.SUCCESS;
            })
        .end()
    .end()
    .build();

// 执行行为树
const status = tree.execute();
```

### 与 ECS 集成

```typescript
import { World } from 'bl-framework/ecs';
import { BehaviorTreeComponent, BehaviorTreeSystem } from 'bl-framework/behaviortree';

// 创建 World 并注册系统
const world = new World();
world.addSystem(new BehaviorTreeSystem());

// 创建 Entity 并添加行为树组件
const entity = world.createEntity('AI');
const btComponent = entity.addComponent(BehaviorTreeComponent);
btComponent.setBehaviorTree(tree);

// 系统会自动更新所有 Entity 的行为树
world.update(deltaTime);
```

## 📚 核心概念

### 节点类型

#### 组合节点（Composite Nodes）

- **Selector（选择器）**: 依次执行子节点，直到有一个成功
- **Sequence（序列）**: 依次执行子节点，直到有一个失败
- **Parallel（并行）**: 同时执行所有子节点

#### 装饰器节点（Decorator Nodes）

- **Inverter（取反）**: 反转子节点的结果
- **Repeater（重复）**: 重复执行子节点指定次数
- **UntilSuccess（直到成功）**: 重复执行直到成功
- **UntilFailure（直到失败）**: 重复执行直到失败

#### 叶子节点（Leaf Nodes）

- **Condition（条件）**: 检查条件，返回成功或失败
- **Action（动作）**: 执行动作，返回成功、失败或运行中

### 黑板（Blackboard）

黑板用于在节点之间共享数据：

```typescript
import { Blackboard } from 'bl-framework/behaviortree';

const blackboard = new Blackboard();
blackboard.set('health', 100);
blackboard.set('target', enemy);

const health = blackboard.get<number>('health', 0);
```

### Entity 数据绑定

可以将 Entity 的 Component 属性绑定到黑板：

```typescript
import { TransformComponent } from 'bl-framework/ecs';

// 绑定 Entity 数据
btComponent.blackboard.bindEntityProperty(
    entity.id,
    TransformComponent,
    'position',
    'position'
);

// 在行为树中使用
const position = blackboard.get<Vec3>('position');
```

## 🔧 API 参考

### BehaviorTreeBuilder

链式 API 构建行为树：

```typescript
const builder = new BehaviorTreeBuilder();
const tree = builder
    .selector('root')           // 创建选择器
    .sequence('attack')         // 创建序列
        .condition('check', fn)  // 添加条件
        .action('do', fn)        // 添加动作
    .end()                       // 返回父节点
    .build();                    // 构建行为树
```

### 节点状态

- `NodeStatus.SUCCESS`: 成功
- `NodeStatus.FAILURE`: 失败
- `NodeStatus.RUNNING`: 运行中
- `NodeStatus.READY`: 准备就绪

## 📖 更多文档

- [Blackboard Entity 绑定使用说明](../../../docs/Blackboard_Entity绑定使用说明.md)
- [类型改进说明](../../../docs/类型改进说明.md)
- [实现进度](../../../docs/IMPLEMENT_行为树实现进度.md)

## 🧪 测试

测试示例位于 `assets/test/behaviortree/` 目录：

- `BasicTest.ts` - 基础功能测试
- `ECSIntegrationTest.ts` - ECS 集成测试

## 📝 示例

### 简单的 AI 行为

```typescript
const builder = new BehaviorTreeBuilder();
const tree = builder
    .selector('ai')
        .sequence('combat')
            .condition('hasEnemy', (bb) => bb.get('enemy') !== null)
            .condition('inRange', (bb) => {
                const distance = calculateDistance(bb.get('position'), bb.get('enemyPosition'));
                return distance < 10;
            })
            .action('attack', (bb) => {
                attackEnemy(bb.get('enemy'));
                return NodeStatus.SUCCESS;
            })
        .end()
        .sequence('patrol')
            .action('moveToWaypoint', (bb) => {
                moveTo(bb.get('waypoint'));
                return NodeStatus.SUCCESS;
            })
        .end()
    .end()
    .build();
```

### 使用装饰器

```typescript
const tree = builder
    .condition('checkHealth', (bb) => bb.get('health', 0) > 50)
    .decorator(DecoratorType.INVERTER)  // 取反
    .build();
```

## ⚠️ 注意事项

1. **类型安全**: 使用 `ComponentType<T>` 而不是字符串来绑定 Entity 数据
2. **性能**: 使用执行间隔控制来优化性能
3. **缓存**: Blackboard 会自动缓存数据，提高访问性能
4. **状态管理**: 运行中的节点需要正确管理状态

---

*最后更新: 2025-11-17*
