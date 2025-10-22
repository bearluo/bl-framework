# 装饰器使用指南

## 组件装饰器 (@component)

组件装饰器允许你为每个组件类配置对象池行为。

### 基础用法

```typescript
import { Component, component } from 'db://bl-framework/ecs';

// 使用默认配置（启用对象池，使用全局池大小）
@component()
class BasicComponent extends Component {
    value: number = 0;
}

// 自定义组件名称
@component({ name: 'MyComponent' })
class CustomNameComponent extends Component {
    data: string = '';
}
```

### 配置对象池

#### 1. 自定义池大小

适用于频繁创建/销毁的组件，如子弹、特效等：

```typescript
@component({
    poolSize: 500  // 创建大对象池
})
class BulletComponent extends Component {
    damage: number = 10;
    speed: number = 100;
}

@component({
    poolSize: 1000
})
class ParticleComponent extends Component {
    lifetime: number = 1.0;
}
```

#### 2. 禁用对象池

适用于很少创建或单例的组件：

```typescript
@component({
    pooled: false  // 完全禁用对象池，每次直接创建新实例
})
class GameStateComponent extends Component {
    level: number = 1;
    score: number = 0;
}

@component({
    pooled: false
})
class UIManagerComponent extends Component {
    currentPanel: string = 'main';
}
```

#### 3. 完整配置

```typescript
@component({
    name: 'Enemy',     // 组件名称（用于调试）
    pooled: true,      // 启用对象池
    poolSize: 200      // 池大小
})
class EnemyComponent extends Component {
    hp: number = 100;
    damage: number = 15;
}
```

### 配置说明

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `name` | string | 类名 | 组件名称，用于调试 |
| `pooled` | boolean | true | 是否启用对象池 |
| `poolSize` | number | 100 | 对象池大小（需要 `pooled: true`） |

### 性能建议

#### ✅ 应该使用大对象池的场景

```typescript
// 子弹组件 - 频繁创建和销毁
@component({ poolSize: 500 })
class BulletComponent extends Component {
    // ...
}

// 粒子特效 - 大量创建
@component({ poolSize: 1000 })
class ParticleComponent extends Component {
    // ...
}

// 敌人组件 - 游戏中会创建很多
@component({ poolSize: 300 })
class EnemyComponent extends Component {
    // ...
}
```

#### ⚠️ 应该禁用对象池的场景

```typescript
// 单例组件 - 整个游戏只有一个
@component({ pooled: false })
class GameManagerComponent extends Component {
    // ...
}

// 玩家组件 - 通常只有 1-4 个
@component({ pooled: false })
class PlayerComponent extends Component {
    // ...
}

// UI 管理组件 - 数量很少
@component({ pooled: false })
class UIRootComponent extends Component {
    // ...
}
```

#### 📊 使用默认配置的场景

```typescript
// 中等频率的组件 - 使用默认配置即可
class TransformComponent extends Component {
    // 默认 pooled: true, poolSize: 100
}

class VelocityComponent extends Component {
    // 默认配置
}
```

### 工作原理

当你使用 `@component` 装饰器时，`ComponentManager` 会：

1. **注册组件类型时**：
   - 读取装饰器的配置
   - 根据 `pooled` 决定是否创建对象池
   - 使用 `poolSize` 或全局配置创建对应大小的对象池

2. **添加组件时**：
   - 如果有对象池：从池中获取实例
   - 如果没有对象池：直接创建新实例

3. **移除组件时**：
   - 如果有对象池：归还到池中复用
   - 如果没有对象池：直接销毁

### 代码对比

#### 使用装饰器前

```typescript
// 所有组件都使用全局默认池大小（100）
class BulletComponent extends Component {
    // 可能不够用，频繁扩容
}

class GameStateComponent extends Component {
    // 浪费内存，用不到对象池
}
```

#### 使用装饰器后

```typescript
// 针对性优化
@component({ poolSize: 500 })  // 大池，避免扩容
class BulletComponent extends Component {
    // 性能更好
}

@component({ pooled: false })   // 不浪费内存
class GameStateComponent extends Component {
    // 内存占用更小
}
```

### 调试技巧

```typescript
// 使用 name 方便调试
@component({ 
    name: 'PlayerBullet',
    poolSize: 200 
})
class PlayerBulletComponent extends Component {
    // ...
}

// 在 World 开启 debug 模式查看组件创建信息
const world = new World({ debug: true });

// 会输出类似：
// [ECS] Component added: PlayerBullet to entity 1
```

---

## 系统装饰器 (@system)

系统装饰器允许你配置系统的优先级、自动注册等属性。

### 基础用法

```typescript
import { System, system } from 'db://bl-framework/ecs';

// 设置优先级
@system({ priority: 0 })
class PhysicsSystem extends System {
    // 会最先执行
}

@system({ priority: 100 })
class RenderSystem extends System {
    // 会最后执行
}

// 设置优先级
@system({ priority: 0 })
class InputSystem extends System {
    // 会最先执行
}
```

