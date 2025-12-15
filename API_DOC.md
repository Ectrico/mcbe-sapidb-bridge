# SapiDBBridge 接口文档
面向前端/AI 的接口说明。默认监听 `http://127.0.0.1:3000`，请求/响应均为 JSON。

## 通用约定
- 头：`Content-Type: application/json`
- 成功：`{ "code": 0, "data": <结果> }`
- 失败：HTTP 500，`{ "code": 500, "msg": "<错误信息>" }`
- 表名仅允许字母/数字/下划线。
- 环境变量：`DB_HOST`、`DB_USER`、`DB_PASSWORD`、`DB_NAME`
- 删除相关环境变量：
  - `BATCH_DELETE_MAX`（批量删除最大数量，默认 200）
  - `CONDITIONAL_DELETE_WHITELIST`（白名单表，逗号分隔）
  - `CONDITIONAL_DELETE_LIMIT`（conditionalDelete 默认强制 limit，默认 100）
- 更新相关环境变量：
  - `BATCH_UPDATE_MAX`（批量更新最大数量，默认 200）
  - `CONDITIONAL_UPDATE_WHITELIST`（受限更新白名单表，逗号分隔）
  - `CONDITIONAL_UPDATE_LIMIT`（conditionalUpdate 默认强制 limit，默认 100）
- 删除默认走逻辑删除（soft delete）：`softDeleteField` 默认为 `deleted_at`，`softDeleteValue` 默认为当前时间；只有显式传 `physical: true` 才会物理删除。

## 健康检查
- `GET /health` → `{ "status": "ok" }`

## 错误码与校验
- `400` 参数不合法：表/字段名非法，必填字段缺失，where 为空，values 超上限，批量/条件更新删除未满足要求等。
- `403` 禁止操作：不在白名单的表，受限接口被拒绝，或其他明确禁止的操作。
- `500` 服务端错误：数据库执行异常或未捕获的异常。
- 响应格式：`{ "code": <错误码>, "msg": "<错误信息>" }`

## CRUD
### 插入
- `POST /db/insert`
- 请求：
```json
{ "table": "users", "data": { "name": "Alice", "age": 18 } }
```
- 响应：`{ "code": 0, "data": { "insertId": 123, ... } }`

### 更新
- `POST /db/update`
- 请求：
```json
{
  "table": "users",
  "data": { "age": 19 },      // 常规赋值
  "inc": { "version": 1 },    // 可选：自增
  "dec": { "quota": 2 },      // 可选：自减
  "setNull": ["deleted_at"],  // 可选：置空
  "where": { "id": 1 },
  "limit": 1
}
```
> 至少需要 data/inc/dec/setNull 之一；同一字段不能在多个操作中重复出现。

### 删除（基础，默认软删）
- `POST /db/delete`
- 请求（软删示例）：
```json
{
  "table": "users",
  "where": { "id": 1 },
  "limit": 1
}
```
- 若需物理删除，加 `physical: true`。
- 若需自定义软删字段或值，可传 `softDeleteField`、`softDeleteValue`。

## 查询能力
### where 语法
- 等值：`{ "status": "active" }`
- IN：`{ "id": { "in": [1, 2, 3] } }`
- 范围：`{ "created_at": { "gt": "2024-01-01", "lte": "2024-02-01" } }`
- BETWEEN：`{ "age": { "between": [18, 30] } }`（不能与 gt/gte/lt/lte 混用）
- 多条件以 AND 连接；暂不支持 OR。

### 基础查询（等值/排序/分页）
- `POST /db/select`（原接口，兼容）
- `POST /db/list`（等价于 select）
- 请求示例：
```json
{
  "table": "users",
  "columns": ["id", "name", "age"],
  "where": { "status": "active" },
  "orderBy": [{ "field": "id", "direction": "DESC" }],
  "limit": 10,
  "offset": 0
}
```

### GetOne：按主键/唯一键/组合键取单条
- `POST /db/getOne`
- 请求示例：
```json
{ "table": "users", "columns": ["id", "name", "email"], "where": { "id": 1 } }
```
- 未命中时 `data` 为 `null`。

### List：等值过滤 + 排序 + limit/offset
- `POST /db/list`（同上）

### BatchGet：IN 批量查询
- `POST /db/batchGet`
- 请求示例：
```json
{
  "table": "users",
  "field": "id",
  "values": [1, 2, 3],
  "columns": ["id", "name"],
  "orderBy": [{ "field": "id", "direction": "ASC" }]
}
```

