import { pool } from "../db/pool";
import { buildWhere, WhereObject, WherePrimitive, WhereValue } from "./where";

export interface InsertOptions {
  table: string;
  data: Record<string, unknown>;
}

export interface SelectOptions {
  table: string;
  columns?: string[];
  where?: WhereObject;
  orderBy?: { field: string; direction?: "ASC" | "DESC" }[];
  limit?: number;
  offset?: number;
}

export interface GetOneOptions extends Omit<SelectOptions, "limit" | "offset"> {}

export interface ListOptions extends SelectOptions {}

export interface BatchGetOptions {
  table: string;
  field: string;
  values: WherePrimitive[];
  columns?: string[];
  orderBy?: { field: string; direction?: "ASC" | "DESC" }[];
  limit?: number;
  offset?: number;
}

export interface RangeFilter {
  field: string;
  gt?: WherePrimitive;
  gte?: WherePrimitive;
  lt?: WherePrimitive;
  lte?: WherePrimitive;
  between?: [WherePrimitive, WherePrimitive];
}

export interface RangeListOptions {
  table: string;
  columns?: string[];
  where?: WhereObject;
  range: RangeFilter;
  orderBy?: { field: string; direction?: "ASC" | "DESC" }[];
  limit?: number;
  offset?: number;
}

export interface CursorListOptions {
  table: string;
  columns?: string[];
  where?: WhereObject;
  cursorField: string;
  cursorValue: WherePrimitive;
  direction?: "next" | "prev"; // next: 取游标之后，prev: 取游标之前
  orderDirection?: "ASC" | "DESC";
  limit?: number;
}

export interface UpdateOptions {
  table: string;
  data?: Record<string, unknown>; // 常规赋值
  inc?: Record<string, number>; // 自增
  dec?: Record<string, number>; // 自减
  setNull?: string[]; // 置空
  where?: WhereObject;
  limit?: number;
}

export interface UpdateOneOptions extends UpdateOptions {
  where: WhereObject;
}

export interface BatchUpdateOptions extends UpdateOptions {
  field: string;
  values: WherePrimitive[];
  maxBatchSize?: number;
}

export interface ConditionalUpdateOptions extends UpdateOptions {
  whitelistTables?: string[];
}

export interface AtomicUpdateOptions extends UpdateOptions {
  inc?: Record<string, number>;
  dec?: Record<string, number>;
}

export interface NullUpdateOptions extends UpdateOptions {
  setNull: string[];
}

export interface BaseDeleteOptions {
  table: string;
  where?: WhereObject;
  limit?: number;
  physical?: boolean; // true 时执行物理删除；默认逻辑删除
  softDeleteField?: string; // 默认 "deleted_at"
  softDeleteValue?: WherePrimitive; // 默认 new Date()
}

export interface DeleteOptions extends BaseDeleteOptions {}

export interface DeleteOneOptions extends BaseDeleteOptions {
  where: WhereObject;
}

export interface BatchDeleteOptions extends BaseDeleteOptions {
  field: string;
  values: WherePrimitive[];
  maxBatchSize?: number;
}

export interface ConditionalDeleteOptions extends BaseDeleteOptions {
  whitelistTables?: string[];
}