### 配置说明

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `name` | string | 类名 | 系统名称（用于调试） |
| `priority` | number | 0 | 优先级，越小越先执行 |

### 优先级示例

```typescript
@system({ priority: 0 })
class InputSystem extends System {
    // 第一步：处理输入
}

@system({ priority: 10 })
class PhysicsSystem extends System {
    // 第二步：物理模拟
}

@system({ priority: 20 })
class AISystem extends System {
    // 第三步：AI 决策
}

@system({ priority: 100 })
class RenderSystem extends System {
    // 最后：渲染
}
```

### 系统注册

系统需要手动注册到 World 中：

```typescript
// 定义系统
@system({ priority: 0 })
class InputSystem extends System { /* ... */ }

@system({ priority: 10 })
class PhysicsSystem extends System { /* ... */ }

@system({ priority: 100 })
class RenderSystem extends System { /* ... */ }

// 创建 World 并注册系统
const world = new World();
world.registerSystem(InputSystem);
world.registerSystem(PhysicsSystem);
world.registerSystem(RenderSystem);
```

### 系统管理

#### 注册系统

```typescript
// 注册单个系统
world.registerSystem(MovementSystem);

// 注册多个系统
world.registerSystem(InputSystem);
world.registerSystem(PhysicsSystem);
world.registerSystem(RenderSystem);
```

#### 获取系统

```typescript
// 获取已注册的系统
const movementSystem = world.getSystem(MovementSystem);
if (movementSystem) {
    // 系统已注册
}
```

#### 移除系统

```typescript
// 移除系统
world.removeSystem(MovementSystem);
```

#### 系统优先级

系统按优先级排序执行，数值越小越先执行：

```typescript
@system({ priority: 0 })    // 最先执行
class InputSystem extends System { }

@system({ priority: 10 })   // 第二执行
class PhysicsSystem extends System { }

@system({ priority: 100 })  // 最后执行
class RenderSystem extends System { }
```

---

## 完整示例

```typescript
import { World, Component, System, Query, component, system } from 'db://bl-framework/ecs';

// 定义组件
@component({ poolSize: 500 })
class BulletComponent extends Component {
    damage: number = 10;
    speed: number = 100;
}

@component({ poolSize: 100 })
class TransformComponent extends Component {
    x: number = 0;
    y: number = 0;
}

@component({ pooled: false })
class PlayerComponent extends Component {
    name: string = 'Player';
    score: number = 0;
}

// 定义系统
@system({ priority: 0 })
class MovementSystem extends System {
    private query!: Query;
    
    onInit() {
        this.query = this.world.createQuery({
            all: [TransformComponent, BulletComponent]
        });
    }
    
    onUpdate(dt: number) {
        this.query.forEach(entity => {
            const transform = this.world.getComponent(entity.id, TransformComponent)!;
            const bullet = this.world.getComponent(entity.id, BulletComponent)!;
            
            transform.x += bullet.speed * dt;
        });
    }
}

@system({ priority: 100 })
class RenderSystem extends System {
    private query!: Query;
    
    onInit() {
        this.query = this.world.createQuery({
            all: [TransformComponent]
        });
    }
    
    onUpdate(dt: number) {
        this.query.forEach(entity => {
            // 渲染逻辑
        });
    }
}

class DebugSystem extends System {
    onUpdate(dt: number) {
        // 调试信息
    }
}

// 使用
const world = new World({ debug: true });

// 注册核心系统
world.registerSystem(MovementSystem);
world.registerSystem(RenderSystem);

// 根据需要注册可选系统
if (DEBUG_MODE) {
    world.registerSystem(DebugSystem);
}

// 创建子弹（会使用大对象池）
for (let i = 0; i < 100; i++) {
    const bullet = world.createEntity(`Bullet_${i}`);
    world.addComponent(bullet.id, TransformComponent);
    world.addComponent(bullet.id, BulletComponent);
}

// 创建玩家（不使用对象池）
const player = world.createEntity('Player');
world.addComponent(player.id, PlayerComponent);

// 每帧更新
function gameLoop(dt: number) {
    world.update(dt);
}
```

---

## 总结

### ✅ 装饰器的优势

1. **性能优化**：针对不同组件配置合适的对象池
2. **内存优化**：避免不必要的对象池创建
3. **代码清晰**：配置和组件定义在一起
4. **灵活性**：每个组件独立配置

### 📝 使用建议

1. **大量创建的组件**：使用大对象池（poolSize: 500+）
2. **单例/少量组件**：禁用对象池（pooled: false）
3. **普通组件**：使用默认配置即可
4. **系统优先级**：根据逻辑依赖关系设置

### 🔍 性能监控

```typescript
// 开启调试模式查看对象池使用情况
const world = new World({ debug: true });

// 查看统计信息
console.log(world.getStats());
```

---

**提示**：装饰器是可选的，不使用装饰器组件也能正常工作，会使用全局默认配置。