### RangeList：范围过滤（>, <, between）+ 排序 + 分页
- `POST /db/rangeList`
- 请求示例：
```json
{
  "table": "orders",
  "columns": ["id", "amount", "created_at"],
  "where": { "status": "paid" },
  "range": { "field": "created_at", "gt": "2024-01-01", "lte": "2024-02-01" },
  "orderBy": [{ "field": "created_at", "direction": "DESC" }],
  "limit": 20,
  "offset": 0
}
```

### CursorList：游标分页（基于 id 或时间）
- `POST /db/cursorList`
- 请求示例（按 id 升序）：
```json
{
  "table": "users",
  "columns": ["id", "name"],
  "cursorField": "id",
  "cursorValue": 100,
  "direction": "next",          // next: 取 cursor 之后；prev: 取 cursor 之前
  "orderDirection": "ASC",      // 默认 ASC，若 DESC 自动使用相反比较符
  "limit": 20,
  "where": { "status": "active" }
}
```

## 更新能力（扩展）
### UpdateOne：按主键/唯一键/组合唯一键更新单条（limit=1）
- `POST /db/updateOne`
- 请求示例：
```json
{
  "table": "users",
  "data": { "name": "Bob" },
  "where": { "id": 1 }
}
```

### BatchUpdate：按主键列表（IN）批量更新
- `POST /db/batchUpdate`
- 请求示例：
```json
{
  "table": "users",
  "field": "id",
  "values": [1, 2, 3],
  "data": { "status": "disabled" },
  "maxBatchSize": 100  // 可选，默认取 BATCH_UPDATE_MAX（默认 200）
}
```
- `values` 超出数量上限会报错；可同时使用 `inc`/`dec`/`setNull`。

### ConditionalUpdate：受限条件更新（仅白名单表 + 强制 limit，等值 AND）
- `POST /db/conditionalUpdate`
- 请求示例：
```json
{
  "table": "logs",
  "data": { "archived": true },
  "where": { "level": "info", "date": "2024-01-01" }, // 仅支持等值 AND
  "limit": 50,                    // 若不传，使用环境变量 CONDITIONAL_UPDATE_LIMIT（默认 100）
  "whitelistTables": ["logs"]     // 可选；若未传则使用环境变量 CONDITIONAL_UPDATE_WHITELIST
}
```
- 若白名单为空或 table 不在白名单，接口会报错。

### AtomicUpdate：自增/自减
- `POST /db/atomicUpdate`
- 请求示例：
```json
{
  "table": "users",
  "inc": { "login_count": 1 },
  "where": { "id": 1 }
}
```
- 至少需要 `inc` 或 `dec`。

### NullUpdate：字段置空
- `POST /db/nullUpdate`
- 请求示例：
```json
{
  "table": "users",
  "setNull": ["deleted_at", "nickname"],
  "where": { "id": 1 }
}
```

## 删除能力（扩展）
### DeleteOne：按主键/唯一键删除单条（limit=1，默认软删）
- `POST /db/deleteOne`
- 请求示例：
```json
{
  "table": "users",
  "where": { "id": 1 },
  "softDeleteField": "deleted_at",  // 可选
  "softDeleteValue": "2025-01-01T12:00:00Z"  // 可选
}
```
- 物理删除需加 `physical: true`。

### BatchDelete：按主键列表删除（IN，数量限制）
- `POST /db/batchDelete`
- 请求示例：
```json
{
  "table": "users",
  "field": "id",
  "values": [1, 2, 3],
  "maxBatchSize": 100  // 可选，默认取环境变量 BATCH_DELETE_MAX（默认 200）
}
```
- 默认软删；物理删需 `physical: true`。
- `values` 数量超出限制会直接报错。

### ConditionalDelete：受限条件删除（仅白名单表 + 强制 limit）
- `POST /db/conditionalDelete`
- 请求示例：
```json
{
  "table": "logs",
  "where": { "created_at": { "lt": "2024-01-01" } },
  "limit": 50,                    // 若不传，使用环境变量 CONDITIONAL_DELETE_LIMIT（默认 100）
  "whitelistTables": ["logs"]     // 可选；若未传则使用环境变量 CONDITIONAL_DELETE_WHITELIST
}
```
- 若白名单为空或 table 不在白名单，接口会报错。
- 默认软删；物理删需 `physical: true`。

## 说明与限制
- `orderBy`：数组，每项 `{ "field": "<列名>", "direction": "ASC" | "DESC" }`，未填 direction 时默认 ASC。
- `limit`/`offset`：数字，直接拼到 SQL。
- `data` 字段为 mysql2 的原始结果：查询是行数组，写操作是结果头。
- 删除默认软删，若表没有 `deleted_at` 字段请指定 `softDeleteField` 或使用物理删除（谨慎）。