const DEFAULT_SOFT_DELETE_FIELD = "deleted_at";
const DEFAULT_BATCH_DELETE_MAX = Number(process.env.BATCH_DELETE_MAX || 200);
const DEFAULT_CONDITIONAL_DELETE_WHITELIST =
  (process.env.CONDITIONAL_DELETE_WHITELIST || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
const DEFAULT_CONDITIONAL_DELETE_LIMIT = Number(process.env.CONDITIONAL_DELETE_LIMIT || 100);
const DEFAULT_BATCH_UPDATE_MAX = Number(process.env.BATCH_UPDATE_MAX || 200);
const DEFAULT_CONDITIONAL_UPDATE_WHITELIST =
  (process.env.CONDITIONAL_UPDATE_WHITELIST || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
const DEFAULT_CONDITIONAL_UPDATE_LIMIT = Number(process.env.CONDITIONAL_UPDATE_LIMIT || 100);

function badRequest(message: string): never {
  const err = new Error(message);
  (err as any).status = 400;
  throw err;
}

function forbidden(message: string): never {
  const err = new Error(message);
  (err as any).status = 403;
  throw err;
}

function checkTable(table: string) {
  if (!table) badRequest("table is required");
  // 简单防注入（你也可以再严格一点）
  if (!/^[a-zA-Z0-9_]+$/.test(table)) {
    badRequest("invalid table name");
  }
}

function buildUpdateSet(options: {
  data?: Record<string, unknown>;
  inc?: Record<string, number>;
  dec?: Record<string, number>;
  setNull?: string[];
}) {
  const parts: string[] = [];
  const params: unknown[] = [];
  const used = new Set<string>();

  const addField = (field: string, clause: string, param?: unknown) => {
    if (used.has(field)) {
      badRequest(`duplicate update on field ${field}`);
    }
    used.add(field);
    parts.push(clause);
    if (param !== undefined) params.push(param);
  };

  if (options.data) {
    for (const key of Object.keys(options.data)) {
      addField(key, "`" + key + "` = ?", options.data[key]);
    }
  }

  if (options.inc) {
    for (const key of Object.keys(options.inc)) {
      const val = options.inc[key];
      if (typeof val !== "number") badRequest(`inc value for ${key} must be number`);
      addField(key, "`" + key + "` = `" + key + "` + ?", val);
    }
  }

  if (options.dec) {
    for (const key of Object.keys(options.dec)) {
      const val = options.dec[key];
      if (typeof val !== "number") badRequest(`dec value for ${key} must be number`);
      addField(key, "`" + key + "` = `" + key + "` - ?", val);
    }
  }

  if (options.setNull) {
    for (const key of options.setNull) {
      addField(key, "`" + key + "` = NULL");
    }
  }

  if (parts.length === 0) {
    badRequest("update set is empty");
  }

  return { setSql: parts.join(", "), params };
}

function validateEqualWhere(where?: WhereObject) {
  if (!where) return;
  for (const key of Object.keys(where)) {
    const value = where[key];
    const isPrimitive =
      ["string", "number", "boolean"].includes(typeof value) || value === null || value === undefined;
    if (!isPrimitive) {
      badRequest("conditionalUpdate only supports equal conditions (primitive values)");
    }
  }
}

export const bridge = {
  async insert(options: InsertOptions) {
    const { table, data } = options;
    checkTable(table);

    const keys = Object.keys(data);
    if (keys.length === 0) {
      badRequest("insert data is empty");
    }

    const columns = keys.map(k => "`" + k + "`").join(", ");
    const placeholders = keys.map(() => "?").join(", ");
    const sql = `INSERT INTO \`${table}\` (${columns}) VALUES (${placeholders})`;
    const params = keys.map(k => data[k]);

    const [result] = await pool.execute(sql, params);
    return result;
  },

  async select<T = any>(options: SelectOptions): Promise<T[]> {
    const { table, columns = ["*"], where, orderBy, limit, offset } = options;
    checkTable(table);

    const colsSql = columns.join(", ");
    const wherePart = buildWhere(where);

    let sql = `SELECT ${colsSql} FROM \`${table}\``;
    const params: unknown[] = [];

    if (wherePart.clause) {
      sql += " " + wherePart.clause;
      params.push(...wherePart.params);
    }

    if (orderBy && orderBy.length > 0) {
      const orderSql = orderBy
        .map(o => "`" + o.field + "` " + (o.direction === "DESC" ? "DESC" : "ASC"))
        .join(", ");
      sql += " ORDER BY " + orderSql;
    }

    if (typeof limit === "number") {
      sql += " LIMIT " + Number(limit);
    }
    if (typeof offset === "number") {
      sql += " OFFSET " + Number(offset);
    }

    const [rows] = await pool.execute(sql, params);
    return rows as T[];
  },

  async getOne<T = any>(options: GetOneOptions): Promise<T | null> {
    const rows = await bridge.select<T>({ ...options, limit: 1 });
    return rows[0] ?? null;
  },

  async list<T = any>(options: ListOptions): Promise<T[]> {
    return bridge.select<T>(options);
  },

  async batchGet<T = any>(options: BatchGetOptions): Promise<T[]> {
    const { table, field, values, columns, orderBy, limit, offset } = options;
    if (!field) badRequest("batchGet field is required");
    if (!Array.isArray(values) || values.length === 0) {
      badRequest("batchGet values must be a non-empty array");
    }
    return bridge.select<T>({
      table,
      columns,
      where: { [field]: { in: values } },
      orderBy,
      limit,
      offset
    });
  },

  async rangeList<T = any>(options: RangeListOptions): Promise<T[]> {
    const { table, columns, where, range, orderBy, limit, offset } = options;
    if (!range || !range.field) {
      badRequest("range field is required");
    }

    const { between, gt, gte, lt, lte } = range;
    let rangeValue: WhereValue;

    if (between !== undefined) {
      if (gt !== undefined || gte !== undefined || lt !== undefined || lte !== undefined) {
        badRequest("between cannot be combined with gt/gte/lt/lte");
      }
      rangeValue = { between };
    } else {
      const value: WhereValue = {};
      if (gt !== undefined) (value as any).gt = gt;
      if (gte !== undefined) (value as any).gte = gte;
      if (lt !== undefined) (value as any).lt = lt;
      if (lte !== undefined) (value as any).lte = lte;
      rangeValue = value;
    }

    const combinedWhere: WhereObject = {
      ...(where || {}),
      [range.field]: rangeValue
    };

    return bridge.select<T>({
      table,
      columns,
      where: combinedWhere,
      orderBy,
      limit,
      offset
    });
  },

  async cursorList<T = any>(options: CursorListOptions): Promise<T[]> {
    const {
      table,
      columns,
      where,
      cursorField,
      cursorValue,
      direction = "next",
      orderDirection = "ASC",
      limit
    } = options;

    if (!cursorField) {
      badRequest("cursorField is required");
    }

    const comparator =
      direction === "next"
        ? orderDirection === "ASC"
          ? { gt: cursorValue }
          : { lt: cursorValue }
        : orderDirection === "ASC"
          ? { lt: cursorValue }
          : { gt: cursorValue };

    const combinedWhere: WhereObject = {
      ...(where || {}),
      [cursorField]: comparator
    };

    return bridge.select<T>({
      table,
      columns,
      where: combinedWhere,
      orderBy: [{ field: cursorField, direction: orderDirection }],
      limit
    });
  },

  async update(options: UpdateOptions) {
    const { table, where, limit, data, inc, dec, setNull } = options;
    checkTable(table);

    const setParts = buildUpdateSet({ data, inc, dec, setNull });
    const wherePart = buildWhere(where);

    let sql = `UPDATE \`${table}\` SET ${setParts.setSql}`;
    const params: unknown[] = [...setParts.params];

    if (wherePart.clause) {
      sql += " " + wherePart.clause;
      params.push(...wherePart.params);
    }

    if (typeof limit === "number") {
      sql += " LIMIT " + Number(limit);
    }

    const [result] = await pool.execute(sql, params);
    return result;
  },

  async updateOne(options: UpdateOneOptions) {
    if (!options.where || Object.keys(options.where).length === 0) {
      badRequest("updateOne requires where");
    }
    return bridge.update({ ...options, limit: 1 });
  },

  async batchUpdate(options: BatchUpdateOptions) {
    const { table, field, values, maxBatchSize, limit, ...rest } = options;
    if (!field) badRequest("batchUpdate field is required");
    if (!Array.isArray(values) || values.length === 0) {
      badRequest("batchUpdate values must be a non-empty array");
    }
    const maxSize = typeof maxBatchSize === "number" ? maxBatchSize : DEFAULT_BATCH_UPDATE_MAX;
    if (values.length > maxSize) {
      badRequest(`batchUpdate values exceed limit ${maxSize}`);
    }

    return bridge.update({
      table,
      where: { [field]: { in: values } },
      limit: typeof limit === "number" ? limit : values.length,
      ...rest
    });
  },

  async conditionalUpdate(options: ConditionalUpdateOptions) {
    const { table, where, whitelistTables, limit, ...rest } = options;
    const whitelist =
      whitelistTables && whitelistTables.length > 0
        ? whitelistTables
        : DEFAULT_CONDITIONAL_UPDATE_WHITELIST;
    if (!whitelist || whitelist.length === 0) {
      forbidden(
        "conditionalUpdate whitelist is empty; set CONDITIONAL_UPDATE_WHITELIST env or pass whitelistTables"
      );
    }
    if (!whitelist.includes(table)) {
      forbidden(`table ${table} is not allowed for conditionalUpdate`);
    }
    if (!where || Object.keys(where).length === 0) {
      badRequest("conditionalUpdate requires where");
    }
    validateEqualWhere(where);

    const enforcedLimit = typeof limit === "number" ? limit : DEFAULT_CONDITIONAL_UPDATE_LIMIT;

    return bridge.update({
      table,
      where,
      limit: enforcedLimit,
      ...rest
    });
  },

  async atomicUpdate(options: AtomicUpdateOptions) {
    const { inc, dec } = options;
    if ((!inc || Object.keys(inc).length === 0) && (!dec || Object.keys(dec).length === 0)) {
      badRequest("atomicUpdate requires inc or dec");
    }
    return bridge.update(options);
  },

  async nullUpdate(options: NullUpdateOptions) {
    if (!options.setNull || options.setNull.length === 0) {
      badRequest("nullUpdate requires setNull fields");
    }
    return bridge.update(options);
  },

  async delete(options: DeleteOptions) {
    const {
      table,
      where,
      limit,
      physical = false,
      softDeleteField = DEFAULT_SOFT_DELETE_FIELD,
      softDeleteValue = new Date()
    } = options;
    checkTable(table);

    if (!physical) {
      const field = softDeleteField || DEFAULT_SOFT_DELETE_FIELD;
      return bridge.update({
        table,
        data: { [field]: softDeleteValue },
        where,
        limit
      });
    }

    const wherePart = buildWhere(where);

    let sql = `DELETE FROM \`${table}\``;
    const params: unknown[] = [];

    if (wherePart.clause) {
      sql += " " + wherePart.clause;
      params.push(...wherePart.params);
    }

    if (typeof limit === "number") {
      sql += " LIMIT " + Number(limit);
    }

    const [result] = await pool.execute(sql, params);
    return result;
  },

  async deleteOne(options: DeleteOneOptions) {
    if (!options.where || Object.keys(options.where).length === 0) {
      badRequest("deleteOne requires where");
    }
    return bridge.delete({ ...options, limit: 1 });
  },

  async batchDelete(options: BatchDeleteOptions) {
    const { table, field, values, maxBatchSize, physical, softDeleteField, softDeleteValue } = options;
    if (!field) badRequest("batchDelete field is required");
    if (!Array.isArray(values) || values.length === 0) {
      badRequest("batchDelete values must be a non-empty array");
    }
    const maxSize = typeof maxBatchSize === "number" ? maxBatchSize : DEFAULT_BATCH_DELETE_MAX;
    if (values.length > maxSize) {
      badRequest(`batchDelete values exceed limit ${maxSize}`);
    }

    return bridge.delete({
      table,
      where: { [field]: { in: values } },
      limit: options.limit ?? values.length,
      physical,
      softDeleteField,
      softDeleteValue
    });
  },

  async conditionalDelete(options: ConditionalDeleteOptions) {
    const { table, where, whitelistTables, limit, physical, softDeleteField, softDeleteValue } = options;
    const whitelist =
      whitelistTables && whitelistTables.length > 0
        ? whitelistTables
        : DEFAULT_CONDITIONAL_DELETE_WHITELIST;
    if (!whitelist || whitelist.length === 0) {
      forbidden(
        "conditionalDelete whitelist is empty; set CONDITIONAL_DELETE_WHITELIST env or pass whitelistTables"
      );
    }
    if (!whitelist.includes(table)) {
      forbidden(`table ${table} is not allowed for conditionalDelete`);
    }
    if (!where || Object.keys(where).length === 0) {
      badRequest("conditionalDelete requires where");
    }

    const enforcedLimit = typeof limit === "number" ? limit : DEFAULT_CONDITIONAL_DELETE_LIMIT;

    return bridge.delete({
      table,
      where,
      limit: enforcedLimit,
      physical,
      softDeleteField,
      softDeleteValue
    });
  }
};
