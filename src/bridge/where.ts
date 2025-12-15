export type WherePrimitive = string | number | boolean | null;

export type WhereValue =
  | WherePrimitive
  | { in: WherePrimitive[] }
  | { gt?: WherePrimitive; gte?: WherePrimitive; lt?: WherePrimitive; lte?: WherePrimitive }
  | { between: [WherePrimitive, WherePrimitive] };

export interface WhereObject {
  [key: string]: WhereValue;
}

export interface WhereClause {
  clause: string;
  params: unknown[];
}

/**
 * 把对象形式的 where 转成 SQL 片段 + 参数数组
 * 支持：等值、IN、范围 (>, >=, <, <=)、BETWEEN
 */
function badRequest(message: string): Error {
  const err = new Error(message);
  (err as any).status = 400;
  return err;
}

export function buildWhere(where: WhereObject | undefined): WhereClause {
  if (!where || Object.keys(where).length === 0) {
    return { clause: "", params: [] };
  }

  const parts: string[] = [];
  const params: unknown[] = [];

  for (const key of Object.keys(where)) {
    const column = "`" + key + "`";
    const { clause, params: valueParams } = buildCondition(column, where[key]);
    parts.push(clause);
    params.push(...valueParams);
  }

  return {
    clause: "WHERE " + parts.join(" AND "),
    params
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPrimitive(value: unknown): value is WherePrimitive {
  return ["string", "number", "boolean"].includes(typeof value) || value === null;
}

function buildCondition(column: string, value: WhereValue): WhereClause {
  if (isPrimitive(value)) {
    return { clause: `${column} = ?`, params: [value] };
  }

  if (isPlainObject(value)) {
    if ("in" in value) {
      const list = value.in;
      if (!Array.isArray(list) || list.length === 0) {
        throw badRequest("IN values must be a non-empty array");
      }
      const placeholders = list.map(() => "?").join(", ");
      return { clause: `${column} IN (${placeholders})`, params: list };
    }

    if ("between" in value) {
      const b = value.between;
      if (!Array.isArray(b) || b.length !== 2) {
        throw badRequest("BETWEEN needs a two-value array");
      }
      return { clause: `${column} BETWEEN ? AND ?`, params: [b[0], b[1]] };
    }

    const rangeParts: string[] = [];
    const rangeParams: unknown[] = [];

    if (value.gt !== undefined) {
      rangeParts.push(`${column} > ?`);
      rangeParams.push(value.gt);
    }
    if (value.gte !== undefined) {
      rangeParts.push(`${column} >= ?`);
      rangeParams.push(value.gte);
    }
    if (value.lt !== undefined) {
      rangeParts.push(`${column} < ?`);
      rangeParams.push(value.lt);
    }
    if (value.lte !== undefined) {
      rangeParts.push(`${column} <= ?`);
      rangeParams.push(value.lte);
    }

    if (rangeParts.length > 0) {
      return { clause: rangeParts.join(" AND "), params: rangeParams };
    }
  }

  throw badRequest(`Unsupported where value for ${column}`);
}
