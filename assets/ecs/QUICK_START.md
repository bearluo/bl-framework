# ECS 框架快速入门

## 5 分钟上手指南

### 第一步：导入框架

```typescript
import { World, Component, System, Query } from 'db://bl-framework/ecs';
```

### 第二步：创建组件

组件是纯数据容器，继承 `Component` 基类：

```typescript
// 基础组件
class PositionComponent extends Component {
    x: number = 0;
    y: number = 0;
    
    reset(): void {
        super.reset();
        this.x = 0;
        this.y = 0;
    }
}

// 使用装饰器配置对象池
import { component } from 'db://bl-framework/ecs';

@component({
    name: 'Velocity',
    pooled: true,      // 启用对象池（默认 true）
    poolSize: 200      // 自定义池大小（默认使用全局配置）
})
class VelocityComponent extends Component {
    x: number = 0;
    y: number = 0;
}

// 禁用对象池（适用于很少创建的组件）
@component({
    pooled: false      // 禁用对象池，每次直接创建新实例
})
class SingletonComponent extends Component {
    data: any;
}
```

### 第三步：创建系统

系统包含逻辑，继承 `System` 基类：

```typescript
class MovementSystem extends System {
    private query!: Query;
    
    // 系统初始化
    onInit(): void {
        // 创建查询：找到所有同时有位置和速度组件的实体
        this.query = this.world.createQuery({
            all: [PositionComponent, VelocityComponent]
        });
    }
    
    // 系统更新（每帧调用）
    onUpdate(dt: number): void {
        // 遍历所有符合条件的实体
        this.query.forEach(entity => {
            const pos = this.world.getComponent(entity.id, PositionComponent)!;
            const vel = this.world.getComponent(entity.id, VelocityComponent)!;
            
            // 更新位置
            pos.x += vel.x * dt;
            pos.y += vel.y * dt;
        });
    }
}
```

### 第四步：在 Cocos Creator 组件中使用

#### 方式一：手动注册系统

```typescript
import { _decorator, Component as CCComponent } from 'cc';
const { ccclass } = _decorator;

@ccclass('GameManager')
export class GameManager extends CCComponent {
    private world!: World;
    
    onLoad() {
        // 1. 创建 World
        this.world = new World({
            debug: true // 开启调试模式
        });
        
        // 2. 手动注册系统
        this.world.registerSystem(MovementSystem);
        
        // 3. 创建实体
        this.createPlayer();
    }
    
    createPlayer() {
        // 创建实体
        const player = this.world.createEntity('Player');
        
        // 添加组件
        const pos = this.world.addComponent(player.id, PositionComponent);
        pos.x = 0;
        pos.y = 0;
        
        const vel = this.world.addComponent(player.id, VelocityComponent);
        vel.x = 1; // 每秒向右移动 1 单位
        vel.y = 0;
    }
    
    update(dt: number) {
        // 更新 World（会自动调用所有系统的 update）
        this.world.update(dt);
    }
    
    onDestroy() {
        // 清理 World
        this.world.destroy();
    }
}
```

#### 方式二：使用装饰器设置优先级

```typescript
import { system, System } from 'db://bl-framework/ecs';

// 使用装饰器设置优先级
@system({ priority: 0 })
class MovementSystem extends System {
    // ...
}

@ccclass('GameManager')
export class GameManager extends CCComponent {
    private world!: World;
    
    onLoad() {
        // 创建 World
        this.world = new World({
            debug: true
        });
        
        // 注册系统
        this.world.registerSystem(MovementSystem);
        
        this.createPlayer();
    }
    
    // ... 其他代码相同
}
```

## 🎯 完成！

你已经完成了第一个 ECS 应用！这个例子会创建一个玩家实体，每帧向右移动。

---

## 常用 API 速查

### World API

```typescript
// 创建 World
const world = new World({ debug: true });

// 实体操作
const entity = world.createEntity('EntityName');
world.destroyEntity(entityId);
world.getEntity(entityId);

// 组件操作
world.addComponent(entityId, ComponentType);
world.getComponent(entityId, ComponentType);
world.removeComponent(entityId, ComponentType);
world.hasComponent(entityId, ComponentType);

// 系统操作
world.registerSystem(SystemType);
world.getSystem(SystemType);
world.removeSystem(SystemType);

// 查询
const query = world.createQuery({ all: [ComponentA, ComponentB] });

// 更新
world.update(deltaTime);

// 清理
world.destroy();
```

