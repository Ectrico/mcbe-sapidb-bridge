"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bridge = void 0;
const pool_1 = require("../db/pool");
const where_1 = require("./where");
const DEFAULT_SOFT_DELETE_FIELD = "deleted_at";
const DEFAULT_BATCH_DELETE_MAX = Number(process.env.BATCH_DELETE_MAX || 200);
const DEFAULT_CONDITIONAL_DELETE_WHITELIST = (process.env.CONDITIONAL_DELETE_WHITELIST || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
const DEFAULT_CONDITIONAL_DELETE_LIMIT = Number(process.env.CONDITIONAL_DELETE_LIMIT || 100);
const DEFAULT_BATCH_UPDATE_MAX = Number(process.env.BATCH_UPDATE_MAX || 200);
const DEFAULT_CONDITIONAL_UPDATE_WHITELIST = (process.env.CONDITIONAL_UPDATE_WHITELIST || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
const DEFAULT_CONDITIONAL_UPDATE_LIMIT = Number(process.env.CONDITIONAL_UPDATE_LIMIT || 100);
function badRequest(message) {
    const err = new Error(message);
    err.status = 400;
    throw err;
}
function forbidden(message) {
    const err = new Error(message);
    err.status = 403;
    throw err;
}
function checkTable(table) {
    if (!table)
        badRequest("table is required");
    // 简单防注入（你也可以再严格一点）
    if (!/^[a-zA-Z0-9_]+$/.test(table)) {
        badRequest("invalid table name");
    }
}
function buildUpdateSet(options) {
    const parts = [];
    const params = [];
    const used = new Set();
    const addField = (field, clause, param) => {
        if (used.has(field)) {
            badRequest(`duplicate update on field ${field}`);
        }
        used.add(field);
        parts.push(clause);
        if (param !== undefined)
            params.push(param);
    };
    if (options.data) {
        for (const key of Object.keys(options.data)) {
            addField(key, "`" + key + "` = ?", options.data[key]);
        }
    }
    if (options.inc) {
        for (const key of Object.keys(options.inc)) {
            const val = options.inc[key];
            if (typeof val !== "number")
                badRequest(`inc value for ${key} must be number`);
            addField(key, "`" + key + "` = `" + key + "` + ?", val);
        }
    }
    if (options.dec) {
        for (const key of Object.keys(options.dec)) {
            const val = options.dec[key];
            if (typeof val !== "number")
                badRequest(`dec value for ${key} must be number`);
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
function validateEqualWhere(where) {
    if (!where)
        return;
    for (const key of Object.keys(where)) {
        const value = where[key];
        const isPrimitive = ["string", "number", "boolean"].includes(typeof value) || value === null || value === undefined;
        if (!isPrimitive) {
            badRequest("conditionalUpdate only supports equal conditions (primitive values)");
        }
    }
}
exports.bridge = {
    async insert(options) {
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
        const [result] = await pool_1.pool.execute(sql, params);
        return result;
    },
    async select(options) {
        const { table, columns = ["*"], where, orderBy, limit, offset } = options;
        checkTable(table);
        const colsSql = columns.join(", ");
        const wherePart = (0, where_1.buildWhere)(where);
        let sql = `SELECT ${colsSql} FROM \`${table}\``;
        const params = [];
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
        const [rows] = await pool_1.pool.execute(sql, params);
        return rows;
    },
    async getOne(options) {
        const rows = await exports.bridge.select({ ...options, limit: 1 });
        return rows[0] ?? null;
    },
    async list(options) {
        return exports.bridge.select(options);
    },
    async batchGet(options) {
        const { table, field, values, columns, orderBy, limit, offset } = options;
        if (!field)
            badRequest("batchGet field is required");
        if (!Array.isArray(values) || values.length === 0) {
            badRequest("batchGet values must be a non-empty array");
        }
        return exports.bridge.select({
            table,
            columns,
            where: { [field]: { in: values } },
            orderBy,
            limit,
            offset
        });
    },
    async rangeList(options) {
        const { table, columns, where, range, orderBy, limit, offset } = options;
        if (!range || !range.field) {
            badRequest("range field is required");
        }
        const { between, gt, gte, lt, lte } = range;
        let rangeValue;
        if (between !== undefined) {
            if (gt !== undefined || gte !== undefined || lt !== undefined || lte !== undefined) {
                badRequest("between cannot be combined with gt/gte/lt/lte");
            }
            rangeValue = { between };
        }
        else {
            const value = {};
            if (gt !== undefined)
                value.gt = gt;
            if (gte !== undefined)
                value.gte = gte;
            if (lt !== undefined)
                value.lt = lt;
            if (lte !== undefined)
                value.lte = lte;
            rangeValue = value;
        }
        const combinedWhere = {
            ...(where || {}),
            [range.field]: rangeValue
        };
        return exports.bridge.select({
            table,
            columns,
            where: combinedWhere,
            orderBy,
            limit,
            offset
        });
    },
    async cursorList(options) {
        const { table, columns, where, cursorField, cursorValue, direction = "next", orderDirection = "ASC", limit } = options;
        if (!cursorField) {
            badRequest("cursorField is required");
        }
        const comparator = direction === "next"
            ? orderDirection === "ASC"
                ? { gt: cursorValue }
                : { lt: cursorValue }
            : orderDirection === "ASC"
                ? { lt: cursorValue }
                : { gt: cursorValue };
        const combinedWhere = {
            ...(where || {}),
            [cursorField]: comparator
        };
        return exports.bridge.select({
            table,
            columns,
            where: combinedWhere,
            orderBy: [{ field: cursorField, direction: orderDirection }],
            limit
        });
    },
    async update(options) {
        const { table, where, limit, data, inc, dec, setNull } = options;
        checkTable(table);
        const setParts = buildUpdateSet({ data, inc, dec, setNull });
        const wherePart = (0, where_1.buildWhere)(where);
        let sql = `UPDATE \`${table}\` SET ${setParts.setSql}`;
        const params = [...setParts.params];
        if (wherePart.clause) {
            sql += " " + wherePart.clause;
            params.push(...wherePart.params);
        }
        if (typeof limit === "number") {
            sql += " LIMIT " + Number(limit);
        }
        const [result] = await pool_1.pool.execute(sql, params);
        return result;
    },
    async updateOne(options) {
        if (!options.where || Object.keys(options.where).length === 0) {
            badRequest("updateOne requires where");
        }
        return exports.bridge.update({ ...options, limit: 1 });
    },
    async batchUpdate(options) {
        const { table, field, values, maxBatchSize, limit, ...rest } = options;
        if (!field)
            badRequest("batchUpdate field is required");
        if (!Array.isArray(values) || values.length === 0) {
            badRequest("batchUpdate values must be a non-empty array");
        }
        const maxSize = typeof maxBatchSize === "number" ? maxBatchSize : DEFAULT_BATCH_UPDATE_MAX;
        if (values.length > maxSize) {
            badRequest(`batchUpdate values exceed limit ${maxSize}`);
        }
        return exports.bridge.update({
            table,
            where: { [field]: { in: values } },
            limit: typeof limit === "number" ? limit : values.length,
            ...rest
        });
    },
    async conditionalUpdate(options) {
        const { table, where, whitelistTables, limit, ...rest } = options;
        const whitelist = whitelistTables && whitelistTables.length > 0
            ? whitelistTables
            : DEFAULT_CONDITIONAL_UPDATE_WHITELIST;
        if (!whitelist || whitelist.length === 0) {
            forbidden("conditionalUpdate whitelist is empty; set CONDITIONAL_UPDATE_WHITELIST env or pass whitelistTables");
        }
        if (!whitelist.includes(table)) {
            forbidden(`table ${table} is not allowed for conditionalUpdate`);
        }
        if (!where || Object.keys(where).length === 0) {
            badRequest("conditionalUpdate requires where");
        }
        validateEqualWhere(where);
        const enforcedLimit = typeof limit === "number" ? limit : DEFAULT_CONDITIONAL_UPDATE_LIMIT;
        return exports.bridge.update({
            table,
            where,
            limit: enforcedLimit,
            ...rest
        });
    },
    async atomicUpdate(options) {
        const { inc, dec } = options;
        if ((!inc || Object.keys(inc).length === 0) && (!dec || Object.keys(dec).length === 0)) {
            badRequest("atomicUpdate requires inc or dec");
        }
        return exports.bridge.update(options);
    },
    async nullUpdate(options) {
        if (!options.setNull || options.setNull.length === 0) {
            badRequest("nullUpdate requires setNull fields");
        }
        return exports.bridge.update(options);
    },
    async delete(options) {
        const { table, where, limit, physical = false, softDeleteField = DEFAULT_SOFT_DELETE_FIELD, softDeleteValue = new Date() } = options;
        checkTable(table);
        if (!physical) {
            const field = softDeleteField || DEFAULT_SOFT_DELETE_FIELD;
            return exports.bridge.update({
                table,
                data: { [field]: softDeleteValue },
                where,
                limit
            });
        }
        const wherePart = (0, where_1.buildWhere)(where);
        let sql = `DELETE FROM \`${table}\``;
        const params = [];
        if (wherePart.clause) {
            sql += " " + wherePart.clause;
            params.push(...wherePart.params);
        }
        if (typeof limit === "number") {
            sql += " LIMIT " + Number(limit);
        }
        const [result] = await pool_1.pool.execute(sql, params);
        return result;
    },
    async deleteOne(options) {
        if (!options.where || Object.keys(options.where).length === 0) {
            badRequest("deleteOne requires where");
        }
        return exports.bridge.delete({ ...options, limit: 1 });
    },
    async batchDelete(options) {
        const { table, field, values, maxBatchSize, physical, softDeleteField, softDeleteValue } = options;
        if (!field)
            badRequest("batchDelete field is required");
        if (!Array.isArray(values) || values.length === 0) {
            badRequest("batchDelete values must be a non-empty array");
        }
        const maxSize = typeof maxBatchSize === "number" ? maxBatchSize : DEFAULT_BATCH_DELETE_MAX;
        if (values.length > maxSize) {
            badRequest(`batchDelete values exceed limit ${maxSize}`);
        }
        return exports.bridge.delete({
            table,
            where: { [field]: { in: values } },
            limit: options.limit ?? values.length,
            physical,
            softDeleteField,
            softDeleteValue
        });
    },
    async conditionalDelete(options) {
        const { table, where, whitelistTables, limit, physical, softDeleteField, softDeleteValue } = options;
        const whitelist = whitelistTables && whitelistTables.length > 0
            ? whitelistTables
            : DEFAULT_CONDITIONAL_DELETE_WHITELIST;
        if (!whitelist || whitelist.length === 0) {
            forbidden("conditionalDelete whitelist is empty; set CONDITIONAL_DELETE_WHITELIST env or pass whitelistTables");
        }
        if (!whitelist.includes(table)) {
            forbidden(`table ${table} is not allowed for conditionalDelete`);
        }
        if (!where || Object.keys(where).length === 0) {
            badRequest("conditionalDelete requires where");
        }
        const enforcedLimit = typeof limit === "number" ? limit : DEFAULT_CONDITIONAL_DELETE_LIMIT;
        return exports.bridge.delete({
            table,
            where,
            limit: enforcedLimit,
            physical,
            softDeleteField,
            softDeleteValue
        });
    }
};