### Query API

```typescript
// 创建查询
const query = world.createQuery({
    all: [ComponentA, ComponentB],  // 必须有这些组件
    any: [ComponentC, ComponentD],  // 至少有其中一个
    none: [ComponentE]              // 不能有这个组件
});

// 遍历实体
query.forEach(entity => {
    // 处理实体
});

// 获取实体列表
const entities = query.getEntities();

// 获取数量
const count = query.getCount();

// 检查是否为空
if (query.isEmpty()) {
    // ...
}
```

### System 生命周期

```typescript
class MySystem extends System {
    priority = 0; // 优先级（越小越先执行）
    
    onInit(): void {
        // 系统初始化时调用（一次）
    }
    
    onUpdate(dt: number): void {
        // 每帧调用
    }
    
    onDestroy(): void {
        // 系统销毁时调用（一次）
    }
    
    onEnable(): void {
        // 系统启用时调用
    }
    
    onDisable(): void {
        // 系统禁用时调用
    }
}
```

---

## 💡 最佳实践

### 1. 组件设计
```typescript
// ✅ 好的做法：纯数据
class HealthComponent extends Component {
    current: number = 100;
    max: number = 100;
}

// ✅ 使用装饰器优化对象池
@component({ poolSize: 500 })  // 大量创建的组件用大池
class BulletComponent extends Component {
    damage: number = 10;
}

@component({ pooled: false })   // 单例组件禁用池
class GameStateComponent extends Component {
    level: number = 1;
}

// ❌ 避免：包含复杂逻辑
class HealthComponent extends Component {
    health: number = 100;
    
    // 逻辑应该放在 System 中
    takeDamage(amount: number) {
        this.health -= amount;
    }
}
```

### 2. 系统设计
```typescript
// ✅ 好的做法：在 onInit 创建查询
class MySystem extends System {
    private query!: Query;
    
    onInit() {
        this.query = this.world.createQuery({
            all: [ComponentA]
        });
    }
    
    onUpdate(dt: number) {
        this.query.forEach(entity => {
            // ...
        });
    }
}

// ❌ 避免：在 update 中创建查询
class MySystem extends System {
    onUpdate(dt: number) {
        // 每帧都创建查询，性能差
        const query = this.world.createQuery({
            all: [ComponentA]
        });
    }
}
```

### 3. 优先级设置
```typescript
class PhysicsSystem extends System {
    priority = 0; // 物理系统先执行
}

class RenderSystem extends System {
    priority = 1000; // 渲染系统最后执行
}
```

### 4. 性能优化
```typescript
// ✅ 缓存组件引用
class MySystem extends System {
    private query!: Query;
    private components = new Map();
    
    onUpdate(dt: number) {
        this.query.forEach(entity => {
            // 缓存组件引用，避免重复获取
            let comp = this.components.get(entity.id);
            if (!comp) {
                comp = this.world.getComponent(entity.id, MyComponent);
                this.components.set(entity.id, comp);
            }
            
            // 使用缓存的组件
        });
    }
}
```

---

## 🔍 调试技巧

### 1. 启用调试模式
```typescript
const world = new World({ debug: true });
```

调试模式会在控制台输出详细日志：
- 实体创建/销毁
- 组件添加/移除
- 系统注册/移除
- 查询创建

### 2. 查看统计信息
```typescript
const stats = world.getStats();
console.log('实体数量:', stats.entities);
console.log('系统数量:', stats.systems);
console.log('查询数量:', stats.queries);
```

### 3. 检查实体组件
```typescript
const components = world.getComponents(entityId);
console.log('实体组件:', components);
```

---

## 📚 下一步

现在你已经掌握了基础，可以：

1. 查看完整示例：`assets/test/ecs/ECSExample.ts`
2. 了解详细设计：`STRUCTURE.md`
3. 学习高级特性：装饰器、对象池优化
4. 创建自己的游戏逻辑

祝你使用愉快！🎮

