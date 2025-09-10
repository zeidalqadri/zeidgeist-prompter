var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../.wrangler/tmp/bundle-54FTSV/checked-fetch.js
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
var urls;
var init_checked_fetch = __esm({
  "../.wrangler/tmp/bundle-54FTSV/checked-fetch.js"() {
    "use strict";
    urls = /* @__PURE__ */ new Set();
    __name(checkURL, "checkURL");
    globalThis.fetch = new Proxy(globalThis.fetch, {
      apply(target, thisArg, argArray) {
        const [request, init] = argArray;
        checkURL(request, init);
        return Reflect.apply(target, thisArg, argArray);
      }
    });
  }
});

// ../node_modules/drizzle-orm/entity.js
function is(value, type) {
  if (!value || typeof value !== "object") {
    return false;
  }
  if (value instanceof type) {
    return true;
  }
  if (!Object.prototype.hasOwnProperty.call(type, entityKind)) {
    throw new Error(
      `Class "${type.name ?? "<unknown>"}" doesn't look like a Drizzle entity. If this is incorrect and the class is provided by Drizzle, please report this as a bug.`
    );
  }
  let cls = Object.getPrototypeOf(value).constructor;
  if (cls) {
    while (cls) {
      if (entityKind in cls && cls[entityKind] === type[entityKind]) {
        return true;
      }
      cls = Object.getPrototypeOf(cls);
    }
  }
  return false;
}
var entityKind, hasOwnEntityKind;
var init_entity = __esm({
  "../node_modules/drizzle-orm/entity.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    entityKind = Symbol.for("drizzle:entityKind");
    hasOwnEntityKind = Symbol.for("drizzle:hasOwnEntityKind");
    __name(is, "is");
  }
});

// ../node_modules/drizzle-orm/column.js
var Column;
var init_column = __esm({
  "../node_modules/drizzle-orm/column.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    Column = class {
      static {
        __name(this, "Column");
      }
      constructor(table, config) {
        this.table = table;
        this.config = config;
        this.name = config.name;
        this.keyAsName = config.keyAsName;
        this.notNull = config.notNull;
        this.default = config.default;
        this.defaultFn = config.defaultFn;
        this.onUpdateFn = config.onUpdateFn;
        this.hasDefault = config.hasDefault;
        this.primary = config.primaryKey;
        this.isUnique = config.isUnique;
        this.uniqueName = config.uniqueName;
        this.uniqueType = config.uniqueType;
        this.dataType = config.dataType;
        this.columnType = config.columnType;
        this.generated = config.generated;
        this.generatedIdentity = config.generatedIdentity;
      }
      static [entityKind] = "Column";
      name;
      keyAsName;
      primary;
      notNull;
      default;
      defaultFn;
      onUpdateFn;
      hasDefault;
      isUnique;
      uniqueName;
      uniqueType;
      dataType;
      columnType;
      enumValues = void 0;
      generated = void 0;
      generatedIdentity = void 0;
      config;
      mapFromDriverValue(value) {
        return value;
      }
      mapToDriverValue(value) {
        return value;
      }
      // ** @internal */
      shouldDisableInsert() {
        return this.config.generated !== void 0 && this.config.generated.type !== "byDefault";
      }
    };
  }
});

// ../node_modules/drizzle-orm/column-builder.js
var ColumnBuilder;
var init_column_builder = __esm({
  "../node_modules/drizzle-orm/column-builder.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    ColumnBuilder = class {
      static {
        __name(this, "ColumnBuilder");
      }
      static [entityKind] = "ColumnBuilder";
      config;
      constructor(name, dataType, columnType) {
        this.config = {
          name,
          keyAsName: name === "",
          notNull: false,
          default: void 0,
          hasDefault: false,
          primaryKey: false,
          isUnique: false,
          uniqueName: void 0,
          uniqueType: void 0,
          dataType,
          columnType,
          generated: void 0
        };
      }
      /**
       * Changes the data type of the column. Commonly used with `json` columns. Also, useful for branded types.
       *
       * @example
       * ```ts
       * const users = pgTable('users', {
       * 	id: integer('id').$type<UserId>().primaryKey(),
       * 	details: json('details').$type<UserDetails>().notNull(),
       * });
       * ```
       */
      $type() {
        return this;
      }
      /**
       * Adds a `not null` clause to the column definition.
       *
       * Affects the `select` model of the table - columns *without* `not null` will be nullable on select.
       */
      notNull() {
        this.config.notNull = true;
        return this;
      }
      /**
       * Adds a `default <value>` clause to the column definition.
       *
       * Affects the `insert` model of the table - columns *with* `default` are optional on insert.
       *
       * If you need to set a dynamic default value, use {@link $defaultFn} instead.
       */
      default(value) {
        this.config.default = value;
        this.config.hasDefault = true;
        return this;
      }
      /**
       * Adds a dynamic default value to the column.
       * The function will be called when the row is inserted, and the returned value will be used as the column value.
       *
       * **Note:** This value does not affect the `drizzle-kit` behavior, it is only used at runtime in `drizzle-orm`.
       */
      $defaultFn(fn) {
        this.config.defaultFn = fn;
        this.config.hasDefault = true;
        return this;
      }
      /**
       * Alias for {@link $defaultFn}.
       */
      $default = this.$defaultFn;
      /**
       * Adds a dynamic update value to the column.
       * The function will be called when the row is updated, and the returned value will be used as the column value if none is provided.
       * If no `default` (or `$defaultFn`) value is provided, the function will be called when the row is inserted as well, and the returned value will be used as the column value.
       *
       * **Note:** This value does not affect the `drizzle-kit` behavior, it is only used at runtime in `drizzle-orm`.
       */
      $onUpdateFn(fn) {
        this.config.onUpdateFn = fn;
        this.config.hasDefault = true;
        return this;
      }
      /**
       * Alias for {@link $onUpdateFn}.
       */
      $onUpdate = this.$onUpdateFn;
      /**
       * Adds a `primary key` clause to the column definition. This implicitly makes the column `not null`.
       *
       * In SQLite, `integer primary key` implicitly makes the column auto-incrementing.
       */
      primaryKey() {
        this.config.primaryKey = true;
        this.config.notNull = true;
        return this;
      }
      /** @internal Sets the name of the column to the key within the table definition if a name was not given. */
      setName(name) {
        if (this.config.name !== "") return;
        this.config.name = name;
      }
    };
  }
});

// ../node_modules/drizzle-orm/table.utils.js
var TableName;
var init_table_utils = __esm({
  "../node_modules/drizzle-orm/table.utils.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    TableName = Symbol.for("drizzle:Name");
  }
});

// ../node_modules/drizzle-orm/pg-core/foreign-keys.js
var ForeignKeyBuilder, ForeignKey;
var init_foreign_keys = __esm({
  "../node_modules/drizzle-orm/pg-core/foreign-keys.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_table_utils();
    ForeignKeyBuilder = class {
      static {
        __name(this, "ForeignKeyBuilder");
      }
      static [entityKind] = "PgForeignKeyBuilder";
      /** @internal */
      reference;
      /** @internal */
      _onUpdate = "no action";
      /** @internal */
      _onDelete = "no action";
      constructor(config, actions) {
        this.reference = () => {
          const { name, columns, foreignColumns } = config();
          return { name, columns, foreignTable: foreignColumns[0].table, foreignColumns };
        };
        if (actions) {
          this._onUpdate = actions.onUpdate;
          this._onDelete = actions.onDelete;
        }
      }
      onUpdate(action) {
        this._onUpdate = action === void 0 ? "no action" : action;
        return this;
      }
      onDelete(action) {
        this._onDelete = action === void 0 ? "no action" : action;
        return this;
      }
      /** @internal */
      build(table) {
        return new ForeignKey(table, this);
      }
    };
    ForeignKey = class {
      static {
        __name(this, "ForeignKey");
      }
      constructor(table, builder) {
        this.table = table;
        this.reference = builder.reference;
        this.onUpdate = builder._onUpdate;
        this.onDelete = builder._onDelete;
      }
      static [entityKind] = "PgForeignKey";
      reference;
      onUpdate;
      onDelete;
      getName() {
        const { name, columns, foreignColumns } = this.reference();
        const columnNames = columns.map((column) => column.name);
        const foreignColumnNames = foreignColumns.map((column) => column.name);
        const chunks = [
          this.table[TableName],
          ...columnNames,
          foreignColumns[0].table[TableName],
          ...foreignColumnNames
        ];
        return name ?? `${chunks.join("_")}_fk`;
      }
    };
  }
});

// ../node_modules/drizzle-orm/tracing-utils.js
function iife(fn, ...args) {
  return fn(...args);
}
var init_tracing_utils = __esm({
  "../node_modules/drizzle-orm/tracing-utils.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    __name(iife, "iife");
  }
});

// ../node_modules/drizzle-orm/pg-core/unique-constraint.js
function uniqueKeyName(table, columns) {
  return `${table[TableName]}_${columns.join("_")}_unique`;
}
var UniqueConstraintBuilder, UniqueOnConstraintBuilder, UniqueConstraint;
var init_unique_constraint = __esm({
  "../node_modules/drizzle-orm/pg-core/unique-constraint.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_table_utils();
    __name(uniqueKeyName, "uniqueKeyName");
    UniqueConstraintBuilder = class {
      static {
        __name(this, "UniqueConstraintBuilder");
      }
      constructor(columns, name) {
        this.name = name;
        this.columns = columns;
      }
      static [entityKind] = "PgUniqueConstraintBuilder";
      /** @internal */
      columns;
      /** @internal */
      nullsNotDistinctConfig = false;
      nullsNotDistinct() {
        this.nullsNotDistinctConfig = true;
        return this;
      }
      /** @internal */
      build(table) {
        return new UniqueConstraint(table, this.columns, this.nullsNotDistinctConfig, this.name);
      }
    };
    UniqueOnConstraintBuilder = class {
      static {
        __name(this, "UniqueOnConstraintBuilder");
      }
      static [entityKind] = "PgUniqueOnConstraintBuilder";
      /** @internal */
      name;
      constructor(name) {
        this.name = name;
      }
      on(...columns) {
        return new UniqueConstraintBuilder(columns, this.name);
      }
    };
    UniqueConstraint = class {
      static {
        __name(this, "UniqueConstraint");
      }
      constructor(table, columns, nullsNotDistinct, name) {
        this.table = table;
        this.columns = columns;
        this.name = name ?? uniqueKeyName(this.table, this.columns.map((column) => column.name));
        this.nullsNotDistinct = nullsNotDistinct;
      }
      static [entityKind] = "PgUniqueConstraint";
      columns;
      name;
      nullsNotDistinct = false;
      getName() {
        return this.name;
      }
    };
  }
});

// ../node_modules/drizzle-orm/pg-core/utils/array.js
function parsePgArrayValue(arrayString, startFrom, inQuotes) {
  for (let i = startFrom; i < arrayString.length; i++) {
    const char2 = arrayString[i];
    if (char2 === "\\") {
      i++;
      continue;
    }
    if (char2 === '"') {
      return [arrayString.slice(startFrom, i).replace(/\\/g, ""), i + 1];
    }
    if (inQuotes) {
      continue;
    }
    if (char2 === "," || char2 === "}") {
      return [arrayString.slice(startFrom, i).replace(/\\/g, ""), i];
    }
  }
  return [arrayString.slice(startFrom).replace(/\\/g, ""), arrayString.length];
}
function parsePgNestedArray(arrayString, startFrom = 0) {
  const result = [];
  let i = startFrom;
  let lastCharIsComma = false;
  while (i < arrayString.length) {
    const char2 = arrayString[i];
    if (char2 === ",") {
      if (lastCharIsComma || i === startFrom) {
        result.push("");
      }
      lastCharIsComma = true;
      i++;
      continue;
    }
    lastCharIsComma = false;
    if (char2 === "\\") {
      i += 2;
      continue;
    }
    if (char2 === '"') {
      const [value2, startFrom2] = parsePgArrayValue(arrayString, i + 1, true);
      result.push(value2);
      i = startFrom2;
      continue;
    }
    if (char2 === "}") {
      return [result, i + 1];
    }
    if (char2 === "{") {
      const [value2, startFrom2] = parsePgNestedArray(arrayString, i + 1);
      result.push(value2);
      i = startFrom2;
      continue;
    }
    const [value, newStartFrom] = parsePgArrayValue(arrayString, i, false);
    result.push(value);
    i = newStartFrom;
  }
  return [result, i];
}
function parsePgArray(arrayString) {
  const [result] = parsePgNestedArray(arrayString, 1);
  return result;
}
function makePgArray(array) {
  return `{${array.map((item) => {
    if (Array.isArray(item)) {
      return makePgArray(item);
    }
    if (typeof item === "string") {
      return `"${item.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    }
    return `${item}`;
  }).join(",")}}`;
}
var init_array = __esm({
  "../node_modules/drizzle-orm/pg-core/utils/array.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    __name(parsePgArrayValue, "parsePgArrayValue");
    __name(parsePgNestedArray, "parsePgNestedArray");
    __name(parsePgArray, "parsePgArray");
    __name(makePgArray, "makePgArray");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/common.js
var PgColumnBuilder, PgColumn, ExtraConfigColumn, IndexedColumn, PgArrayBuilder, PgArray;
var init_common = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/common.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_column_builder();
    init_column();
    init_entity();
    init_foreign_keys();
    init_tracing_utils();
    init_unique_constraint();
    init_array();
    PgColumnBuilder = class extends ColumnBuilder {
      static {
        __name(this, "PgColumnBuilder");
      }
      foreignKeyConfigs = [];
      static [entityKind] = "PgColumnBuilder";
      array(size) {
        return new PgArrayBuilder(this.config.name, this, size);
      }
      references(ref, actions = {}) {
        this.foreignKeyConfigs.push({ ref, actions });
        return this;
      }
      unique(name, config) {
        this.config.isUnique = true;
        this.config.uniqueName = name;
        this.config.uniqueType = config?.nulls;
        return this;
      }
      generatedAlwaysAs(as2) {
        this.config.generated = {
          as: as2,
          type: "always",
          mode: "stored"
        };
        return this;
      }
      /** @internal */
      buildForeignKeys(column, table) {
        return this.foreignKeyConfigs.map(({ ref, actions }) => {
          return iife(
            (ref2, actions2) => {
              const builder = new ForeignKeyBuilder(() => {
                const foreignColumn = ref2();
                return { columns: [column], foreignColumns: [foreignColumn] };
              });
              if (actions2.onUpdate) {
                builder.onUpdate(actions2.onUpdate);
              }
              if (actions2.onDelete) {
                builder.onDelete(actions2.onDelete);
              }
              return builder.build(table);
            },
            ref,
            actions
          );
        });
      }
      /** @internal */
      buildExtraConfigColumn(table) {
        return new ExtraConfigColumn(table, this.config);
      }
    };
    PgColumn = class extends Column {
      static {
        __name(this, "PgColumn");
      }
      constructor(table, config) {
        if (!config.uniqueName) {
          config.uniqueName = uniqueKeyName(table, [config.name]);
        }
        super(table, config);
        this.table = table;
      }
      static [entityKind] = "PgColumn";
    };
    ExtraConfigColumn = class extends PgColumn {
      static {
        __name(this, "ExtraConfigColumn");
      }
      static [entityKind] = "ExtraConfigColumn";
      getSQLType() {
        return this.getSQLType();
      }
      indexConfig = {
        order: this.config.order ?? "asc",
        nulls: this.config.nulls ?? "last",
        opClass: this.config.opClass
      };
      defaultConfig = {
        order: "asc",
        nulls: "last",
        opClass: void 0
      };
      asc() {
        this.indexConfig.order = "asc";
        return this;
      }
      desc() {
        this.indexConfig.order = "desc";
        return this;
      }
      nullsFirst() {
        this.indexConfig.nulls = "first";
        return this;
      }
      nullsLast() {
        this.indexConfig.nulls = "last";
        return this;
      }
      /**
       * ### PostgreSQL documentation quote
       *
       * > An operator class with optional parameters can be specified for each column of an index.
       * The operator class identifies the operators to be used by the index for that column.
       * For example, a B-tree index on four-byte integers would use the int4_ops class;
       * this operator class includes comparison functions for four-byte integers.
       * In practice the default operator class for the column's data type is usually sufficient.
       * The main point of having operator classes is that for some data types, there could be more than one meaningful ordering.
       * For example, we might want to sort a complex-number data type either by absolute value or by real part.
       * We could do this by defining two operator classes for the data type and then selecting the proper class when creating an index.
       * More information about operator classes check:
       *
       * ### Useful links
       * https://www.postgresql.org/docs/current/sql-createindex.html
       *
       * https://www.postgresql.org/docs/current/indexes-opclass.html
       *
       * https://www.postgresql.org/docs/current/xindex.html
       *
       * ### Additional types
       * If you have the `pg_vector` extension installed in your database, you can use the
       * `vector_l2_ops`, `vector_ip_ops`, `vector_cosine_ops`, `vector_l1_ops`, `bit_hamming_ops`, `bit_jaccard_ops`, `halfvec_l2_ops`, `sparsevec_l2_ops` options, which are predefined types.
       *
       * **You can always specify any string you want in the operator class, in case Drizzle doesn't have it natively in its types**
       *
       * @param opClass
       * @returns
       */
      op(opClass) {
        this.indexConfig.opClass = opClass;
        return this;
      }
    };
    IndexedColumn = class {
      static {
        __name(this, "IndexedColumn");
      }
      static [entityKind] = "IndexedColumn";
      constructor(name, keyAsName, type, indexConfig) {
        this.name = name;
        this.keyAsName = keyAsName;
        this.type = type;
        this.indexConfig = indexConfig;
      }
      name;
      keyAsName;
      type;
      indexConfig;
    };
    PgArrayBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgArrayBuilder");
      }
      static [entityKind] = "PgArrayBuilder";
      constructor(name, baseBuilder, size) {
        super(name, "array", "PgArray");
        this.config.baseBuilder = baseBuilder;
        this.config.size = size;
      }
      /** @internal */
      build(table) {
        const baseColumn = this.config.baseBuilder.build(table);
        return new PgArray(
          table,
          this.config,
          baseColumn
        );
      }
    };
    PgArray = class _PgArray extends PgColumn {
      static {
        __name(this, "PgArray");
      }
      constructor(table, config, baseColumn, range) {
        super(table, config);
        this.baseColumn = baseColumn;
        this.range = range;
        this.size = config.size;
      }
      size;
      static [entityKind] = "PgArray";
      getSQLType() {
        return `${this.baseColumn.getSQLType()}[${typeof this.size === "number" ? this.size : ""}]`;
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") {
          value = parsePgArray(value);
        }
        return value.map((v2) => this.baseColumn.mapFromDriverValue(v2));
      }
      mapToDriverValue(value, isNestedArray = false) {
        const a2 = value.map(
          (v2) => v2 === null ? null : is(this.baseColumn, _PgArray) ? this.baseColumn.mapToDriverValue(v2, true) : this.baseColumn.mapToDriverValue(v2)
        );
        if (isNestedArray) return a2;
        return makePgArray(a2);
      }
    };
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/enum.js
function isPgEnum(obj) {
  return !!obj && typeof obj === "function" && isPgEnumSym in obj && obj[isPgEnumSym] === true;
}
function pgEnumWithSchema(enumName, values, schema) {
  const enumInstance = Object.assign(
    (name) => new PgEnumColumnBuilder(name ?? "", enumInstance),
    {
      enumName,
      enumValues: values,
      schema,
      [isPgEnumSym]: true
    }
  );
  return enumInstance;
}
function pgEnumObjectWithSchema(enumName, values, schema) {
  const enumInstance = Object.assign(
    (name) => new PgEnumObjectColumnBuilder(name ?? "", enumInstance),
    {
      enumName,
      enumValues: Object.values(values),
      schema,
      [isPgEnumSym]: true
    }
  );
  return enumInstance;
}
var PgEnumObjectColumnBuilder, PgEnumObjectColumn, isPgEnumSym, PgEnumColumnBuilder, PgEnumColumn;
var init_enum = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/enum.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_common();
    PgEnumObjectColumnBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgEnumObjectColumnBuilder");
      }
      static [entityKind] = "PgEnumObjectColumnBuilder";
      constructor(name, enumInstance) {
        super(name, "string", "PgEnumObjectColumn");
        this.config.enum = enumInstance;
      }
      /** @internal */
      build(table) {
        return new PgEnumObjectColumn(
          table,
          this.config
        );
      }
    };
    PgEnumObjectColumn = class extends PgColumn {
      static {
        __name(this, "PgEnumObjectColumn");
      }
      static [entityKind] = "PgEnumObjectColumn";
      enum;
      enumValues = this.config.enum.enumValues;
      constructor(table, config) {
        super(table, config);
        this.enum = config.enum;
      }
      getSQLType() {
        return this.enum.enumName;
      }
    };
    isPgEnumSym = Symbol.for("drizzle:isPgEnum");
    __name(isPgEnum, "isPgEnum");
    PgEnumColumnBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgEnumColumnBuilder");
      }
      static [entityKind] = "PgEnumColumnBuilder";
      constructor(name, enumInstance) {
        super(name, "string", "PgEnumColumn");
        this.config.enum = enumInstance;
      }
      /** @internal */
      build(table) {
        return new PgEnumColumn(
          table,
          this.config
        );
      }
    };
    PgEnumColumn = class extends PgColumn {
      static {
        __name(this, "PgEnumColumn");
      }
      static [entityKind] = "PgEnumColumn";
      enum = this.config.enum;
      enumValues = this.config.enum.enumValues;
      constructor(table, config) {
        super(table, config);
        this.enum = config.enum;
      }
      getSQLType() {
        return this.enum.enumName;
      }
    };
    __name(pgEnumWithSchema, "pgEnumWithSchema");
    __name(pgEnumObjectWithSchema, "pgEnumObjectWithSchema");
  }
});

// ../node_modules/drizzle-orm/subquery.js
var Subquery, WithSubquery;
var init_subquery = __esm({
  "../node_modules/drizzle-orm/subquery.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    Subquery = class {
      static {
        __name(this, "Subquery");
      }
      static [entityKind] = "Subquery";
      constructor(sql2, fields, alias, isWith = false, usedTables = []) {
        this._ = {
          brand: "Subquery",
          sql: sql2,
          selectedFields: fields,
          alias,
          isWith,
          usedTables
        };
      }
      // getSQL(): SQL<unknown> {
      // 	return new SQL([this]);
      // }
    };
    WithSubquery = class extends Subquery {
      static {
        __name(this, "WithSubquery");
      }
      static [entityKind] = "WithSubquery";
    };
  }
});

// ../node_modules/drizzle-orm/version.js
var version;
var init_version = __esm({
  "../node_modules/drizzle-orm/version.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    version = "0.44.4";
  }
});

// ../node_modules/drizzle-orm/tracing.js
var otel, rawTracer, tracer;
var init_tracing = __esm({
  "../node_modules/drizzle-orm/tracing.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_tracing_utils();
    init_version();
    tracer = {
      startActiveSpan(name, fn) {
        if (!otel) {
          return fn();
        }
        if (!rawTracer) {
          rawTracer = otel.trace.getTracer("drizzle-orm", version);
        }
        return iife(
          (otel2, rawTracer2) => rawTracer2.startActiveSpan(
            name,
            (span) => {
              try {
                return fn(span);
              } catch (e) {
                span.setStatus({
                  code: otel2.SpanStatusCode.ERROR,
                  message: e instanceof Error ? e.message : "Unknown error"
                  // eslint-disable-line no-instanceof/no-instanceof
                });
                throw e;
              } finally {
                span.end();
              }
            }
          ),
          otel,
          rawTracer
        );
      }
    };
  }
});

// ../node_modules/drizzle-orm/view-common.js
var ViewBaseConfig;
var init_view_common = __esm({
  "../node_modules/drizzle-orm/view-common.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    ViewBaseConfig = Symbol.for("drizzle:ViewBaseConfig");
  }
});

// ../node_modules/drizzle-orm/table.js
function getTableName(table) {
  return table[TableName];
}
function getTableUniqueName(table) {
  return `${table[Schema] ?? "public"}.${table[TableName]}`;
}
var Schema, Columns, ExtraConfigColumns, OriginalName, BaseName, IsAlias, ExtraConfigBuilder, IsDrizzleTable, Table;
var init_table = __esm({
  "../node_modules/drizzle-orm/table.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_table_utils();
    Schema = Symbol.for("drizzle:Schema");
    Columns = Symbol.for("drizzle:Columns");
    ExtraConfigColumns = Symbol.for("drizzle:ExtraConfigColumns");
    OriginalName = Symbol.for("drizzle:OriginalName");
    BaseName = Symbol.for("drizzle:BaseName");
    IsAlias = Symbol.for("drizzle:IsAlias");
    ExtraConfigBuilder = Symbol.for("drizzle:ExtraConfigBuilder");
    IsDrizzleTable = Symbol.for("drizzle:IsDrizzleTable");
    Table = class {
      static {
        __name(this, "Table");
      }
      static [entityKind] = "Table";
      /** @internal */
      static Symbol = {
        Name: TableName,
        Schema,
        OriginalName,
        Columns,
        ExtraConfigColumns,
        BaseName,
        IsAlias,
        ExtraConfigBuilder
      };
      /**
       * @internal
       * Can be changed if the table is aliased.
       */
      [TableName];
      /**
       * @internal
       * Used to store the original name of the table, before any aliasing.
       */
      [OriginalName];
      /** @internal */
      [Schema];
      /** @internal */
      [Columns];
      /** @internal */
      [ExtraConfigColumns];
      /**
       *  @internal
       * Used to store the table name before the transformation via the `tableCreator` functions.
       */
      [BaseName];
      /** @internal */
      [IsAlias] = false;
      /** @internal */
      [IsDrizzleTable] = true;
      /** @internal */
      [ExtraConfigBuilder] = void 0;
      constructor(name, schema, baseName) {
        this[TableName] = this[OriginalName] = name;
        this[Schema] = schema;
        this[BaseName] = baseName;
      }
    };
    __name(getTableName, "getTableName");
    __name(getTableUniqueName, "getTableUniqueName");
  }
});

// ../node_modules/drizzle-orm/sql/sql.js
function isSQLWrapper(value) {
  return value !== null && value !== void 0 && typeof value.getSQL === "function";
}
function mergeQueries(queries) {
  const result = { sql: "", params: [] };
  for (const query of queries) {
    result.sql += query.sql;
    result.params.push(...query.params);
    if (query.typings?.length) {
      if (!result.typings) {
        result.typings = [];
      }
      result.typings.push(...query.typings);
    }
  }
  return result;
}
function isDriverValueEncoder(value) {
  return typeof value === "object" && value !== null && "mapToDriverValue" in value && typeof value.mapToDriverValue === "function";
}
function sql(strings, ...params) {
  const queryChunks = [];
  if (params.length > 0 || strings.length > 0 && strings[0] !== "") {
    queryChunks.push(new StringChunk(strings[0]));
  }
  for (const [paramIndex, param2] of params.entries()) {
    queryChunks.push(param2, new StringChunk(strings[paramIndex + 1]));
  }
  return new SQL(queryChunks);
}
function fillPlaceholders(params, values) {
  return params.map((p2) => {
    if (is(p2, Placeholder)) {
      if (!(p2.name in values)) {
        throw new Error(`No value for placeholder "${p2.name}" was provided`);
      }
      return values[p2.name];
    }
    if (is(p2, Param) && is(p2.value, Placeholder)) {
      if (!(p2.value.name in values)) {
        throw new Error(`No value for placeholder "${p2.value.name}" was provided`);
      }
      return p2.encoder.mapToDriverValue(values[p2.value.name]);
    }
    return p2;
  });
}
var FakePrimitiveParam, StringChunk, SQL, Name, noopDecoder, noopEncoder, noopMapper, Param, Placeholder, IsDrizzleView, View;
var init_sql = __esm({
  "../node_modules/drizzle-orm/sql/sql.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_enum();
    init_subquery();
    init_tracing();
    init_view_common();
    init_column();
    init_table();
    FakePrimitiveParam = class {
      static {
        __name(this, "FakePrimitiveParam");
      }
      static [entityKind] = "FakePrimitiveParam";
    };
    __name(isSQLWrapper, "isSQLWrapper");
    __name(mergeQueries, "mergeQueries");
    StringChunk = class {
      static {
        __name(this, "StringChunk");
      }
      static [entityKind] = "StringChunk";
      value;
      constructor(value) {
        this.value = Array.isArray(value) ? value : [value];
      }
      getSQL() {
        return new SQL([this]);
      }
    };
    SQL = class _SQL {
      static {
        __name(this, "SQL");
      }
      constructor(queryChunks) {
        this.queryChunks = queryChunks;
        for (const chunk of queryChunks) {
          if (is(chunk, Table)) {
            const schemaName = chunk[Table.Symbol.Schema];
            this.usedTables.push(
              schemaName === void 0 ? chunk[Table.Symbol.Name] : schemaName + "." + chunk[Table.Symbol.Name]
            );
          }
        }
      }
      static [entityKind] = "SQL";
      /** @internal */
      decoder = noopDecoder;
      shouldInlineParams = false;
      /** @internal */
      usedTables = [];
      append(query) {
        this.queryChunks.push(...query.queryChunks);
        return this;
      }
      toQuery(config) {
        return tracer.startActiveSpan("drizzle.buildSQL", (span) => {
          const query = this.buildQueryFromSourceParams(this.queryChunks, config);
          span?.setAttributes({
            "drizzle.query.text": query.sql,
            "drizzle.query.params": JSON.stringify(query.params)
          });
          return query;
        });
      }
      buildQueryFromSourceParams(chunks, _config) {
        const config = Object.assign({}, _config, {
          inlineParams: _config.inlineParams || this.shouldInlineParams,
          paramStartIndex: _config.paramStartIndex || { value: 0 }
        });
        const {
          casing,
          escapeName,
          escapeParam,
          prepareTyping,
          inlineParams,
          paramStartIndex
        } = config;
        return mergeQueries(chunks.map((chunk) => {
          if (is(chunk, StringChunk)) {
            return { sql: chunk.value.join(""), params: [] };
          }
          if (is(chunk, Name)) {
            return { sql: escapeName(chunk.value), params: [] };
          }
          if (chunk === void 0) {
            return { sql: "", params: [] };
          }
          if (Array.isArray(chunk)) {
            const result = [new StringChunk("(")];
            for (const [i, p2] of chunk.entries()) {
              result.push(p2);
              if (i < chunk.length - 1) {
                result.push(new StringChunk(", "));
              }
            }
            result.push(new StringChunk(")"));
            return this.buildQueryFromSourceParams(result, config);
          }
          if (is(chunk, _SQL)) {
            return this.buildQueryFromSourceParams(chunk.queryChunks, {
              ...config,
              inlineParams: inlineParams || chunk.shouldInlineParams
            });
          }
          if (is(chunk, Table)) {
            const schemaName = chunk[Table.Symbol.Schema];
            const tableName = chunk[Table.Symbol.Name];
            return {
              sql: schemaName === void 0 || chunk[IsAlias] ? escapeName(tableName) : escapeName(schemaName) + "." + escapeName(tableName),
              params: []
            };
          }
          if (is(chunk, Column)) {
            const columnName = casing.getColumnCasing(chunk);
            if (_config.invokeSource === "indexes") {
              return { sql: escapeName(columnName), params: [] };
            }
            const schemaName = chunk.table[Table.Symbol.Schema];
            return {
              sql: chunk.table[IsAlias] || schemaName === void 0 ? escapeName(chunk.table[Table.Symbol.Name]) + "." + escapeName(columnName) : escapeName(schemaName) + "." + escapeName(chunk.table[Table.Symbol.Name]) + "." + escapeName(columnName),
              params: []
            };
          }
          if (is(chunk, View)) {
            const schemaName = chunk[ViewBaseConfig].schema;
            const viewName = chunk[ViewBaseConfig].name;
            return {
              sql: schemaName === void 0 || chunk[ViewBaseConfig].isAlias ? escapeName(viewName) : escapeName(schemaName) + "." + escapeName(viewName),
              params: []
            };
          }
          if (is(chunk, Param)) {
            if (is(chunk.value, Placeholder)) {
              return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
            }
            const mappedValue = chunk.value === null ? null : chunk.encoder.mapToDriverValue(chunk.value);
            if (is(mappedValue, _SQL)) {
              return this.buildQueryFromSourceParams([mappedValue], config);
            }
            if (inlineParams) {
              return { sql: this.mapInlineParam(mappedValue, config), params: [] };
            }
            let typings = ["none"];
            if (prepareTyping) {
              typings = [prepareTyping(chunk.encoder)];
            }
            return { sql: escapeParam(paramStartIndex.value++, mappedValue), params: [mappedValue], typings };
          }
          if (is(chunk, Placeholder)) {
            return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
          }
          if (is(chunk, _SQL.Aliased) && chunk.fieldAlias !== void 0) {
            return { sql: escapeName(chunk.fieldAlias), params: [] };
          }
          if (is(chunk, Subquery)) {
            if (chunk._.isWith) {
              return { sql: escapeName(chunk._.alias), params: [] };
            }
            return this.buildQueryFromSourceParams([
              new StringChunk("("),
              chunk._.sql,
              new StringChunk(") "),
              new Name(chunk._.alias)
            ], config);
          }
          if (isPgEnum(chunk)) {
            if (chunk.schema) {
              return { sql: escapeName(chunk.schema) + "." + escapeName(chunk.enumName), params: [] };
            }
            return { sql: escapeName(chunk.enumName), params: [] };
          }
          if (isSQLWrapper(chunk)) {
            if (chunk.shouldOmitSQLParens?.()) {
              return this.buildQueryFromSourceParams([chunk.getSQL()], config);
            }
            return this.buildQueryFromSourceParams([
              new StringChunk("("),
              chunk.getSQL(),
              new StringChunk(")")
            ], config);
          }
          if (inlineParams) {
            return { sql: this.mapInlineParam(chunk, config), params: [] };
          }
          return { sql: escapeParam(paramStartIndex.value++, chunk), params: [chunk], typings: ["none"] };
        }));
      }
      mapInlineParam(chunk, { escapeString: escapeString2 }) {
        if (chunk === null) {
          return "null";
        }
        if (typeof chunk === "number" || typeof chunk === "boolean") {
          return chunk.toString();
        }
        if (typeof chunk === "string") {
          return escapeString2(chunk);
        }
        if (typeof chunk === "object") {
          const mappedValueAsString = chunk.toString();
          if (mappedValueAsString === "[object Object]") {
            return escapeString2(JSON.stringify(chunk));
          }
          return escapeString2(mappedValueAsString);
        }
        throw new Error("Unexpected param value: " + chunk);
      }
      getSQL() {
        return this;
      }
      as(alias) {
        if (alias === void 0) {
          return this;
        }
        return new _SQL.Aliased(this, alias);
      }
      mapWith(decoder) {
        this.decoder = typeof decoder === "function" ? { mapFromDriverValue: decoder } : decoder;
        return this;
      }
      inlineParams() {
        this.shouldInlineParams = true;
        return this;
      }
      /**
       * This method is used to conditionally include a part of the query.
       *
       * @param condition - Condition to check
       * @returns itself if the condition is `true`, otherwise `undefined`
       */
      if(condition) {
        return condition ? this : void 0;
      }
    };
    Name = class {
      static {
        __name(this, "Name");
      }
      constructor(value) {
        this.value = value;
      }
      static [entityKind] = "Name";
      brand;
      getSQL() {
        return new SQL([this]);
      }
    };
    __name(isDriverValueEncoder, "isDriverValueEncoder");
    noopDecoder = {
      mapFromDriverValue: /* @__PURE__ */ __name((value) => value, "mapFromDriverValue")
    };
    noopEncoder = {
      mapToDriverValue: /* @__PURE__ */ __name((value) => value, "mapToDriverValue")
    };
    noopMapper = {
      ...noopDecoder,
      ...noopEncoder
    };
    Param = class {
      static {
        __name(this, "Param");
      }
      /**
       * @param value - Parameter value
       * @param encoder - Encoder to convert the value to a driver parameter
       */
      constructor(value, encoder = noopEncoder) {
        this.value = value;
        this.encoder = encoder;
      }
      static [entityKind] = "Param";
      brand;
      getSQL() {
        return new SQL([this]);
      }
    };
    __name(sql, "sql");
    ((sql2) => {
      function empty() {
        return new SQL([]);
      }
      __name(empty, "empty");
      sql2.empty = empty;
      function fromList(list) {
        return new SQL(list);
      }
      __name(fromList, "fromList");
      sql2.fromList = fromList;
      function raw(str) {
        return new SQL([new StringChunk(str)]);
      }
      __name(raw, "raw");
      sql2.raw = raw;
      function join(chunks, separator) {
        const result = [];
        for (const [i, chunk] of chunks.entries()) {
          if (i > 0 && separator !== void 0) {
            result.push(separator);
          }
          result.push(chunk);
        }
        return new SQL(result);
      }
      __name(join, "join");
      sql2.join = join;
      function identifier(value) {
        return new Name(value);
      }
      __name(identifier, "identifier");
      sql2.identifier = identifier;
      function placeholder2(name2) {
        return new Placeholder(name2);
      }
      __name(placeholder2, "placeholder2");
      sql2.placeholder = placeholder2;
      function param2(value, encoder) {
        return new Param(value, encoder);
      }
      __name(param2, "param2");
      sql2.param = param2;
    })(sql || (sql = {}));
    ((SQL2) => {
      class Aliased {
        static {
          __name(this, "Aliased");
        }
        constructor(sql2, fieldAlias) {
          this.sql = sql2;
          this.fieldAlias = fieldAlias;
        }
        static [entityKind] = "SQL.Aliased";
        /** @internal */
        isSelectionField = false;
        getSQL() {
          return this.sql;
        }
        /** @internal */
        clone() {
          return new Aliased(this.sql, this.fieldAlias);
        }
      }
      SQL2.Aliased = Aliased;
    })(SQL || (SQL = {}));
    Placeholder = class {
      static {
        __name(this, "Placeholder");
      }
      constructor(name2) {
        this.name = name2;
      }
      static [entityKind] = "Placeholder";
      getSQL() {
        return new SQL([this]);
      }
    };
    __name(fillPlaceholders, "fillPlaceholders");
    IsDrizzleView = Symbol.for("drizzle:IsDrizzleView");
    View = class {
      static {
        __name(this, "View");
      }
      static [entityKind] = "View";
      /** @internal */
      [ViewBaseConfig];
      /** @internal */
      [IsDrizzleView] = true;
      constructor({ name: name2, schema, selectedFields, query }) {
        this[ViewBaseConfig] = {
          name: name2,
          originalName: name2,
          schema,
          selectedFields,
          query,
          isExisting: !query,
          isAlias: false
        };
      }
      getSQL() {
        return new SQL([this]);
      }
    };
    Column.prototype.getSQL = function() {
      return new SQL([this]);
    };
    Table.prototype.getSQL = function() {
      return new SQL([this]);
    };
    Subquery.prototype.getSQL = function() {
      return new SQL([this]);
    };
  }
});

// ../node_modules/drizzle-orm/alias.js
function aliasedTable(table, tableAlias) {
  return new Proxy(table, new TableAliasProxyHandler(tableAlias, false));
}
function aliasedTableColumn(column, tableAlias) {
  return new Proxy(
    column,
    new ColumnAliasProxyHandler(new Proxy(column.table, new TableAliasProxyHandler(tableAlias, false)))
  );
}
function mapColumnsInAliasedSQLToAlias(query, alias) {
  return new SQL.Aliased(mapColumnsInSQLToAlias(query.sql, alias), query.fieldAlias);
}
function mapColumnsInSQLToAlias(query, alias) {
  return sql.join(query.queryChunks.map((c) => {
    if (is(c, Column)) {
      return aliasedTableColumn(c, alias);
    }
    if (is(c, SQL)) {
      return mapColumnsInSQLToAlias(c, alias);
    }
    if (is(c, SQL.Aliased)) {
      return mapColumnsInAliasedSQLToAlias(c, alias);
    }
    return c;
  }));
}
var ColumnAliasProxyHandler, TableAliasProxyHandler, RelationTableAliasProxyHandler;
var init_alias = __esm({
  "../node_modules/drizzle-orm/alias.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_column();
    init_entity();
    init_sql();
    init_table();
    init_view_common();
    ColumnAliasProxyHandler = class {
      static {
        __name(this, "ColumnAliasProxyHandler");
      }
      constructor(table) {
        this.table = table;
      }
      static [entityKind] = "ColumnAliasProxyHandler";
      get(columnObj, prop) {
        if (prop === "table") {
          return this.table;
        }
        return columnObj[prop];
      }
    };
    TableAliasProxyHandler = class {
      static {
        __name(this, "TableAliasProxyHandler");
      }
      constructor(alias, replaceOriginalName) {
        this.alias = alias;
        this.replaceOriginalName = replaceOriginalName;
      }
      static [entityKind] = "TableAliasProxyHandler";
      get(target, prop) {
        if (prop === Table.Symbol.IsAlias) {
          return true;
        }
        if (prop === Table.Symbol.Name) {
          return this.alias;
        }
        if (this.replaceOriginalName && prop === Table.Symbol.OriginalName) {
          return this.alias;
        }
        if (prop === ViewBaseConfig) {
          return {
            ...target[ViewBaseConfig],
            name: this.alias,
            isAlias: true
          };
        }
        if (prop === Table.Symbol.Columns) {
          const columns = target[Table.Symbol.Columns];
          if (!columns) {
            return columns;
          }
          const proxiedColumns = {};
          Object.keys(columns).map((key) => {
            proxiedColumns[key] = new Proxy(
              columns[key],
              new ColumnAliasProxyHandler(new Proxy(target, this))
            );
          });
          return proxiedColumns;
        }
        const value = target[prop];
        if (is(value, Column)) {
          return new Proxy(value, new ColumnAliasProxyHandler(new Proxy(target, this)));
        }
        return value;
      }
    };
    RelationTableAliasProxyHandler = class {
      static {
        __name(this, "RelationTableAliasProxyHandler");
      }
      constructor(alias) {
        this.alias = alias;
      }
      static [entityKind] = "RelationTableAliasProxyHandler";
      get(target, prop) {
        if (prop === "sourceTable") {
          return aliasedTable(target.sourceTable, this.alias);
        }
        return target[prop];
      }
    };
    __name(aliasedTable, "aliasedTable");
    __name(aliasedTableColumn, "aliasedTableColumn");
    __name(mapColumnsInAliasedSQLToAlias, "mapColumnsInAliasedSQLToAlias");
    __name(mapColumnsInSQLToAlias, "mapColumnsInSQLToAlias");
  }
});

// ../node_modules/drizzle-orm/errors.js
var DrizzleError, DrizzleQueryError, TransactionRollbackError;
var init_errors = __esm({
  "../node_modules/drizzle-orm/errors.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    DrizzleError = class extends Error {
      static {
        __name(this, "DrizzleError");
      }
      static [entityKind] = "DrizzleError";
      constructor({ message, cause }) {
        super(message);
        this.name = "DrizzleError";
        this.cause = cause;
      }
    };
    DrizzleQueryError = class _DrizzleQueryError extends Error {
      static {
        __name(this, "DrizzleQueryError");
      }
      constructor(query, params, cause) {
        super(`Failed query: ${query}
params: ${params}`);
        this.query = query;
        this.params = params;
        this.cause = cause;
        Error.captureStackTrace(this, _DrizzleQueryError);
        if (cause) this.cause = cause;
      }
    };
    TransactionRollbackError = class extends DrizzleError {
      static {
        __name(this, "TransactionRollbackError");
      }
      static [entityKind] = "TransactionRollbackError";
      constructor() {
        super({ message: "Rollback" });
      }
    };
  }
});

// ../node_modules/drizzle-orm/logger.js
var ConsoleLogWriter, DefaultLogger, NoopLogger;
var init_logger = __esm({
  "../node_modules/drizzle-orm/logger.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    ConsoleLogWriter = class {
      static {
        __name(this, "ConsoleLogWriter");
      }
      static [entityKind] = "ConsoleLogWriter";
      write(message) {
        console.log(message);
      }
    };
    DefaultLogger = class {
      static {
        __name(this, "DefaultLogger");
      }
      static [entityKind] = "DefaultLogger";
      writer;
      constructor(config) {
        this.writer = config?.writer ?? new ConsoleLogWriter();
      }
      logQuery(query, params) {
        const stringifiedParams = params.map((p2) => {
          try {
            return JSON.stringify(p2);
          } catch {
            return String(p2);
          }
        });
        const paramsStr = stringifiedParams.length ? ` -- params: [${stringifiedParams.join(", ")}]` : "";
        this.writer.write(`Query: ${query}${paramsStr}`);
      }
    };
    NoopLogger = class {
      static {
        __name(this, "NoopLogger");
      }
      static [entityKind] = "NoopLogger";
      logQuery() {
      }
    };
  }
});

// ../node_modules/drizzle-orm/operations.js
var init_operations = __esm({
  "../node_modules/drizzle-orm/operations.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
  }
});

// ../node_modules/drizzle-orm/query-promise.js
var QueryPromise;
var init_query_promise = __esm({
  "../node_modules/drizzle-orm/query-promise.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    QueryPromise = class {
      static {
        __name(this, "QueryPromise");
      }
      static [entityKind] = "QueryPromise";
      [Symbol.toStringTag] = "QueryPromise";
      catch(onRejected) {
        return this.then(void 0, onRejected);
      }
      finally(onFinally) {
        return this.then(
          (value) => {
            onFinally?.();
            return value;
          },
          (reason) => {
            onFinally?.();
            throw reason;
          }
        );
      }
      then(onFulfilled, onRejected) {
        return this.execute().then(onFulfilled, onRejected);
      }
    };
  }
});

// ../node_modules/drizzle-orm/utils.js
function mapResultRow(columns, row, joinsNotNullableMap) {
  const nullifyMap = {};
  const result = columns.reduce(
    (result2, { path, field }, columnIndex) => {
      let decoder;
      if (is(field, Column)) {
        decoder = field;
      } else if (is(field, SQL)) {
        decoder = field.decoder;
      } else {
        decoder = field.sql.decoder;
      }
      let node = result2;
      for (const [pathChunkIndex, pathChunk] of path.entries()) {
        if (pathChunkIndex < path.length - 1) {
          if (!(pathChunk in node)) {
            node[pathChunk] = {};
          }
          node = node[pathChunk];
        } else {
          const rawValue = row[columnIndex];
          const value = node[pathChunk] = rawValue === null ? null : decoder.mapFromDriverValue(rawValue);
          if (joinsNotNullableMap && is(field, Column) && path.length === 2) {
            const objectName = path[0];
            if (!(objectName in nullifyMap)) {
              nullifyMap[objectName] = value === null ? getTableName(field.table) : false;
            } else if (typeof nullifyMap[objectName] === "string" && nullifyMap[objectName] !== getTableName(field.table)) {
              nullifyMap[objectName] = false;
            }
          }
        }
      }
      return result2;
    },
    {}
  );
  if (joinsNotNullableMap && Object.keys(nullifyMap).length > 0) {
    for (const [objectName, tableName] of Object.entries(nullifyMap)) {
      if (typeof tableName === "string" && !joinsNotNullableMap[tableName]) {
        result[objectName] = null;
      }
    }
  }
  return result;
}
function orderSelectedFields(fields, pathPrefix) {
  return Object.entries(fields).reduce((result, [name, field]) => {
    if (typeof name !== "string") {
      return result;
    }
    const newPath = pathPrefix ? [...pathPrefix, name] : [name];
    if (is(field, Column) || is(field, SQL) || is(field, SQL.Aliased)) {
      result.push({ path: newPath, field });
    } else if (is(field, Table)) {
      result.push(...orderSelectedFields(field[Table.Symbol.Columns], newPath));
    } else {
      result.push(...orderSelectedFields(field, newPath));
    }
    return result;
  }, []);
}
function haveSameKeys(left, right) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }
  for (const [index, key] of leftKeys.entries()) {
    if (key !== rightKeys[index]) {
      return false;
    }
  }
  return true;
}
function mapUpdateSet(table, values) {
  const entries = Object.entries(values).filter(([, value]) => value !== void 0).map(([key, value]) => {
    if (is(value, SQL) || is(value, Column)) {
      return [key, value];
    } else {
      return [key, new Param(value, table[Table.Symbol.Columns][key])];
    }
  });
  if (entries.length === 0) {
    throw new Error("No values to set");
  }
  return Object.fromEntries(entries);
}
function applyMixins(baseClass, extendedClasses) {
  for (const extendedClass of extendedClasses) {
    for (const name of Object.getOwnPropertyNames(extendedClass.prototype)) {
      if (name === "constructor") continue;
      Object.defineProperty(
        baseClass.prototype,
        name,
        Object.getOwnPropertyDescriptor(extendedClass.prototype, name) || /* @__PURE__ */ Object.create(null)
      );
    }
  }
}
function getTableColumns(table) {
  return table[Table.Symbol.Columns];
}
function getTableLikeName(table) {
  return is(table, Subquery) ? table._.alias : is(table, View) ? table[ViewBaseConfig].name : is(table, SQL) ? void 0 : table[Table.Symbol.IsAlias] ? table[Table.Symbol.Name] : table[Table.Symbol.BaseName];
}
function getColumnNameAndConfig(a2, b2) {
  return {
    name: typeof a2 === "string" && a2.length > 0 ? a2 : "",
    config: typeof a2 === "object" ? a2 : b2
  };
}
function isConfig(data) {
  if (typeof data !== "object" || data === null) return false;
  if (data.constructor.name !== "Object") return false;
  if ("logger" in data) {
    const type = typeof data["logger"];
    if (type !== "boolean" && (type !== "object" || typeof data["logger"]["logQuery"] !== "function") && type !== "undefined") return false;
    return true;
  }
  if ("schema" in data) {
    const type = typeof data["schema"];
    if (type !== "object" && type !== "undefined") return false;
    return true;
  }
  if ("casing" in data) {
    const type = typeof data["casing"];
    if (type !== "string" && type !== "undefined") return false;
    return true;
  }
  if ("mode" in data) {
    if (data["mode"] !== "default" || data["mode"] !== "planetscale" || data["mode"] !== void 0) return false;
    return true;
  }
  if ("connection" in data) {
    const type = typeof data["connection"];
    if (type !== "string" && type !== "object" && type !== "undefined") return false;
    return true;
  }
  if ("client" in data) {
    const type = typeof data["client"];
    if (type !== "object" && type !== "function" && type !== "undefined") return false;
    return true;
  }
  if (Object.keys(data).length === 0) return true;
  return false;
}
var init_utils = __esm({
  "../node_modules/drizzle-orm/utils.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_column();
    init_entity();
    init_sql();
    init_subquery();
    init_table();
    init_view_common();
    __name(mapResultRow, "mapResultRow");
    __name(orderSelectedFields, "orderSelectedFields");
    __name(haveSameKeys, "haveSameKeys");
    __name(mapUpdateSet, "mapUpdateSet");
    __name(applyMixins, "applyMixins");
    __name(getTableColumns, "getTableColumns");
    __name(getTableLikeName, "getTableLikeName");
    __name(getColumnNameAndConfig, "getColumnNameAndConfig");
    __name(isConfig, "isConfig");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/int.common.js
var PgIntColumnBaseBuilder;
var init_int_common = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/int.common.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_common();
    PgIntColumnBaseBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgIntColumnBaseBuilder");
      }
      static [entityKind] = "PgIntColumnBaseBuilder";
      generatedAlwaysAsIdentity(sequence) {
        if (sequence) {
          const { name, ...options } = sequence;
          this.config.generatedIdentity = {
            type: "always",
            sequenceName: name,
            sequenceOptions: options
          };
        } else {
          this.config.generatedIdentity = {
            type: "always"
          };
        }
        this.config.hasDefault = true;
        this.config.notNull = true;
        return this;
      }
      generatedByDefaultAsIdentity(sequence) {
        if (sequence) {
          const { name, ...options } = sequence;
          this.config.generatedIdentity = {
            type: "byDefault",
            sequenceName: name,
            sequenceOptions: options
          };
        } else {
          this.config.generatedIdentity = {
            type: "byDefault"
          };
        }
        this.config.hasDefault = true;
        this.config.notNull = true;
        return this;
      }
    };
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/bigint.js
function bigint(a2, b2) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  if (config.mode === "number") {
    return new PgBigInt53Builder(name);
  }
  return new PgBigInt64Builder(name);
}
var PgBigInt53Builder, PgBigInt53, PgBigInt64Builder, PgBigInt64;
var init_bigint = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/bigint.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_utils();
    init_common();
    init_int_common();
    PgBigInt53Builder = class extends PgIntColumnBaseBuilder {
      static {
        __name(this, "PgBigInt53Builder");
      }
      static [entityKind] = "PgBigInt53Builder";
      constructor(name) {
        super(name, "number", "PgBigInt53");
      }
      /** @internal */
      build(table) {
        return new PgBigInt53(table, this.config);
      }
    };
    PgBigInt53 = class extends PgColumn {
      static {
        __name(this, "PgBigInt53");
      }
      static [entityKind] = "PgBigInt53";
      getSQLType() {
        return "bigint";
      }
      mapFromDriverValue(value) {
        if (typeof value === "number") {
          return value;
        }
        return Number(value);
      }
    };
    PgBigInt64Builder = class extends PgIntColumnBaseBuilder {
      static {
        __name(this, "PgBigInt64Builder");
      }
      static [entityKind] = "PgBigInt64Builder";
      constructor(name) {
        super(name, "bigint", "PgBigInt64");
      }
      /** @internal */
      build(table) {
        return new PgBigInt64(
          table,
          this.config
        );
      }
    };
    PgBigInt64 = class extends PgColumn {
      static {
        __name(this, "PgBigInt64");
      }
      static [entityKind] = "PgBigInt64";
      getSQLType() {
        return "bigint";
      }
      // eslint-disable-next-line unicorn/prefer-native-coercion-functions
      mapFromDriverValue(value) {
        return BigInt(value);
      }
    };
    __name(bigint, "bigint");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/bigserial.js
function bigserial(a2, b2) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  if (config.mode === "number") {
    return new PgBigSerial53Builder(name);
  }
  return new PgBigSerial64Builder(name);
}
var PgBigSerial53Builder, PgBigSerial53, PgBigSerial64Builder, PgBigSerial64;
var init_bigserial = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/bigserial.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_utils();
    init_common();
    PgBigSerial53Builder = class extends PgColumnBuilder {
      static {
        __name(this, "PgBigSerial53Builder");
      }
      static [entityKind] = "PgBigSerial53Builder";
      constructor(name) {
        super(name, "number", "PgBigSerial53");
        this.config.hasDefault = true;
        this.config.notNull = true;
      }
      /** @internal */
      build(table) {
        return new PgBigSerial53(
          table,
          this.config
        );
      }
    };
    PgBigSerial53 = class extends PgColumn {
      static {
        __name(this, "PgBigSerial53");
      }
      static [entityKind] = "PgBigSerial53";
      getSQLType() {
        return "bigserial";
      }
      mapFromDriverValue(value) {
        if (typeof value === "number") {
          return value;
        }
        return Number(value);
      }
    };
    PgBigSerial64Builder = class extends PgColumnBuilder {
      static {
        __name(this, "PgBigSerial64Builder");
      }
      static [entityKind] = "PgBigSerial64Builder";
      constructor(name) {
        super(name, "bigint", "PgBigSerial64");
        this.config.hasDefault = true;
      }
      /** @internal */
      build(table) {
        return new PgBigSerial64(
          table,
          this.config
        );
      }
    };
    PgBigSerial64 = class extends PgColumn {
      static {
        __name(this, "PgBigSerial64");
      }
      static [entityKind] = "PgBigSerial64";
      getSQLType() {
        return "bigserial";
      }
      // eslint-disable-next-line unicorn/prefer-native-coercion-functions
      mapFromDriverValue(value) {
        return BigInt(value);
      }
    };
    __name(bigserial, "bigserial");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/boolean.js
function boolean(name) {
  return new PgBooleanBuilder(name ?? "");
}
var PgBooleanBuilder, PgBoolean;
var init_boolean = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/boolean.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_common();
    PgBooleanBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgBooleanBuilder");
      }
      static [entityKind] = "PgBooleanBuilder";
      constructor(name) {
        super(name, "boolean", "PgBoolean");
      }
      /** @internal */
      build(table) {
        return new PgBoolean(table, this.config);
      }
    };
    PgBoolean = class extends PgColumn {
      static {
        __name(this, "PgBoolean");
      }
      static [entityKind] = "PgBoolean";
      getSQLType() {
        return "boolean";
      }
    };
    __name(boolean, "boolean");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/char.js
function char(a2, b2 = {}) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  return new PgCharBuilder(name, config);
}
var PgCharBuilder, PgChar;
var init_char = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/char.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_utils();
    init_common();
    PgCharBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgCharBuilder");
      }
      static [entityKind] = "PgCharBuilder";
      constructor(name, config) {
        super(name, "string", "PgChar");
        this.config.length = config.length;
        this.config.enumValues = config.enum;
      }
      /** @internal */
      build(table) {
        return new PgChar(
          table,
          this.config
        );
      }
    };
    PgChar = class extends PgColumn {
      static {
        __name(this, "PgChar");
      }
      static [entityKind] = "PgChar";
      length = this.config.length;
      enumValues = this.config.enumValues;
      getSQLType() {
        return this.length === void 0 ? `char` : `char(${this.length})`;
      }
    };
    __name(char, "char");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/cidr.js
function cidr(name) {
  return new PgCidrBuilder(name ?? "");
}
var PgCidrBuilder, PgCidr;
var init_cidr = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/cidr.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_common();
    PgCidrBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgCidrBuilder");
      }
      static [entityKind] = "PgCidrBuilder";
      constructor(name) {
        super(name, "string", "PgCidr");
      }
      /** @internal */
      build(table) {
        return new PgCidr(table, this.config);
      }
    };
    PgCidr = class extends PgColumn {
      static {
        __name(this, "PgCidr");
      }
      static [entityKind] = "PgCidr";
      getSQLType() {
        return "cidr";
      }
    };
    __name(cidr, "cidr");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/custom.js
function customType(customTypeParams) {
  return (a2, b2) => {
    const { name, config } = getColumnNameAndConfig(a2, b2);
    return new PgCustomColumnBuilder(name, config, customTypeParams);
  };
}
var PgCustomColumnBuilder, PgCustomColumn;
var init_custom = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/custom.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_utils();
    init_common();
    PgCustomColumnBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgCustomColumnBuilder");
      }
      static [entityKind] = "PgCustomColumnBuilder";
      constructor(name, fieldConfig, customTypeParams) {
        super(name, "custom", "PgCustomColumn");
        this.config.fieldConfig = fieldConfig;
        this.config.customTypeParams = customTypeParams;
      }
      /** @internal */
      build(table) {
        return new PgCustomColumn(
          table,
          this.config
        );
      }
    };
    PgCustomColumn = class extends PgColumn {
      static {
        __name(this, "PgCustomColumn");
      }
      static [entityKind] = "PgCustomColumn";
      sqlName;
      mapTo;
      mapFrom;
      constructor(table, config) {
        super(table, config);
        this.sqlName = config.customTypeParams.dataType(config.fieldConfig);
        this.mapTo = config.customTypeParams.toDriver;
        this.mapFrom = config.customTypeParams.fromDriver;
      }
      getSQLType() {
        return this.sqlName;
      }
      mapFromDriverValue(value) {
        return typeof this.mapFrom === "function" ? this.mapFrom(value) : value;
      }
      mapToDriverValue(value) {
        return typeof this.mapTo === "function" ? this.mapTo(value) : value;
      }
    };
    __name(customType, "customType");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/date.common.js
var PgDateColumnBaseBuilder;
var init_date_common = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/date.common.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_sql();
    init_common();
    PgDateColumnBaseBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgDateColumnBaseBuilder");
      }
      static [entityKind] = "PgDateColumnBaseBuilder";
      defaultNow() {
        return this.default(sql`now()`);
      }
    };
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/date.js
function date(a2, b2) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  if (config?.mode === "date") {
    return new PgDateBuilder(name);
  }
  return new PgDateStringBuilder(name);
}
var PgDateBuilder, PgDate, PgDateStringBuilder, PgDateString;
var init_date = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/date.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_utils();
    init_common();
    init_date_common();
    PgDateBuilder = class extends PgDateColumnBaseBuilder {
      static {
        __name(this, "PgDateBuilder");
      }
      static [entityKind] = "PgDateBuilder";
      constructor(name) {
        super(name, "date", "PgDate");
      }
      /** @internal */
      build(table) {
        return new PgDate(table, this.config);
      }
    };
    PgDate = class extends PgColumn {
      static {
        __name(this, "PgDate");
      }
      static [entityKind] = "PgDate";
      getSQLType() {
        return "date";
      }
      mapFromDriverValue(value) {
        return new Date(value);
      }
      mapToDriverValue(value) {
        return value.toISOString();
      }
    };
    PgDateStringBuilder = class extends PgDateColumnBaseBuilder {
      static {
        __name(this, "PgDateStringBuilder");
      }
      static [entityKind] = "PgDateStringBuilder";
      constructor(name) {
        super(name, "string", "PgDateString");
      }
      /** @internal */
      build(table) {
        return new PgDateString(
          table,
          this.config
        );
      }
    };
    PgDateString = class extends PgColumn {
      static {
        __name(this, "PgDateString");
      }
      static [entityKind] = "PgDateString";
      getSQLType() {
        return "date";
      }
    };
    __name(date, "date");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/double-precision.js
function doublePrecision(name) {
  return new PgDoublePrecisionBuilder(name ?? "");
}
var PgDoublePrecisionBuilder, PgDoublePrecision;
var init_double_precision = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/double-precision.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_common();
    PgDoublePrecisionBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgDoublePrecisionBuilder");
      }
      static [entityKind] = "PgDoublePrecisionBuilder";
      constructor(name) {
        super(name, "number", "PgDoublePrecision");
      }
      /** @internal */
      build(table) {
        return new PgDoublePrecision(
          table,
          this.config
        );
      }
    };
    PgDoublePrecision = class extends PgColumn {
      static {
        __name(this, "PgDoublePrecision");
      }
      static [entityKind] = "PgDoublePrecision";
      getSQLType() {
        return "double precision";
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") {
          return Number.parseFloat(value);
        }
        return value;
      }
    };
    __name(doublePrecision, "doublePrecision");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/inet.js
function inet(name) {
  return new PgInetBuilder(name ?? "");
}
var PgInetBuilder, PgInet;
var init_inet = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/inet.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_common();
    PgInetBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgInetBuilder");
      }
      static [entityKind] = "PgInetBuilder";
      constructor(name) {
        super(name, "string", "PgInet");
      }
      /** @internal */
      build(table) {
        return new PgInet(table, this.config);
      }
    };
    PgInet = class extends PgColumn {
      static {
        __name(this, "PgInet");
      }
      static [entityKind] = "PgInet";
      getSQLType() {
        return "inet";
      }
    };
    __name(inet, "inet");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/integer.js
function integer(name) {
  return new PgIntegerBuilder(name ?? "");
}
var PgIntegerBuilder, PgInteger;
var init_integer = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/integer.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_common();
    init_int_common();
    PgIntegerBuilder = class extends PgIntColumnBaseBuilder {
      static {
        __name(this, "PgIntegerBuilder");
      }
      static [entityKind] = "PgIntegerBuilder";
      constructor(name) {
        super(name, "number", "PgInteger");
      }
      /** @internal */
      build(table) {
        return new PgInteger(table, this.config);
      }
    };
    PgInteger = class extends PgColumn {
      static {
        __name(this, "PgInteger");
      }
      static [entityKind] = "PgInteger";
      getSQLType() {
        return "integer";
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") {
          return Number.parseInt(value);
        }
        return value;
      }
    };
    __name(integer, "integer");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/interval.js
function interval(a2, b2 = {}) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  return new PgIntervalBuilder(name, config);
}
var PgIntervalBuilder, PgInterval;
var init_interval = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/interval.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_utils();
    init_common();
    PgIntervalBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgIntervalBuilder");
      }
      static [entityKind] = "PgIntervalBuilder";
      constructor(name, intervalConfig) {
        super(name, "string", "PgInterval");
        this.config.intervalConfig = intervalConfig;
      }
      /** @internal */
      build(table) {
        return new PgInterval(table, this.config);
      }
    };
    PgInterval = class extends PgColumn {
      static {
        __name(this, "PgInterval");
      }
      static [entityKind] = "PgInterval";
      fields = this.config.intervalConfig.fields;
      precision = this.config.intervalConfig.precision;
      getSQLType() {
        const fields = this.fields ? ` ${this.fields}` : "";
        const precision = this.precision ? `(${this.precision})` : "";
        return `interval${fields}${precision}`;
      }
    };
    __name(interval, "interval");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/json.js
function json(name) {
  return new PgJsonBuilder(name ?? "");
}
var PgJsonBuilder, PgJson;
var init_json = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/json.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_common();
    PgJsonBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgJsonBuilder");
      }
      static [entityKind] = "PgJsonBuilder";
      constructor(name) {
        super(name, "json", "PgJson");
      }
      /** @internal */
      build(table) {
        return new PgJson(table, this.config);
      }
    };
    PgJson = class extends PgColumn {
      static {
        __name(this, "PgJson");
      }
      static [entityKind] = "PgJson";
      constructor(table, config) {
        super(table, config);
      }
      getSQLType() {
        return "json";
      }
      mapToDriverValue(value) {
        return JSON.stringify(value);
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return value;
      }
    };
    __name(json, "json");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/jsonb.js
function jsonb(name) {
  return new PgJsonbBuilder(name ?? "");
}
var PgJsonbBuilder, PgJsonb;
var init_jsonb = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/jsonb.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_common();
    PgJsonbBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgJsonbBuilder");
      }
      static [entityKind] = "PgJsonbBuilder";
      constructor(name) {
        super(name, "json", "PgJsonb");
      }
      /** @internal */
      build(table) {
        return new PgJsonb(table, this.config);
      }
    };
    PgJsonb = class extends PgColumn {
      static {
        __name(this, "PgJsonb");
      }
      static [entityKind] = "PgJsonb";
      constructor(table, config) {
        super(table, config);
      }
      getSQLType() {
        return "jsonb";
      }
      mapToDriverValue(value) {
        return JSON.stringify(value);
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        }
        return value;
      }
    };
    __name(jsonb, "jsonb");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/line.js
function line(a2, b2) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  if (!config?.mode || config.mode === "tuple") {
    return new PgLineBuilder(name);
  }
  return new PgLineABCBuilder(name);
}
var PgLineBuilder, PgLineTuple, PgLineABCBuilder, PgLineABC;
var init_line = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/line.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_utils();
    init_common();
    PgLineBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgLineBuilder");
      }
      static [entityKind] = "PgLineBuilder";
      constructor(name) {
        super(name, "array", "PgLine");
      }
      /** @internal */
      build(table) {
        return new PgLineTuple(
          table,
          this.config
        );
      }
    };
    PgLineTuple = class extends PgColumn {
      static {
        __name(this, "PgLineTuple");
      }
      static [entityKind] = "PgLine";
      getSQLType() {
        return "line";
      }
      mapFromDriverValue(value) {
        const [a2, b2, c] = value.slice(1, -1).split(",");
        return [Number.parseFloat(a2), Number.parseFloat(b2), Number.parseFloat(c)];
      }
      mapToDriverValue(value) {
        return `{${value[0]},${value[1]},${value[2]}}`;
      }
    };
    PgLineABCBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgLineABCBuilder");
      }
      static [entityKind] = "PgLineABCBuilder";
      constructor(name) {
        super(name, "json", "PgLineABC");
      }
      /** @internal */
      build(table) {
        return new PgLineABC(
          table,
          this.config
        );
      }
    };
    PgLineABC = class extends PgColumn {
      static {
        __name(this, "PgLineABC");
      }
      static [entityKind] = "PgLineABC";
      getSQLType() {
        return "line";
      }
      mapFromDriverValue(value) {
        const [a2, b2, c] = value.slice(1, -1).split(",");
        return { a: Number.parseFloat(a2), b: Number.parseFloat(b2), c: Number.parseFloat(c) };
      }
      mapToDriverValue(value) {
        return `{${value.a},${value.b},${value.c}}`;
      }
    };
    __name(line, "line");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/macaddr.js
function macaddr(name) {
  return new PgMacaddrBuilder(name ?? "");
}
var PgMacaddrBuilder, PgMacaddr;
var init_macaddr = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/macaddr.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_common();
    PgMacaddrBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgMacaddrBuilder");
      }
      static [entityKind] = "PgMacaddrBuilder";
      constructor(name) {
        super(name, "string", "PgMacaddr");
      }
      /** @internal */
      build(table) {
        return new PgMacaddr(table, this.config);
      }
    };
    PgMacaddr = class extends PgColumn {
      static {
        __name(this, "PgMacaddr");
      }
      static [entityKind] = "PgMacaddr";
      getSQLType() {
        return "macaddr";
      }
    };
    __name(macaddr, "macaddr");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/macaddr8.js
function macaddr8(name) {
  return new PgMacaddr8Builder(name ?? "");
}
var PgMacaddr8Builder, PgMacaddr8;
var init_macaddr8 = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/macaddr8.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_common();
    PgMacaddr8Builder = class extends PgColumnBuilder {
      static {
        __name(this, "PgMacaddr8Builder");
      }
      static [entityKind] = "PgMacaddr8Builder";
      constructor(name) {
        super(name, "string", "PgMacaddr8");
      }
      /** @internal */
      build(table) {
        return new PgMacaddr8(table, this.config);
      }
    };
    PgMacaddr8 = class extends PgColumn {
      static {
        __name(this, "PgMacaddr8");
      }
      static [entityKind] = "PgMacaddr8";
      getSQLType() {
        return "macaddr8";
      }
    };
    __name(macaddr8, "macaddr8");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/numeric.js
function numeric(a2, b2) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  const mode = config?.mode;
  return mode === "number" ? new PgNumericNumberBuilder(name, config?.precision, config?.scale) : mode === "bigint" ? new PgNumericBigIntBuilder(name, config?.precision, config?.scale) : new PgNumericBuilder(name, config?.precision, config?.scale);
}
var PgNumericBuilder, PgNumeric, PgNumericNumberBuilder, PgNumericNumber, PgNumericBigIntBuilder, PgNumericBigInt;
var init_numeric = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/numeric.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_utils();
    init_common();
    PgNumericBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgNumericBuilder");
      }
      static [entityKind] = "PgNumericBuilder";
      constructor(name, precision, scale) {
        super(name, "string", "PgNumeric");
        this.config.precision = precision;
        this.config.scale = scale;
      }
      /** @internal */
      build(table) {
        return new PgNumeric(table, this.config);
      }
    };
    PgNumeric = class extends PgColumn {
      static {
        __name(this, "PgNumeric");
      }
      static [entityKind] = "PgNumeric";
      precision;
      scale;
      constructor(table, config) {
        super(table, config);
        this.precision = config.precision;
        this.scale = config.scale;
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") return value;
        return String(value);
      }
      getSQLType() {
        if (this.precision !== void 0 && this.scale !== void 0) {
          return `numeric(${this.precision}, ${this.scale})`;
        } else if (this.precision === void 0) {
          return "numeric";
        } else {
          return `numeric(${this.precision})`;
        }
      }
    };
    PgNumericNumberBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgNumericNumberBuilder");
      }
      static [entityKind] = "PgNumericNumberBuilder";
      constructor(name, precision, scale) {
        super(name, "number", "PgNumericNumber");
        this.config.precision = precision;
        this.config.scale = scale;
      }
      /** @internal */
      build(table) {
        return new PgNumericNumber(
          table,
          this.config
        );
      }
    };
    PgNumericNumber = class extends PgColumn {
      static {
        __name(this, "PgNumericNumber");
      }
      static [entityKind] = "PgNumericNumber";
      precision;
      scale;
      constructor(table, config) {
        super(table, config);
        this.precision = config.precision;
        this.scale = config.scale;
      }
      mapFromDriverValue(value) {
        if (typeof value === "number") return value;
        return Number(value);
      }
      mapToDriverValue = String;
      getSQLType() {
        if (this.precision !== void 0 && this.scale !== void 0) {
          return `numeric(${this.precision}, ${this.scale})`;
        } else if (this.precision === void 0) {
          return "numeric";
        } else {
          return `numeric(${this.precision})`;
        }
      }
    };
    PgNumericBigIntBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgNumericBigIntBuilder");
      }
      static [entityKind] = "PgNumericBigIntBuilder";
      constructor(name, precision, scale) {
        super(name, "bigint", "PgNumericBigInt");
        this.config.precision = precision;
        this.config.scale = scale;
      }
      /** @internal */
      build(table) {
        return new PgNumericBigInt(
          table,
          this.config
        );
      }
    };
    PgNumericBigInt = class extends PgColumn {
      static {
        __name(this, "PgNumericBigInt");
      }
      static [entityKind] = "PgNumericBigInt";
      precision;
      scale;
      constructor(table, config) {
        super(table, config);
        this.precision = config.precision;
        this.scale = config.scale;
      }
      mapFromDriverValue = BigInt;
      mapToDriverValue = String;
      getSQLType() {
        if (this.precision !== void 0 && this.scale !== void 0) {
          return `numeric(${this.precision}, ${this.scale})`;
        } else if (this.precision === void 0) {
          return "numeric";
        } else {
          return `numeric(${this.precision})`;
        }
      }
    };
    __name(numeric, "numeric");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/point.js
function point(a2, b2) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  if (!config?.mode || config.mode === "tuple") {
    return new PgPointTupleBuilder(name);
  }
  return new PgPointObjectBuilder(name);
}
var PgPointTupleBuilder, PgPointTuple, PgPointObjectBuilder, PgPointObject;
var init_point = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/point.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_utils();
    init_common();
    PgPointTupleBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgPointTupleBuilder");
      }
      static [entityKind] = "PgPointTupleBuilder";
      constructor(name) {
        super(name, "array", "PgPointTuple");
      }
      /** @internal */
      build(table) {
        return new PgPointTuple(
          table,
          this.config
        );
      }
    };
    PgPointTuple = class extends PgColumn {
      static {
        __name(this, "PgPointTuple");
      }
      static [entityKind] = "PgPointTuple";
      getSQLType() {
        return "point";
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") {
          const [x2, y] = value.slice(1, -1).split(",");
          return [Number.parseFloat(x2), Number.parseFloat(y)];
        }
        return [value.x, value.y];
      }
      mapToDriverValue(value) {
        return `(${value[0]},${value[1]})`;
      }
    };
    PgPointObjectBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgPointObjectBuilder");
      }
      static [entityKind] = "PgPointObjectBuilder";
      constructor(name) {
        super(name, "json", "PgPointObject");
      }
      /** @internal */
      build(table) {
        return new PgPointObject(
          table,
          this.config
        );
      }
    };
    PgPointObject = class extends PgColumn {
      static {
        __name(this, "PgPointObject");
      }
      static [entityKind] = "PgPointObject";
      getSQLType() {
        return "point";
      }
      mapFromDriverValue(value) {
        if (typeof value === "string") {
          const [x2, y] = value.slice(1, -1).split(",");
          return { x: Number.parseFloat(x2), y: Number.parseFloat(y) };
        }
        return value;
      }
      mapToDriverValue(value) {
        return `(${value.x},${value.y})`;
      }
    };
    __name(point, "point");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/postgis_extension/utils.js
function hexToBytes(hex) {
  const bytes = [];
  for (let c = 0; c < hex.length; c += 2) {
    bytes.push(Number.parseInt(hex.slice(c, c + 2), 16));
  }
  return new Uint8Array(bytes);
}
function bytesToFloat64(bytes, offset) {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  for (let i = 0; i < 8; i++) {
    view.setUint8(i, bytes[offset + i]);
  }
  return view.getFloat64(0, true);
}
function parseEWKB(hex) {
  const bytes = hexToBytes(hex);
  let offset = 0;
  const byteOrder = bytes[offset];
  offset += 1;
  const view = new DataView(bytes.buffer);
  const geomType = view.getUint32(offset, byteOrder === 1);
  offset += 4;
  let _srid;
  if (geomType & 536870912) {
    _srid = view.getUint32(offset, byteOrder === 1);
    offset += 4;
  }
  if ((geomType & 65535) === 1) {
    const x2 = bytesToFloat64(bytes, offset);
    offset += 8;
    const y = bytesToFloat64(bytes, offset);
    offset += 8;
    return [x2, y];
  }
  throw new Error("Unsupported geometry type");
}
var init_utils2 = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/postgis_extension/utils.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    __name(hexToBytes, "hexToBytes");
    __name(bytesToFloat64, "bytesToFloat64");
    __name(parseEWKB, "parseEWKB");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/postgis_extension/geometry.js
function geometry(a2, b2) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  if (!config?.mode || config.mode === "tuple") {
    return new PgGeometryBuilder(name);
  }
  return new PgGeometryObjectBuilder(name);
}
var PgGeometryBuilder, PgGeometry, PgGeometryObjectBuilder, PgGeometryObject;
var init_geometry = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/postgis_extension/geometry.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_utils();
    init_common();
    init_utils2();
    PgGeometryBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgGeometryBuilder");
      }
      static [entityKind] = "PgGeometryBuilder";
      constructor(name) {
        super(name, "array", "PgGeometry");
      }
      /** @internal */
      build(table) {
        return new PgGeometry(
          table,
          this.config
        );
      }
    };
    PgGeometry = class extends PgColumn {
      static {
        __name(this, "PgGeometry");
      }
      static [entityKind] = "PgGeometry";
      getSQLType() {
        return "geometry(point)";
      }
      mapFromDriverValue(value) {
        return parseEWKB(value);
      }
      mapToDriverValue(value) {
        return `point(${value[0]} ${value[1]})`;
      }
    };
    PgGeometryObjectBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgGeometryObjectBuilder");
      }
      static [entityKind] = "PgGeometryObjectBuilder";
      constructor(name) {
        super(name, "json", "PgGeometryObject");
      }
      /** @internal */
      build(table) {
        return new PgGeometryObject(
          table,
          this.config
        );
      }
    };
    PgGeometryObject = class extends PgColumn {
      static {
        __name(this, "PgGeometryObject");
      }
      static [entityKind] = "PgGeometryObject";
      getSQLType() {
        return "geometry(point)";
      }
      mapFromDriverValue(value) {
        const parsed = parseEWKB(value);
        return { x: parsed[0], y: parsed[1] };
      }
      mapToDriverValue(value) {
        return `point(${value.x} ${value.y})`;
      }
    };
    __name(geometry, "geometry");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/real.js
function real(name) {
  return new PgRealBuilder(name ?? "");
}
var PgRealBuilder, PgReal;
var init_real = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/real.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_common();
    PgRealBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgRealBuilder");
      }
      static [entityKind] = "PgRealBuilder";
      constructor(name, length) {
        super(name, "number", "PgReal");
        this.config.length = length;
      }
      /** @internal */
      build(table) {
        return new PgReal(table, this.config);
      }
    };
    PgReal = class extends PgColumn {
      static {
        __name(this, "PgReal");
      }
      static [entityKind] = "PgReal";
      constructor(table, config) {
        super(table, config);
      }
      getSQLType() {
        return "real";
      }
      mapFromDriverValue = /* @__PURE__ */ __name((value) => {
        if (typeof value === "string") {
          return Number.parseFloat(value);
        }
        return value;
      }, "mapFromDriverValue");
    };
    __name(real, "real");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/serial.js
function serial(name) {
  return new PgSerialBuilder(name ?? "");
}
var PgSerialBuilder, PgSerial;
var init_serial = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/serial.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_common();
    PgSerialBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgSerialBuilder");
      }
      static [entityKind] = "PgSerialBuilder";
      constructor(name) {
        super(name, "number", "PgSerial");
        this.config.hasDefault = true;
        this.config.notNull = true;
      }
      /** @internal */
      build(table) {
        return new PgSerial(table, this.config);
      }
    };
    PgSerial = class extends PgColumn {
      static {
        __name(this, "PgSerial");
      }
      static [entityKind] = "PgSerial";
      getSQLType() {
        return "serial";
      }
    };
    __name(serial, "serial");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/smallint.js
function smallint(name) {
  return new PgSmallIntBuilder(name ?? "");
}
var PgSmallIntBuilder, PgSmallInt;
var init_smallint = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/smallint.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_common();
    init_int_common();
    PgSmallIntBuilder = class extends PgIntColumnBaseBuilder {
      static {
        __name(this, "PgSmallIntBuilder");
      }
      static [entityKind] = "PgSmallIntBuilder";
      constructor(name) {
        super(name, "number", "PgSmallInt");
      }
      /** @internal */
      build(table) {
        return new PgSmallInt(table, this.config);
      }
    };
    PgSmallInt = class extends PgColumn {
      static {
        __name(this, "PgSmallInt");
      }
      static [entityKind] = "PgSmallInt";
      getSQLType() {
        return "smallint";
      }
      mapFromDriverValue = /* @__PURE__ */ __name((value) => {
        if (typeof value === "string") {
          return Number(value);
        }
        return value;
      }, "mapFromDriverValue");
    };
    __name(smallint, "smallint");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/smallserial.js
function smallserial(name) {
  return new PgSmallSerialBuilder(name ?? "");
}
var PgSmallSerialBuilder, PgSmallSerial;
var init_smallserial = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/smallserial.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_common();
    PgSmallSerialBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgSmallSerialBuilder");
      }
      static [entityKind] = "PgSmallSerialBuilder";
      constructor(name) {
        super(name, "number", "PgSmallSerial");
        this.config.hasDefault = true;
        this.config.notNull = true;
      }
      /** @internal */
      build(table) {
        return new PgSmallSerial(
          table,
          this.config
        );
      }
    };
    PgSmallSerial = class extends PgColumn {
      static {
        __name(this, "PgSmallSerial");
      }
      static [entityKind] = "PgSmallSerial";
      getSQLType() {
        return "smallserial";
      }
    };
    __name(smallserial, "smallserial");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/text.js
function text(a2, b2 = {}) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  return new PgTextBuilder(name, config);
}
var PgTextBuilder, PgText;
var init_text = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/text.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_utils();
    init_common();
    PgTextBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgTextBuilder");
      }
      static [entityKind] = "PgTextBuilder";
      constructor(name, config) {
        super(name, "string", "PgText");
        this.config.enumValues = config.enum;
      }
      /** @internal */
      build(table) {
        return new PgText(table, this.config);
      }
    };
    PgText = class extends PgColumn {
      static {
        __name(this, "PgText");
      }
      static [entityKind] = "PgText";
      enumValues = this.config.enumValues;
      getSQLType() {
        return "text";
      }
    };
    __name(text, "text");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/time.js
function time(a2, b2 = {}) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  return new PgTimeBuilder(name, config.withTimezone ?? false, config.precision);
}
var PgTimeBuilder, PgTime;
var init_time = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/time.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_utils();
    init_common();
    init_date_common();
    PgTimeBuilder = class extends PgDateColumnBaseBuilder {
      static {
        __name(this, "PgTimeBuilder");
      }
      constructor(name, withTimezone, precision) {
        super(name, "string", "PgTime");
        this.withTimezone = withTimezone;
        this.precision = precision;
        this.config.withTimezone = withTimezone;
        this.config.precision = precision;
      }
      static [entityKind] = "PgTimeBuilder";
      /** @internal */
      build(table) {
        return new PgTime(table, this.config);
      }
    };
    PgTime = class extends PgColumn {
      static {
        __name(this, "PgTime");
      }
      static [entityKind] = "PgTime";
      withTimezone;
      precision;
      constructor(table, config) {
        super(table, config);
        this.withTimezone = config.withTimezone;
        this.precision = config.precision;
      }
      getSQLType() {
        const precision = this.precision === void 0 ? "" : `(${this.precision})`;
        return `time${precision}${this.withTimezone ? " with time zone" : ""}`;
      }
    };
    __name(time, "time");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/timestamp.js
function timestamp(a2, b2 = {}) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  if (config?.mode === "string") {
    return new PgTimestampStringBuilder(name, config.withTimezone ?? false, config.precision);
  }
  return new PgTimestampBuilder(name, config?.withTimezone ?? false, config?.precision);
}
var PgTimestampBuilder, PgTimestamp, PgTimestampStringBuilder, PgTimestampString;
var init_timestamp = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/timestamp.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_utils();
    init_common();
    init_date_common();
    PgTimestampBuilder = class extends PgDateColumnBaseBuilder {
      static {
        __name(this, "PgTimestampBuilder");
      }
      static [entityKind] = "PgTimestampBuilder";
      constructor(name, withTimezone, precision) {
        super(name, "date", "PgTimestamp");
        this.config.withTimezone = withTimezone;
        this.config.precision = precision;
      }
      /** @internal */
      build(table) {
        return new PgTimestamp(table, this.config);
      }
    };
    PgTimestamp = class extends PgColumn {
      static {
        __name(this, "PgTimestamp");
      }
      static [entityKind] = "PgTimestamp";
      withTimezone;
      precision;
      constructor(table, config) {
        super(table, config);
        this.withTimezone = config.withTimezone;
        this.precision = config.precision;
      }
      getSQLType() {
        const precision = this.precision === void 0 ? "" : ` (${this.precision})`;
        return `timestamp${precision}${this.withTimezone ? " with time zone" : ""}`;
      }
      mapFromDriverValue = /* @__PURE__ */ __name((value) => {
        return new Date(this.withTimezone ? value : value + "+0000");
      }, "mapFromDriverValue");
      mapToDriverValue = /* @__PURE__ */ __name((value) => {
        return value.toISOString();
      }, "mapToDriverValue");
    };
    PgTimestampStringBuilder = class extends PgDateColumnBaseBuilder {
      static {
        __name(this, "PgTimestampStringBuilder");
      }
      static [entityKind] = "PgTimestampStringBuilder";
      constructor(name, withTimezone, precision) {
        super(name, "string", "PgTimestampString");
        this.config.withTimezone = withTimezone;
        this.config.precision = precision;
      }
      /** @internal */
      build(table) {
        return new PgTimestampString(
          table,
          this.config
        );
      }
    };
    PgTimestampString = class extends PgColumn {
      static {
        __name(this, "PgTimestampString");
      }
      static [entityKind] = "PgTimestampString";
      withTimezone;
      precision;
      constructor(table, config) {
        super(table, config);
        this.withTimezone = config.withTimezone;
        this.precision = config.precision;
      }
      getSQLType() {
        const precision = this.precision === void 0 ? "" : `(${this.precision})`;
        return `timestamp${precision}${this.withTimezone ? " with time zone" : ""}`;
      }
    };
    __name(timestamp, "timestamp");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/uuid.js
function uuid(name) {
  return new PgUUIDBuilder(name ?? "");
}
var PgUUIDBuilder, PgUUID;
var init_uuid = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/uuid.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_sql();
    init_common();
    PgUUIDBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgUUIDBuilder");
      }
      static [entityKind] = "PgUUIDBuilder";
      constructor(name) {
        super(name, "string", "PgUUID");
      }
      /**
       * Adds `default gen_random_uuid()` to the column definition.
       */
      defaultRandom() {
        return this.default(sql`gen_random_uuid()`);
      }
      /** @internal */
      build(table) {
        return new PgUUID(table, this.config);
      }
    };
    PgUUID = class extends PgColumn {
      static {
        __name(this, "PgUUID");
      }
      static [entityKind] = "PgUUID";
      getSQLType() {
        return "uuid";
      }
    };
    __name(uuid, "uuid");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/varchar.js
function varchar(a2, b2 = {}) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  return new PgVarcharBuilder(name, config);
}
var PgVarcharBuilder, PgVarchar;
var init_varchar = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/varchar.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_utils();
    init_common();
    PgVarcharBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgVarcharBuilder");
      }
      static [entityKind] = "PgVarcharBuilder";
      constructor(name, config) {
        super(name, "string", "PgVarchar");
        this.config.length = config.length;
        this.config.enumValues = config.enum;
      }
      /** @internal */
      build(table) {
        return new PgVarchar(
          table,
          this.config
        );
      }
    };
    PgVarchar = class extends PgColumn {
      static {
        __name(this, "PgVarchar");
      }
      static [entityKind] = "PgVarchar";
      length = this.config.length;
      enumValues = this.config.enumValues;
      getSQLType() {
        return this.length === void 0 ? `varchar` : `varchar(${this.length})`;
      }
    };
    __name(varchar, "varchar");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/vector_extension/bit.js
function bit(a2, b2) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  return new PgBinaryVectorBuilder(name, config);
}
var PgBinaryVectorBuilder, PgBinaryVector;
var init_bit = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/vector_extension/bit.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_utils();
    init_common();
    PgBinaryVectorBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgBinaryVectorBuilder");
      }
      static [entityKind] = "PgBinaryVectorBuilder";
      constructor(name, config) {
        super(name, "string", "PgBinaryVector");
        this.config.dimensions = config.dimensions;
      }
      /** @internal */
      build(table) {
        return new PgBinaryVector(
          table,
          this.config
        );
      }
    };
    PgBinaryVector = class extends PgColumn {
      static {
        __name(this, "PgBinaryVector");
      }
      static [entityKind] = "PgBinaryVector";
      dimensions = this.config.dimensions;
      getSQLType() {
        return `bit(${this.dimensions})`;
      }
    };
    __name(bit, "bit");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/vector_extension/halfvec.js
function halfvec(a2, b2) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  return new PgHalfVectorBuilder(name, config);
}
var PgHalfVectorBuilder, PgHalfVector;
var init_halfvec = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/vector_extension/halfvec.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_utils();
    init_common();
    PgHalfVectorBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgHalfVectorBuilder");
      }
      static [entityKind] = "PgHalfVectorBuilder";
      constructor(name, config) {
        super(name, "array", "PgHalfVector");
        this.config.dimensions = config.dimensions;
      }
      /** @internal */
      build(table) {
        return new PgHalfVector(
          table,
          this.config
        );
      }
    };
    PgHalfVector = class extends PgColumn {
      static {
        __name(this, "PgHalfVector");
      }
      static [entityKind] = "PgHalfVector";
      dimensions = this.config.dimensions;
      getSQLType() {
        return `halfvec(${this.dimensions})`;
      }
      mapToDriverValue(value) {
        return JSON.stringify(value);
      }
      mapFromDriverValue(value) {
        return value.slice(1, -1).split(",").map((v2) => Number.parseFloat(v2));
      }
    };
    __name(halfvec, "halfvec");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/vector_extension/sparsevec.js
function sparsevec(a2, b2) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  return new PgSparseVectorBuilder(name, config);
}
var PgSparseVectorBuilder, PgSparseVector;
var init_sparsevec = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/vector_extension/sparsevec.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_utils();
    init_common();
    PgSparseVectorBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgSparseVectorBuilder");
      }
      static [entityKind] = "PgSparseVectorBuilder";
      constructor(name, config) {
        super(name, "string", "PgSparseVector");
        this.config.dimensions = config.dimensions;
      }
      /** @internal */
      build(table) {
        return new PgSparseVector(
          table,
          this.config
        );
      }
    };
    PgSparseVector = class extends PgColumn {
      static {
        __name(this, "PgSparseVector");
      }
      static [entityKind] = "PgSparseVector";
      dimensions = this.config.dimensions;
      getSQLType() {
        return `sparsevec(${this.dimensions})`;
      }
    };
    __name(sparsevec, "sparsevec");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/vector_extension/vector.js
function vector(a2, b2) {
  const { name, config } = getColumnNameAndConfig(a2, b2);
  return new PgVectorBuilder(name, config);
}
var PgVectorBuilder, PgVector;
var init_vector = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/vector_extension/vector.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_utils();
    init_common();
    PgVectorBuilder = class extends PgColumnBuilder {
      static {
        __name(this, "PgVectorBuilder");
      }
      static [entityKind] = "PgVectorBuilder";
      constructor(name, config) {
        super(name, "array", "PgVector");
        this.config.dimensions = config.dimensions;
      }
      /** @internal */
      build(table) {
        return new PgVector(
          table,
          this.config
        );
      }
    };
    PgVector = class extends PgColumn {
      static {
        __name(this, "PgVector");
      }
      static [entityKind] = "PgVector";
      dimensions = this.config.dimensions;
      getSQLType() {
        return `vector(${this.dimensions})`;
      }
      mapToDriverValue(value) {
        return JSON.stringify(value);
      }
      mapFromDriverValue(value) {
        return value.slice(1, -1).split(",").map((v2) => Number.parseFloat(v2));
      }
    };
    __name(vector, "vector");
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/all.js
function getPgColumnBuilders() {
  return {
    bigint,
    bigserial,
    boolean,
    char,
    cidr,
    customType,
    date,
    doublePrecision,
    inet,
    integer,
    interval,
    json,
    jsonb,
    line,
    macaddr,
    macaddr8,
    numeric,
    point,
    geometry,
    real,
    serial,
    smallint,
    smallserial,
    text,
    time,
    timestamp,
    uuid,
    varchar,
    bit,
    halfvec,
    sparsevec,
    vector
  };
}
var init_all = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/all.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_bigint();
    init_bigserial();
    init_boolean();
    init_char();
    init_cidr();
    init_custom();
    init_date();
    init_double_precision();
    init_inet();
    init_integer();
    init_interval();
    init_json();
    init_jsonb();
    init_line();
    init_macaddr();
    init_macaddr8();
    init_numeric();
    init_point();
    init_geometry();
    init_real();
    init_serial();
    init_smallint();
    init_smallserial();
    init_text();
    init_time();
    init_timestamp();
    init_uuid();
    init_varchar();
    init_bit();
    init_halfvec();
    init_sparsevec();
    init_vector();
    __name(getPgColumnBuilders, "getPgColumnBuilders");
  }
});

// ../node_modules/drizzle-orm/pg-core/table.js
function pgTableWithSchema(name, columns, extraConfig, schema, baseName = name) {
  const rawTable = new PgTable(name, schema, baseName);
  const parsedColumns = typeof columns === "function" ? columns(getPgColumnBuilders()) : columns;
  const builtColumns = Object.fromEntries(
    Object.entries(parsedColumns).map(([name2, colBuilderBase]) => {
      const colBuilder = colBuilderBase;
      colBuilder.setName(name2);
      const column = colBuilder.build(rawTable);
      rawTable[InlineForeignKeys].push(...colBuilder.buildForeignKeys(column, rawTable));
      return [name2, column];
    })
  );
  const builtColumnsForExtraConfig = Object.fromEntries(
    Object.entries(parsedColumns).map(([name2, colBuilderBase]) => {
      const colBuilder = colBuilderBase;
      colBuilder.setName(name2);
      const column = colBuilder.buildExtraConfigColumn(rawTable);
      return [name2, column];
    })
  );
  const table = Object.assign(rawTable, builtColumns);
  table[Table.Symbol.Columns] = builtColumns;
  table[Table.Symbol.ExtraConfigColumns] = builtColumnsForExtraConfig;
  if (extraConfig) {
    table[PgTable.Symbol.ExtraConfigBuilder] = extraConfig;
  }
  return Object.assign(table, {
    enableRLS: /* @__PURE__ */ __name(() => {
      table[PgTable.Symbol.EnableRLS] = true;
      return table;
    }, "enableRLS")
  });
}
var InlineForeignKeys, EnableRLS, PgTable, pgTable;
var init_table2 = __esm({
  "../node_modules/drizzle-orm/pg-core/table.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_table();
    init_all();
    InlineForeignKeys = Symbol.for("drizzle:PgInlineForeignKeys");
    EnableRLS = Symbol.for("drizzle:EnableRLS");
    PgTable = class extends Table {
      static {
        __name(this, "PgTable");
      }
      static [entityKind] = "PgTable";
      /** @internal */
      static Symbol = Object.assign({}, Table.Symbol, {
        InlineForeignKeys,
        EnableRLS
      });
      /**@internal */
      [InlineForeignKeys] = [];
      /** @internal */
      [EnableRLS] = false;
      /** @internal */
      [Table.Symbol.ExtraConfigBuilder] = void 0;
      /** @internal */
      [Table.Symbol.ExtraConfigColumns] = {};
    };
    __name(pgTableWithSchema, "pgTableWithSchema");
    pgTable = /* @__PURE__ */ __name((name, columns, extraConfig) => {
      return pgTableWithSchema(name, columns, extraConfig, void 0);
    }, "pgTable");
  }
});

// ../node_modules/drizzle-orm/pg-core/primary-keys.js
var PrimaryKeyBuilder, PrimaryKey;
var init_primary_keys = __esm({
  "../node_modules/drizzle-orm/pg-core/primary-keys.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_table2();
    PrimaryKeyBuilder = class {
      static {
        __name(this, "PrimaryKeyBuilder");
      }
      static [entityKind] = "PgPrimaryKeyBuilder";
      /** @internal */
      columns;
      /** @internal */
      name;
      constructor(columns, name) {
        this.columns = columns;
        this.name = name;
      }
      /** @internal */
      build(table) {
        return new PrimaryKey(table, this.columns, this.name);
      }
    };
    PrimaryKey = class {
      static {
        __name(this, "PrimaryKey");
      }
      constructor(table, columns, name) {
        this.table = table;
        this.columns = columns;
        this.name = name;
      }
      static [entityKind] = "PgPrimaryKey";
      columns;
      name;
      getName() {
        return this.name ?? `${this.table[PgTable.Symbol.Name]}_${this.columns.map((column) => column.name).join("_")}_pk`;
      }
    };
  }
});

// ../node_modules/drizzle-orm/sql/expressions/conditions.js
function bindIfParam(value, column) {
  if (isDriverValueEncoder(column) && !isSQLWrapper(value) && !is(value, Param) && !is(value, Placeholder) && !is(value, Column) && !is(value, Table) && !is(value, View)) {
    return new Param(value, column);
  }
  return value;
}
function and(...unfilteredConditions) {
  const conditions = unfilteredConditions.filter(
    (c) => c !== void 0
  );
  if (conditions.length === 0) {
    return void 0;
  }
  if (conditions.length === 1) {
    return new SQL(conditions);
  }
  return new SQL([
    new StringChunk("("),
    sql.join(conditions, new StringChunk(" and ")),
    new StringChunk(")")
  ]);
}
function or(...unfilteredConditions) {
  const conditions = unfilteredConditions.filter(
    (c) => c !== void 0
  );
  if (conditions.length === 0) {
    return void 0;
  }
  if (conditions.length === 1) {
    return new SQL(conditions);
  }
  return new SQL([
    new StringChunk("("),
    sql.join(conditions, new StringChunk(" or ")),
    new StringChunk(")")
  ]);
}
function not(condition) {
  return sql`not ${condition}`;
}
function inArray(column, values) {
  if (Array.isArray(values)) {
    if (values.length === 0) {
      return sql`false`;
    }
    return sql`${column} in ${values.map((v2) => bindIfParam(v2, column))}`;
  }
  return sql`${column} in ${bindIfParam(values, column)}`;
}
function notInArray(column, values) {
  if (Array.isArray(values)) {
    if (values.length === 0) {
      return sql`true`;
    }
    return sql`${column} not in ${values.map((v2) => bindIfParam(v2, column))}`;
  }
  return sql`${column} not in ${bindIfParam(values, column)}`;
}
function isNull(value) {
  return sql`${value} is null`;
}
function isNotNull(value) {
  return sql`${value} is not null`;
}
function exists(subquery) {
  return sql`exists ${subquery}`;
}
function notExists(subquery) {
  return sql`not exists ${subquery}`;
}
function between(column, min, max) {
  return sql`${column} between ${bindIfParam(min, column)} and ${bindIfParam(
    max,
    column
  )}`;
}
function notBetween(column, min, max) {
  return sql`${column} not between ${bindIfParam(
    min,
    column
  )} and ${bindIfParam(max, column)}`;
}
function like(column, value) {
  return sql`${column} like ${value}`;
}
function notLike(column, value) {
  return sql`${column} not like ${value}`;
}
function ilike(column, value) {
  return sql`${column} ilike ${value}`;
}
function notIlike(column, value) {
  return sql`${column} not ilike ${value}`;
}
var eq, ne, gt, gte, lt, lte;
var init_conditions = __esm({
  "../node_modules/drizzle-orm/sql/expressions/conditions.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_column();
    init_entity();
    init_table();
    init_sql();
    __name(bindIfParam, "bindIfParam");
    eq = /* @__PURE__ */ __name((left, right) => {
      return sql`${left} = ${bindIfParam(right, left)}`;
    }, "eq");
    ne = /* @__PURE__ */ __name((left, right) => {
      return sql`${left} <> ${bindIfParam(right, left)}`;
    }, "ne");
    __name(and, "and");
    __name(or, "or");
    __name(not, "not");
    gt = /* @__PURE__ */ __name((left, right) => {
      return sql`${left} > ${bindIfParam(right, left)}`;
    }, "gt");
    gte = /* @__PURE__ */ __name((left, right) => {
      return sql`${left} >= ${bindIfParam(right, left)}`;
    }, "gte");
    lt = /* @__PURE__ */ __name((left, right) => {
      return sql`${left} < ${bindIfParam(right, left)}`;
    }, "lt");
    lte = /* @__PURE__ */ __name((left, right) => {
      return sql`${left} <= ${bindIfParam(right, left)}`;
    }, "lte");
    __name(inArray, "inArray");
    __name(notInArray, "notInArray");
    __name(isNull, "isNull");
    __name(isNotNull, "isNotNull");
    __name(exists, "exists");
    __name(notExists, "notExists");
    __name(between, "between");
    __name(notBetween, "notBetween");
    __name(like, "like");
    __name(notLike, "notLike");
    __name(ilike, "ilike");
    __name(notIlike, "notIlike");
  }
});

// ../node_modules/drizzle-orm/sql/expressions/select.js
function asc(column) {
  return sql`${column} asc`;
}
function desc(column) {
  return sql`${column} desc`;
}
var init_select = __esm({
  "../node_modules/drizzle-orm/sql/expressions/select.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_sql();
    __name(asc, "asc");
    __name(desc, "desc");
  }
});

// ../node_modules/drizzle-orm/sql/expressions/index.js
var init_expressions = __esm({
  "../node_modules/drizzle-orm/sql/expressions/index.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_conditions();
    init_select();
  }
});

// ../node_modules/drizzle-orm/relations.js
function getOperators() {
  return {
    and,
    between,
    eq,
    exists,
    gt,
    gte,
    ilike,
    inArray,
    isNull,
    isNotNull,
    like,
    lt,
    lte,
    ne,
    not,
    notBetween,
    notExists,
    notLike,
    notIlike,
    notInArray,
    or,
    sql
  };
}
function getOrderByOperators() {
  return {
    sql,
    asc,
    desc
  };
}
function extractTablesRelationalConfig(schema, configHelpers) {
  if (Object.keys(schema).length === 1 && "default" in schema && !is(schema["default"], Table)) {
    schema = schema["default"];
  }
  const tableNamesMap = {};
  const relationsBuffer = {};
  const tablesConfig = {};
  for (const [key, value] of Object.entries(schema)) {
    if (is(value, Table)) {
      const dbName = getTableUniqueName(value);
      const bufferedRelations = relationsBuffer[dbName];
      tableNamesMap[dbName] = key;
      tablesConfig[key] = {
        tsName: key,
        dbName: value[Table.Symbol.Name],
        schema: value[Table.Symbol.Schema],
        columns: value[Table.Symbol.Columns],
        relations: bufferedRelations?.relations ?? {},
        primaryKey: bufferedRelations?.primaryKey ?? []
      };
      for (const column of Object.values(
        value[Table.Symbol.Columns]
      )) {
        if (column.primary) {
          tablesConfig[key].primaryKey.push(column);
        }
      }
      const extraConfig = value[Table.Symbol.ExtraConfigBuilder]?.(value[Table.Symbol.ExtraConfigColumns]);
      if (extraConfig) {
        for (const configEntry of Object.values(extraConfig)) {
          if (is(configEntry, PrimaryKeyBuilder)) {
            tablesConfig[key].primaryKey.push(...configEntry.columns);
          }
        }
      }
    } else if (is(value, Relations)) {
      const dbName = getTableUniqueName(value.table);
      const tableName = tableNamesMap[dbName];
      const relations2 = value.config(
        configHelpers(value.table)
      );
      let primaryKey;
      for (const [relationName, relation] of Object.entries(relations2)) {
        if (tableName) {
          const tableConfig = tablesConfig[tableName];
          tableConfig.relations[relationName] = relation;
          if (primaryKey) {
            tableConfig.primaryKey.push(...primaryKey);
          }
        } else {
          if (!(dbName in relationsBuffer)) {
            relationsBuffer[dbName] = {
              relations: {},
              primaryKey
            };
          }
          relationsBuffer[dbName].relations[relationName] = relation;
        }
      }
    }
  }
  return { tables: tablesConfig, tableNamesMap };
}
function createOne(sourceTable) {
  return /* @__PURE__ */ __name(function one(table, config) {
    return new One(
      sourceTable,
      table,
      config,
      config?.fields.reduce((res, f) => res && f.notNull, true) ?? false
    );
  }, "one");
}
function createMany(sourceTable) {
  return /* @__PURE__ */ __name(function many(referencedTable, config) {
    return new Many(sourceTable, referencedTable, config);
  }, "many");
}
function normalizeRelation(schema, tableNamesMap, relation) {
  if (is(relation, One) && relation.config) {
    return {
      fields: relation.config.fields,
      references: relation.config.references
    };
  }
  const referencedTableTsName = tableNamesMap[getTableUniqueName(relation.referencedTable)];
  if (!referencedTableTsName) {
    throw new Error(
      `Table "${relation.referencedTable[Table.Symbol.Name]}" not found in schema`
    );
  }
  const referencedTableConfig = schema[referencedTableTsName];
  if (!referencedTableConfig) {
    throw new Error(`Table "${referencedTableTsName}" not found in schema`);
  }
  const sourceTable = relation.sourceTable;
  const sourceTableTsName = tableNamesMap[getTableUniqueName(sourceTable)];
  if (!sourceTableTsName) {
    throw new Error(
      `Table "${sourceTable[Table.Symbol.Name]}" not found in schema`
    );
  }
  const reverseRelations = [];
  for (const referencedTableRelation of Object.values(
    referencedTableConfig.relations
  )) {
    if (relation.relationName && relation !== referencedTableRelation && referencedTableRelation.relationName === relation.relationName || !relation.relationName && referencedTableRelation.referencedTable === relation.sourceTable) {
      reverseRelations.push(referencedTableRelation);
    }
  }
  if (reverseRelations.length > 1) {
    throw relation.relationName ? new Error(
      `There are multiple relations with name "${relation.relationName}" in table "${referencedTableTsName}"`
    ) : new Error(
      `There are multiple relations between "${referencedTableTsName}" and "${relation.sourceTable[Table.Symbol.Name]}". Please specify relation name`
    );
  }
  if (reverseRelations[0] && is(reverseRelations[0], One) && reverseRelations[0].config) {
    return {
      fields: reverseRelations[0].config.references,
      references: reverseRelations[0].config.fields
    };
  }
  throw new Error(
    `There is not enough information to infer relation "${sourceTableTsName}.${relation.fieldName}"`
  );
}
function createTableRelationsHelpers(sourceTable) {
  return {
    one: createOne(sourceTable),
    many: createMany(sourceTable)
  };
}
function mapRelationalRow(tablesConfig, tableConfig, row, buildQueryResultSelection, mapColumnValue = (value) => value) {
  const result = {};
  for (const [
    selectionItemIndex,
    selectionItem
  ] of buildQueryResultSelection.entries()) {
    if (selectionItem.isJson) {
      const relation = tableConfig.relations[selectionItem.tsKey];
      const rawSubRows = row[selectionItemIndex];
      const subRows = typeof rawSubRows === "string" ? JSON.parse(rawSubRows) : rawSubRows;
      result[selectionItem.tsKey] = is(relation, One) ? subRows && mapRelationalRow(
        tablesConfig,
        tablesConfig[selectionItem.relationTableTsKey],
        subRows,
        selectionItem.selection,
        mapColumnValue
      ) : subRows.map(
        (subRow) => mapRelationalRow(
          tablesConfig,
          tablesConfig[selectionItem.relationTableTsKey],
          subRow,
          selectionItem.selection,
          mapColumnValue
        )
      );
    } else {
      const value = mapColumnValue(row[selectionItemIndex]);
      const field = selectionItem.field;
      let decoder;
      if (is(field, Column)) {
        decoder = field;
      } else if (is(field, SQL)) {
        decoder = field.decoder;
      } else {
        decoder = field.sql.decoder;
      }
      result[selectionItem.tsKey] = value === null ? null : decoder.mapFromDriverValue(value);
    }
  }
  return result;
}
var Relation, Relations, One, Many;
var init_relations = __esm({
  "../node_modules/drizzle-orm/relations.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_table();
    init_column();
    init_entity();
    init_primary_keys();
    init_expressions();
    init_sql();
    Relation = class {
      static {
        __name(this, "Relation");
      }
      constructor(sourceTable, referencedTable, relationName) {
        this.sourceTable = sourceTable;
        this.referencedTable = referencedTable;
        this.relationName = relationName;
        this.referencedTableName = referencedTable[Table.Symbol.Name];
      }
      static [entityKind] = "Relation";
      referencedTableName;
      fieldName;
    };
    Relations = class {
      static {
        __name(this, "Relations");
      }
      constructor(table, config) {
        this.table = table;
        this.config = config;
      }
      static [entityKind] = "Relations";
    };
    One = class _One extends Relation {
      static {
        __name(this, "One");
      }
      constructor(sourceTable, referencedTable, config, isNullable) {
        super(sourceTable, referencedTable, config?.relationName);
        this.config = config;
        this.isNullable = isNullable;
      }
      static [entityKind] = "One";
      withFieldName(fieldName) {
        const relation = new _One(
          this.sourceTable,
          this.referencedTable,
          this.config,
          this.isNullable
        );
        relation.fieldName = fieldName;
        return relation;
      }
    };
    Many = class _Many extends Relation {
      static {
        __name(this, "Many");
      }
      constructor(sourceTable, referencedTable, config) {
        super(sourceTable, referencedTable, config?.relationName);
        this.config = config;
      }
      static [entityKind] = "Many";
      withFieldName(fieldName) {
        const relation = new _Many(
          this.sourceTable,
          this.referencedTable,
          this.config
        );
        relation.fieldName = fieldName;
        return relation;
      }
    };
    __name(getOperators, "getOperators");
    __name(getOrderByOperators, "getOrderByOperators");
    __name(extractTablesRelationalConfig, "extractTablesRelationalConfig");
    __name(createOne, "createOne");
    __name(createMany, "createMany");
    __name(normalizeRelation, "normalizeRelation");
    __name(createTableRelationsHelpers, "createTableRelationsHelpers");
    __name(mapRelationalRow, "mapRelationalRow");
  }
});

// ../node_modules/drizzle-orm/sql/functions/aggregate.js
var init_aggregate = __esm({
  "../node_modules/drizzle-orm/sql/functions/aggregate.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
  }
});

// ../node_modules/drizzle-orm/sql/functions/vector.js
var init_vector2 = __esm({
  "../node_modules/drizzle-orm/sql/functions/vector.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
  }
});

// ../node_modules/drizzle-orm/sql/functions/index.js
var init_functions = __esm({
  "../node_modules/drizzle-orm/sql/functions/index.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_aggregate();
    init_vector2();
  }
});

// ../node_modules/drizzle-orm/sql/index.js
var init_sql2 = __esm({
  "../node_modules/drizzle-orm/sql/index.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_expressions();
    init_functions();
    init_sql();
  }
});

// ../node_modules/drizzle-orm/index.js
var init_drizzle_orm = __esm({
  "../node_modules/drizzle-orm/index.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_alias();
    init_column_builder();
    init_column();
    init_entity();
    init_errors();
    init_logger();
    init_operations();
    init_query_promise();
    init_relations();
    init_sql2();
    init_subquery();
    init_table();
    init_utils();
    init_view_common();
  }
});

// ../node_modules/@neondatabase/serverless/index.mjs
function ha(r) {
  return 0;
}
function Yt(r, e = false) {
  let { protocol: t } = new URL(r), n = "http:" + r.substring(
    t.length
  ), { username: i, password: s, host: o, hostname: u, port: c, pathname: l, search: f, searchParams: y, hash: g } = new URL(
    n
  );
  s = decodeURIComponent(s), i = decodeURIComponent(i), l = decodeURIComponent(l);
  let A = i + ":" + s, C = e ? Object.fromEntries(y.entries()) : f;
  return {
    href: r,
    protocol: t,
    auth: A,
    username: i,
    password: s,
    host: o,
    hostname: u,
    port: c,
    pathname: l,
    search: f,
    query: C,
    hash: g
  };
}
function Xe(r) {
  let e = 1779033703, t = 3144134277, n = 1013904242, i = 2773480762, s = 1359893119, o = 2600822924, u = 528734635, c = 1541459225, l = 0, f = 0, y = [
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ], g = a((I, w) => I >>> w | I << 32 - w, "rrot"), A = new Uint32Array(64), C = new Uint8Array(64), D = a(() => {
    for (let R = 0, j = 0; R < 16; R++, j += 4) A[R] = C[j] << 24 | C[j + 1] << 16 | C[j + 2] << 8 | C[j + 3];
    for (let R = 16; R < 64; R++) {
      let j = g(A[R - 15], 7) ^ g(A[R - 15], 18) ^ A[R - 15] >>> 3, le = g(
        A[R - 2],
        17
      ) ^ g(A[R - 2], 19) ^ A[R - 2] >>> 10;
      A[R] = A[R - 16] + j + A[R - 7] + le | 0;
    }
    let I = e, w = t, Z = n, W = i, J = s, X = o, se = u, oe = c;
    for (let R = 0; R < 64; R++) {
      let j = g(J, 6) ^ g(J, 11) ^ g(J, 25), le = J & X ^ ~J & se, de = oe + j + le + y[R] + A[R] | 0, We = g(I, 2) ^ g(
        I,
        13
      ) ^ g(I, 22), fe = I & w ^ I & Z ^ w & Z, _e = We + fe | 0;
      oe = se, se = X, X = J, J = W + de | 0, W = Z, Z = w, w = I, I = de + _e | 0;
    }
    e = e + I | 0, t = t + w | 0, n = n + Z | 0, i = i + W | 0, s = s + J | 0, o = o + X | 0, u = u + se | 0, c = c + oe | 0, f = 0;
  }, "process"), Y = a((I) => {
    typeof I == "string" && (I = new TextEncoder().encode(I));
    for (let w = 0; w < I.length; w++) C[f++] = I[w], f === 64 && D();
    l += I.length;
  }, "add"), P = a(() => {
    if (C[f++] = 128, f == 64 && D(), f + 8 > 64) {
      for (; f < 64; ) C[f++] = 0;
      D();
    }
    for (; f < 58; ) C[f++] = 0;
    let I = l * 8;
    C[f++] = I / 1099511627776 & 255, C[f++] = I / 4294967296 & 255, C[f++] = I >>> 24, C[f++] = I >>> 16 & 255, C[f++] = I >>> 8 & 255, C[f++] = I & 255, D();
    let w = new Uint8Array(
      32
    );
    return w[0] = e >>> 24, w[1] = e >>> 16 & 255, w[2] = e >>> 8 & 255, w[3] = e & 255, w[4] = t >>> 24, w[5] = t >>> 16 & 255, w[6] = t >>> 8 & 255, w[7] = t & 255, w[8] = n >>> 24, w[9] = n >>> 16 & 255, w[10] = n >>> 8 & 255, w[11] = n & 255, w[12] = i >>> 24, w[13] = i >>> 16 & 255, w[14] = i >>> 8 & 255, w[15] = i & 255, w[16] = s >>> 24, w[17] = s >>> 16 & 255, w[18] = s >>> 8 & 255, w[19] = s & 255, w[20] = o >>> 24, w[21] = o >>> 16 & 255, w[22] = o >>> 8 & 255, w[23] = o & 255, w[24] = u >>> 24, w[25] = u >>> 16 & 255, w[26] = u >>> 8 & 255, w[27] = u & 255, w[28] = c >>> 24, w[29] = c >>> 16 & 255, w[30] = c >>> 8 & 255, w[31] = c & 255, w;
  }, "digest");
  return r === void 0 ? { add: Y, digest: P } : (Y(r), P());
}
function gu(r) {
  return crypto.getRandomValues(d.alloc(r));
}
function bu(r) {
  if (r === "sha256") return { update: a(function(e) {
    return { digest: a(
      function() {
        return d.from(Xe(e));
      },
      "digest"
    ) };
  }, "update") };
  if (r === "md5") return { update: a(function(e) {
    return {
      digest: a(function() {
        return typeof e == "string" ? et.hashStr(e) : et.hashByteArray(e);
      }, "digest")
    };
  }, "update") };
  throw new Error(`Hash type '${r}' not supported`);
}
function vu(r, e) {
  if (r !== "sha256") throw new Error(`Only sha256 is supported (requested: '${r}')`);
  return { update: a(function(t) {
    return { digest: a(
      function() {
        typeof e == "string" && (e = new TextEncoder().encode(e)), typeof t == "string" && (t = new TextEncoder().encode(
          t
        ));
        let n = e.length;
        if (n > 64) e = Xe(e);
        else if (n < 64) {
          let c = new Uint8Array(64);
          c.set(e), e = c;
        }
        let i = new Uint8Array(
          64
        ), s = new Uint8Array(64);
        for (let c = 0; c < 64; c++) i[c] = 54 ^ e[c], s[c] = 92 ^ e[c];
        let o = new Uint8Array(t.length + 64);
        o.set(i, 0), o.set(t, 64);
        let u = new Uint8Array(96);
        return u.set(s, 0), u.set(Xe(o), 64), d.from(Xe(u));
      },
      "digest"
    ) };
  }, "update") };
}
function ju(...r) {
  return r.join("/");
}
function Hu(r, e) {
  e(new Error("No filesystem"));
}
function $c({ socket: r, servername: e }) {
  return r.startTls(e), r;
}
function Ea(r, { alphabet: e, scratchArr: t } = {}) {
  if (!He) if (He = new Uint16Array(256), wt = new Uint16Array(256), xi) for (let C = 0; C < 256; C++) He[C] = yt[C & 15] << 8 | yt[C >>> 4], wt[C] = mt[C & 15] << 8 | mt[C >>> 4];
  else for (let C = 0; C < 256; C++) He[C] = yt[C & 15] | yt[C >>> 4] << 8, wt[C] = mt[C & 15] | mt[C >>> 4] << 8;
  r.byteOffset % 4 !== 0 && (r = new Uint8Array(r));
  let n = r.length, i = n >>> 1, s = n >>> 2, o = t || new Uint16Array(n), u = new Uint32Array(
    r.buffer,
    r.byteOffset,
    s
  ), c = new Uint32Array(o.buffer, o.byteOffset, i), l = e === "upper" ? wt : He, f = 0, y = 0, g;
  if (xi)
    for (; f < s; ) g = u[f++], c[y++] = l[g >>> 8 & 255] << 16 | l[g & 255], c[y++] = l[g >>> 24] << 16 | l[g >>> 16 & 255];
  else for (; f < s; )
    g = u[f++], c[y++] = l[g >>> 24] << 16 | l[g >>> 16 & 255], c[y++] = l[g >>> 8 & 255] << 16 | l[g & 255];
  for (f <<= 2; f < n; ) o[f] = l[r[f++]];
  return xa.decode(o.subarray(0, n));
}
function Aa(r, e = {}) {
  let t = "", n = r.length, i = va >>> 1, s = Math.ceil(n / i), o = new Uint16Array(s > 1 ? i : n);
  for (let u = 0; u < s; u++) {
    let c = u * i, l = c + i;
    t += Ea(r.subarray(c, l), ba(ga(
      {},
      e
    ), { scratchArr: o }));
  }
  return t;
}
function Ei(r, e = {}) {
  return e.alphabet !== "upper" && typeof r.toHex == "function" ? r.toHex() : Aa(r, e);
}
function bt() {
  typeof window < "u" && typeof document < "u" && typeof console < "u" && typeof console.warn == "function" && console.warn(`          
        ************************************************************
        *                                                          *
        *  WARNING: Running SQL directly from the browser can have *
        *  security implications. Even if your database is         *
        *  protected by Row-Level Security (RLS), use it at your   *
        *  own risk. This approach is great for fast prototyping,  *
        *  but ensure proper safeguards are in place to prevent    *
        *  misuse or execution of expensive SQL queries by your    *
        *  end users.                                              *
        *                                                          *
        *  If you've assessed the risks, suppress this message     *
        *  using the disableWarningInBrowsers configuration        *
        *  parameter.                                              *
        *                                                          *
        ************************************************************`);
}
function Lu(r) {
  return r instanceof d ? "\\x" + Ei(r) : r;
}
function ss(r) {
  let { query: e, params: t } = r instanceof $e ? r.toParameterizedQuery() : r;
  return { query: e, params: t.map((n) => Lu((0, us.prepareValue)(n))) };
}
function cs(r, {
  arrayMode: e,
  fullResults: t,
  fetchOptions: n,
  isolationLevel: i,
  readOnly: s,
  deferrable: o,
  authToken: u,
  disableWarningInBrowsers: c
} = {}) {
  if (!r) throw new Error("No database connection string was provided to `neon()`. Perhaps an environment variable has not been set?");
  let l;
  try {
    l = Yt(r);
  } catch {
    throw new Error(
      "Database connection string provided to `neon()` is not a valid URL. Connection string: " + String(r)
    );
  }
  let { protocol: f, username: y, hostname: g, port: A, pathname: C } = l;
  if (f !== "postgres:" && f !== "postgresql:" || !y || !g || !C) throw new Error("Database connection string format for `neon()` should be: postgresql://user:password@host.tld/dbname?option=value");
  function D(P, ...I) {
    if (!(Array.isArray(P) && Array.isArray(P.raw) && Array.isArray(I))) throw new Error('This function can now be called only as a tagged-template function: sql`SELECT ${value}`, not sql("SELECT $1", [value], options). For a conventional function call with value placeholders ($1, $2, etc.), use sql.query("SELECT $1", [value], options).');
    return new Ce(
      Y,
      new $e(P, I)
    );
  }
  __name(D, "D");
  a(D, "templateFn"), D.query = (P, I, w) => new Ce(Y, { query: P, params: I ?? [] }, w), D.unsafe = (P) => new Ge(
    P
  ), D.transaction = async (P, I) => {
    if (typeof P == "function" && (P = P(D)), !Array.isArray(P)) throw new Error(is2);
    P.forEach((W) => {
      if (!(W instanceof Ce)) throw new Error(is2);
    });
    let w = P.map((W) => W.queryData), Z = P.map((W) => W.opts ?? {});
    return Y(w, Z, I);
  };
  async function Y(P, I, w) {
    let { fetchEndpoint: Z, fetchFunction: W } = ce, J = Array.isArray(
      P
    ) ? { queries: P.map((ee) => ss(ee)) } : ss(P), X = n ?? {}, se = e ?? false, oe = t ?? false, R = i, j = s, le = o;
    w !== void 0 && (w.fetchOptions !== void 0 && (X = { ...X, ...w.fetchOptions }), w.arrayMode !== void 0 && (se = w.arrayMode), w.fullResults !== void 0 && (oe = w.fullResults), w.isolationLevel !== void 0 && (R = w.isolationLevel), w.readOnly !== void 0 && (j = w.readOnly), w.deferrable !== void 0 && (le = w.deferrable)), I !== void 0 && !Array.isArray(I) && I.fetchOptions !== void 0 && (X = { ...X, ...I.fetchOptions });
    let de = u;
    !Array.isArray(I) && I?.authToken !== void 0 && (de = I.authToken);
    let We = typeof Z == "function" ? Z(g, A, { jwtAuth: de !== void 0 }) : Z, fe = { "Neon-Connection-String": r, "Neon-Raw-Text-Output": "true", "Neon-Array-Mode": "true" }, _e = await Fu(de);
    _e && (fe.Authorization = `Bearer ${_e}`), Array.isArray(P) && (R !== void 0 && (fe["Neon-Batch-Isolation-Level"] = R), j !== void 0 && (fe["Neon-Batch-Read-Only"] = String(j)), le !== void 0 && (fe["Neon-Batch-Deferrable"] = String(le))), c || ce.disableWarningInBrowsers || bt();
    let ye;
    try {
      ye = await (W ?? fetch)(We, { method: "POST", body: JSON.stringify(J), headers: fe, ...X });
    } catch (ee) {
      let M = new be(
        `Error connecting to database: ${ee}`
      );
      throw M.sourceError = ee, M;
    }
    if (ye.ok) {
      let ee = await ye.json();
      if (Array.isArray(P)) {
        let M = ee.results;
        if (!Array.isArray(M)) throw new be("Neon internal error: unexpected result format");
        return M.map(($, me) => {
          let Ot = I[me] ?? {}, vo = Ot.arrayMode ?? se, xo = Ot.fullResults ?? oe;
          return os(
            $,
            { arrayMode: vo, fullResults: xo, types: Ot.types }
          );
        });
      } else {
        let M = I ?? {}, $ = M.arrayMode ?? se, me = M.fullResults ?? oe;
        return os(ee, { arrayMode: $, fullResults: me, types: M.types });
      }
    } else {
      let { status: ee } = ye;
      if (ee === 400) {
        let M = await ye.json(), $ = new be(M.message);
        for (let me of Ru) $[me] = M[me] ?? void 0;
        throw $;
      } else {
        let M = await ye.text();
        throw new be(
          `Server error (HTTP status ${ee}): ${M}`
        );
      }
    }
  }
  __name(Y, "Y");
  return a(Y, "execute"), D;
}
function os(r, {
  arrayMode: e,
  fullResults: t,
  types: n
}) {
  let i = new as.default(n), s = r.fields.map((c) => c.name), o = r.fields.map((c) => i.getTypeParser(
    c.dataTypeID
  )), u = e === true ? r.rows.map((c) => c.map((l, f) => l === null ? null : o[f](l))) : r.rows.map((c) => Object.fromEntries(
    c.map((l, f) => [s[f], l === null ? null : o[f](l)])
  ));
  return t ? (r.viaNeonFetch = true, r.rowAsArray = e, r.rows = u, r._parsers = o, r._types = i, r) : u;
}
async function Fu(r) {
  if (typeof r == "string") return r;
  if (typeof r == "function") try {
    return await Promise.resolve(r());
  } catch (e) {
    let t = new be("Error getting auth token.");
    throw e instanceof Error && (t = new be(`Error getting auth token: ${e.message}`)), t;
  }
}
function vl(r, e) {
  if (e) return { callback: e, result: void 0 };
  let t, n, i = a(function(o, u) {
    o ? t(o) : n(u);
  }, "cb"), s = new r(function(o, u) {
    n = o, t = u;
  });
  return { callback: i, result: s };
}
var So, Ie, Eo, Ao, Co, _o, Io, a, G, T, ie, Dn, Se, O, E, Qn, Nn, ii, b, v, x, d, m, p, ge, wi, mi, yi, S, ce, Fe, gi, Zt, tr, rr, Ti, Bi, Fi, Mi, Wi, Hi, Ki, Zi, Je, At, es, U, et, ts, lr, fr, tt, rt, nt, ku, it, ds, mr, wr, gr, br, vr, $u, xr, ys, Er, Sr, ms, vs, Es, Cs, _s, cc, Is, Ps, Bt, Ms, qs, ln, Qs, Ws, js, Gs, vn, Vs, zs, En, eo, io, so, ol, oo, ao, lo, yo, Ln, ot, pa, da, ya, bi, ma, wa, vi, ga, ba, va, xi, xa, Jt, yt, mt, Sa, Si, He, wt, gt2, $e, Xt, Ge, as, us, _t, be, is2, Ru, dr, Ce, go, wo, kn, ut, bo, Un, ct, export_DatabaseError, export_defaults, export_escapeIdentifier, export_escapeLiteral, export_types;
var init_serverless = __esm({
  "../node_modules/@neondatabase/serverless/index.mjs"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    So = Object.create;
    Ie = Object.defineProperty;
    Eo = Object.getOwnPropertyDescriptor;
    Ao = Object.getOwnPropertyNames;
    Co = Object.getPrototypeOf;
    _o = Object.prototype.hasOwnProperty;
    Io = /* @__PURE__ */ __name((r, e, t) => e in r ? Ie(r, e, { enumerable: true, configurable: true, writable: true, value: t }) : r[e] = t, "Io");
    a = /* @__PURE__ */ __name((r, e) => Ie(r, "name", { value: e, configurable: true }), "a");
    G = /* @__PURE__ */ __name((r, e) => () => (r && (e = r(r = 0)), e), "G");
    T = /* @__PURE__ */ __name((r, e) => () => (e || r((e = { exports: {} }).exports, e), e.exports), "T");
    ie = /* @__PURE__ */ __name((r, e) => {
      for (var t in e) Ie(r, t, {
        get: e[t],
        enumerable: true
      });
    }, "ie");
    Dn = /* @__PURE__ */ __name((r, e, t, n) => {
      if (e && typeof e == "object" || typeof e == "function") for (let i of Ao(e)) !_o.call(r, i) && i !== t && Ie(r, i, { get: /* @__PURE__ */ __name(() => e[i], "get"), enumerable: !(n = Eo(e, i)) || n.enumerable });
      return r;
    }, "Dn");
    Se = /* @__PURE__ */ __name((r, e, t) => (t = r != null ? So(Co(r)) : {}, Dn(e || !r || !r.__esModule ? Ie(t, "default", { value: r, enumerable: true }) : t, r)), "Se");
    O = /* @__PURE__ */ __name((r) => Dn(Ie({}, "__esModule", { value: true }), r), "O");
    E = /* @__PURE__ */ __name((r, e, t) => Io(r, typeof e != "symbol" ? e + "" : e, t), "E");
    Qn = T((lt2) => {
      "use strict";
      p();
      lt2.byteLength = Po;
      lt2.toByteArray = Ro;
      lt2.fromByteArray = ko;
      var ae = [], te = [], To = typeof Uint8Array < "u" ? Uint8Array : Array, qt = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
      for (Ee = 0, On = qt.length; Ee < On; ++Ee) ae[Ee] = qt[Ee], te[qt.charCodeAt(Ee)] = Ee;
      var Ee, On;
      te[45] = 62;
      te[95] = 63;
      function qn(r) {
        var e = r.length;
        if (e % 4 > 0) throw new Error("Invalid string. Length must be a multiple of 4");
        var t = r.indexOf("=");
        t === -1 && (t = e);
        var n = t === e ? 0 : 4 - t % 4;
        return [t, n];
      }
      __name(qn, "qn");
      a(qn, "getLens");
      function Po(r) {
        var e = qn(r), t = e[0], n = e[1];
        return (t + n) * 3 / 4 - n;
      }
      __name(Po, "Po");
      a(Po, "byteLength");
      function Bo(r, e, t) {
        return (e + t) * 3 / 4 - t;
      }
      __name(Bo, "Bo");
      a(Bo, "_byteLength");
      function Ro(r) {
        var e, t = qn(r), n = t[0], i = t[1], s = new To(Bo(r, n, i)), o = 0, u = i > 0 ? n - 4 : n, c;
        for (c = 0; c < u; c += 4) e = te[r.charCodeAt(c)] << 18 | te[r.charCodeAt(c + 1)] << 12 | te[r.charCodeAt(c + 2)] << 6 | te[r.charCodeAt(c + 3)], s[o++] = e >> 16 & 255, s[o++] = e >> 8 & 255, s[o++] = e & 255;
        return i === 2 && (e = te[r.charCodeAt(
          c
        )] << 2 | te[r.charCodeAt(c + 1)] >> 4, s[o++] = e & 255), i === 1 && (e = te[r.charCodeAt(c)] << 10 | te[r.charCodeAt(c + 1)] << 4 | te[r.charCodeAt(c + 2)] >> 2, s[o++] = e >> 8 & 255, s[o++] = e & 255), s;
      }
      __name(Ro, "Ro");
      a(Ro, "toByteArray");
      function Lo(r) {
        return ae[r >> 18 & 63] + ae[r >> 12 & 63] + ae[r >> 6 & 63] + ae[r & 63];
      }
      __name(Lo, "Lo");
      a(Lo, "tripletToBase64");
      function Fo(r, e, t) {
        for (var n, i = [], s = e; s < t; s += 3) n = (r[s] << 16 & 16711680) + (r[s + 1] << 8 & 65280) + (r[s + 2] & 255), i.push(Lo(n));
        return i.join("");
      }
      __name(Fo, "Fo");
      a(Fo, "encodeChunk");
      function ko(r) {
        for (var e, t = r.length, n = t % 3, i = [], s = 16383, o = 0, u = t - n; o < u; o += s) i.push(Fo(
          r,
          o,
          o + s > u ? u : o + s
        ));
        return n === 1 ? (e = r[t - 1], i.push(ae[e >> 2] + ae[e << 4 & 63] + "==")) : n === 2 && (e = (r[t - 2] << 8) + r[t - 1], i.push(ae[e >> 10] + ae[e >> 4 & 63] + ae[e << 2 & 63] + "=")), i.join("");
      }
      __name(ko, "ko");
      a(ko, "fromByteArray");
    });
    Nn = T((Qt) => {
      p();
      Qt.read = function(r, e, t, n, i) {
        var s, o, u = i * 8 - n - 1, c = (1 << u) - 1, l = c >> 1, f = -7, y = t ? i - 1 : 0, g = t ? -1 : 1, A = r[e + y];
        for (y += g, s = A & (1 << -f) - 1, A >>= -f, f += u; f > 0; s = s * 256 + r[e + y], y += g, f -= 8) ;
        for (o = s & (1 << -f) - 1, s >>= -f, f += n; f > 0; o = o * 256 + r[e + y], y += g, f -= 8) ;
        if (s === 0) s = 1 - l;
        else {
          if (s === c) return o ? NaN : (A ? -1 : 1) * (1 / 0);
          o = o + Math.pow(2, n), s = s - l;
        }
        return (A ? -1 : 1) * o * Math.pow(2, s - n);
      };
      Qt.write = function(r, e, t, n, i, s) {
        var o, u, c, l = s * 8 - i - 1, f = (1 << l) - 1, y = f >> 1, g = i === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0, A = n ? 0 : s - 1, C = n ? 1 : -1, D = e < 0 || e === 0 && 1 / e < 0 ? 1 : 0;
        for (e = Math.abs(e), isNaN(e) || e === 1 / 0 ? (u = isNaN(e) ? 1 : 0, o = f) : (o = Math.floor(Math.log(e) / Math.LN2), e * (c = Math.pow(2, -o)) < 1 && (o--, c *= 2), o + y >= 1 ? e += g / c : e += g * Math.pow(2, 1 - y), e * c >= 2 && (o++, c /= 2), o + y >= f ? (u = 0, o = f) : o + y >= 1 ? (u = (e * c - 1) * Math.pow(2, i), o = o + y) : (u = e * Math.pow(2, y - 1) * Math.pow(2, i), o = 0)); i >= 8; r[t + A] = u & 255, A += C, u /= 256, i -= 8) ;
        for (o = o << i | u, l += i; l > 0; r[t + A] = o & 255, A += C, o /= 256, l -= 8) ;
        r[t + A - C] |= D * 128;
      };
    });
    ii = T((Re) => {
      "use strict";
      p();
      var Nt = Qn(), Pe = Nn(), Wn = typeof Symbol == "function" && typeof Symbol.for == "function" ? Symbol.for("nodejs.util.inspect.custom") : null;
      Re.Buffer = h;
      Re.SlowBuffer = Qo;
      Re.INSPECT_MAX_BYTES = 50;
      var ft = 2147483647;
      Re.kMaxLength = ft;
      h.TYPED_ARRAY_SUPPORT = Mo();
      !h.TYPED_ARRAY_SUPPORT && typeof console < "u" && typeof console.error == "function" && console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support.");
      function Mo() {
        try {
          let r = new Uint8Array(1), e = { foo: a(function() {
            return 42;
          }, "foo") };
          return Object.setPrototypeOf(e, Uint8Array.prototype), Object.setPrototypeOf(r, e), r.foo() === 42;
        } catch {
          return false;
        }
      }
      __name(Mo, "Mo");
      a(Mo, "typedArraySupport");
      Object.defineProperty(h.prototype, "parent", { enumerable: true, get: a(function() {
        if (h.isBuffer(this)) return this.buffer;
      }, "get") });
      Object.defineProperty(h.prototype, "offset", { enumerable: true, get: a(function() {
        if (h.isBuffer(
          this
        )) return this.byteOffset;
      }, "get") });
      function he(r) {
        if (r > ft) throw new RangeError('The value "' + r + '" is invalid for option "size"');
        let e = new Uint8Array(r);
        return Object.setPrototypeOf(e, h.prototype), e;
      }
      __name(he, "he");
      a(he, "createBuffer");
      function h(r, e, t) {
        if (typeof r == "number") {
          if (typeof e == "string") throw new TypeError(
            'The "string" argument must be of type string. Received type number'
          );
          return $t(r);
        }
        return Gn(r, e, t);
      }
      __name(h, "h");
      a(h, "Buffer");
      h.poolSize = 8192;
      function Gn(r, e, t) {
        if (typeof r == "string") return Do(r, e);
        if (ArrayBuffer.isView(r)) return Oo(r);
        if (r == null) throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof r);
        if (ue(r, ArrayBuffer) || r && ue(r.buffer, ArrayBuffer) || typeof SharedArrayBuffer < "u" && (ue(r, SharedArrayBuffer) || r && ue(
          r.buffer,
          SharedArrayBuffer
        ))) return jt(r, e, t);
        if (typeof r == "number") throw new TypeError('The "value" argument must not be of type number. Received type number');
        let n = r.valueOf && r.valueOf();
        if (n != null && n !== r) return h.from(n, e, t);
        let i = qo(r);
        if (i) return i;
        if (typeof Symbol < "u" && Symbol.toPrimitive != null && typeof r[Symbol.toPrimitive] == "function") return h.from(r[Symbol.toPrimitive]("string"), e, t);
        throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof r);
      }
      __name(Gn, "Gn");
      a(Gn, "from");
      h.from = function(r, e, t) {
        return Gn(r, e, t);
      };
      Object.setPrototypeOf(
        h.prototype,
        Uint8Array.prototype
      );
      Object.setPrototypeOf(h, Uint8Array);
      function Vn(r) {
        if (typeof r != "number") throw new TypeError(
          '"size" argument must be of type number'
        );
        if (r < 0) throw new RangeError('The value "' + r + '" is invalid for option "size"');
      }
      __name(Vn, "Vn");
      a(Vn, "assertSize");
      function Uo(r, e, t) {
        return Vn(r), r <= 0 ? he(r) : e !== void 0 ? typeof t == "string" ? he(r).fill(e, t) : he(r).fill(e) : he(r);
      }
      __name(Uo, "Uo");
      a(Uo, "alloc");
      h.alloc = function(r, e, t) {
        return Uo(r, e, t);
      };
      function $t(r) {
        return Vn(r), he(r < 0 ? 0 : Gt(r) | 0);
      }
      __name($t, "$t");
      a($t, "allocUnsafe");
      h.allocUnsafe = function(r) {
        return $t(
          r
        );
      };
      h.allocUnsafeSlow = function(r) {
        return $t(r);
      };
      function Do(r, e) {
        if ((typeof e != "string" || e === "") && (e = "utf8"), !h.isEncoding(e)) throw new TypeError("Unknown encoding: " + e);
        let t = zn(r, e) | 0, n = he(t), i = n.write(
          r,
          e
        );
        return i !== t && (n = n.slice(0, i)), n;
      }
      __name(Do, "Do");
      a(Do, "fromString");
      function Wt(r) {
        let e = r.length < 0 ? 0 : Gt(r.length) | 0, t = he(e);
        for (let n = 0; n < e; n += 1) t[n] = r[n] & 255;
        return t;
      }
      __name(Wt, "Wt");
      a(Wt, "fromArrayLike");
      function Oo(r) {
        if (ue(r, Uint8Array)) {
          let e = new Uint8Array(r);
          return jt(e.buffer, e.byteOffset, e.byteLength);
        }
        return Wt(r);
      }
      __name(Oo, "Oo");
      a(Oo, "fromArrayView");
      function jt(r, e, t) {
        if (e < 0 || r.byteLength < e) throw new RangeError('"offset" is outside of buffer bounds');
        if (r.byteLength < e + (t || 0)) throw new RangeError('"length" is outside of buffer bounds');
        let n;
        return e === void 0 && t === void 0 ? n = new Uint8Array(r) : t === void 0 ? n = new Uint8Array(r, e) : n = new Uint8Array(
          r,
          e,
          t
        ), Object.setPrototypeOf(n, h.prototype), n;
      }
      __name(jt, "jt");
      a(jt, "fromArrayBuffer");
      function qo(r) {
        if (h.isBuffer(r)) {
          let e = Gt(r.length) | 0, t = he(e);
          return t.length === 0 || r.copy(t, 0, 0, e), t;
        }
        if (r.length !== void 0) return typeof r.length != "number" || zt(r.length) ? he(0) : Wt(r);
        if (r.type === "Buffer" && Array.isArray(r.data)) return Wt(r.data);
      }
      __name(qo, "qo");
      a(qo, "fromObject");
      function Gt(r) {
        if (r >= ft) throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + ft.toString(16) + " bytes");
        return r | 0;
      }
      __name(Gt, "Gt");
      a(Gt, "checked");
      function Qo(r) {
        return +r != r && (r = 0), h.alloc(+r);
      }
      __name(Qo, "Qo");
      a(Qo, "SlowBuffer");
      h.isBuffer = a(function(e) {
        return e != null && e._isBuffer === true && e !== h.prototype;
      }, "isBuffer");
      h.compare = a(function(e, t) {
        if (ue(e, Uint8Array) && (e = h.from(e, e.offset, e.byteLength)), ue(t, Uint8Array) && (t = h.from(t, t.offset, t.byteLength)), !h.isBuffer(e) || !h.isBuffer(t)) throw new TypeError(
          'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
        );
        if (e === t) return 0;
        let n = e.length, i = t.length;
        for (let s = 0, o = Math.min(n, i); s < o; ++s) if (e[s] !== t[s]) {
          n = e[s], i = t[s];
          break;
        }
        return n < i ? -1 : i < n ? 1 : 0;
      }, "compare");
      h.isEncoding = a(function(e) {
        switch (String(e).toLowerCase()) {
          case "hex":
          case "utf8":
          case "utf-8":
          case "ascii":
          case "latin1":
          case "binary":
          case "base64":
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return true;
          default:
            return false;
        }
      }, "isEncoding");
      h.concat = a(function(e, t) {
        if (!Array.isArray(e)) throw new TypeError(
          '"list" argument must be an Array of Buffers'
        );
        if (e.length === 0) return h.alloc(0);
        let n;
        if (t === void 0)
          for (t = 0, n = 0; n < e.length; ++n) t += e[n].length;
        let i = h.allocUnsafe(t), s = 0;
        for (n = 0; n < e.length; ++n) {
          let o = e[n];
          if (ue(o, Uint8Array)) s + o.length > i.length ? (h.isBuffer(o) || (o = h.from(o)), o.copy(i, s)) : Uint8Array.prototype.set.call(i, o, s);
          else if (h.isBuffer(o)) o.copy(i, s);
          else throw new TypeError('"list" argument must be an Array of Buffers');
          s += o.length;
        }
        return i;
      }, "concat");
      function zn(r, e) {
        if (h.isBuffer(r)) return r.length;
        if (ArrayBuffer.isView(r) || ue(r, ArrayBuffer)) return r.byteLength;
        if (typeof r != "string") throw new TypeError(
          'The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type ' + typeof r
        );
        let t = r.length, n = arguments.length > 2 && arguments[2] === true;
        if (!n && t === 0) return 0;
        let i = false;
        for (; ; ) switch (e) {
          case "ascii":
          case "latin1":
          case "binary":
            return t;
          case "utf8":
          case "utf-8":
            return Ht(r).length;
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return t * 2;
          case "hex":
            return t >>> 1;
          case "base64":
            return ni(r).length;
          default:
            if (i) return n ? -1 : Ht(r).length;
            e = ("" + e).toLowerCase(), i = true;
        }
      }
      __name(zn, "zn");
      a(zn, "byteLength");
      h.byteLength = zn;
      function No(r, e, t) {
        let n = false;
        if ((e === void 0 || e < 0) && (e = 0), e > this.length || ((t === void 0 || t > this.length) && (t = this.length), t <= 0) || (t >>>= 0, e >>>= 0, t <= e)) return "";
        for (r || (r = "utf8"); ; ) switch (r) {
          case "hex":
            return Zo(this, e, t);
          case "utf8":
          case "utf-8":
            return Yn(this, e, t);
          case "ascii":
            return Ko(this, e, t);
          case "latin1":
          case "binary":
            return Yo(
              this,
              e,
              t
            );
          case "base64":
            return Vo(this, e, t);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return Jo(
              this,
              e,
              t
            );
          default:
            if (n) throw new TypeError("Unknown encoding: " + r);
            r = (r + "").toLowerCase(), n = true;
        }
      }
      __name(No, "No");
      a(
        No,
        "slowToString"
      );
      h.prototype._isBuffer = true;
      function Ae(r, e, t) {
        let n = r[e];
        r[e] = r[t], r[t] = n;
      }
      __name(Ae, "Ae");
      a(Ae, "swap");
      h.prototype.swap16 = a(function() {
        let e = this.length;
        if (e % 2 !== 0) throw new RangeError("Buffer size must be a multiple of 16-bits");
        for (let t = 0; t < e; t += 2) Ae(this, t, t + 1);
        return this;
      }, "swap16");
      h.prototype.swap32 = a(function() {
        let e = this.length;
        if (e % 4 !== 0) throw new RangeError("Buffer size must be a multiple of 32-bits");
        for (let t = 0; t < e; t += 4) Ae(this, t, t + 3), Ae(this, t + 1, t + 2);
        return this;
      }, "swap32");
      h.prototype.swap64 = a(
        function() {
          let e = this.length;
          if (e % 8 !== 0) throw new RangeError("Buffer size must be a multiple of 64-bits");
          for (let t = 0; t < e; t += 8) Ae(this, t, t + 7), Ae(this, t + 1, t + 6), Ae(this, t + 2, t + 5), Ae(this, t + 3, t + 4);
          return this;
        },
        "swap64"
      );
      h.prototype.toString = a(function() {
        let e = this.length;
        return e === 0 ? "" : arguments.length === 0 ? Yn(
          this,
          0,
          e
        ) : No.apply(this, arguments);
      }, "toString");
      h.prototype.toLocaleString = h.prototype.toString;
      h.prototype.equals = a(function(e) {
        if (!h.isBuffer(e)) throw new TypeError("Argument must be a Buffer");
        return this === e ? true : h.compare(this, e) === 0;
      }, "equals");
      h.prototype.inspect = a(function() {
        let e = "", t = Re.INSPECT_MAX_BYTES;
        return e = this.toString("hex", 0, t).replace(/(.{2})/g, "$1 ").trim(), this.length > t && (e += " ... "), "<Buffer " + e + ">";
      }, "inspect");
      Wn && (h.prototype[Wn] = h.prototype.inspect);
      h.prototype.compare = a(function(e, t, n, i, s) {
        if (ue(e, Uint8Array) && (e = h.from(e, e.offset, e.byteLength)), !h.isBuffer(e)) throw new TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type ' + typeof e);
        if (t === void 0 && (t = 0), n === void 0 && (n = e ? e.length : 0), i === void 0 && (i = 0), s === void 0 && (s = this.length), t < 0 || n > e.length || i < 0 || s > this.length) throw new RangeError("out of range index");
        if (i >= s && t >= n) return 0;
        if (i >= s) return -1;
        if (t >= n) return 1;
        if (t >>>= 0, n >>>= 0, i >>>= 0, s >>>= 0, this === e) return 0;
        let o = s - i, u = n - t, c = Math.min(o, u), l = this.slice(
          i,
          s
        ), f = e.slice(t, n);
        for (let y = 0; y < c; ++y) if (l[y] !== f[y]) {
          o = l[y], u = f[y];
          break;
        }
        return o < u ? -1 : u < o ? 1 : 0;
      }, "compare");
      function Kn(r, e, t, n, i) {
        if (r.length === 0) return -1;
        if (typeof t == "string" ? (n = t, t = 0) : t > 2147483647 ? t = 2147483647 : t < -2147483648 && (t = -2147483648), t = +t, zt(t) && (t = i ? 0 : r.length - 1), t < 0 && (t = r.length + t), t >= r.length) {
          if (i) return -1;
          t = r.length - 1;
        } else if (t < 0) if (i) t = 0;
        else return -1;
        if (typeof e == "string" && (e = h.from(
          e,
          n
        )), h.isBuffer(e)) return e.length === 0 ? -1 : jn(r, e, t, n, i);
        if (typeof e == "number") return e = e & 255, typeof Uint8Array.prototype.indexOf == "function" ? i ? Uint8Array.prototype.indexOf.call(r, e, t) : Uint8Array.prototype.lastIndexOf.call(r, e, t) : jn(r, [e], t, n, i);
        throw new TypeError("val must be string, number or Buffer");
      }
      __name(Kn, "Kn");
      a(Kn, "bidirectionalIndexOf");
      function jn(r, e, t, n, i) {
        let s = 1, o = r.length, u = e.length;
        if (n !== void 0 && (n = String(n).toLowerCase(), n === "ucs2" || n === "ucs-2" || n === "utf16le" || n === "utf-16le")) {
          if (r.length < 2 || e.length < 2) return -1;
          s = 2, o /= 2, u /= 2, t /= 2;
        }
        function c(f, y) {
          return s === 1 ? f[y] : f.readUInt16BE(y * s);
        }
        __name(c, "c");
        a(c, "read");
        let l;
        if (i) {
          let f = -1;
          for (l = t; l < o; l++) if (c(r, l) === c(e, f === -1 ? 0 : l - f)) {
            if (f === -1 && (f = l), l - f + 1 === u) return f * s;
          } else f !== -1 && (l -= l - f), f = -1;
        } else for (t + u > o && (t = o - u), l = t; l >= 0; l--) {
          let f = true;
          for (let y = 0; y < u; y++) if (c(r, l + y) !== c(e, y)) {
            f = false;
            break;
          }
          if (f) return l;
        }
        return -1;
      }
      __name(jn, "jn");
      a(jn, "arrayIndexOf");
      h.prototype.includes = a(function(e, t, n) {
        return this.indexOf(
          e,
          t,
          n
        ) !== -1;
      }, "includes");
      h.prototype.indexOf = a(function(e, t, n) {
        return Kn(this, e, t, n, true);
      }, "indexOf");
      h.prototype.lastIndexOf = a(function(e, t, n) {
        return Kn(this, e, t, n, false);
      }, "lastIndexOf");
      function Wo(r, e, t, n) {
        t = Number(t) || 0;
        let i = r.length - t;
        n ? (n = Number(n), n > i && (n = i)) : n = i;
        let s = e.length;
        n > s / 2 && (n = s / 2);
        let o;
        for (o = 0; o < n; ++o) {
          let u = parseInt(e.substr(o * 2, 2), 16);
          if (zt(u)) return o;
          r[t + o] = u;
        }
        return o;
      }
      __name(Wo, "Wo");
      a(Wo, "hexWrite");
      function jo(r, e, t, n) {
        return ht(Ht(e, r.length - t), r, t, n);
      }
      __name(jo, "jo");
      a(jo, "utf8Write");
      function Ho(r, e, t, n) {
        return ht(ra(e), r, t, n);
      }
      __name(Ho, "Ho");
      a(
        Ho,
        "asciiWrite"
      );
      function $o(r, e, t, n) {
        return ht(ni(e), r, t, n);
      }
      __name($o, "$o");
      a($o, "base64Write");
      function Go(r, e, t, n) {
        return ht(
          na(e, r.length - t),
          r,
          t,
          n
        );
      }
      __name(Go, "Go");
      a(Go, "ucs2Write");
      h.prototype.write = a(function(e, t, n, i) {
        if (t === void 0) i = "utf8", n = this.length, t = 0;
        else if (n === void 0 && typeof t == "string") i = t, n = this.length, t = 0;
        else if (isFinite(t))
          t = t >>> 0, isFinite(n) ? (n = n >>> 0, i === void 0 && (i = "utf8")) : (i = n, n = void 0);
        else throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
        let s = this.length - t;
        if ((n === void 0 || n > s) && (n = s), e.length > 0 && (n < 0 || t < 0) || t > this.length) throw new RangeError("Attempt to write outside buffer bounds");
        i || (i = "utf8");
        let o = false;
        for (; ; ) switch (i) {
          case "hex":
            return Wo(this, e, t, n);
          case "utf8":
          case "utf-8":
            return jo(this, e, t, n);
          case "ascii":
          case "latin1":
          case "binary":
            return Ho(this, e, t, n);
          case "base64":
            return $o(this, e, t, n);
          case "ucs2":
          case "ucs-2":
          case "utf16le":
          case "utf-16le":
            return Go(this, e, t, n);
          default:
            if (o) throw new TypeError("Unknown encoding: " + i);
            i = ("" + i).toLowerCase(), o = true;
        }
      }, "write");
      h.prototype.toJSON = a(function() {
        return { type: "Buffer", data: Array.prototype.slice.call(this._arr || this, 0) };
      }, "toJSON");
      function Vo(r, e, t) {
        return e === 0 && t === r.length ? Nt.fromByteArray(r) : Nt.fromByteArray(r.slice(e, t));
      }
      __name(Vo, "Vo");
      a(Vo, "base64Slice");
      function Yn(r, e, t) {
        t = Math.min(r.length, t);
        let n = [], i = e;
        for (; i < t; ) {
          let s = r[i], o = null, u = s > 239 ? 4 : s > 223 ? 3 : s > 191 ? 2 : 1;
          if (i + u <= t) {
            let c, l, f, y;
            switch (u) {
              case 1:
                s < 128 && (o = s);
                break;
              case 2:
                c = r[i + 1], (c & 192) === 128 && (y = (s & 31) << 6 | c & 63, y > 127 && (o = y));
                break;
              case 3:
                c = r[i + 1], l = r[i + 2], (c & 192) === 128 && (l & 192) === 128 && (y = (s & 15) << 12 | (c & 63) << 6 | l & 63, y > 2047 && (y < 55296 || y > 57343) && (o = y));
                break;
              case 4:
                c = r[i + 1], l = r[i + 2], f = r[i + 3], (c & 192) === 128 && (l & 192) === 128 && (f & 192) === 128 && (y = (s & 15) << 18 | (c & 63) << 12 | (l & 63) << 6 | f & 63, y > 65535 && y < 1114112 && (o = y));
            }
          }
          o === null ? (o = 65533, u = 1) : o > 65535 && (o -= 65536, n.push(o >>> 10 & 1023 | 55296), o = 56320 | o & 1023), n.push(o), i += u;
        }
        return zo(n);
      }
      __name(Yn, "Yn");
      a(Yn, "utf8Slice");
      var Hn = 4096;
      function zo(r) {
        let e = r.length;
        if (e <= Hn) return String.fromCharCode.apply(String, r);
        let t = "", n = 0;
        for (; n < e; ) t += String.fromCharCode.apply(String, r.slice(n, n += Hn));
        return t;
      }
      __name(zo, "zo");
      a(zo, "decodeCodePointsArray");
      function Ko(r, e, t) {
        let n = "";
        t = Math.min(r.length, t);
        for (let i = e; i < t; ++i) n += String.fromCharCode(r[i] & 127);
        return n;
      }
      __name(Ko, "Ko");
      a(Ko, "asciiSlice");
      function Yo(r, e, t) {
        let n = "";
        t = Math.min(r.length, t);
        for (let i = e; i < t; ++i) n += String.fromCharCode(r[i]);
        return n;
      }
      __name(Yo, "Yo");
      a(Yo, "latin1Slice");
      function Zo(r, e, t) {
        let n = r.length;
        (!e || e < 0) && (e = 0), (!t || t < 0 || t > n) && (t = n);
        let i = "";
        for (let s = e; s < t; ++s) i += ia[r[s]];
        return i;
      }
      __name(Zo, "Zo");
      a(Zo, "hexSlice");
      function Jo(r, e, t) {
        let n = r.slice(e, t), i = "";
        for (let s = 0; s < n.length - 1; s += 2) i += String.fromCharCode(n[s] + n[s + 1] * 256);
        return i;
      }
      __name(Jo, "Jo");
      a(Jo, "utf16leSlice");
      h.prototype.slice = a(function(e, t) {
        let n = this.length;
        e = ~~e, t = t === void 0 ? n : ~~t, e < 0 ? (e += n, e < 0 && (e = 0)) : e > n && (e = n), t < 0 ? (t += n, t < 0 && (t = 0)) : t > n && (t = n), t < e && (t = e);
        let i = this.subarray(e, t);
        return Object.setPrototypeOf(i, h.prototype), i;
      }, "slice");
      function q(r, e, t) {
        if (r % 1 !== 0 || r < 0) throw new RangeError("offset is not uint");
        if (r + e > t) throw new RangeError("Trying to access beyond buffer length");
      }
      __name(q, "q");
      a(q, "checkOffset");
      h.prototype.readUintLE = h.prototype.readUIntLE = a(
        function(e, t, n) {
          e = e >>> 0, t = t >>> 0, n || q(e, t, this.length);
          let i = this[e], s = 1, o = 0;
          for (; ++o < t && (s *= 256); ) i += this[e + o] * s;
          return i;
        },
        "readUIntLE"
      );
      h.prototype.readUintBE = h.prototype.readUIntBE = a(function(e, t, n) {
        e = e >>> 0, t = t >>> 0, n || q(
          e,
          t,
          this.length
        );
        let i = this[e + --t], s = 1;
        for (; t > 0 && (s *= 256); ) i += this[e + --t] * s;
        return i;
      }, "readUIntBE");
      h.prototype.readUint8 = h.prototype.readUInt8 = a(
        function(e, t) {
          return e = e >>> 0, t || q(e, 1, this.length), this[e];
        },
        "readUInt8"
      );
      h.prototype.readUint16LE = h.prototype.readUInt16LE = a(function(e, t) {
        return e = e >>> 0, t || q(
          e,
          2,
          this.length
        ), this[e] | this[e + 1] << 8;
      }, "readUInt16LE");
      h.prototype.readUint16BE = h.prototype.readUInt16BE = a(function(e, t) {
        return e = e >>> 0, t || q(e, 2, this.length), this[e] << 8 | this[e + 1];
      }, "readUInt16BE");
      h.prototype.readUint32LE = h.prototype.readUInt32LE = a(function(e, t) {
        return e = e >>> 0, t || q(e, 4, this.length), (this[e] | this[e + 1] << 8 | this[e + 2] << 16) + this[e + 3] * 16777216;
      }, "readUInt32LE");
      h.prototype.readUint32BE = h.prototype.readUInt32BE = a(function(e, t) {
        return e = e >>> 0, t || q(e, 4, this.length), this[e] * 16777216 + (this[e + 1] << 16 | this[e + 2] << 8 | this[e + 3]);
      }, "readUInt32BE");
      h.prototype.readBigUInt64LE = we(a(function(e) {
        e = e >>> 0, Be(e, "offset");
        let t = this[e], n = this[e + 7];
        (t === void 0 || n === void 0) && je(e, this.length - 8);
        let i = t + this[++e] * 2 ** 8 + this[++e] * 2 ** 16 + this[++e] * 2 ** 24, s = this[++e] + this[++e] * 2 ** 8 + this[++e] * 2 ** 16 + n * 2 ** 24;
        return BigInt(i) + (BigInt(s) << BigInt(32));
      }, "readBigUInt64LE"));
      h.prototype.readBigUInt64BE = we(a(function(e) {
        e = e >>> 0, Be(e, "offset");
        let t = this[e], n = this[e + 7];
        (t === void 0 || n === void 0) && je(e, this.length - 8);
        let i = t * 2 ** 24 + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + this[++e], s = this[++e] * 2 ** 24 + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + n;
        return (BigInt(i) << BigInt(
          32
        )) + BigInt(s);
      }, "readBigUInt64BE"));
      h.prototype.readIntLE = a(function(e, t, n) {
        e = e >>> 0, t = t >>> 0, n || q(
          e,
          t,
          this.length
        );
        let i = this[e], s = 1, o = 0;
        for (; ++o < t && (s *= 256); ) i += this[e + o] * s;
        return s *= 128, i >= s && (i -= Math.pow(2, 8 * t)), i;
      }, "readIntLE");
      h.prototype.readIntBE = a(function(e, t, n) {
        e = e >>> 0, t = t >>> 0, n || q(e, t, this.length);
        let i = t, s = 1, o = this[e + --i];
        for (; i > 0 && (s *= 256); ) o += this[e + --i] * s;
        return s *= 128, o >= s && (o -= Math.pow(2, 8 * t)), o;
      }, "readIntBE");
      h.prototype.readInt8 = a(function(e, t) {
        return e = e >>> 0, t || q(e, 1, this.length), this[e] & 128 ? (255 - this[e] + 1) * -1 : this[e];
      }, "readInt8");
      h.prototype.readInt16LE = a(function(e, t) {
        e = e >>> 0, t || q(
          e,
          2,
          this.length
        );
        let n = this[e] | this[e + 1] << 8;
        return n & 32768 ? n | 4294901760 : n;
      }, "readInt16LE");
      h.prototype.readInt16BE = a(function(e, t) {
        e = e >>> 0, t || q(e, 2, this.length);
        let n = this[e + 1] | this[e] << 8;
        return n & 32768 ? n | 4294901760 : n;
      }, "readInt16BE");
      h.prototype.readInt32LE = a(function(e, t) {
        return e = e >>> 0, t || q(e, 4, this.length), this[e] | this[e + 1] << 8 | this[e + 2] << 16 | this[e + 3] << 24;
      }, "readInt32LE");
      h.prototype.readInt32BE = a(function(e, t) {
        return e = e >>> 0, t || q(e, 4, this.length), this[e] << 24 | this[e + 1] << 16 | this[e + 2] << 8 | this[e + 3];
      }, "readInt32BE");
      h.prototype.readBigInt64LE = we(a(function(e) {
        e = e >>> 0, Be(e, "offset");
        let t = this[e], n = this[e + 7];
        (t === void 0 || n === void 0) && je(e, this.length - 8);
        let i = this[e + 4] + this[e + 5] * 2 ** 8 + this[e + 6] * 2 ** 16 + (n << 24);
        return (BigInt(i) << BigInt(
          32
        )) + BigInt(t + this[++e] * 2 ** 8 + this[++e] * 2 ** 16 + this[++e] * 2 ** 24);
      }, "readBigInt64LE"));
      h.prototype.readBigInt64BE = we(a(function(e) {
        e = e >>> 0, Be(e, "offset");
        let t = this[e], n = this[e + 7];
        (t === void 0 || n === void 0) && je(e, this.length - 8);
        let i = (t << 24) + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + this[++e];
        return (BigInt(i) << BigInt(32)) + BigInt(
          this[++e] * 2 ** 24 + this[++e] * 2 ** 16 + this[++e] * 2 ** 8 + n
        );
      }, "readBigInt64BE"));
      h.prototype.readFloatLE = a(function(e, t) {
        return e = e >>> 0, t || q(e, 4, this.length), Pe.read(this, e, true, 23, 4);
      }, "readFloatLE");
      h.prototype.readFloatBE = a(function(e, t) {
        return e = e >>> 0, t || q(e, 4, this.length), Pe.read(this, e, false, 23, 4);
      }, "readFloatBE");
      h.prototype.readDoubleLE = a(function(e, t) {
        return e = e >>> 0, t || q(e, 8, this.length), Pe.read(this, e, true, 52, 8);
      }, "readDoubleLE");
      h.prototype.readDoubleBE = a(function(e, t) {
        return e = e >>> 0, t || q(e, 8, this.length), Pe.read(
          this,
          e,
          false,
          52,
          8
        );
      }, "readDoubleBE");
      function V(r, e, t, n, i, s) {
        if (!h.isBuffer(r)) throw new TypeError('"buffer" argument must be a Buffer instance');
        if (e > i || e < s) throw new RangeError('"value" argument is out of bounds');
        if (t + n > r.length) throw new RangeError("Index out of range");
      }
      __name(V, "V");
      a(V, "checkInt");
      h.prototype.writeUintLE = h.prototype.writeUIntLE = a(function(e, t, n, i) {
        if (e = +e, t = t >>> 0, n = n >>> 0, !i) {
          let u = Math.pow(2, 8 * n) - 1;
          V(
            this,
            e,
            t,
            n,
            u,
            0
          );
        }
        let s = 1, o = 0;
        for (this[t] = e & 255; ++o < n && (s *= 256); ) this[t + o] = e / s & 255;
        return t + n;
      }, "writeUIntLE");
      h.prototype.writeUintBE = h.prototype.writeUIntBE = a(function(e, t, n, i) {
        if (e = +e, t = t >>> 0, n = n >>> 0, !i) {
          let u = Math.pow(2, 8 * n) - 1;
          V(this, e, t, n, u, 0);
        }
        let s = n - 1, o = 1;
        for (this[t + s] = e & 255; --s >= 0 && (o *= 256); ) this[t + s] = e / o & 255;
        return t + n;
      }, "writeUIntBE");
      h.prototype.writeUint8 = h.prototype.writeUInt8 = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || V(this, e, t, 1, 255, 0), this[t] = e & 255, t + 1;
      }, "writeUInt8");
      h.prototype.writeUint16LE = h.prototype.writeUInt16LE = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || V(this, e, t, 2, 65535, 0), this[t] = e & 255, this[t + 1] = e >>> 8, t + 2;
      }, "writeUInt16LE");
      h.prototype.writeUint16BE = h.prototype.writeUInt16BE = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || V(this, e, t, 2, 65535, 0), this[t] = e >>> 8, this[t + 1] = e & 255, t + 2;
      }, "writeUInt16BE");
      h.prototype.writeUint32LE = h.prototype.writeUInt32LE = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || V(
          this,
          e,
          t,
          4,
          4294967295,
          0
        ), this[t + 3] = e >>> 24, this[t + 2] = e >>> 16, this[t + 1] = e >>> 8, this[t] = e & 255, t + 4;
      }, "writeUInt32LE");
      h.prototype.writeUint32BE = h.prototype.writeUInt32BE = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || V(
          this,
          e,
          t,
          4,
          4294967295,
          0
        ), this[t] = e >>> 24, this[t + 1] = e >>> 16, this[t + 2] = e >>> 8, this[t + 3] = e & 255, t + 4;
      }, "writeUInt32BE");
      function Zn(r, e, t, n, i) {
        ri(e, n, i, r, t, 7);
        let s = Number(e & BigInt(4294967295));
        r[t++] = s, s = s >> 8, r[t++] = s, s = s >> 8, r[t++] = s, s = s >> 8, r[t++] = s;
        let o = Number(e >> BigInt(32) & BigInt(4294967295));
        return r[t++] = o, o = o >> 8, r[t++] = o, o = o >> 8, r[t++] = o, o = o >> 8, r[t++] = o, t;
      }
      __name(Zn, "Zn");
      a(Zn, "wrtBigUInt64LE");
      function Jn(r, e, t, n, i) {
        ri(e, n, i, r, t, 7);
        let s = Number(e & BigInt(4294967295));
        r[t + 7] = s, s = s >> 8, r[t + 6] = s, s = s >> 8, r[t + 5] = s, s = s >> 8, r[t + 4] = s;
        let o = Number(e >> BigInt(32) & BigInt(4294967295));
        return r[t + 3] = o, o = o >> 8, r[t + 2] = o, o = o >> 8, r[t + 1] = o, o = o >> 8, r[t] = o, t + 8;
      }
      __name(Jn, "Jn");
      a(Jn, "wrtBigUInt64BE");
      h.prototype.writeBigUInt64LE = we(a(function(e, t = 0) {
        return Zn(this, e, t, BigInt(0), BigInt("0xffffffffffffffff"));
      }, "writeBigUInt64LE"));
      h.prototype.writeBigUInt64BE = we(a(function(e, t = 0) {
        return Jn(this, e, t, BigInt(0), BigInt(
          "0xffffffffffffffff"
        ));
      }, "writeBigUInt64BE"));
      h.prototype.writeIntLE = a(function(e, t, n, i) {
        if (e = +e, t = t >>> 0, !i) {
          let c = Math.pow(2, 8 * n - 1);
          V(this, e, t, n, c - 1, -c);
        }
        let s = 0, o = 1, u = 0;
        for (this[t] = e & 255; ++s < n && (o *= 256); )
          e < 0 && u === 0 && this[t + s - 1] !== 0 && (u = 1), this[t + s] = (e / o >> 0) - u & 255;
        return t + n;
      }, "writeIntLE");
      h.prototype.writeIntBE = a(function(e, t, n, i) {
        if (e = +e, t = t >>> 0, !i) {
          let c = Math.pow(2, 8 * n - 1);
          V(this, e, t, n, c - 1, -c);
        }
        let s = n - 1, o = 1, u = 0;
        for (this[t + s] = e & 255; --s >= 0 && (o *= 256); ) e < 0 && u === 0 && this[t + s + 1] !== 0 && (u = 1), this[t + s] = (e / o >> 0) - u & 255;
        return t + n;
      }, "writeIntBE");
      h.prototype.writeInt8 = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || V(this, e, t, 1, 127, -128), e < 0 && (e = 255 + e + 1), this[t] = e & 255, t + 1;
      }, "writeInt8");
      h.prototype.writeInt16LE = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || V(this, e, t, 2, 32767, -32768), this[t] = e & 255, this[t + 1] = e >>> 8, t + 2;
      }, "writeInt16LE");
      h.prototype.writeInt16BE = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || V(this, e, t, 2, 32767, -32768), this[t] = e >>> 8, this[t + 1] = e & 255, t + 2;
      }, "writeInt16BE");
      h.prototype.writeInt32LE = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || V(
          this,
          e,
          t,
          4,
          2147483647,
          -2147483648
        ), this[t] = e & 255, this[t + 1] = e >>> 8, this[t + 2] = e >>> 16, this[t + 3] = e >>> 24, t + 4;
      }, "writeInt32LE");
      h.prototype.writeInt32BE = a(function(e, t, n) {
        return e = +e, t = t >>> 0, n || V(
          this,
          e,
          t,
          4,
          2147483647,
          -2147483648
        ), e < 0 && (e = 4294967295 + e + 1), this[t] = e >>> 24, this[t + 1] = e >>> 16, this[t + 2] = e >>> 8, this[t + 3] = e & 255, t + 4;
      }, "writeInt32BE");
      h.prototype.writeBigInt64LE = we(a(function(e, t = 0) {
        return Zn(this, e, t, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
      }, "writeBigInt64LE"));
      h.prototype.writeBigInt64BE = we(
        a(function(e, t = 0) {
          return Jn(this, e, t, -BigInt("0x8000000000000000"), BigInt("0x7fffffffffffffff"));
        }, "writeBigInt64BE")
      );
      function Xn(r, e, t, n, i, s) {
        if (t + n > r.length) throw new RangeError("Index out of range");
        if (t < 0) throw new RangeError("Index out of range");
      }
      __name(Xn, "Xn");
      a(Xn, "checkIEEE754");
      function ei(r, e, t, n, i) {
        return e = +e, t = t >>> 0, i || Xn(r, e, t, 4, 34028234663852886e22, -34028234663852886e22), Pe.write(r, e, t, n, 23, 4), t + 4;
      }
      __name(ei, "ei");
      a(
        ei,
        "writeFloat"
      );
      h.prototype.writeFloatLE = a(function(e, t, n) {
        return ei(this, e, t, true, n);
      }, "writeFloatLE");
      h.prototype.writeFloatBE = a(function(e, t, n) {
        return ei(this, e, t, false, n);
      }, "writeFloatBE");
      function ti(r, e, t, n, i) {
        return e = +e, t = t >>> 0, i || Xn(r, e, t, 8, 17976931348623157e292, -17976931348623157e292), Pe.write(
          r,
          e,
          t,
          n,
          52,
          8
        ), t + 8;
      }
      __name(ti, "ti");
      a(ti, "writeDouble");
      h.prototype.writeDoubleLE = a(function(e, t, n) {
        return ti(this, e, t, true, n);
      }, "writeDoubleLE");
      h.prototype.writeDoubleBE = a(function(e, t, n) {
        return ti(this, e, t, false, n);
      }, "writeDoubleBE");
      h.prototype.copy = a(function(e, t, n, i) {
        if (!h.isBuffer(e)) throw new TypeError("argument should be a Buffer");
        if (n || (n = 0), !i && i !== 0 && (i = this.length), t >= e.length && (t = e.length), t || (t = 0), i > 0 && i < n && (i = n), i === n || e.length === 0 || this.length === 0) return 0;
        if (t < 0) throw new RangeError("targetStart out of bounds");
        if (n < 0 || n >= this.length) throw new RangeError("Index out of range");
        if (i < 0) throw new RangeError("sourceEnd out of bounds");
        i > this.length && (i = this.length), e.length - t < i - n && (i = e.length - t + n);
        let s = i - n;
        return this === e && typeof Uint8Array.prototype.copyWithin == "function" ? this.copyWithin(t, n, i) : Uint8Array.prototype.set.call(e, this.subarray(n, i), t), s;
      }, "copy");
      h.prototype.fill = a(function(e, t, n, i) {
        if (typeof e == "string") {
          if (typeof t == "string" ? (i = t, t = 0, n = this.length) : typeof n == "string" && (i = n, n = this.length), i !== void 0 && typeof i != "string") throw new TypeError("encoding must be a string");
          if (typeof i == "string" && !h.isEncoding(i)) throw new TypeError(
            "Unknown encoding: " + i
          );
          if (e.length === 1) {
            let o = e.charCodeAt(0);
            (i === "utf8" && o < 128 || i === "latin1") && (e = o);
          }
        } else typeof e == "number" ? e = e & 255 : typeof e == "boolean" && (e = Number(e));
        if (t < 0 || this.length < t || this.length < n) throw new RangeError("Out of range index");
        if (n <= t) return this;
        t = t >>> 0, n = n === void 0 ? this.length : n >>> 0, e || (e = 0);
        let s;
        if (typeof e == "number") for (s = t; s < n; ++s) this[s] = e;
        else {
          let o = h.isBuffer(e) ? e : h.from(
            e,
            i
          ), u = o.length;
          if (u === 0) throw new TypeError('The value "' + e + '" is invalid for argument "value"');
          for (s = 0; s < n - t; ++s) this[s + t] = o[s % u];
        }
        return this;
      }, "fill");
      var Te = {};
      function Vt(r, e, t) {
        var n;
        Te[r] = (n = class extends t {
          static {
            __name(this, "n");
          }
          constructor() {
            super(), Object.defineProperty(this, "message", { value: e.apply(this, arguments), writable: true, configurable: true }), this.name = `${this.name} [${r}]`, this.stack, delete this.name;
          }
          get code() {
            return r;
          }
          set code(s) {
            Object.defineProperty(
              this,
              "code",
              { configurable: true, enumerable: true, value: s, writable: true }
            );
          }
          toString() {
            return `${this.name} [${r}]: ${this.message}`;
          }
        }, a(n, "NodeError"), n);
      }
      __name(Vt, "Vt");
      a(Vt, "E");
      Vt("ERR_BUFFER_OUT_OF_BOUNDS", function(r) {
        return r ? `${r} is outside of buffer bounds` : "Attempt to access memory outside buffer bounds";
      }, RangeError);
      Vt(
        "ERR_INVALID_ARG_TYPE",
        function(r, e) {
          return `The "${r}" argument must be of type number. Received type ${typeof e}`;
        },
        TypeError
      );
      Vt("ERR_OUT_OF_RANGE", function(r, e, t) {
        let n = `The value of "${r}" is out of range.`, i = t;
        return Number.isInteger(t) && Math.abs(t) > 2 ** 32 ? i = $n(String(t)) : typeof t == "bigint" && (i = String(
          t
        ), (t > BigInt(2) ** BigInt(32) || t < -(BigInt(2) ** BigInt(32))) && (i = $n(i)), i += "n"), n += ` It must be ${e}. Received ${i}`, n;
      }, RangeError);
      function $n(r) {
        let e = "", t = r.length, n = r[0] === "-" ? 1 : 0;
        for (; t >= n + 4; t -= 3) e = `_${r.slice(t - 3, t)}${e}`;
        return `${r.slice(0, t)}${e}`;
      }
      __name($n, "$n");
      a($n, "addNumericalSeparator");
      function Xo(r, e, t) {
        Be(e, "offset"), (r[e] === void 0 || r[e + t] === void 0) && je(e, r.length - (t + 1));
      }
      __name(Xo, "Xo");
      a(Xo, "checkBounds");
      function ri(r, e, t, n, i, s) {
        if (r > t || r < e) {
          let o = typeof e == "bigint" ? "n" : "", u;
          throw s > 3 ? e === 0 || e === BigInt(0) ? u = `>= 0${o} and < 2${o} ** ${(s + 1) * 8}${o}` : u = `>= -(2${o} ** ${(s + 1) * 8 - 1}${o}) and < 2 ** ${(s + 1) * 8 - 1}${o}` : u = `>= ${e}${o} and <= ${t}${o}`, new Te.ERR_OUT_OF_RANGE("value", u, r);
        }
        Xo(n, i, s);
      }
      __name(ri, "ri");
      a(ri, "checkIntBI");
      function Be(r, e) {
        if (typeof r != "number") throw new Te.ERR_INVALID_ARG_TYPE(e, "number", r);
      }
      __name(Be, "Be");
      a(Be, "validateNumber");
      function je(r, e, t) {
        throw Math.floor(r) !== r ? (Be(r, t), new Te.ERR_OUT_OF_RANGE(t || "offset", "an integer", r)) : e < 0 ? new Te.ERR_BUFFER_OUT_OF_BOUNDS() : new Te.ERR_OUT_OF_RANGE(t || "offset", `>= ${t ? 1 : 0} and <= ${e}`, r);
      }
      __name(je, "je");
      a(je, "boundsError");
      var ea = /[^+/0-9A-Za-z-_]/g;
      function ta(r) {
        if (r = r.split("=")[0], r = r.trim().replace(ea, ""), r.length < 2) return "";
        for (; r.length % 4 !== 0; ) r = r + "=";
        return r;
      }
      __name(ta, "ta");
      a(ta, "base64clean");
      function Ht(r, e) {
        e = e || 1 / 0;
        let t, n = r.length, i = null, s = [];
        for (let o = 0; o < n; ++o) {
          if (t = r.charCodeAt(o), t > 55295 && t < 57344) {
            if (!i) {
              if (t > 56319) {
                (e -= 3) > -1 && s.push(239, 191, 189);
                continue;
              } else if (o + 1 === n) {
                (e -= 3) > -1 && s.push(239, 191, 189);
                continue;
              }
              i = t;
              continue;
            }
            if (t < 56320) {
              (e -= 3) > -1 && s.push(239, 191, 189), i = t;
              continue;
            }
            t = (i - 55296 << 10 | t - 56320) + 65536;
          } else i && (e -= 3) > -1 && s.push(239, 191, 189);
          if (i = null, t < 128) {
            if ((e -= 1) < 0) break;
            s.push(t);
          } else if (t < 2048) {
            if ((e -= 2) < 0) break;
            s.push(t >> 6 | 192, t & 63 | 128);
          } else if (t < 65536) {
            if ((e -= 3) < 0) break;
            s.push(t >> 12 | 224, t >> 6 & 63 | 128, t & 63 | 128);
          } else if (t < 1114112) {
            if ((e -= 4) < 0) break;
            s.push(t >> 18 | 240, t >> 12 & 63 | 128, t >> 6 & 63 | 128, t & 63 | 128);
          } else throw new Error("Invalid code point");
        }
        return s;
      }
      __name(Ht, "Ht");
      a(Ht, "utf8ToBytes");
      function ra(r) {
        let e = [];
        for (let t = 0; t < r.length; ++t) e.push(r.charCodeAt(t) & 255);
        return e;
      }
      __name(ra, "ra");
      a(
        ra,
        "asciiToBytes"
      );
      function na(r, e) {
        let t, n, i, s = [];
        for (let o = 0; o < r.length && !((e -= 2) < 0); ++o) t = r.charCodeAt(
          o
        ), n = t >> 8, i = t % 256, s.push(i), s.push(n);
        return s;
      }
      __name(na, "na");
      a(na, "utf16leToBytes");
      function ni(r) {
        return Nt.toByteArray(
          ta(r)
        );
      }
      __name(ni, "ni");
      a(ni, "base64ToBytes");
      function ht(r, e, t, n) {
        let i;
        for (i = 0; i < n && !(i + t >= e.length || i >= r.length); ++i)
          e[i + t] = r[i];
        return i;
      }
      __name(ht, "ht");
      a(ht, "blitBuffer");
      function ue(r, e) {
        return r instanceof e || r != null && r.constructor != null && r.constructor.name != null && r.constructor.name === e.name;
      }
      __name(ue, "ue");
      a(ue, "isInstance");
      function zt(r) {
        return r !== r;
      }
      __name(zt, "zt");
      a(zt, "numberIsNaN");
      var ia = function() {
        let r = "0123456789abcdef", e = new Array(256);
        for (let t = 0; t < 16; ++t) {
          let n = t * 16;
          for (let i = 0; i < 16; ++i) e[n + i] = r[t] + r[i];
        }
        return e;
      }();
      function we(r) {
        return typeof BigInt > "u" ? sa : r;
      }
      __name(we, "we");
      a(we, "defineBigIntMethod");
      function sa() {
        throw new Error("BigInt not supported");
      }
      __name(sa, "sa");
      a(sa, "BufferBigIntNotDefined");
    });
    p = G(() => {
      "use strict";
      b = globalThis, v = globalThis.setImmediate ?? ((r) => setTimeout(r, 0)), x = globalThis.clearImmediate ?? ((r) => clearTimeout(r)), d = typeof globalThis.Buffer == "function" && typeof globalThis.Buffer.allocUnsafe == "function" ? globalThis.Buffer : ii().Buffer, m = globalThis.process ?? {};
      m.env ?? (m.env = {});
      try {
        m.nextTick(() => {
        });
      } catch {
        let e = Promise.resolve();
        m.nextTick = e.then.bind(e);
      }
    });
    ge = T((Rl, Kt) => {
      "use strict";
      p();
      var Le = typeof Reflect == "object" ? Reflect : null, si = Le && typeof Le.apply == "function" ? Le.apply : a(function(e, t, n) {
        return Function.prototype.apply.call(e, t, n);
      }, "ReflectApply"), pt;
      Le && typeof Le.ownKeys == "function" ? pt = Le.ownKeys : Object.getOwnPropertySymbols ? pt = a(function(e) {
        return Object.getOwnPropertyNames(e).concat(Object.getOwnPropertySymbols(e));
      }, "ReflectOwnKeys") : pt = a(function(e) {
        return Object.getOwnPropertyNames(e);
      }, "ReflectOwnKeys");
      function oa(r) {
        console && console.warn && console.warn(r);
      }
      __name(oa, "oa");
      a(
        oa,
        "ProcessEmitWarning"
      );
      var ai = Number.isNaN || a(function(e) {
        return e !== e;
      }, "NumberIsNaN");
      function B() {
        B.init.call(this);
      }
      __name(B, "B");
      a(B, "EventEmitter");
      Kt.exports = B;
      Kt.exports.once = la;
      B.EventEmitter = B;
      B.prototype._events = void 0;
      B.prototype._eventsCount = 0;
      B.prototype._maxListeners = void 0;
      var oi = 10;
      function dt(r) {
        if (typeof r != "function") throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof r);
      }
      __name(dt, "dt");
      a(dt, "checkListener");
      Object.defineProperty(B, "defaultMaxListeners", { enumerable: true, get: a(function() {
        return oi;
      }, "get"), set: a(
        function(r) {
          if (typeof r != "number" || r < 0 || ai(r)) throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + r + ".");
          oi = r;
        },
        "set"
      ) });
      B.init = function() {
        (this._events === void 0 || this._events === Object.getPrototypeOf(this)._events) && (this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0), this._maxListeners = this._maxListeners || void 0;
      };
      B.prototype.setMaxListeners = a(function(e) {
        if (typeof e != "number" || e < 0 || ai(e)) throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + e + ".");
        return this._maxListeners = e, this;
      }, "setMaxListeners");
      function ui(r) {
        return r._maxListeners === void 0 ? B.defaultMaxListeners : r._maxListeners;
      }
      __name(ui, "ui");
      a(ui, "_getMaxListeners");
      B.prototype.getMaxListeners = a(function() {
        return ui(this);
      }, "getMaxListeners");
      B.prototype.emit = a(function(e) {
        for (var t = [], n = 1; n < arguments.length; n++) t.push(arguments[n]);
        var i = e === "error", s = this._events;
        if (s !== void 0) i = i && s.error === void 0;
        else if (!i) return false;
        if (i) {
          var o;
          if (t.length > 0 && (o = t[0]), o instanceof Error) throw o;
          var u = new Error("Unhandled error." + (o ? " (" + o.message + ")" : ""));
          throw u.context = o, u;
        }
        var c = s[e];
        if (c === void 0) return false;
        if (typeof c == "function") si(c, this, t);
        else for (var l = c.length, f = pi(c, l), n = 0; n < l; ++n) si(f[n], this, t);
        return true;
      }, "emit");
      function ci(r, e, t, n) {
        var i, s, o;
        if (dt(
          t
        ), s = r._events, s === void 0 ? (s = r._events = /* @__PURE__ */ Object.create(null), r._eventsCount = 0) : (s.newListener !== void 0 && (r.emit("newListener", e, t.listener ? t.listener : t), s = r._events), o = s[e]), o === void 0) o = s[e] = t, ++r._eventsCount;
        else if (typeof o == "function" ? o = s[e] = n ? [t, o] : [o, t] : n ? o.unshift(t) : o.push(t), i = ui(r), i > 0 && o.length > i && !o.warned) {
          o.warned = true;
          var u = new Error("Possible EventEmitter memory leak detected. " + o.length + " " + String(e) + " listeners added. Use emitter.setMaxListeners() to increase limit");
          u.name = "MaxListenersExceededWarning", u.emitter = r, u.type = e, u.count = o.length, oa(u);
        }
        return r;
      }
      __name(ci, "ci");
      a(ci, "_addListener");
      B.prototype.addListener = a(function(e, t) {
        return ci(this, e, t, false);
      }, "addListener");
      B.prototype.on = B.prototype.addListener;
      B.prototype.prependListener = a(function(e, t) {
        return ci(this, e, t, true);
      }, "prependListener");
      function aa() {
        if (!this.fired) return this.target.removeListener(this.type, this.wrapFn), this.fired = true, arguments.length === 0 ? this.listener.call(this.target) : this.listener.apply(this.target, arguments);
      }
      __name(aa, "aa");
      a(aa, "onceWrapper");
      function li(r, e, t) {
        var n = {
          fired: false,
          wrapFn: void 0,
          target: r,
          type: e,
          listener: t
        }, i = aa.bind(n);
        return i.listener = t, n.wrapFn = i, i;
      }
      __name(li, "li");
      a(li, "_onceWrap");
      B.prototype.once = a(function(e, t) {
        return dt(t), this.on(e, li(this, e, t)), this;
      }, "once");
      B.prototype.prependOnceListener = a(function(e, t) {
        return dt(t), this.prependListener(e, li(this, e, t)), this;
      }, "prependOnceListener");
      B.prototype.removeListener = a(function(e, t) {
        var n, i, s, o, u;
        if (dt(t), i = this._events, i === void 0) return this;
        if (n = i[e], n === void 0) return this;
        if (n === t || n.listener === t) --this._eventsCount === 0 ? this._events = /* @__PURE__ */ Object.create(null) : (delete i[e], i.removeListener && this.emit("removeListener", e, n.listener || t));
        else if (typeof n != "function") {
          for (s = -1, o = n.length - 1; o >= 0; o--) if (n[o] === t || n[o].listener === t) {
            u = n[o].listener, s = o;
            break;
          }
          if (s < 0) return this;
          s === 0 ? n.shift() : ua(n, s), n.length === 1 && (i[e] = n[0]), i.removeListener !== void 0 && this.emit("removeListener", e, u || t);
        }
        return this;
      }, "removeListener");
      B.prototype.off = B.prototype.removeListener;
      B.prototype.removeAllListeners = a(function(e) {
        var t, n, i;
        if (n = this._events, n === void 0) return this;
        if (n.removeListener === void 0) return arguments.length === 0 ? (this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0) : n[e] !== void 0 && (--this._eventsCount === 0 ? this._events = /* @__PURE__ */ Object.create(null) : delete n[e]), this;
        if (arguments.length === 0) {
          var s = Object.keys(n), o;
          for (i = 0; i < s.length; ++i) o = s[i], o !== "removeListener" && this.removeAllListeners(
            o
          );
          return this.removeAllListeners("removeListener"), this._events = /* @__PURE__ */ Object.create(null), this._eventsCount = 0, this;
        }
        if (t = n[e], typeof t == "function") this.removeListener(e, t);
        else if (t !== void 0) for (i = t.length - 1; i >= 0; i--) this.removeListener(e, t[i]);
        return this;
      }, "removeAllListeners");
      function fi(r, e, t) {
        var n = r._events;
        if (n === void 0) return [];
        var i = n[e];
        return i === void 0 ? [] : typeof i == "function" ? t ? [i.listener || i] : [i] : t ? ca(i) : pi(i, i.length);
      }
      __name(fi, "fi");
      a(fi, "_listeners");
      B.prototype.listeners = a(function(e) {
        return fi(this, e, true);
      }, "listeners");
      B.prototype.rawListeners = a(function(e) {
        return fi(this, e, false);
      }, "rawListeners");
      B.listenerCount = function(r, e) {
        return typeof r.listenerCount == "function" ? r.listenerCount(e) : hi.call(r, e);
      };
      B.prototype.listenerCount = hi;
      function hi(r) {
        var e = this._events;
        if (e !== void 0) {
          var t = e[r];
          if (typeof t == "function")
            return 1;
          if (t !== void 0) return t.length;
        }
        return 0;
      }
      __name(hi, "hi");
      a(hi, "listenerCount");
      B.prototype.eventNames = a(function() {
        return this._eventsCount > 0 ? pt(this._events) : [];
      }, "eventNames");
      function pi(r, e) {
        for (var t = new Array(e), n = 0; n < e; ++n) t[n] = r[n];
        return t;
      }
      __name(pi, "pi");
      a(pi, "arrayClone");
      function ua(r, e) {
        for (; e + 1 < r.length; e++) r[e] = r[e + 1];
        r.pop();
      }
      __name(ua, "ua");
      a(ua, "spliceOne");
      function ca(r) {
        for (var e = new Array(r.length), t = 0; t < e.length; ++t) e[t] = r[t].listener || r[t];
        return e;
      }
      __name(ca, "ca");
      a(ca, "unwrapListeners");
      function la(r, e) {
        return new Promise(function(t, n) {
          function i(o) {
            r.removeListener(e, s), n(o);
          }
          __name(i, "i");
          a(i, "errorListener");
          function s() {
            typeof r.removeListener == "function" && r.removeListener("error", i), t([].slice.call(arguments));
          }
          __name(s, "s");
          a(s, "resolver"), di(r, e, s, { once: true }), e !== "error" && fa(r, i, { once: true });
        });
      }
      __name(la, "la");
      a(la, "once");
      function fa(r, e, t) {
        typeof r.on == "function" && di(r, "error", e, t);
      }
      __name(fa, "fa");
      a(
        fa,
        "addErrorHandlerIfEventEmitter"
      );
      function di(r, e, t, n) {
        if (typeof r.on == "function") n.once ? r.once(e, t) : r.on(e, t);
        else if (typeof r.addEventListener == "function") r.addEventListener(e, a(/* @__PURE__ */ __name(function i(s) {
          n.once && r.removeEventListener(e, i), t(s);
        }, "i"), "wrapListener"));
        else throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof r);
      }
      __name(di, "di");
      a(di, "eventTargetAgnosticAddListener");
    });
    wi = {};
    ie(wi, { Socket: /* @__PURE__ */ __name(() => ce, "Socket"), isIP: /* @__PURE__ */ __name(() => ha, "isIP") });
    __name(ha, "ha");
    Fe = G(() => {
      "use strict";
      p();
      mi = Se(ge(), 1);
      a(ha, "isIP");
      yi = /^[^.]+\./, S = class S2 extends mi.EventEmitter {
        static {
          __name(this, "S");
        }
        constructor() {
          super(...arguments);
          E(this, "opts", {});
          E(this, "connecting", false);
          E(this, "pending", true);
          E(
            this,
            "writable",
            true
          );
          E(this, "encrypted", false);
          E(this, "authorized", false);
          E(this, "destroyed", false);
          E(this, "ws", null);
          E(this, "writeBuffer");
          E(this, "tlsState", 0);
          E(this, "tlsRead");
          E(this, "tlsWrite");
        }
        static get poolQueryViaFetch() {
          return S2.opts.poolQueryViaFetch ?? S2.defaults.poolQueryViaFetch;
        }
        static set poolQueryViaFetch(t) {
          S2.opts.poolQueryViaFetch = t;
        }
        static get fetchEndpoint() {
          return S2.opts.fetchEndpoint ?? S2.defaults.fetchEndpoint;
        }
        static set fetchEndpoint(t) {
          S2.opts.fetchEndpoint = t;
        }
        static get fetchConnectionCache() {
          return true;
        }
        static set fetchConnectionCache(t) {
          console.warn("The `fetchConnectionCache` option is deprecated (now always `true`)");
        }
        static get fetchFunction() {
          return S2.opts.fetchFunction ?? S2.defaults.fetchFunction;
        }
        static set fetchFunction(t) {
          S2.opts.fetchFunction = t;
        }
        static get webSocketConstructor() {
          return S2.opts.webSocketConstructor ?? S2.defaults.webSocketConstructor;
        }
        static set webSocketConstructor(t) {
          S2.opts.webSocketConstructor = t;
        }
        get webSocketConstructor() {
          return this.opts.webSocketConstructor ?? S2.webSocketConstructor;
        }
        set webSocketConstructor(t) {
          this.opts.webSocketConstructor = t;
        }
        static get wsProxy() {
          return S2.opts.wsProxy ?? S2.defaults.wsProxy;
        }
        static set wsProxy(t) {
          S2.opts.wsProxy = t;
        }
        get wsProxy() {
          return this.opts.wsProxy ?? S2.wsProxy;
        }
        set wsProxy(t) {
          this.opts.wsProxy = t;
        }
        static get coalesceWrites() {
          return S2.opts.coalesceWrites ?? S2.defaults.coalesceWrites;
        }
        static set coalesceWrites(t) {
          S2.opts.coalesceWrites = t;
        }
        get coalesceWrites() {
          return this.opts.coalesceWrites ?? S2.coalesceWrites;
        }
        set coalesceWrites(t) {
          this.opts.coalesceWrites = t;
        }
        static get useSecureWebSocket() {
          return S2.opts.useSecureWebSocket ?? S2.defaults.useSecureWebSocket;
        }
        static set useSecureWebSocket(t) {
          S2.opts.useSecureWebSocket = t;
        }
        get useSecureWebSocket() {
          return this.opts.useSecureWebSocket ?? S2.useSecureWebSocket;
        }
        set useSecureWebSocket(t) {
          this.opts.useSecureWebSocket = t;
        }
        static get forceDisablePgSSL() {
          return S2.opts.forceDisablePgSSL ?? S2.defaults.forceDisablePgSSL;
        }
        static set forceDisablePgSSL(t) {
          S2.opts.forceDisablePgSSL = t;
        }
        get forceDisablePgSSL() {
          return this.opts.forceDisablePgSSL ?? S2.forceDisablePgSSL;
        }
        set forceDisablePgSSL(t) {
          this.opts.forceDisablePgSSL = t;
        }
        static get disableSNI() {
          return S2.opts.disableSNI ?? S2.defaults.disableSNI;
        }
        static set disableSNI(t) {
          S2.opts.disableSNI = t;
        }
        get disableSNI() {
          return this.opts.disableSNI ?? S2.disableSNI;
        }
        set disableSNI(t) {
          this.opts.disableSNI = t;
        }
        static get disableWarningInBrowsers() {
          return S2.opts.disableWarningInBrowsers ?? S2.defaults.disableWarningInBrowsers;
        }
        static set disableWarningInBrowsers(t) {
          S2.opts.disableWarningInBrowsers = t;
        }
        get disableWarningInBrowsers() {
          return this.opts.disableWarningInBrowsers ?? S2.disableWarningInBrowsers;
        }
        set disableWarningInBrowsers(t) {
          this.opts.disableWarningInBrowsers = t;
        }
        static get pipelineConnect() {
          return S2.opts.pipelineConnect ?? S2.defaults.pipelineConnect;
        }
        static set pipelineConnect(t) {
          S2.opts.pipelineConnect = t;
        }
        get pipelineConnect() {
          return this.opts.pipelineConnect ?? S2.pipelineConnect;
        }
        set pipelineConnect(t) {
          this.opts.pipelineConnect = t;
        }
        static get subtls() {
          return S2.opts.subtls ?? S2.defaults.subtls;
        }
        static set subtls(t) {
          S2.opts.subtls = t;
        }
        get subtls() {
          return this.opts.subtls ?? S2.subtls;
        }
        set subtls(t) {
          this.opts.subtls = t;
        }
        static get pipelineTLS() {
          return S2.opts.pipelineTLS ?? S2.defaults.pipelineTLS;
        }
        static set pipelineTLS(t) {
          S2.opts.pipelineTLS = t;
        }
        get pipelineTLS() {
          return this.opts.pipelineTLS ?? S2.pipelineTLS;
        }
        set pipelineTLS(t) {
          this.opts.pipelineTLS = t;
        }
        static get rootCerts() {
          return S2.opts.rootCerts ?? S2.defaults.rootCerts;
        }
        static set rootCerts(t) {
          S2.opts.rootCerts = t;
        }
        get rootCerts() {
          return this.opts.rootCerts ?? S2.rootCerts;
        }
        set rootCerts(t) {
          this.opts.rootCerts = t;
        }
        wsProxyAddrForHost(t, n) {
          let i = this.wsProxy;
          if (i === void 0) throw new Error("No WebSocket proxy is configured. Please see https://github.com/neondatabase/serverless/blob/main/CONFIG.md#wsproxy-string--host-string-port-number--string--string");
          return typeof i == "function" ? i(t, n) : `${i}?address=${t}:${n}`;
        }
        setNoDelay() {
          return this;
        }
        setKeepAlive() {
          return this;
        }
        ref() {
          return this;
        }
        unref() {
          return this;
        }
        connect(t, n, i) {
          this.connecting = true, i && this.once("connect", i);
          let s = a(() => {
            this.connecting = false, this.pending = false, this.emit("connect"), this.emit("ready");
          }, "handleWebSocketOpen"), o = a((c, l = false) => {
            c.binaryType = "arraybuffer", c.addEventListener("error", (f) => {
              this.emit("error", f), this.emit("close");
            }), c.addEventListener("message", (f) => {
              if (this.tlsState === 0) {
                let y = d.from(f.data);
                this.emit("data", y);
              }
            }), c.addEventListener("close", () => {
              this.emit("close");
            }), l ? s() : c.addEventListener(
              "open",
              s
            );
          }, "configureWebSocket"), u;
          try {
            u = this.wsProxyAddrForHost(n, typeof t == "string" ? parseInt(t, 10) : t);
          } catch (c) {
            this.emit("error", c), this.emit("close");
            return;
          }
          try {
            let l = (this.useSecureWebSocket ? "wss:" : "ws:") + "//" + u;
            if (this.webSocketConstructor !== void 0) this.ws = new this.webSocketConstructor(l), o(this.ws);
            else try {
              this.ws = new WebSocket(l), o(this.ws);
            } catch {
              this.ws = new __unstable_WebSocket(l), o(this.ws);
            }
          } catch (c) {
            let f = (this.useSecureWebSocket ? "https:" : "http:") + "//" + u;
            fetch(f, { headers: { Upgrade: "websocket" } }).then(
              (y) => {
                if (this.ws = y.webSocket, this.ws == null) throw c;
                this.ws.accept(), o(this.ws, true);
              }
            ).catch((y) => {
              this.emit(
                "error",
                new Error(`All attempts to open a WebSocket to connect to the database failed. Please refer to https://github.com/neondatabase/serverless/blob/main/CONFIG.md#websocketconstructor-typeof-websocket--undefined. Details: ${y}`)
              ), this.emit("close");
            });
          }
        }
        async startTls(t) {
          if (this.subtls === void 0) throw new Error(
            "For Postgres SSL connections, you must set `neonConfig.subtls` to the subtls library. See https://github.com/neondatabase/serverless/blob/main/CONFIG.md for more information."
          );
          this.tlsState = 1;
          let n = await this.subtls.TrustedCert.databaseFromPEM(this.rootCerts), i = new this.subtls.WebSocketReadQueue(this.ws), s = i.read.bind(i), o = this.rawWrite.bind(this), { read: u, write: c } = await this.subtls.startTls(t, n, s, o, { useSNI: !this.disableSNI, expectPreData: this.pipelineTLS ? new Uint8Array([83]) : void 0 });
          this.tlsRead = u, this.tlsWrite = c, this.tlsState = 2, this.encrypted = true, this.authorized = true, this.emit("secureConnection", this), this.tlsReadLoop();
        }
        async tlsReadLoop() {
          for (; ; ) {
            let t = await this.tlsRead();
            if (t === void 0) break;
            {
              let n = d.from(t);
              this.emit("data", n);
            }
          }
        }
        rawWrite(t) {
          if (!this.coalesceWrites) {
            this.ws && this.ws.send(t);
            return;
          }
          if (this.writeBuffer === void 0) this.writeBuffer = t, setTimeout(() => {
            this.ws && this.ws.send(this.writeBuffer), this.writeBuffer = void 0;
          }, 0);
          else {
            let n = new Uint8Array(
              this.writeBuffer.length + t.length
            );
            n.set(this.writeBuffer), n.set(t, this.writeBuffer.length), this.writeBuffer = n;
          }
        }
        write(t, n = "utf8", i = (s) => {
        }) {
          return t.length === 0 ? (i(), true) : (typeof t == "string" && (t = d.from(t, n)), this.tlsState === 0 ? (this.rawWrite(t), i()) : this.tlsState === 1 ? this.once("secureConnection", () => {
            this.write(
              t,
              n,
              i
            );
          }) : (this.tlsWrite(t), i()), true);
        }
        end(t = d.alloc(0), n = "utf8", i = () => {
        }) {
          return this.write(t, n, () => {
            this.ws.close(), i();
          }), this;
        }
        destroy() {
          return this.destroyed = true, this.end();
        }
      };
      a(S, "Socket"), E(S, "defaults", {
        poolQueryViaFetch: false,
        fetchEndpoint: a((t, n, i) => {
          let s;
          return i?.jwtAuth ? s = t.replace(yi, "apiauth.") : s = t.replace(yi, "api."), "https://" + s + "/sql";
        }, "fetchEndpoint"),
        fetchConnectionCache: true,
        fetchFunction: void 0,
        webSocketConstructor: void 0,
        wsProxy: a((t) => t + "/v2", "wsProxy"),
        useSecureWebSocket: true,
        forceDisablePgSSL: true,
        coalesceWrites: true,
        pipelineConnect: "password",
        subtls: void 0,
        rootCerts: "",
        pipelineTLS: false,
        disableSNI: false,
        disableWarningInBrowsers: false
      }), E(S, "opts", {});
      ce = S;
    });
    gi = {};
    ie(gi, { parse: /* @__PURE__ */ __name(() => Yt, "parse") });
    __name(Yt, "Yt");
    Zt = G(() => {
      "use strict";
      p();
      a(Yt, "parse");
    });
    tr = T((Ai) => {
      "use strict";
      p();
      Ai.parse = function(r, e) {
        return new er(r, e).parse();
      };
      var vt = class vt2 {
        static {
          __name(this, "vt");
        }
        constructor(e, t) {
          this.source = e, this.transform = t || Ca, this.position = 0, this.entries = [], this.recorded = [], this.dimension = 0;
        }
        isEof() {
          return this.position >= this.source.length;
        }
        nextCharacter() {
          var e = this.source[this.position++];
          return e === "\\" ? { value: this.source[this.position++], escaped: true } : { value: e, escaped: false };
        }
        record(e) {
          this.recorded.push(
            e
          );
        }
        newEntry(e) {
          var t;
          (this.recorded.length > 0 || e) && (t = this.recorded.join(""), t === "NULL" && !e && (t = null), t !== null && (t = this.transform(t)), this.entries.push(t), this.recorded = []);
        }
        consumeDimensions() {
          if (this.source[0] === "[") for (; !this.isEof(); ) {
            var e = this.nextCharacter();
            if (e.value === "=") break;
          }
        }
        parse(e) {
          var t, n, i;
          for (this.consumeDimensions(); !this.isEof(); ) if (t = this.nextCharacter(), t.value === "{" && !i) this.dimension++, this.dimension > 1 && (n = new vt2(this.source.substr(this.position - 1), this.transform), this.entries.push(n.parse(
            true
          )), this.position += n.position - 2);
          else if (t.value === "}" && !i) {
            if (this.dimension--, !this.dimension && (this.newEntry(), e)) return this.entries;
          } else t.value === '"' && !t.escaped ? (i && this.newEntry(true), i = !i) : t.value === "," && !i ? this.newEntry() : this.record(t.value);
          if (this.dimension !== 0) throw new Error("array dimension not balanced");
          return this.entries;
        }
      };
      a(vt, "ArrayParser");
      var er = vt;
      function Ca(r) {
        return r;
      }
      __name(Ca, "Ca");
      a(Ca, "identity");
    });
    rr = T((Zl, Ci) => {
      p();
      var _a = tr();
      Ci.exports = { create: a(function(r, e) {
        return { parse: a(function() {
          return _a.parse(r, e);
        }, "parse") };
      }, "create") };
    });
    Ti = T((ef, Ii) => {
      "use strict";
      p();
      var Ia = /(\d{1,})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.\d{1,})?.*?( BC)?$/, Ta = /^(\d{1,})-(\d{2})-(\d{2})( BC)?$/, Pa = /([Z+-])(\d{2})?:?(\d{2})?:?(\d{2})?/, Ba = /^-?infinity$/;
      Ii.exports = a(function(e) {
        if (Ba.test(e)) return Number(e.replace("i", "I"));
        var t = Ia.exec(e);
        if (!t) return Ra(
          e
        ) || null;
        var n = !!t[8], i = parseInt(t[1], 10);
        n && (i = _i(i));
        var s = parseInt(t[2], 10) - 1, o = t[3], u = parseInt(
          t[4],
          10
        ), c = parseInt(t[5], 10), l = parseInt(t[6], 10), f = t[7];
        f = f ? 1e3 * parseFloat(f) : 0;
        var y, g = La(e);
        return g != null ? (y = new Date(Date.UTC(i, s, o, u, c, l, f)), nr(i) && y.setUTCFullYear(i), g !== 0 && y.setTime(y.getTime() - g)) : (y = new Date(i, s, o, u, c, l, f), nr(i) && y.setFullYear(i)), y;
      }, "parseDate");
      function Ra(r) {
        var e = Ta.exec(r);
        if (e) {
          var t = parseInt(e[1], 10), n = !!e[4];
          n && (t = _i(t));
          var i = parseInt(e[2], 10) - 1, s = e[3], o = new Date(t, i, s);
          return nr(
            t
          ) && o.setFullYear(t), o;
        }
      }
      __name(Ra, "Ra");
      a(Ra, "getDate");
      function La(r) {
        if (r.endsWith("+00")) return 0;
        var e = Pa.exec(r.split(" ")[1]);
        if (e) {
          var t = e[1];
          if (t === "Z") return 0;
          var n = t === "-" ? -1 : 1, i = parseInt(e[2], 10) * 3600 + parseInt(
            e[3] || 0,
            10
          ) * 60 + parseInt(e[4] || 0, 10);
          return i * n * 1e3;
        }
      }
      __name(La, "La");
      a(La, "timeZoneOffset");
      function _i(r) {
        return -(r - 1);
      }
      __name(_i, "_i");
      a(_i, "bcYearToNegativeYear");
      function nr(r) {
        return r >= 0 && r < 100;
      }
      __name(nr, "nr");
      a(nr, "is0To99");
    });
    Bi = T((nf, Pi) => {
      p();
      Pi.exports = ka;
      var Fa = Object.prototype.hasOwnProperty;
      function ka(r) {
        for (var e = 1; e < arguments.length; e++) {
          var t = arguments[e];
          for (var n in t) Fa.call(t, n) && (r[n] = t[n]);
        }
        return r;
      }
      __name(ka, "ka");
      a(ka, "extend");
    });
    Fi = T((af, Li) => {
      "use strict";
      p();
      var Ma = Bi();
      Li.exports = ke;
      function ke(r) {
        if (!(this instanceof ke))
          return new ke(r);
        Ma(this, Va(r));
      }
      __name(ke, "ke");
      a(ke, "PostgresInterval");
      var Ua = [
        "seconds",
        "minutes",
        "hours",
        "days",
        "months",
        "years"
      ];
      ke.prototype.toPostgres = function() {
        var r = Ua.filter(this.hasOwnProperty, this);
        return this.milliseconds && r.indexOf("seconds") < 0 && r.push("seconds"), r.length === 0 ? "0" : r.map(function(e) {
          var t = this[e] || 0;
          return e === "seconds" && this.milliseconds && (t = (t + this.milliseconds / 1e3).toFixed(6).replace(
            /\.?0+$/,
            ""
          )), t + " " + e;
        }, this).join(" ");
      };
      var Da = { years: "Y", months: "M", days: "D", hours: "H", minutes: "M", seconds: "S" }, Oa = ["years", "months", "days"], qa = ["hours", "minutes", "seconds"];
      ke.prototype.toISOString = ke.prototype.toISO = function() {
        var r = Oa.map(t, this).join(""), e = qa.map(t, this).join("");
        return "P" + r + "T" + e;
        function t(n) {
          var i = this[n] || 0;
          return n === "seconds" && this.milliseconds && (i = (i + this.milliseconds / 1e3).toFixed(6).replace(
            /0+$/,
            ""
          )), i + Da[n];
        }
        __name(t, "t");
      };
      var ir = "([+-]?\\d+)", Qa = ir + "\\s+years?", Na = ir + "\\s+mons?", Wa = ir + "\\s+days?", ja = "([+-])?([\\d]*):(\\d\\d):(\\d\\d)\\.?(\\d{1,6})?", Ha = new RegExp([Qa, Na, Wa, ja].map(function(r) {
        return "(" + r + ")?";
      }).join("\\s*")), Ri = { years: 2, months: 4, days: 6, hours: 9, minutes: 10, seconds: 11, milliseconds: 12 }, $a = ["hours", "minutes", "seconds", "milliseconds"];
      function Ga(r) {
        var e = r + "000000".slice(r.length);
        return parseInt(
          e,
          10
        ) / 1e3;
      }
      __name(Ga, "Ga");
      a(Ga, "parseMilliseconds");
      function Va(r) {
        if (!r) return {};
        var e = Ha.exec(r), t = e[8] === "-";
        return Object.keys(Ri).reduce(function(n, i) {
          var s = Ri[i], o = e[s];
          return !o || (o = i === "milliseconds" ? Ga(o) : parseInt(o, 10), !o) || (t && ~$a.indexOf(i) && (o *= -1), n[i] = o), n;
        }, {});
      }
      __name(Va, "Va");
      a(Va, "parse");
    });
    Mi = T((lf, ki) => {
      "use strict";
      p();
      ki.exports = a(function(e) {
        if (/^\\x/.test(e)) return new d(e.substr(
          2
        ), "hex");
        for (var t = "", n = 0; n < e.length; ) if (e[n] !== "\\") t += e[n], ++n;
        else if (/[0-7]{3}/.test(e.substr(n + 1, 3))) t += String.fromCharCode(parseInt(e.substr(n + 1, 3), 8)), n += 4;
        else {
          for (var i = 1; n + i < e.length && e[n + i] === "\\"; ) i++;
          for (var s = 0; s < Math.floor(i / 2); ++s) t += "\\";
          n += Math.floor(i / 2) * 2;
        }
        return new d(t, "binary");
      }, "parseBytea");
    });
    Wi = T((pf, Ni) => {
      p();
      var Ve = tr(), ze = rr(), xt = Ti(), Di = Fi(), Oi = Mi();
      function St(r) {
        return a(function(t) {
          return t === null ? t : r(t);
        }, "nullAllowed");
      }
      __name(St, "St");
      a(St, "allowNull");
      function qi(r) {
        return r === null ? r : r === "TRUE" || r === "t" || r === "true" || r === "y" || r === "yes" || r === "on" || r === "1";
      }
      __name(qi, "qi");
      a(qi, "parseBool");
      function za(r) {
        return r ? Ve.parse(r, qi) : null;
      }
      __name(za, "za");
      a(za, "parseBoolArray");
      function Ka(r) {
        return parseInt(r, 10);
      }
      __name(Ka, "Ka");
      a(Ka, "parseBaseTenInt");
      function sr(r) {
        return r ? Ve.parse(r, St(Ka)) : null;
      }
      __name(sr, "sr");
      a(sr, "parseIntegerArray");
      function Ya(r) {
        return r ? Ve.parse(r, St(function(e) {
          return Qi(e).trim();
        })) : null;
      }
      __name(Ya, "Ya");
      a(Ya, "parseBigIntegerArray");
      var Za = a(function(r) {
        if (!r) return null;
        var e = ze.create(r, function(t) {
          return t !== null && (t = cr(t)), t;
        });
        return e.parse();
      }, "parsePointArray"), or2 = a(function(r) {
        if (!r) return null;
        var e = ze.create(r, function(t) {
          return t !== null && (t = parseFloat(t)), t;
        });
        return e.parse();
      }, "parseFloatArray"), re = a(function(r) {
        if (!r) return null;
        var e = ze.create(r);
        return e.parse();
      }, "parseStringArray"), ar = a(function(r) {
        if (!r) return null;
        var e = ze.create(
          r,
          function(t) {
            return t !== null && (t = xt(t)), t;
          }
        );
        return e.parse();
      }, "parseDateArray"), Ja = a(function(r) {
        if (!r)
          return null;
        var e = ze.create(r, function(t) {
          return t !== null && (t = Di(t)), t;
        });
        return e.parse();
      }, "parseIntervalArray"), Xa = a(function(r) {
        return r ? Ve.parse(r, St(Oi)) : null;
      }, "parseByteAArray"), ur = a(function(r) {
        return parseInt(r, 10);
      }, "parseInteger"), Qi = a(function(r) {
        var e = String(r);
        return /^\d+$/.test(e) ? e : r;
      }, "parseBigInteger"), Ui = a(function(r) {
        return r ? Ve.parse(r, St(JSON.parse)) : null;
      }, "parseJsonArray"), cr = a(
        function(r) {
          return r[0] !== "(" ? null : (r = r.substring(1, r.length - 1).split(","), { x: parseFloat(r[0]), y: parseFloat(
            r[1]
          ) });
        },
        "parsePoint"
      ), eu = a(function(r) {
        if (r[0] !== "<" && r[1] !== "(") return null;
        for (var e = "(", t = "", n = false, i = 2; i < r.length - 1; i++) {
          if (n || (e += r[i]), r[i] === ")") {
            n = true;
            continue;
          } else if (!n) continue;
          r[i] !== "," && (t += r[i]);
        }
        var s = cr(e);
        return s.radius = parseFloat(t), s;
      }, "parseCircle"), tu = a(function(r) {
        r(20, Qi), r(21, ur), r(23, ur), r(26, ur), r(700, parseFloat), r(701, parseFloat), r(16, qi), r(1082, xt), r(1114, xt), r(1184, xt), r(
          600,
          cr
        ), r(651, re), r(718, eu), r(1e3, za), r(1001, Xa), r(1005, sr), r(1007, sr), r(1028, sr), r(1016, Ya), r(1017, Za), r(1021, or2), r(1022, or2), r(1231, or2), r(1014, re), r(1015, re), r(1008, re), r(1009, re), r(1040, re), r(1041, re), r(
          1115,
          ar
        ), r(1182, ar), r(1185, ar), r(1186, Di), r(1187, Ja), r(17, Oi), r(114, JSON.parse.bind(JSON)), r(3802, JSON.parse.bind(JSON)), r(199, Ui), r(3807, Ui), r(3907, re), r(2951, re), r(791, re), r(1183, re), r(1270, re);
      }, "init");
      Ni.exports = { init: tu };
    });
    Hi = T((mf, ji) => {
      "use strict";
      p();
      var z = 1e6;
      function ru(r) {
        var e = r.readInt32BE(0), t = r.readUInt32BE(
          4
        ), n = "";
        e < 0 && (e = ~e + (t === 0), t = ~t + 1 >>> 0, n = "-");
        var i = "", s, o, u, c, l, f;
        {
          if (s = e % z, e = e / z >>> 0, o = 4294967296 * s + t, t = o / z >>> 0, u = "" + (o - z * t), t === 0 && e === 0) return n + u + i;
          for (c = "", l = 6 - u.length, f = 0; f < l; f++) c += "0";
          i = c + u + i;
        }
        {
          if (s = e % z, e = e / z >>> 0, o = 4294967296 * s + t, t = o / z >>> 0, u = "" + (o - z * t), t === 0 && e === 0) return n + u + i;
          for (c = "", l = 6 - u.length, f = 0; f < l; f++) c += "0";
          i = c + u + i;
        }
        {
          if (s = e % z, e = e / z >>> 0, o = 4294967296 * s + t, t = o / z >>> 0, u = "" + (o - z * t), t === 0 && e === 0) return n + u + i;
          for (c = "", l = 6 - u.length, f = 0; f < l; f++) c += "0";
          i = c + u + i;
        }
        return s = e % z, o = 4294967296 * s + t, u = "" + o % z, n + u + i;
      }
      __name(ru, "ru");
      a(ru, "readInt8");
      ji.exports = ru;
    });
    Ki = T((bf, zi) => {
      p();
      var nu = Hi(), L = a(function(r, e, t, n, i) {
        t = t || 0, n = n || false, i = i || function(A, C, D) {
          return A * Math.pow(2, D) + C;
        };
        var s = t >> 3, o = a(function(A) {
          return n ? ~A & 255 : A;
        }, "inv"), u = 255, c = 8 - t % 8;
        e < c && (u = 255 << 8 - e & 255, c = e), t && (u = u >> t % 8);
        var l = 0;
        t % 8 + e >= 8 && (l = i(0, o(r[s]) & u, c));
        for (var f = e + t >> 3, y = s + 1; y < f; y++) l = i(l, o(
          r[y]
        ), 8);
        var g = (e + t) % 8;
        return g > 0 && (l = i(l, o(r[f]) >> 8 - g, g)), l;
      }, "parseBits"), Vi = a(function(r, e, t) {
        var n = Math.pow(2, t - 1) - 1, i = L(r, 1), s = L(r, t, 1);
        if (s === 0) return 0;
        var o = 1, u = a(function(l, f, y) {
          l === 0 && (l = 1);
          for (var g = 1; g <= y; g++) o /= 2, (f & 1 << y - g) > 0 && (l += o);
          return l;
        }, "parsePrecisionBits"), c = L(r, e, t + 1, false, u);
        return s == Math.pow(
          2,
          t + 1
        ) - 1 ? c === 0 ? i === 0 ? 1 / 0 : -1 / 0 : NaN : (i === 0 ? 1 : -1) * Math.pow(2, s - n) * c;
      }, "parseFloatFromBits"), iu = a(function(r) {
        return L(r, 1) == 1 ? -1 * (L(r, 15, 1, true) + 1) : L(r, 15, 1);
      }, "parseInt16"), $i = a(function(r) {
        return L(r, 1) == 1 ? -1 * (L(
          r,
          31,
          1,
          true
        ) + 1) : L(r, 31, 1);
      }, "parseInt32"), su = a(function(r) {
        return Vi(r, 23, 8);
      }, "parseFloat32"), ou = a(function(r) {
        return Vi(r, 52, 11);
      }, "parseFloat64"), au = a(function(r) {
        var e = L(r, 16, 32);
        if (e == 49152) return NaN;
        for (var t = Math.pow(1e4, L(r, 16, 16)), n = 0, i = [], s = L(r, 16), o = 0; o < s; o++) n += L(r, 16, 64 + 16 * o) * t, t /= 1e4;
        var u = Math.pow(10, L(
          r,
          16,
          48
        ));
        return (e === 0 ? 1 : -1) * Math.round(n * u) / u;
      }, "parseNumeric"), Gi = a(function(r, e) {
        var t = L(e, 1), n = L(
          e,
          63,
          1
        ), i = new Date((t === 0 ? 1 : -1) * n / 1e3 + 9466848e5);
        return r || i.setTime(i.getTime() + i.getTimezoneOffset() * 6e4), i.usec = n % 1e3, i.getMicroSeconds = function() {
          return this.usec;
        }, i.setMicroSeconds = function(s) {
          this.usec = s;
        }, i.getUTCMicroSeconds = function() {
          return this.usec;
        }, i;
      }, "parseDate"), Ke = a(
        function(r) {
          for (var e = L(
            r,
            32
          ), t = L(r, 32, 32), n = L(r, 32, 64), i = 96, s = [], o = 0; o < e; o++) s[o] = L(r, 32, i), i += 32, i += 32;
          var u = a(function(l) {
            var f = L(r, 32, i);
            if (i += 32, f == 4294967295) return null;
            var y;
            if (l == 23 || l == 20) return y = L(r, f * 8, i), i += f * 8, y;
            if (l == 25) return y = r.toString(this.encoding, i >> 3, (i += f << 3) >> 3), y;
            console.log("ERROR: ElementType not implemented: " + l);
          }, "parseElement"), c = a(function(l, f) {
            var y = [], g;
            if (l.length > 1) {
              var A = l.shift();
              for (g = 0; g < A; g++) y[g] = c(l, f);
              l.unshift(A);
            } else for (g = 0; g < l[0]; g++) y[g] = u(f);
            return y;
          }, "parse");
          return c(s, n);
        },
        "parseArray"
      ), uu = a(function(r) {
        return r.toString("utf8");
      }, "parseText"), cu = a(function(r) {
        return r === null ? null : L(r, 8) > 0;
      }, "parseBool"), lu = a(function(r) {
        r(20, nu), r(21, iu), r(23, $i), r(26, $i), r(1700, au), r(700, su), r(701, ou), r(16, cu), r(1114, Gi.bind(null, false)), r(1184, Gi.bind(null, true)), r(1e3, Ke), r(1007, Ke), r(1016, Ke), r(1008, Ke), r(1009, Ke), r(25, uu);
      }, "init");
      zi.exports = { init: lu };
    });
    Zi = T((Sf, Yi) => {
      p();
      Yi.exports = {
        BOOL: 16,
        BYTEA: 17,
        CHAR: 18,
        INT8: 20,
        INT2: 21,
        INT4: 23,
        REGPROC: 24,
        TEXT: 25,
        OID: 26,
        TID: 27,
        XID: 28,
        CID: 29,
        JSON: 114,
        XML: 142,
        PG_NODE_TREE: 194,
        SMGR: 210,
        PATH: 602,
        POLYGON: 604,
        CIDR: 650,
        FLOAT4: 700,
        FLOAT8: 701,
        ABSTIME: 702,
        RELTIME: 703,
        TINTERVAL: 704,
        CIRCLE: 718,
        MACADDR8: 774,
        MONEY: 790,
        MACADDR: 829,
        INET: 869,
        ACLITEM: 1033,
        BPCHAR: 1042,
        VARCHAR: 1043,
        DATE: 1082,
        TIME: 1083,
        TIMESTAMP: 1114,
        TIMESTAMPTZ: 1184,
        INTERVAL: 1186,
        TIMETZ: 1266,
        BIT: 1560,
        VARBIT: 1562,
        NUMERIC: 1700,
        REFCURSOR: 1790,
        REGPROCEDURE: 2202,
        REGOPER: 2203,
        REGOPERATOR: 2204,
        REGCLASS: 2205,
        REGTYPE: 2206,
        UUID: 2950,
        TXID_SNAPSHOT: 2970,
        PG_LSN: 3220,
        PG_NDISTINCT: 3361,
        PG_DEPENDENCIES: 3402,
        TSVECTOR: 3614,
        TSQUERY: 3615,
        GTSVECTOR: 3642,
        REGCONFIG: 3734,
        REGDICTIONARY: 3769,
        JSONB: 3802,
        REGNAMESPACE: 4089,
        REGROLE: 4096
      };
    });
    Je = T((Ze) => {
      p();
      var fu = Wi(), hu = Ki(), pu = rr(), du = Zi();
      Ze.getTypeParser = yu;
      Ze.setTypeParser = mu;
      Ze.arrayParser = pu;
      Ze.builtins = du;
      var Ye = { text: {}, binary: {} };
      function Ji(r) {
        return String(r);
      }
      __name(Ji, "Ji");
      a(Ji, "noParse");
      function yu(r, e) {
        return e = e || "text", Ye[e] && Ye[e][r] || Ji;
      }
      __name(yu, "yu");
      a(yu, "getTypeParser");
      function mu(r, e, t) {
        typeof e == "function" && (t = e, e = "text"), Ye[e][r] = t;
      }
      __name(mu, "mu");
      a(mu, "setTypeParser");
      fu.init(function(r, e) {
        Ye.text[r] = e;
      });
      hu.init(function(r, e) {
        Ye.binary[r] = e;
      });
    });
    At = T((If, Xi) => {
      "use strict";
      p();
      var wu = Je();
      function Et(r) {
        this._types = r || wu, this.text = {}, this.binary = {};
      }
      __name(Et, "Et");
      a(Et, "TypeOverrides");
      Et.prototype.getOverrides = function(r) {
        switch (r) {
          case "text":
            return this.text;
          case "binary":
            return this.binary;
          default:
            return {};
        }
      };
      Et.prototype.setTypeParser = function(r, e, t) {
        typeof e == "function" && (t = e, e = "text"), this.getOverrides(e)[r] = t;
      };
      Et.prototype.getTypeParser = function(r, e) {
        return e = e || "text", this.getOverrides(e)[r] || this._types.getTypeParser(r, e);
      };
      Xi.exports = Et;
    });
    __name(Xe, "Xe");
    es = G(() => {
      "use strict";
      p();
      a(Xe, "sha256");
    });
    ts = G(() => {
      "use strict";
      p();
      U = class U2 {
        static {
          __name(this, "U");
        }
        constructor() {
          E(this, "_dataLength", 0);
          E(this, "_bufferLength", 0);
          E(this, "_state", new Int32Array(4));
          E(this, "_buffer", new ArrayBuffer(68));
          E(this, "_buffer8");
          E(this, "_buffer32");
          this._buffer8 = new Uint8Array(this._buffer, 0, 68), this._buffer32 = new Uint32Array(this._buffer, 0, 17), this.start();
        }
        static hashByteArray(e, t = false) {
          return this.onePassHasher.start().appendByteArray(
            e
          ).end(t);
        }
        static hashStr(e, t = false) {
          return this.onePassHasher.start().appendStr(e).end(t);
        }
        static hashAsciiStr(e, t = false) {
          return this.onePassHasher.start().appendAsciiStr(e).end(t);
        }
        static _hex(e) {
          let t = U2.hexChars, n = U2.hexOut, i, s, o, u;
          for (u = 0; u < 4; u += 1) for (s = u * 8, i = e[u], o = 0; o < 8; o += 2) n[s + 1 + o] = t.charAt(i & 15), i >>>= 4, n[s + 0 + o] = t.charAt(
            i & 15
          ), i >>>= 4;
          return n.join("");
        }
        static _md5cycle(e, t) {
          let n = e[0], i = e[1], s = e[2], o = e[3];
          n += (i & s | ~i & o) + t[0] - 680876936 | 0, n = (n << 7 | n >>> 25) + i | 0, o += (n & i | ~n & s) + t[1] - 389564586 | 0, o = (o << 12 | o >>> 20) + n | 0, s += (o & n | ~o & i) + t[2] + 606105819 | 0, s = (s << 17 | s >>> 15) + o | 0, i += (s & o | ~s & n) + t[3] - 1044525330 | 0, i = (i << 22 | i >>> 10) + s | 0, n += (i & s | ~i & o) + t[4] - 176418897 | 0, n = (n << 7 | n >>> 25) + i | 0, o += (n & i | ~n & s) + t[5] + 1200080426 | 0, o = (o << 12 | o >>> 20) + n | 0, s += (o & n | ~o & i) + t[6] - 1473231341 | 0, s = (s << 17 | s >>> 15) + o | 0, i += (s & o | ~s & n) + t[7] - 45705983 | 0, i = (i << 22 | i >>> 10) + s | 0, n += (i & s | ~i & o) + t[8] + 1770035416 | 0, n = (n << 7 | n >>> 25) + i | 0, o += (n & i | ~n & s) + t[9] - 1958414417 | 0, o = (o << 12 | o >>> 20) + n | 0, s += (o & n | ~o & i) + t[10] - 42063 | 0, s = (s << 17 | s >>> 15) + o | 0, i += (s & o | ~s & n) + t[11] - 1990404162 | 0, i = (i << 22 | i >>> 10) + s | 0, n += (i & s | ~i & o) + t[12] + 1804603682 | 0, n = (n << 7 | n >>> 25) + i | 0, o += (n & i | ~n & s) + t[13] - 40341101 | 0, o = (o << 12 | o >>> 20) + n | 0, s += (o & n | ~o & i) + t[14] - 1502002290 | 0, s = (s << 17 | s >>> 15) + o | 0, i += (s & o | ~s & n) + t[15] + 1236535329 | 0, i = (i << 22 | i >>> 10) + s | 0, n += (i & o | s & ~o) + t[1] - 165796510 | 0, n = (n << 5 | n >>> 27) + i | 0, o += (n & s | i & ~s) + t[6] - 1069501632 | 0, o = (o << 9 | o >>> 23) + n | 0, s += (o & i | n & ~i) + t[11] + 643717713 | 0, s = (s << 14 | s >>> 18) + o | 0, i += (s & n | o & ~n) + t[0] - 373897302 | 0, i = (i << 20 | i >>> 12) + s | 0, n += (i & o | s & ~o) + t[5] - 701558691 | 0, n = (n << 5 | n >>> 27) + i | 0, o += (n & s | i & ~s) + t[10] + 38016083 | 0, o = (o << 9 | o >>> 23) + n | 0, s += (o & i | n & ~i) + t[15] - 660478335 | 0, s = (s << 14 | s >>> 18) + o | 0, i += (s & n | o & ~n) + t[4] - 405537848 | 0, i = (i << 20 | i >>> 12) + s | 0, n += (i & o | s & ~o) + t[9] + 568446438 | 0, n = (n << 5 | n >>> 27) + i | 0, o += (n & s | i & ~s) + t[14] - 1019803690 | 0, o = (o << 9 | o >>> 23) + n | 0, s += (o & i | n & ~i) + t[3] - 187363961 | 0, s = (s << 14 | s >>> 18) + o | 0, i += (s & n | o & ~n) + t[8] + 1163531501 | 0, i = (i << 20 | i >>> 12) + s | 0, n += (i & o | s & ~o) + t[13] - 1444681467 | 0, n = (n << 5 | n >>> 27) + i | 0, o += (n & s | i & ~s) + t[2] - 51403784 | 0, o = (o << 9 | o >>> 23) + n | 0, s += (o & i | n & ~i) + t[7] + 1735328473 | 0, s = (s << 14 | s >>> 18) + o | 0, i += (s & n | o & ~n) + t[12] - 1926607734 | 0, i = (i << 20 | i >>> 12) + s | 0, n += (i ^ s ^ o) + t[5] - 378558 | 0, n = (n << 4 | n >>> 28) + i | 0, o += (n ^ i ^ s) + t[8] - 2022574463 | 0, o = (o << 11 | o >>> 21) + n | 0, s += (o ^ n ^ i) + t[11] + 1839030562 | 0, s = (s << 16 | s >>> 16) + o | 0, i += (s ^ o ^ n) + t[14] - 35309556 | 0, i = (i << 23 | i >>> 9) + s | 0, n += (i ^ s ^ o) + t[1] - 1530992060 | 0, n = (n << 4 | n >>> 28) + i | 0, o += (n ^ i ^ s) + t[4] + 1272893353 | 0, o = (o << 11 | o >>> 21) + n | 0, s += (o ^ n ^ i) + t[7] - 155497632 | 0, s = (s << 16 | s >>> 16) + o | 0, i += (s ^ o ^ n) + t[10] - 1094730640 | 0, i = (i << 23 | i >>> 9) + s | 0, n += (i ^ s ^ o) + t[13] + 681279174 | 0, n = (n << 4 | n >>> 28) + i | 0, o += (n ^ i ^ s) + t[0] - 358537222 | 0, o = (o << 11 | o >>> 21) + n | 0, s += (o ^ n ^ i) + t[3] - 722521979 | 0, s = (s << 16 | s >>> 16) + o | 0, i += (s ^ o ^ n) + t[6] + 76029189 | 0, i = (i << 23 | i >>> 9) + s | 0, n += (i ^ s ^ o) + t[9] - 640364487 | 0, n = (n << 4 | n >>> 28) + i | 0, o += (n ^ i ^ s) + t[12] - 421815835 | 0, o = (o << 11 | o >>> 21) + n | 0, s += (o ^ n ^ i) + t[15] + 530742520 | 0, s = (s << 16 | s >>> 16) + o | 0, i += (s ^ o ^ n) + t[2] - 995338651 | 0, i = (i << 23 | i >>> 9) + s | 0, n += (s ^ (i | ~o)) + t[0] - 198630844 | 0, n = (n << 6 | n >>> 26) + i | 0, o += (i ^ (n | ~s)) + t[7] + 1126891415 | 0, o = (o << 10 | o >>> 22) + n | 0, s += (n ^ (o | ~i)) + t[14] - 1416354905 | 0, s = (s << 15 | s >>> 17) + o | 0, i += (o ^ (s | ~n)) + t[5] - 57434055 | 0, i = (i << 21 | i >>> 11) + s | 0, n += (s ^ (i | ~o)) + t[12] + 1700485571 | 0, n = (n << 6 | n >>> 26) + i | 0, o += (i ^ (n | ~s)) + t[3] - 1894986606 | 0, o = (o << 10 | o >>> 22) + n | 0, s += (n ^ (o | ~i)) + t[10] - 1051523 | 0, s = (s << 15 | s >>> 17) + o | 0, i += (o ^ (s | ~n)) + t[1] - 2054922799 | 0, i = (i << 21 | i >>> 11) + s | 0, n += (s ^ (i | ~o)) + t[8] + 1873313359 | 0, n = (n << 6 | n >>> 26) + i | 0, o += (i ^ (n | ~s)) + t[15] - 30611744 | 0, o = (o << 10 | o >>> 22) + n | 0, s += (n ^ (o | ~i)) + t[6] - 1560198380 | 0, s = (s << 15 | s >>> 17) + o | 0, i += (o ^ (s | ~n)) + t[13] + 1309151649 | 0, i = (i << 21 | i >>> 11) + s | 0, n += (s ^ (i | ~o)) + t[4] - 145523070 | 0, n = (n << 6 | n >>> 26) + i | 0, o += (i ^ (n | ~s)) + t[11] - 1120210379 | 0, o = (o << 10 | o >>> 22) + n | 0, s += (n ^ (o | ~i)) + t[2] + 718787259 | 0, s = (s << 15 | s >>> 17) + o | 0, i += (o ^ (s | ~n)) + t[9] - 343485551 | 0, i = (i << 21 | i >>> 11) + s | 0, e[0] = n + e[0] | 0, e[1] = i + e[1] | 0, e[2] = s + e[2] | 0, e[3] = o + e[3] | 0;
        }
        start() {
          return this._dataLength = 0, this._bufferLength = 0, this._state.set(U2.stateIdentity), this;
        }
        appendStr(e) {
          let t = this._buffer8, n = this._buffer32, i = this._bufferLength, s, o;
          for (o = 0; o < e.length; o += 1) {
            if (s = e.charCodeAt(o), s < 128) t[i++] = s;
            else if (s < 2048) t[i++] = (s >>> 6) + 192, t[i++] = s & 63 | 128;
            else if (s < 55296 || s > 56319) t[i++] = (s >>> 12) + 224, t[i++] = s >>> 6 & 63 | 128, t[i++] = s & 63 | 128;
            else {
              if (s = (s - 55296) * 1024 + (e.charCodeAt(++o) - 56320) + 65536, s > 1114111) throw new Error(
                "Unicode standard supports code points up to U+10FFFF"
              );
              t[i++] = (s >>> 18) + 240, t[i++] = s >>> 12 & 63 | 128, t[i++] = s >>> 6 & 63 | 128, t[i++] = s & 63 | 128;
            }
            i >= 64 && (this._dataLength += 64, U2._md5cycle(this._state, n), i -= 64, n[0] = n[16]);
          }
          return this._bufferLength = i, this;
        }
        appendAsciiStr(e) {
          let t = this._buffer8, n = this._buffer32, i = this._bufferLength, s, o = 0;
          for (; ; ) {
            for (s = Math.min(e.length - o, 64 - i); s--; ) t[i++] = e.charCodeAt(o++);
            if (i < 64) break;
            this._dataLength += 64, U2._md5cycle(this._state, n), i = 0;
          }
          return this._bufferLength = i, this;
        }
        appendByteArray(e) {
          let t = this._buffer8, n = this._buffer32, i = this._bufferLength, s, o = 0;
          for (; ; ) {
            for (s = Math.min(e.length - o, 64 - i); s--; ) t[i++] = e[o++];
            if (i < 64) break;
            this._dataLength += 64, U2._md5cycle(this._state, n), i = 0;
          }
          return this._bufferLength = i, this;
        }
        getState() {
          let e = this._state;
          return { buffer: String.fromCharCode.apply(null, Array.from(this._buffer8)), buflen: this._bufferLength, length: this._dataLength, state: [e[0], e[1], e[2], e[3]] };
        }
        setState(e) {
          let t = e.buffer, n = e.state, i = this._state, s;
          for (this._dataLength = e.length, this._bufferLength = e.buflen, i[0] = n[0], i[1] = n[1], i[2] = n[2], i[3] = n[3], s = 0; s < t.length; s += 1) this._buffer8[s] = t.charCodeAt(s);
        }
        end(e = false) {
          let t = this._bufferLength, n = this._buffer8, i = this._buffer32, s = (t >> 2) + 1;
          this._dataLength += t;
          let o = this._dataLength * 8;
          if (n[t] = 128, n[t + 1] = n[t + 2] = n[t + 3] = 0, i.set(U2.buffer32Identity.subarray(s), s), t > 55 && (U2._md5cycle(this._state, i), i.set(U2.buffer32Identity)), o <= 4294967295) i[14] = o;
          else {
            let u = o.toString(16).match(/(.*?)(.{0,8})$/);
            if (u === null) return;
            let c = parseInt(
              u[2],
              16
            ), l = parseInt(u[1], 16) || 0;
            i[14] = c, i[15] = l;
          }
          return U2._md5cycle(this._state, i), e ? this._state : U2._hex(
            this._state
          );
        }
      };
      a(U, "Md5"), E(U, "stateIdentity", new Int32Array([1732584193, -271733879, -1732584194, 271733878])), E(U, "buffer32Identity", new Int32Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])), E(U, "hexChars", "0123456789abcdef"), E(U, "hexOut", []), E(U, "onePassHasher", new U());
      et = U;
    });
    lr = {};
    ie(lr, { createHash: /* @__PURE__ */ __name(() => bu, "createHash"), createHmac: /* @__PURE__ */ __name(() => vu, "createHmac"), randomBytes: /* @__PURE__ */ __name(() => gu, "randomBytes") });
    __name(gu, "gu");
    __name(bu, "bu");
    __name(vu, "vu");
    fr = G(() => {
      "use strict";
      p();
      es();
      ts();
      a(gu, "randomBytes");
      a(bu, "createHash");
      a(vu, "createHmac");
    });
    tt = T((Qf, hr) => {
      "use strict";
      p();
      hr.exports = {
        host: "localhost",
        user: m.platform === "win32" ? m.env.USERNAME : m.env.USER,
        database: void 0,
        password: null,
        connectionString: void 0,
        port: 5432,
        rows: 0,
        binary: false,
        max: 10,
        idleTimeoutMillis: 3e4,
        client_encoding: "",
        ssl: false,
        application_name: void 0,
        fallback_application_name: void 0,
        options: void 0,
        parseInputDatesAsUTC: false,
        statement_timeout: false,
        lock_timeout: false,
        idle_in_transaction_session_timeout: false,
        query_timeout: false,
        connect_timeout: 0,
        keepalives: 1,
        keepalives_idle: 0
      };
      var Me = Je(), xu = Me.getTypeParser(20, "text"), Su = Me.getTypeParser(
        1016,
        "text"
      );
      hr.exports.__defineSetter__("parseInt8", function(r) {
        Me.setTypeParser(20, "text", r ? Me.getTypeParser(
          23,
          "text"
        ) : xu), Me.setTypeParser(1016, "text", r ? Me.getTypeParser(1007, "text") : Su);
      });
    });
    rt = T((Wf, ns) => {
      "use strict";
      p();
      var Eu = (fr(), O(lr)), Au = tt();
      function Cu(r) {
        var e = r.replace(
          /\\/g,
          "\\\\"
        ).replace(/"/g, '\\"');
        return '"' + e + '"';
      }
      __name(Cu, "Cu");
      a(Cu, "escapeElement");
      function rs(r) {
        for (var e = "{", t = 0; t < r.length; t++) t > 0 && (e = e + ","), r[t] === null || typeof r[t] > "u" ? e = e + "NULL" : Array.isArray(r[t]) ? e = e + rs(r[t]) : r[t] instanceof d ? e += "\\\\x" + r[t].toString("hex") : e += Cu(Ct(r[t]));
        return e = e + "}", e;
      }
      __name(rs, "rs");
      a(rs, "arrayString");
      var Ct = a(function(r, e) {
        if (r == null) return null;
        if (r instanceof d) return r;
        if (ArrayBuffer.isView(r)) {
          var t = d.from(r.buffer, r.byteOffset, r.byteLength);
          return t.length === r.byteLength ? t : t.slice(r.byteOffset, r.byteOffset + r.byteLength);
        }
        return r instanceof Date ? Au.parseInputDatesAsUTC ? Tu(r) : Iu(r) : Array.isArray(r) ? rs(r) : typeof r == "object" ? _u(r, e) : r.toString();
      }, "prepareValue");
      function _u(r, e) {
        if (r && typeof r.toPostgres == "function") {
          if (e = e || [], e.indexOf(r) !== -1) throw new Error('circular reference detected while preparing "' + r + '" for query');
          return e.push(r), Ct(r.toPostgres(Ct), e);
        }
        return JSON.stringify(r);
      }
      __name(_u, "_u");
      a(_u, "prepareObject");
      function N(r, e) {
        for (r = "" + r; r.length < e; ) r = "0" + r;
        return r;
      }
      __name(N, "N");
      a(N, "pad");
      function Iu(r) {
        var e = -r.getTimezoneOffset(), t = r.getFullYear(), n = t < 1;
        n && (t = Math.abs(t) + 1);
        var i = N(t, 4) + "-" + N(r.getMonth() + 1, 2) + "-" + N(r.getDate(), 2) + "T" + N(
          r.getHours(),
          2
        ) + ":" + N(r.getMinutes(), 2) + ":" + N(r.getSeconds(), 2) + "." + N(r.getMilliseconds(), 3);
        return e < 0 ? (i += "-", e *= -1) : i += "+", i += N(Math.floor(e / 60), 2) + ":" + N(e % 60, 2), n && (i += " BC"), i;
      }
      __name(Iu, "Iu");
      a(Iu, "dateToString");
      function Tu(r) {
        var e = r.getUTCFullYear(), t = e < 1;
        t && (e = Math.abs(e) + 1);
        var n = N(e, 4) + "-" + N(r.getUTCMonth() + 1, 2) + "-" + N(r.getUTCDate(), 2) + "T" + N(r.getUTCHours(), 2) + ":" + N(r.getUTCMinutes(), 2) + ":" + N(r.getUTCSeconds(), 2) + "." + N(
          r.getUTCMilliseconds(),
          3
        );
        return n += "+00:00", t && (n += " BC"), n;
      }
      __name(Tu, "Tu");
      a(Tu, "dateToStringUTC");
      function Pu(r, e, t) {
        return r = typeof r == "string" ? { text: r } : r, e && (typeof e == "function" ? r.callback = e : r.values = e), t && (r.callback = t), r;
      }
      __name(Pu, "Pu");
      a(Pu, "normalizeQueryConfig");
      var pr = a(function(r) {
        return Eu.createHash("md5").update(r, "utf-8").digest("hex");
      }, "md5"), Bu = a(
        function(r, e, t) {
          var n = pr(e + r), i = pr(d.concat([d.from(n), t]));
          return "md5" + i;
        },
        "postgresMd5PasswordHash"
      );
      ns.exports = {
        prepareValue: a(function(e) {
          return Ct(e);
        }, "prepareValueWrapper"),
        normalizeQueryConfig: Pu,
        postgresMd5PasswordHash: Bu,
        md5: pr
      };
    });
    nt = {};
    ie(nt, { default: /* @__PURE__ */ __name(() => ku, "default") });
    it = G(() => {
      "use strict";
      p();
      ku = {};
    });
    ds = T((th, ps) => {
      "use strict";
      p();
      var yr = (fr(), O(lr));
      function Mu(r) {
        if (r.indexOf("SCRAM-SHA-256") === -1) throw new Error("SASL: Only mechanism SCRAM-SHA-256 is currently supported");
        let e = yr.randomBytes(
          18
        ).toString("base64");
        return { mechanism: "SCRAM-SHA-256", clientNonce: e, response: "n,,n=*,r=" + e, message: "SASLInitialResponse" };
      }
      __name(Mu, "Mu");
      a(Mu, "startSession");
      function Uu(r, e, t) {
        if (r.message !== "SASLInitialResponse") throw new Error(
          "SASL: Last message was not SASLInitialResponse"
        );
        if (typeof e != "string") throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string");
        if (typeof t != "string") throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: serverData must be a string");
        let n = qu(t);
        if (n.nonce.startsWith(r.clientNonce)) {
          if (n.nonce.length === r.clientNonce.length) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
        } else throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
        var i = d.from(n.salt, "base64"), s = Wu(e, i, n.iteration), o = Ue(s, "Client Key"), u = Nu(
          o
        ), c = "n=*,r=" + r.clientNonce, l = "r=" + n.nonce + ",s=" + n.salt + ",i=" + n.iteration, f = "c=biws,r=" + n.nonce, y = c + "," + l + "," + f, g = Ue(u, y), A = hs(o, g), C = A.toString("base64"), D = Ue(s, "Server Key"), Y = Ue(D, y);
        r.message = "SASLResponse", r.serverSignature = Y.toString("base64"), r.response = f + ",p=" + C;
      }
      __name(Uu, "Uu");
      a(Uu, "continueSession");
      function Du(r, e) {
        if (r.message !== "SASLResponse") throw new Error("SASL: Last message was not SASLResponse");
        if (typeof e != "string") throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: serverData must be a string");
        let { serverSignature: t } = Qu(
          e
        );
        if (t !== r.serverSignature) throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature does not match");
      }
      __name(Du, "Du");
      a(Du, "finalizeSession");
      function Ou(r) {
        if (typeof r != "string") throw new TypeError("SASL: text must be a string");
        return r.split("").map((e, t) => r.charCodeAt(t)).every((e) => e >= 33 && e <= 43 || e >= 45 && e <= 126);
      }
      __name(Ou, "Ou");
      a(Ou, "isPrintableChars");
      function ls(r) {
        return /^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(r);
      }
      __name(ls, "ls");
      a(ls, "isBase64");
      function fs(r) {
        if (typeof r != "string") throw new TypeError("SASL: attribute pairs text must be a string");
        return new Map(r.split(",").map((e) => {
          if (!/^.=/.test(e)) throw new Error("SASL: Invalid attribute pair entry");
          let t = e[0], n = e.substring(2);
          return [t, n];
        }));
      }
      __name(fs, "fs");
      a(fs, "parseAttributePairs");
      function qu(r) {
        let e = fs(r), t = e.get("r");
        if (t) {
          if (!Ou(t)) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce must only contain printable characters");
        } else throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing");
        let n = e.get("s");
        if (n) {
          if (!ls(n)) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt must be base64");
        } else throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing");
        let i = e.get("i");
        if (i) {
          if (!/^[1-9][0-9]*$/.test(i)) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: invalid iteration count");
        } else throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration missing");
        let s = parseInt(i, 10);
        return { nonce: t, salt: n, iteration: s };
      }
      __name(qu, "qu");
      a(qu, "parseServerFirstMessage");
      function Qu(r) {
        let t = fs(r).get("v");
        if (t) {
          if (!ls(t)) throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature must be base64");
        } else throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature is missing");
        return { serverSignature: t };
      }
      __name(Qu, "Qu");
      a(Qu, "parseServerFinalMessage");
      function hs(r, e) {
        if (!d.isBuffer(r)) throw new TypeError("first argument must be a Buffer");
        if (!d.isBuffer(e)) throw new TypeError(
          "second argument must be a Buffer"
        );
        if (r.length !== e.length) throw new Error("Buffer lengths must match");
        if (r.length === 0) throw new Error("Buffers cannot be empty");
        return d.from(r.map((t, n) => r[n] ^ e[n]));
      }
      __name(hs, "hs");
      a(hs, "xorBuffers");
      function Nu(r) {
        return yr.createHash("sha256").update(r).digest();
      }
      __name(Nu, "Nu");
      a(Nu, "sha256");
      function Ue(r, e) {
        return yr.createHmac("sha256", r).update(e).digest();
      }
      __name(Ue, "Ue");
      a(Ue, "hmacSha256");
      function Wu(r, e, t) {
        for (var n = Ue(
          r,
          d.concat([e, d.from([0, 0, 0, 1])])
        ), i = n, s = 0; s < t - 1; s++) n = Ue(r, n), i = hs(i, n);
        return i;
      }
      __name(Wu, "Wu");
      a(Wu, "Hi");
      ps.exports = { startSession: Mu, continueSession: Uu, finalizeSession: Du };
    });
    mr = {};
    ie(mr, { join: /* @__PURE__ */ __name(() => ju, "join") });
    __name(ju, "ju");
    wr = G(() => {
      "use strict";
      p();
      a(
        ju,
        "join"
      );
    });
    gr = {};
    ie(gr, { stat: /* @__PURE__ */ __name(() => Hu, "stat") });
    __name(Hu, "Hu");
    br = G(() => {
      "use strict";
      p();
      a(Hu, "stat");
    });
    vr = {};
    ie(vr, { default: /* @__PURE__ */ __name(() => $u, "default") });
    xr = G(() => {
      "use strict";
      p();
      $u = {};
    });
    ys = {};
    ie(ys, { StringDecoder: /* @__PURE__ */ __name(() => Sr, "StringDecoder") });
    ms = G(() => {
      "use strict";
      p();
      Er = class Er {
        static {
          __name(this, "Er");
        }
        constructor(e) {
          E(this, "td");
          this.td = new TextDecoder(e);
        }
        write(e) {
          return this.td.decode(e, { stream: true });
        }
        end(e) {
          return this.td.decode(e);
        }
      };
      a(Er, "StringDecoder");
      Sr = Er;
    });
    vs = T((fh, bs) => {
      "use strict";
      p();
      var { Transform: Gu } = (xr(), O(vr)), { StringDecoder: Vu } = (ms(), O(ys)), ve = Symbol(
        "last"
      ), It = Symbol("decoder");
      function zu(r, e, t) {
        let n;
        if (this.overflow) {
          if (n = this[It].write(r).split(
            this.matcher
          ), n.length === 1) return t();
          n.shift(), this.overflow = false;
        } else this[ve] += this[It].write(r), n = this[ve].split(this.matcher);
        this[ve] = n.pop();
        for (let i = 0; i < n.length; i++) try {
          gs(this, this.mapper(n[i]));
        } catch (s) {
          return t(s);
        }
        if (this.overflow = this[ve].length > this.maxLength, this.overflow && !this.skipOverflow) {
          t(new Error(
            "maximum buffer reached"
          ));
          return;
        }
        t();
      }
      __name(zu, "zu");
      a(zu, "transform");
      function Ku(r) {
        if (this[ve] += this[It].end(), this[ve])
          try {
            gs(this, this.mapper(this[ve]));
          } catch (e) {
            return r(e);
          }
        r();
      }
      __name(Ku, "Ku");
      a(Ku, "flush");
      function gs(r, e) {
        e !== void 0 && r.push(e);
      }
      __name(gs, "gs");
      a(gs, "push");
      function ws(r) {
        return r;
      }
      __name(ws, "ws");
      a(ws, "noop");
      function Yu(r, e, t) {
        switch (r = r || /\r?\n/, e = e || ws, t = t || {}, arguments.length) {
          case 1:
            typeof r == "function" ? (e = r, r = /\r?\n/) : typeof r == "object" && !(r instanceof RegExp) && !r[Symbol.split] && (t = r, r = /\r?\n/);
            break;
          case 2:
            typeof r == "function" ? (t = e, e = r, r = /\r?\n/) : typeof e == "object" && (t = e, e = ws);
        }
        t = Object.assign({}, t), t.autoDestroy = true, t.transform = zu, t.flush = Ku, t.readableObjectMode = true;
        let n = new Gu(t);
        return n[ve] = "", n[It] = new Vu("utf8"), n.matcher = r, n.mapper = e, n.maxLength = t.maxLength, n.skipOverflow = t.skipOverflow || false, n.overflow = false, n._destroy = function(i, s) {
          this._writableState.errorEmitted = false, s(i);
        }, n;
      }
      __name(Yu, "Yu");
      a(Yu, "split");
      bs.exports = Yu;
    });
    Es = T((dh, pe) => {
      "use strict";
      p();
      var xs = (wr(), O(mr)), Zu = (xr(), O(vr)).Stream, Ju = vs(), Ss = (it(), O(nt)), Xu = 5432, Tt = m.platform === "win32", st = m.stderr, ec = 56, tc = 7, rc = 61440, nc = 32768;
      function ic(r) {
        return (r & rc) == nc;
      }
      __name(ic, "ic");
      a(ic, "isRegFile");
      var De = ["host", "port", "database", "user", "password"], Ar = De.length, sc = De[Ar - 1];
      function Cr() {
        var r = st instanceof Zu && st.writable === true;
        if (r) {
          var e = Array.prototype.slice.call(arguments).concat(`
`);
          st.write(Ss.format.apply(Ss, e));
        }
      }
      __name(Cr, "Cr");
      a(Cr, "warn");
      Object.defineProperty(pe.exports, "isWin", { get: a(function() {
        return Tt;
      }, "get"), set: a(function(r) {
        Tt = r;
      }, "set") });
      pe.exports.warnTo = function(r) {
        var e = st;
        return st = r, e;
      };
      pe.exports.getFileName = function(r) {
        var e = r || m.env, t = e.PGPASSFILE || (Tt ? xs.join(e.APPDATA || "./", "postgresql", "pgpass.conf") : xs.join(e.HOME || "./", ".pgpass"));
        return t;
      };
      pe.exports.usePgPass = function(r, e) {
        return Object.prototype.hasOwnProperty.call(m.env, "PGPASSWORD") ? false : Tt ? true : (e = e || "<unkn>", ic(r.mode) ? r.mode & (ec | tc) ? (Cr('WARNING: password file "%s" has group or world access; permissions should be u=rw (0600) or less', e), false) : true : (Cr('WARNING: password file "%s" is not a plain file', e), false));
      };
      var oc = pe.exports.match = function(r, e) {
        return De.slice(0, -1).reduce(function(t, n, i) {
          return i == 1 && Number(r[n] || Xu) === Number(
            e[n]
          ) ? t && true : t && (e[n] === "*" || e[n] === r[n]);
        }, true);
      };
      pe.exports.getPassword = function(r, e, t) {
        var n, i = e.pipe(
          Ju()
        );
        function s(c) {
          var l = ac(c);
          l && uc(l) && oc(r, l) && (n = l[sc], i.end());
        }
        __name(s, "s");
        a(s, "onLine");
        var o = a(function() {
          e.destroy(), t(n);
        }, "onEnd"), u = a(function(c) {
          e.destroy(), Cr("WARNING: error on reading file: %s", c), t(
            void 0
          );
        }, "onErr");
        e.on("error", u), i.on("data", s).on("end", o).on("error", u);
      };
      var ac = pe.exports.parseLine = function(r) {
        if (r.length < 11 || r.match(/^\s+#/)) return null;
        for (var e = "", t = "", n = 0, i = 0, s = 0, o = {}, u = false, c = a(
          function(f, y, g) {
            var A = r.substring(y, g);
            Object.hasOwnProperty.call(m.env, "PGPASS_NO_DEESCAPE") || (A = A.replace(/\\([:\\])/g, "$1")), o[De[f]] = A;
          },
          "addToObj"
        ), l = 0; l < r.length - 1; l += 1) {
          if (e = r.charAt(l + 1), t = r.charAt(
            l
          ), u = n == Ar - 1, u) {
            c(n, i);
            break;
          }
          l >= 0 && e == ":" && t !== "\\" && (c(n, i, l + 1), i = l + 2, n += 1);
        }
        return o = Object.keys(o).length === Ar ? o : null, o;
      }, uc = pe.exports.isValidEntry = function(r) {
        for (var e = { 0: function(o) {
          return o.length > 0;
        }, 1: function(o) {
          return o === "*" ? true : (o = Number(o), isFinite(o) && o > 0 && o < 9007199254740992 && Math.floor(o) === o);
        }, 2: function(o) {
          return o.length > 0;
        }, 3: function(o) {
          return o.length > 0;
        }, 4: function(o) {
          return o.length > 0;
        } }, t = 0; t < De.length; t += 1) {
          var n = e[t], i = r[De[t]] || "", s = n(i);
          if (!s) return false;
        }
        return true;
      };
    });
    Cs = T((gh, _r) => {
      "use strict";
      p();
      var wh = (wr(), O(mr)), As = (br(), O(gr)), Pt = Es();
      _r.exports = function(r, e) {
        var t = Pt.getFileName();
        As.stat(t, function(n, i) {
          if (n || !Pt.usePgPass(i, t)) return e(void 0);
          var s = As.createReadStream(
            t
          );
          Pt.getPassword(r, s, e);
        });
      };
      _r.exports.warnTo = Pt.warnTo;
    });
    _s = {};
    ie(_s, { default: /* @__PURE__ */ __name(() => cc, "default") });
    Is = G(() => {
      "use strict";
      p();
      cc = {};
    });
    Ps = T((xh, Ts) => {
      "use strict";
      p();
      var lc = (Zt(), O(gi)), Ir = (br(), O(gr));
      function Tr(r) {
        if (r.charAt(0) === "/") {
          var t = r.split(" ");
          return { host: t[0], database: t[1] };
        }
        var e = lc.parse(/ |%[^a-f0-9]|%[a-f0-9][^a-f0-9]/i.test(r) ? encodeURI(r).replace(/\%25(\d\d)/g, "%$1") : r, true), t = e.query;
        for (var n in t) Array.isArray(t[n]) && (t[n] = t[n][t[n].length - 1]);
        var i = (e.auth || ":").split(":");
        if (t.user = i[0], t.password = i.splice(1).join(
          ":"
        ), t.port = e.port, e.protocol == "socket:") return t.host = decodeURI(e.pathname), t.database = e.query.db, t.client_encoding = e.query.encoding, t;
        t.host || (t.host = e.hostname);
        var s = e.pathname;
        if (!t.host && s && /^%2f/i.test(s)) {
          var o = s.split("/");
          t.host = decodeURIComponent(o[0]), s = o.splice(1).join("/");
        }
        switch (s && s.charAt(
          0
        ) === "/" && (s = s.slice(1) || null), t.database = s && decodeURI(s), (t.ssl === "true" || t.ssl === "1") && (t.ssl = true), t.ssl === "0" && (t.ssl = false), (t.sslcert || t.sslkey || t.sslrootcert || t.sslmode) && (t.ssl = {}), t.sslcert && (t.ssl.cert = Ir.readFileSync(t.sslcert).toString()), t.sslkey && (t.ssl.key = Ir.readFileSync(t.sslkey).toString()), t.sslrootcert && (t.ssl.ca = Ir.readFileSync(t.sslrootcert).toString()), t.sslmode) {
          case "disable": {
            t.ssl = false;
            break;
          }
          case "prefer":
          case "require":
          case "verify-ca":
          case "verify-full":
            break;
          case "no-verify": {
            t.ssl.rejectUnauthorized = false;
            break;
          }
        }
        return t;
      }
      __name(Tr, "Tr");
      a(Tr, "parse");
      Ts.exports = Tr;
      Tr.parse = Tr;
    });
    Bt = T((Ah, Ls) => {
      "use strict";
      p();
      var fc = (Is(), O(_s)), Rs = tt(), Bs = Ps().parse, H = a(function(r, e, t) {
        return t === void 0 ? t = m.env["PG" + r.toUpperCase()] : t === false || (t = m.env[t]), e[r] || t || Rs[r];
      }, "val"), hc = a(function() {
        switch (m.env.PGSSLMODE) {
          case "disable":
            return false;
          case "prefer":
          case "require":
          case "verify-ca":
          case "verify-full":
            return true;
          case "no-verify":
            return { rejectUnauthorized: false };
        }
        return Rs.ssl;
      }, "readSSLConfigFromEnvironment"), Oe = a(function(r) {
        return "'" + ("" + r).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
      }, "quoteParamValue"), ne2 = a(function(r, e, t) {
        var n = e[t];
        n != null && r.push(t + "=" + Oe(n));
      }, "add"), Br = class Br {
        static {
          __name(this, "Br");
        }
        constructor(e) {
          e = typeof e == "string" ? Bs(e) : e || {}, e.connectionString && (e = Object.assign({}, e, Bs(e.connectionString))), this.user = H("user", e), this.database = H("database", e), this.database === void 0 && (this.database = this.user), this.port = parseInt(H("port", e), 10), this.host = H("host", e), Object.defineProperty(this, "password", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: H("password", e)
          }), this.binary = H("binary", e), this.options = H("options", e), this.ssl = typeof e.ssl > "u" ? hc() : e.ssl, typeof this.ssl == "string" && this.ssl === "true" && (this.ssl = true), this.ssl === "no-verify" && (this.ssl = { rejectUnauthorized: false }), this.ssl && this.ssl.key && Object.defineProperty(this.ssl, "key", { enumerable: false }), this.client_encoding = H("client_encoding", e), this.replication = H("replication", e), this.isDomainSocket = !(this.host || "").indexOf("/"), this.application_name = H("application_name", e, "PGAPPNAME"), this.fallback_application_name = H("fallback_application_name", e, false), this.statement_timeout = H("statement_timeout", e, false), this.lock_timeout = H("lock_timeout", e, false), this.idle_in_transaction_session_timeout = H("idle_in_transaction_session_timeout", e, false), this.query_timeout = H("query_timeout", e, false), e.connectionTimeoutMillis === void 0 ? this.connect_timeout = m.env.PGCONNECT_TIMEOUT || 0 : this.connect_timeout = Math.floor(e.connectionTimeoutMillis / 1e3), e.keepAlive === false ? this.keepalives = 0 : e.keepAlive === true && (this.keepalives = 1), typeof e.keepAliveInitialDelayMillis == "number" && (this.keepalives_idle = Math.floor(e.keepAliveInitialDelayMillis / 1e3));
        }
        getLibpqConnectionString(e) {
          var t = [];
          ne2(t, this, "user"), ne2(t, this, "password"), ne2(t, this, "port"), ne2(t, this, "application_name"), ne2(
            t,
            this,
            "fallback_application_name"
          ), ne2(t, this, "connect_timeout"), ne2(t, this, "options");
          var n = typeof this.ssl == "object" ? this.ssl : this.ssl ? { sslmode: this.ssl } : {};
          if (ne2(t, n, "sslmode"), ne2(t, n, "sslca"), ne2(t, n, "sslkey"), ne2(t, n, "sslcert"), ne2(t, n, "sslrootcert"), this.database && t.push("dbname=" + Oe(this.database)), this.replication && t.push("replication=" + Oe(this.replication)), this.host && t.push("host=" + Oe(this.host)), this.isDomainSocket) return e(null, t.join(" "));
          this.client_encoding && t.push("client_encoding=" + Oe(this.client_encoding)), fc.lookup(this.host, function(i, s) {
            return i ? e(i, null) : (t.push("hostaddr=" + Oe(s)), e(null, t.join(" ")));
          });
        }
      };
      a(Br, "ConnectionParameters");
      var Pr = Br;
      Ls.exports = Pr;
    });
    Ms = T((Ih, ks) => {
      "use strict";
      p();
      var pc = Je(), Fs = /^([A-Za-z]+)(?: (\d+))?(?: (\d+))?/, Lr = class Lr {
        static {
          __name(this, "Lr");
        }
        constructor(e, t) {
          this.command = null, this.rowCount = null, this.oid = null, this.rows = [], this.fields = [], this._parsers = void 0, this._types = t, this.RowCtor = null, this.rowAsArray = e === "array", this.rowAsArray && (this.parseRow = this._parseRowAsArray);
        }
        addCommandComplete(e) {
          var t;
          e.text ? t = Fs.exec(e.text) : t = Fs.exec(e.command), t && (this.command = t[1], t[3] ? (this.oid = parseInt(
            t[2],
            10
          ), this.rowCount = parseInt(t[3], 10)) : t[2] && (this.rowCount = parseInt(t[2], 10)));
        }
        _parseRowAsArray(e) {
          for (var t = new Array(
            e.length
          ), n = 0, i = e.length; n < i; n++) {
            var s = e[n];
            s !== null ? t[n] = this._parsers[n](s) : t[n] = null;
          }
          return t;
        }
        parseRow(e) {
          for (var t = {}, n = 0, i = e.length; n < i; n++) {
            var s = e[n], o = this.fields[n].name;
            s !== null ? t[o] = this._parsers[n](
              s
            ) : t[o] = null;
          }
          return t;
        }
        addRow(e) {
          this.rows.push(e);
        }
        addFields(e) {
          this.fields = e, this.fields.length && (this._parsers = new Array(e.length));
          for (var t = 0; t < e.length; t++) {
            var n = e[t];
            this._types ? this._parsers[t] = this._types.getTypeParser(n.dataTypeID, n.format || "text") : this._parsers[t] = pc.getTypeParser(n.dataTypeID, n.format || "text");
          }
        }
      };
      a(Lr, "Result");
      var Rr = Lr;
      ks.exports = Rr;
    });
    qs = T((Bh, Os) => {
      "use strict";
      p();
      var { EventEmitter: dc } = ge(), Us = Ms(), Ds = rt(), kr = class kr extends dc {
        static {
          __name(this, "kr");
        }
        constructor(e, t, n) {
          super(), e = Ds.normalizeQueryConfig(e, t, n), this.text = e.text, this.values = e.values, this.rows = e.rows, this.types = e.types, this.name = e.name, this.binary = e.binary, this.portal = e.portal || "", this.callback = e.callback, this._rowMode = e.rowMode, m.domain && e.callback && (this.callback = m.domain.bind(e.callback)), this._result = new Us(this._rowMode, this.types), this._results = this._result, this.isPreparedStatement = false, this._canceledDueToError = false, this._promise = null;
        }
        requiresPreparation() {
          return this.name || this.rows ? true : !this.text || !this.values ? false : this.values.length > 0;
        }
        _checkForMultirow() {
          this._result.command && (Array.isArray(this._results) || (this._results = [this._result]), this._result = new Us(this._rowMode, this.types), this._results.push(this._result));
        }
        handleRowDescription(e) {
          this._checkForMultirow(), this._result.addFields(e.fields), this._accumulateRows = this.callback || !this.listeners("row").length;
        }
        handleDataRow(e) {
          let t;
          if (!this._canceledDueToError) {
            try {
              t = this._result.parseRow(
                e.fields
              );
            } catch (n) {
              this._canceledDueToError = n;
              return;
            }
            this.emit("row", t, this._result), this._accumulateRows && this._result.addRow(t);
          }
        }
        handleCommandComplete(e, t) {
          this._checkForMultirow(), this._result.addCommandComplete(
            e
          ), this.rows && t.sync();
        }
        handleEmptyQuery(e) {
          this.rows && e.sync();
        }
        handleError(e, t) {
          if (this._canceledDueToError && (e = this._canceledDueToError, this._canceledDueToError = false), this.callback) return this.callback(e);
          this.emit("error", e);
        }
        handleReadyForQuery(e) {
          if (this._canceledDueToError) return this.handleError(
            this._canceledDueToError,
            e
          );
          if (this.callback) try {
            this.callback(null, this._results);
          } catch (t) {
            m.nextTick(() => {
              throw t;
            });
          }
          this.emit(
            "end",
            this._results
          );
        }
        submit(e) {
          if (typeof this.text != "string" && typeof this.name != "string") return new Error(
            "A query must have either text or a name. Supplying neither is unsupported."
          );
          let t = e.parsedStatements[this.name];
          return this.text && t && this.text !== t ? new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`) : this.values && !Array.isArray(this.values) ? new Error("Query values must be an array") : (this.requiresPreparation() ? this.prepare(e) : e.query(this.text), null);
        }
        hasBeenParsed(e) {
          return this.name && e.parsedStatements[this.name];
        }
        handlePortalSuspended(e) {
          this._getRows(e, this.rows);
        }
        _getRows(e, t) {
          e.execute({ portal: this.portal, rows: t }), t ? e.flush() : e.sync();
        }
        prepare(e) {
          this.isPreparedStatement = true, this.hasBeenParsed(e) || e.parse({ text: this.text, name: this.name, types: this.types });
          try {
            e.bind({ portal: this.portal, statement: this.name, values: this.values, binary: this.binary, valueMapper: Ds.prepareValue });
          } catch (t) {
            this.handleError(t, e);
            return;
          }
          e.describe({ type: "P", name: this.portal || "" }), this._getRows(e, this.rows);
        }
        handleCopyInResponse(e) {
          e.sendCopyFail("No source stream defined");
        }
        handleCopyData(e, t) {
        }
      };
      a(kr, "Query");
      var Fr = kr;
      Os.exports = Fr;
    });
    ln = T((_) => {
      "use strict";
      p();
      Object.defineProperty(_, "__esModule", { value: true });
      _.NoticeMessage = _.DataRowMessage = _.CommandCompleteMessage = _.ReadyForQueryMessage = _.NotificationResponseMessage = _.BackendKeyDataMessage = _.AuthenticationMD5Password = _.ParameterStatusMessage = _.ParameterDescriptionMessage = _.RowDescriptionMessage = _.Field = _.CopyResponse = _.CopyDataMessage = _.DatabaseError = _.copyDone = _.emptyQuery = _.replicationStart = _.portalSuspended = _.noData = _.closeComplete = _.bindComplete = _.parseComplete = void 0;
      _.parseComplete = { name: "parseComplete", length: 5 };
      _.bindComplete = { name: "bindComplete", length: 5 };
      _.closeComplete = { name: "closeComplete", length: 5 };
      _.noData = { name: "noData", length: 5 };
      _.portalSuspended = { name: "portalSuspended", length: 5 };
      _.replicationStart = { name: "replicationStart", length: 4 };
      _.emptyQuery = { name: "emptyQuery", length: 4 };
      _.copyDone = { name: "copyDone", length: 4 };
      var Kr = class Kr extends Error {
        static {
          __name(this, "Kr");
        }
        constructor(e, t, n) {
          super(e), this.length = t, this.name = n;
        }
      };
      a(Kr, "DatabaseError");
      var Mr = Kr;
      _.DatabaseError = Mr;
      var Yr = class Yr {
        static {
          __name(this, "Yr");
        }
        constructor(e, t) {
          this.length = e, this.chunk = t, this.name = "copyData";
        }
      };
      a(Yr, "CopyDataMessage");
      var Ur = Yr;
      _.CopyDataMessage = Ur;
      var Zr = class Zr {
        static {
          __name(this, "Zr");
        }
        constructor(e, t, n, i) {
          this.length = e, this.name = t, this.binary = n, this.columnTypes = new Array(i);
        }
      };
      a(Zr, "CopyResponse");
      var Dr = Zr;
      _.CopyResponse = Dr;
      var Jr = class Jr {
        static {
          __name(this, "Jr");
        }
        constructor(e, t, n, i, s, o, u) {
          this.name = e, this.tableID = t, this.columnID = n, this.dataTypeID = i, this.dataTypeSize = s, this.dataTypeModifier = o, this.format = u;
        }
      };
      a(Jr, "Field");
      var Or = Jr;
      _.Field = Or;
      var Xr = class Xr {
        static {
          __name(this, "Xr");
        }
        constructor(e, t) {
          this.length = e, this.fieldCount = t, this.name = "rowDescription", this.fields = new Array(this.fieldCount);
        }
      };
      a(Xr, "RowDescriptionMessage");
      var qr = Xr;
      _.RowDescriptionMessage = qr;
      var en = class en {
        static {
          __name(this, "en");
        }
        constructor(e, t) {
          this.length = e, this.parameterCount = t, this.name = "parameterDescription", this.dataTypeIDs = new Array(this.parameterCount);
        }
      };
      a(en, "ParameterDescriptionMessage");
      var Qr = en;
      _.ParameterDescriptionMessage = Qr;
      var tn = class tn {
        static {
          __name(this, "tn");
        }
        constructor(e, t, n) {
          this.length = e, this.parameterName = t, this.parameterValue = n, this.name = "parameterStatus";
        }
      };
      a(tn, "ParameterStatusMessage");
      var Nr = tn;
      _.ParameterStatusMessage = Nr;
      var rn = class rn {
        static {
          __name(this, "rn");
        }
        constructor(e, t) {
          this.length = e, this.salt = t, this.name = "authenticationMD5Password";
        }
      };
      a(rn, "AuthenticationMD5Password");
      var Wr = rn;
      _.AuthenticationMD5Password = Wr;
      var nn = class nn {
        static {
          __name(this, "nn");
        }
        constructor(e, t, n) {
          this.length = e, this.processID = t, this.secretKey = n, this.name = "backendKeyData";
        }
      };
      a(nn, "BackendKeyDataMessage");
      var jr = nn;
      _.BackendKeyDataMessage = jr;
      var sn = class sn {
        static {
          __name(this, "sn");
        }
        constructor(e, t, n, i) {
          this.length = e, this.processId = t, this.channel = n, this.payload = i, this.name = "notification";
        }
      };
      a(sn, "NotificationResponseMessage");
      var Hr = sn;
      _.NotificationResponseMessage = Hr;
      var on = class on {
        static {
          __name(this, "on");
        }
        constructor(e, t) {
          this.length = e, this.status = t, this.name = "readyForQuery";
        }
      };
      a(on, "ReadyForQueryMessage");
      var $r = on;
      _.ReadyForQueryMessage = $r;
      var an = class an {
        static {
          __name(this, "an");
        }
        constructor(e, t) {
          this.length = e, this.text = t, this.name = "commandComplete";
        }
      };
      a(an, "CommandCompleteMessage");
      var Gr = an;
      _.CommandCompleteMessage = Gr;
      var un = class un {
        static {
          __name(this, "un");
        }
        constructor(e, t) {
          this.length = e, this.fields = t, this.name = "dataRow", this.fieldCount = t.length;
        }
      };
      a(un, "DataRowMessage");
      var Vr = un;
      _.DataRowMessage = Vr;
      var cn = class cn {
        static {
          __name(this, "cn");
        }
        constructor(e, t) {
          this.length = e, this.message = t, this.name = "notice";
        }
      };
      a(cn, "NoticeMessage");
      var zr = cn;
      _.NoticeMessage = zr;
    });
    Qs = T((Rt) => {
      "use strict";
      p();
      Object.defineProperty(Rt, "__esModule", { value: true });
      Rt.Writer = void 0;
      var hn = class hn {
        static {
          __name(this, "hn");
        }
        constructor(e = 256) {
          this.size = e, this.offset = 5, this.headerPosition = 0, this.buffer = d.allocUnsafe(e);
        }
        ensure(e) {
          if (this.buffer.length - this.offset < e) {
            let n = this.buffer, i = n.length + (n.length >> 1) + e;
            this.buffer = d.allocUnsafe(i), n.copy(
              this.buffer
            );
          }
        }
        addInt32(e) {
          return this.ensure(4), this.buffer[this.offset++] = e >>> 24 & 255, this.buffer[this.offset++] = e >>> 16 & 255, this.buffer[this.offset++] = e >>> 8 & 255, this.buffer[this.offset++] = e >>> 0 & 255, this;
        }
        addInt16(e) {
          return this.ensure(2), this.buffer[this.offset++] = e >>> 8 & 255, this.buffer[this.offset++] = e >>> 0 & 255, this;
        }
        addCString(e) {
          if (!e) this.ensure(1);
          else {
            let t = d.byteLength(e);
            this.ensure(t + 1), this.buffer.write(e, this.offset, "utf-8"), this.offset += t;
          }
          return this.buffer[this.offset++] = 0, this;
        }
        addString(e = "") {
          let t = d.byteLength(e);
          return this.ensure(t), this.buffer.write(e, this.offset), this.offset += t, this;
        }
        add(e) {
          return this.ensure(
            e.length
          ), e.copy(this.buffer, this.offset), this.offset += e.length, this;
        }
        join(e) {
          if (e) {
            this.buffer[this.headerPosition] = e;
            let t = this.offset - (this.headerPosition + 1);
            this.buffer.writeInt32BE(t, this.headerPosition + 1);
          }
          return this.buffer.slice(e ? 0 : 5, this.offset);
        }
        flush(e) {
          let t = this.join(e);
          return this.offset = 5, this.headerPosition = 0, this.buffer = d.allocUnsafe(this.size), t;
        }
      };
      a(hn, "Writer");
      var fn = hn;
      Rt.Writer = fn;
    });
    Ws = T((Ft) => {
      "use strict";
      p();
      Object.defineProperty(Ft, "__esModule", { value: true });
      Ft.serialize = void 0;
      var pn = Qs(), F = new pn.Writer(), yc = a((r) => {
        F.addInt16(3).addInt16(0);
        for (let n of Object.keys(r)) F.addCString(
          n
        ).addCString(r[n]);
        F.addCString("client_encoding").addCString("UTF8");
        let e = F.addCString("").flush(), t = e.length + 4;
        return new pn.Writer().addInt32(t).add(e).flush();
      }, "startup"), mc = a(() => {
        let r = d.allocUnsafe(
          8
        );
        return r.writeInt32BE(8, 0), r.writeInt32BE(80877103, 4), r;
      }, "requestSsl"), wc = a((r) => F.addCString(r).flush(
        112
      ), "password"), gc = a(function(r, e) {
        return F.addCString(r).addInt32(d.byteLength(e)).addString(e), F.flush(112);
      }, "sendSASLInitialResponseMessage"), bc = a(function(r) {
        return F.addString(r).flush(112);
      }, "sendSCRAMClientFinalMessage"), vc = a((r) => F.addCString(r).flush(81), "query"), Ns = [], xc = a((r) => {
        let e = r.name || "";
        e.length > 63 && (console.error("Warning! Postgres only supports 63 characters for query names."), console.error("You supplied %s (%s)", e, e.length), console.error("This can cause conflicts and silent errors executing queries"));
        let t = r.types || Ns, n = t.length, i = F.addCString(e).addCString(r.text).addInt16(n);
        for (let s = 0; s < n; s++) i.addInt32(t[s]);
        return F.flush(80);
      }, "parse"), qe = new pn.Writer(), Sc = a(function(r, e) {
        for (let t = 0; t < r.length; t++) {
          let n = e ? e(r[t], t) : r[t];
          n == null ? (F.addInt16(0), qe.addInt32(-1)) : n instanceof d ? (F.addInt16(
            1
          ), qe.addInt32(n.length), qe.add(n)) : (F.addInt16(0), qe.addInt32(d.byteLength(n)), qe.addString(n));
        }
      }, "writeValues"), Ec = a((r = {}) => {
        let e = r.portal || "", t = r.statement || "", n = r.binary || false, i = r.values || Ns, s = i.length;
        return F.addCString(e).addCString(t), F.addInt16(s), Sc(i, r.valueMapper), F.addInt16(s), F.add(qe.flush()), F.addInt16(n ? 1 : 0), F.flush(66);
      }, "bind"), Ac = d.from([69, 0, 0, 0, 9, 0, 0, 0, 0, 0]), Cc = a((r) => {
        if (!r || !r.portal && !r.rows) return Ac;
        let e = r.portal || "", t = r.rows || 0, n = d.byteLength(e), i = 4 + n + 1 + 4, s = d.allocUnsafe(1 + i);
        return s[0] = 69, s.writeInt32BE(i, 1), s.write(e, 5, "utf-8"), s[n + 5] = 0, s.writeUInt32BE(t, s.length - 4), s;
      }, "execute"), _c = a(
        (r, e) => {
          let t = d.allocUnsafe(16);
          return t.writeInt32BE(16, 0), t.writeInt16BE(1234, 4), t.writeInt16BE(
            5678,
            6
          ), t.writeInt32BE(r, 8), t.writeInt32BE(e, 12), t;
        },
        "cancel"
      ), dn = a((r, e) => {
        let n = 4 + d.byteLength(e) + 1, i = d.allocUnsafe(1 + n);
        return i[0] = r, i.writeInt32BE(n, 1), i.write(e, 5, "utf-8"), i[n] = 0, i;
      }, "cstringMessage"), Ic = F.addCString("P").flush(68), Tc = F.addCString("S").flush(68), Pc = a((r) => r.name ? dn(68, `${r.type}${r.name || ""}`) : r.type === "P" ? Ic : Tc, "describe"), Bc = a((r) => {
        let e = `${r.type}${r.name || ""}`;
        return dn(67, e);
      }, "close"), Rc = a((r) => F.add(r).flush(100), "copyData"), Lc = a((r) => dn(102, r), "copyFail"), Lt = a((r) => d.from([r, 0, 0, 0, 4]), "codeOnlyBuffer"), Fc = Lt(72), kc = Lt(83), Mc = Lt(88), Uc = Lt(99), Dc = {
        startup: yc,
        password: wc,
        requestSsl: mc,
        sendSASLInitialResponseMessage: gc,
        sendSCRAMClientFinalMessage: bc,
        query: vc,
        parse: xc,
        bind: Ec,
        execute: Cc,
        describe: Pc,
        close: Bc,
        flush: a(
          () => Fc,
          "flush"
        ),
        sync: a(() => kc, "sync"),
        end: a(() => Mc, "end"),
        copyData: Rc,
        copyDone: a(() => Uc, "copyDone"),
        copyFail: Lc,
        cancel: _c
      };
      Ft.serialize = Dc;
    });
    js = T((kt) => {
      "use strict";
      p();
      Object.defineProperty(kt, "__esModule", { value: true });
      kt.BufferReader = void 0;
      var Oc = d.allocUnsafe(0), mn = class mn {
        static {
          __name(this, "mn");
        }
        constructor(e = 0) {
          this.offset = e, this.buffer = Oc, this.encoding = "utf-8";
        }
        setBuffer(e, t) {
          this.offset = e, this.buffer = t;
        }
        int16() {
          let e = this.buffer.readInt16BE(this.offset);
          return this.offset += 2, e;
        }
        byte() {
          let e = this.buffer[this.offset];
          return this.offset++, e;
        }
        int32() {
          let e = this.buffer.readInt32BE(
            this.offset
          );
          return this.offset += 4, e;
        }
        uint32() {
          let e = this.buffer.readUInt32BE(this.offset);
          return this.offset += 4, e;
        }
        string(e) {
          let t = this.buffer.toString(this.encoding, this.offset, this.offset + e);
          return this.offset += e, t;
        }
        cstring() {
          let e = this.offset, t = e;
          for (; this.buffer[t++] !== 0; ) ;
          return this.offset = t, this.buffer.toString(this.encoding, e, t - 1);
        }
        bytes(e) {
          let t = this.buffer.slice(this.offset, this.offset + e);
          return this.offset += e, t;
        }
      };
      a(mn, "BufferReader");
      var yn = mn;
      kt.BufferReader = yn;
    });
    Gs = T((Mt) => {
      "use strict";
      p();
      Object.defineProperty(Mt, "__esModule", { value: true });
      Mt.Parser = void 0;
      var k = ln(), qc = js(), wn = 1, Qc = 4, Hs = wn + Qc, $s = d.allocUnsafe(0), bn = class bn {
        static {
          __name(this, "bn");
        }
        constructor(e) {
          if (this.buffer = $s, this.bufferLength = 0, this.bufferOffset = 0, this.reader = new qc.BufferReader(), e?.mode === "binary") throw new Error("Binary mode not supported yet");
          this.mode = e?.mode || "text";
        }
        parse(e, t) {
          this.mergeBuffer(e);
          let n = this.bufferOffset + this.bufferLength, i = this.bufferOffset;
          for (; i + Hs <= n; ) {
            let s = this.buffer[i], o = this.buffer.readUInt32BE(
              i + wn
            ), u = wn + o;
            if (u + i <= n) {
              let c = this.handlePacket(i + Hs, s, o, this.buffer);
              t(c), i += u;
            } else break;
          }
          i === n ? (this.buffer = $s, this.bufferLength = 0, this.bufferOffset = 0) : (this.bufferLength = n - i, this.bufferOffset = i);
        }
        mergeBuffer(e) {
          if (this.bufferLength > 0) {
            let t = this.bufferLength + e.byteLength;
            if (t + this.bufferOffset > this.buffer.byteLength) {
              let i;
              if (t <= this.buffer.byteLength && this.bufferOffset >= this.bufferLength) i = this.buffer;
              else {
                let s = this.buffer.byteLength * 2;
                for (; t >= s; ) s *= 2;
                i = d.allocUnsafe(s);
              }
              this.buffer.copy(i, 0, this.bufferOffset, this.bufferOffset + this.bufferLength), this.buffer = i, this.bufferOffset = 0;
            }
            e.copy(this.buffer, this.bufferOffset + this.bufferLength), this.bufferLength = t;
          } else this.buffer = e, this.bufferOffset = 0, this.bufferLength = e.byteLength;
        }
        handlePacket(e, t, n, i) {
          switch (t) {
            case 50:
              return k.bindComplete;
            case 49:
              return k.parseComplete;
            case 51:
              return k.closeComplete;
            case 110:
              return k.noData;
            case 115:
              return k.portalSuspended;
            case 99:
              return k.copyDone;
            case 87:
              return k.replicationStart;
            case 73:
              return k.emptyQuery;
            case 68:
              return this.parseDataRowMessage(e, n, i);
            case 67:
              return this.parseCommandCompleteMessage(
                e,
                n,
                i
              );
            case 90:
              return this.parseReadyForQueryMessage(e, n, i);
            case 65:
              return this.parseNotificationMessage(
                e,
                n,
                i
              );
            case 82:
              return this.parseAuthenticationResponse(e, n, i);
            case 83:
              return this.parseParameterStatusMessage(
                e,
                n,
                i
              );
            case 75:
              return this.parseBackendKeyData(e, n, i);
            case 69:
              return this.parseErrorMessage(e, n, i, "error");
            case 78:
              return this.parseErrorMessage(e, n, i, "notice");
            case 84:
              return this.parseRowDescriptionMessage(
                e,
                n,
                i
              );
            case 116:
              return this.parseParameterDescriptionMessage(e, n, i);
            case 71:
              return this.parseCopyInMessage(
                e,
                n,
                i
              );
            case 72:
              return this.parseCopyOutMessage(e, n, i);
            case 100:
              return this.parseCopyData(e, n, i);
            default:
              return new k.DatabaseError("received invalid response: " + t.toString(16), n, "error");
          }
        }
        parseReadyForQueryMessage(e, t, n) {
          this.reader.setBuffer(e, n);
          let i = this.reader.string(1);
          return new k.ReadyForQueryMessage(t, i);
        }
        parseCommandCompleteMessage(e, t, n) {
          this.reader.setBuffer(e, n);
          let i = this.reader.cstring();
          return new k.CommandCompleteMessage(t, i);
        }
        parseCopyData(e, t, n) {
          let i = n.slice(e, e + (t - 4));
          return new k.CopyDataMessage(t, i);
        }
        parseCopyInMessage(e, t, n) {
          return this.parseCopyMessage(
            e,
            t,
            n,
            "copyInResponse"
          );
        }
        parseCopyOutMessage(e, t, n) {
          return this.parseCopyMessage(e, t, n, "copyOutResponse");
        }
        parseCopyMessage(e, t, n, i) {
          this.reader.setBuffer(e, n);
          let s = this.reader.byte() !== 0, o = this.reader.int16(), u = new k.CopyResponse(t, i, s, o);
          for (let c = 0; c < o; c++) u.columnTypes[c] = this.reader.int16();
          return u;
        }
        parseNotificationMessage(e, t, n) {
          this.reader.setBuffer(e, n);
          let i = this.reader.int32(), s = this.reader.cstring(), o = this.reader.cstring();
          return new k.NotificationResponseMessage(t, i, s, o);
        }
        parseRowDescriptionMessage(e, t, n) {
          this.reader.setBuffer(
            e,
            n
          );
          let i = this.reader.int16(), s = new k.RowDescriptionMessage(t, i);
          for (let o = 0; o < i; o++) s.fields[o] = this.parseField();
          return s;
        }
        parseField() {
          let e = this.reader.cstring(), t = this.reader.uint32(), n = this.reader.int16(), i = this.reader.uint32(), s = this.reader.int16(), o = this.reader.int32(), u = this.reader.int16() === 0 ? "text" : "binary";
          return new k.Field(e, t, n, i, s, o, u);
        }
        parseParameterDescriptionMessage(e, t, n) {
          this.reader.setBuffer(e, n);
          let i = this.reader.int16(), s = new k.ParameterDescriptionMessage(t, i);
          for (let o = 0; o < i; o++)
            s.dataTypeIDs[o] = this.reader.int32();
          return s;
        }
        parseDataRowMessage(e, t, n) {
          this.reader.setBuffer(e, n);
          let i = this.reader.int16(), s = new Array(i);
          for (let o = 0; o < i; o++) {
            let u = this.reader.int32();
            s[o] = u === -1 ? null : this.reader.string(u);
          }
          return new k.DataRowMessage(t, s);
        }
        parseParameterStatusMessage(e, t, n) {
          this.reader.setBuffer(e, n);
          let i = this.reader.cstring(), s = this.reader.cstring();
          return new k.ParameterStatusMessage(
            t,
            i,
            s
          );
        }
        parseBackendKeyData(e, t, n) {
          this.reader.setBuffer(e, n);
          let i = this.reader.int32(), s = this.reader.int32();
          return new k.BackendKeyDataMessage(t, i, s);
        }
        parseAuthenticationResponse(e, t, n) {
          this.reader.setBuffer(
            e,
            n
          );
          let i = this.reader.int32(), s = { name: "authenticationOk", length: t };
          switch (i) {
            case 0:
              break;
            case 3:
              s.length === 8 && (s.name = "authenticationCleartextPassword");
              break;
            case 5:
              if (s.length === 12) {
                s.name = "authenticationMD5Password";
                let o = this.reader.bytes(4);
                return new k.AuthenticationMD5Password(t, o);
              }
              break;
            case 10:
              {
                s.name = "authenticationSASL", s.mechanisms = [];
                let o;
                do
                  o = this.reader.cstring(), o && s.mechanisms.push(o);
                while (o);
              }
              break;
            case 11:
              s.name = "authenticationSASLContinue", s.data = this.reader.string(t - 8);
              break;
            case 12:
              s.name = "authenticationSASLFinal", s.data = this.reader.string(t - 8);
              break;
            default:
              throw new Error("Unknown authenticationOk message type " + i);
          }
          return s;
        }
        parseErrorMessage(e, t, n, i) {
          this.reader.setBuffer(e, n);
          let s = {}, o = this.reader.string(1);
          for (; o !== "\0"; ) s[o] = this.reader.cstring(), o = this.reader.string(1);
          let u = s.M, c = i === "notice" ? new k.NoticeMessage(t, u) : new k.DatabaseError(u, t, i);
          return c.severity = s.S, c.code = s.C, c.detail = s.D, c.hint = s.H, c.position = s.P, c.internalPosition = s.p, c.internalQuery = s.q, c.where = s.W, c.schema = s.s, c.table = s.t, c.column = s.c, c.dataType = s.d, c.constraint = s.n, c.file = s.F, c.line = s.L, c.routine = s.R, c;
        }
      };
      a(bn, "Parser");
      var gn = bn;
      Mt.Parser = gn;
    });
    vn = T((xe) => {
      "use strict";
      p();
      Object.defineProperty(xe, "__esModule", { value: true });
      xe.DatabaseError = xe.serialize = xe.parse = void 0;
      var Nc = ln();
      Object.defineProperty(xe, "DatabaseError", { enumerable: true, get: a(
        function() {
          return Nc.DatabaseError;
        },
        "get"
      ) });
      var Wc = Ws();
      Object.defineProperty(xe, "serialize", {
        enumerable: true,
        get: a(function() {
          return Wc.serialize;
        }, "get")
      });
      var jc = Gs();
      function Hc(r, e) {
        let t = new jc.Parser();
        return r.on("data", (n) => t.parse(n, e)), new Promise((n) => r.on("end", () => n()));
      }
      __name(Hc, "Hc");
      a(Hc, "parse");
      xe.parse = Hc;
    });
    Vs = {};
    ie(Vs, { connect: /* @__PURE__ */ __name(() => $c, "connect") });
    __name($c, "$c");
    zs = G(
      () => {
        "use strict";
        p();
        a($c, "connect");
      }
    );
    En = T((Xh, Zs) => {
      "use strict";
      p();
      var Ks = (Fe(), O(wi)), Gc = ge().EventEmitter, { parse: Vc, serialize: Q } = vn(), Ys = Q.flush(), zc = Q.sync(), Kc = Q.end(), Sn = class Sn extends Gc {
        static {
          __name(this, "Sn");
        }
        constructor(e) {
          super(), e = e || {}, this.stream = e.stream || new Ks.Socket(), this._keepAlive = e.keepAlive, this._keepAliveInitialDelayMillis = e.keepAliveInitialDelayMillis, this.lastBuffer = false, this.parsedStatements = {}, this.ssl = e.ssl || false, this._ending = false, this._emitMessage = false;
          var t = this;
          this.on("newListener", function(n) {
            n === "message" && (t._emitMessage = true);
          });
        }
        connect(e, t) {
          var n = this;
          this._connecting = true, this.stream.setNoDelay(true), this.stream.connect(e, t), this.stream.once("connect", function() {
            n._keepAlive && n.stream.setKeepAlive(true, n._keepAliveInitialDelayMillis), n.emit("connect");
          });
          let i = a(function(s) {
            n._ending && (s.code === "ECONNRESET" || s.code === "EPIPE") || n.emit("error", s);
          }, "reportStreamError");
          if (this.stream.on("error", i), this.stream.on("close", function() {
            n.emit("end");
          }), !this.ssl) return this.attachListeners(
            this.stream
          );
          this.stream.once("data", function(s) {
            var o = s.toString("utf8");
            switch (o) {
              case "S":
                break;
              case "N":
                return n.stream.end(), n.emit("error", new Error("The server does not support SSL connections"));
              default:
                return n.stream.end(), n.emit("error", new Error("There was an error establishing an SSL connection"));
            }
            var u = (zs(), O(Vs));
            let c = { socket: n.stream };
            n.ssl !== true && (Object.assign(c, n.ssl), "key" in n.ssl && (c.key = n.ssl.key)), Ks.isIP(t) === 0 && (c.servername = t);
            try {
              n.stream = u.connect(c);
            } catch (l) {
              return n.emit(
                "error",
                l
              );
            }
            n.attachListeners(n.stream), n.stream.on("error", i), n.emit("sslconnect");
          });
        }
        attachListeners(e) {
          e.on(
            "end",
            () => {
              this.emit("end");
            }
          ), Vc(e, (t) => {
            var n = t.name === "error" ? "errorMessage" : t.name;
            this._emitMessage && this.emit("message", t), this.emit(n, t);
          });
        }
        requestSsl() {
          this.stream.write(Q.requestSsl());
        }
        startup(e) {
          this.stream.write(Q.startup(e));
        }
        cancel(e, t) {
          this._send(Q.cancel(e, t));
        }
        password(e) {
          this._send(Q.password(e));
        }
        sendSASLInitialResponseMessage(e, t) {
          this._send(Q.sendSASLInitialResponseMessage(e, t));
        }
        sendSCRAMClientFinalMessage(e) {
          this._send(Q.sendSCRAMClientFinalMessage(
            e
          ));
        }
        _send(e) {
          return this.stream.writable ? this.stream.write(e) : false;
        }
        query(e) {
          this._send(Q.query(e));
        }
        parse(e) {
          this._send(Q.parse(e));
        }
        bind(e) {
          this._send(Q.bind(e));
        }
        execute(e) {
          this._send(Q.execute(e));
        }
        flush() {
          this.stream.writable && this.stream.write(Ys);
        }
        sync() {
          this._ending = true, this._send(Ys), this._send(zc);
        }
        ref() {
          this.stream.ref();
        }
        unref() {
          this.stream.unref();
        }
        end() {
          if (this._ending = true, !this._connecting || !this.stream.writable) {
            this.stream.end();
            return;
          }
          return this.stream.write(Kc, () => {
            this.stream.end();
          });
        }
        close(e) {
          this._send(Q.close(e));
        }
        describe(e) {
          this._send(Q.describe(e));
        }
        sendCopyFromChunk(e) {
          this._send(Q.copyData(e));
        }
        endCopyFrom() {
          this._send(Q.copyDone());
        }
        sendCopyFail(e) {
          this._send(Q.copyFail(e));
        }
      };
      a(Sn, "Connection");
      var xn = Sn;
      Zs.exports = xn;
    });
    eo = T((np, Xs) => {
      "use strict";
      p();
      var Yc = ge().EventEmitter, rp = (it(), O(nt)), Zc = rt(), An = ds(), Jc = Cs(), Xc = At(), el = Bt(), Js = qs(), tl = tt(), rl = En(), Cn = class Cn extends Yc {
        static {
          __name(this, "Cn");
        }
        constructor(e) {
          super(), this.connectionParameters = new el(e), this.user = this.connectionParameters.user, this.database = this.connectionParameters.database, this.port = this.connectionParameters.port, this.host = this.connectionParameters.host, Object.defineProperty(
            this,
            "password",
            { configurable: true, enumerable: false, writable: true, value: this.connectionParameters.password }
          ), this.replication = this.connectionParameters.replication;
          var t = e || {};
          this._Promise = t.Promise || b.Promise, this._types = new Xc(t.types), this._ending = false, this._connecting = false, this._connected = false, this._connectionError = false, this._queryable = true, this.connection = t.connection || new rl({ stream: t.stream, ssl: this.connectionParameters.ssl, keepAlive: t.keepAlive || false, keepAliveInitialDelayMillis: t.keepAliveInitialDelayMillis || 0, encoding: this.connectionParameters.client_encoding || "utf8" }), this.queryQueue = [], this.binary = t.binary || tl.binary, this.processID = null, this.secretKey = null, this.ssl = this.connectionParameters.ssl || false, this.ssl && this.ssl.key && Object.defineProperty(this.ssl, "key", { enumerable: false }), this._connectionTimeoutMillis = t.connectionTimeoutMillis || 0;
        }
        _errorAllQueries(e) {
          let t = a((n) => {
            m.nextTick(() => {
              n.handleError(e, this.connection);
            });
          }, "enqueueError");
          this.activeQuery && (t(this.activeQuery), this.activeQuery = null), this.queryQueue.forEach(t), this.queryQueue.length = 0;
        }
        _connect(e) {
          var t = this, n = this.connection;
          if (this._connectionCallback = e, this._connecting || this._connected) {
            let i = new Error("Client has already been connected. You cannot reuse a client.");
            m.nextTick(
              () => {
                e(i);
              }
            );
            return;
          }
          this._connecting = true, this.connectionTimeoutHandle, this._connectionTimeoutMillis > 0 && (this.connectionTimeoutHandle = setTimeout(() => {
            n._ending = true, n.stream.destroy(new Error("timeout expired"));
          }, this._connectionTimeoutMillis)), this.host && this.host.indexOf("/") === 0 ? n.connect(this.host + "/.s.PGSQL." + this.port) : n.connect(this.port, this.host), n.on("connect", function() {
            t.ssl ? n.requestSsl() : n.startup(t.getStartupConf());
          }), n.on("sslconnect", function() {
            n.startup(t.getStartupConf());
          }), this._attachListeners(
            n
          ), n.once("end", () => {
            let i = this._ending ? new Error("Connection terminated") : new Error("Connection terminated unexpectedly");
            clearTimeout(this.connectionTimeoutHandle), this._errorAllQueries(i), this._ending || (this._connecting && !this._connectionError ? this._connectionCallback ? this._connectionCallback(i) : this._handleErrorEvent(i) : this._connectionError || this._handleErrorEvent(i)), m.nextTick(() => {
              this.emit("end");
            });
          });
        }
        connect(e) {
          if (e) {
            this._connect(e);
            return;
          }
          return new this._Promise((t, n) => {
            this._connect((i) => {
              i ? n(i) : t();
            });
          });
        }
        _attachListeners(e) {
          e.on("authenticationCleartextPassword", this._handleAuthCleartextPassword.bind(this)), e.on("authenticationMD5Password", this._handleAuthMD5Password.bind(this)), e.on("authenticationSASL", this._handleAuthSASL.bind(this)), e.on("authenticationSASLContinue", this._handleAuthSASLContinue.bind(this)), e.on("authenticationSASLFinal", this._handleAuthSASLFinal.bind(this)), e.on("backendKeyData", this._handleBackendKeyData.bind(this)), e.on("error", this._handleErrorEvent.bind(this)), e.on("errorMessage", this._handleErrorMessage.bind(this)), e.on("readyForQuery", this._handleReadyForQuery.bind(this)), e.on("notice", this._handleNotice.bind(this)), e.on("rowDescription", this._handleRowDescription.bind(this)), e.on("dataRow", this._handleDataRow.bind(this)), e.on("portalSuspended", this._handlePortalSuspended.bind(
            this
          )), e.on("emptyQuery", this._handleEmptyQuery.bind(this)), e.on("commandComplete", this._handleCommandComplete.bind(this)), e.on("parseComplete", this._handleParseComplete.bind(this)), e.on("copyInResponse", this._handleCopyInResponse.bind(this)), e.on("copyData", this._handleCopyData.bind(this)), e.on("notification", this._handleNotification.bind(this));
        }
        _checkPgPass(e) {
          let t = this.connection;
          typeof this.password == "function" ? this._Promise.resolve().then(() => this.password()).then((n) => {
            if (n !== void 0) {
              if (typeof n != "string") {
                t.emit("error", new TypeError(
                  "Password must be a string"
                ));
                return;
              }
              this.connectionParameters.password = this.password = n;
            } else this.connectionParameters.password = this.password = null;
            e();
          }).catch((n) => {
            t.emit("error", n);
          }) : this.password !== null ? e() : Jc(
            this.connectionParameters,
            (n) => {
              n !== void 0 && (this.connectionParameters.password = this.password = n), e();
            }
          );
        }
        _handleAuthCleartextPassword(e) {
          this._checkPgPass(() => {
            this.connection.password(this.password);
          });
        }
        _handleAuthMD5Password(e) {
          this._checkPgPass(
            () => {
              let t = Zc.postgresMd5PasswordHash(this.user, this.password, e.salt);
              this.connection.password(t);
            }
          );
        }
        _handleAuthSASL(e) {
          this._checkPgPass(() => {
            this.saslSession = An.startSession(e.mechanisms), this.connection.sendSASLInitialResponseMessage(
              this.saslSession.mechanism,
              this.saslSession.response
            );
          });
        }
        _handleAuthSASLContinue(e) {
          An.continueSession(
            this.saslSession,
            this.password,
            e.data
          ), this.connection.sendSCRAMClientFinalMessage(this.saslSession.response);
        }
        _handleAuthSASLFinal(e) {
          An.finalizeSession(this.saslSession, e.data), this.saslSession = null;
        }
        _handleBackendKeyData(e) {
          this.processID = e.processID, this.secretKey = e.secretKey;
        }
        _handleReadyForQuery(e) {
          this._connecting && (this._connecting = false, this._connected = true, clearTimeout(this.connectionTimeoutHandle), this._connectionCallback && (this._connectionCallback(null, this), this._connectionCallback = null), this.emit("connect"));
          let { activeQuery: t } = this;
          this.activeQuery = null, this.readyForQuery = true, t && t.handleReadyForQuery(this.connection), this._pulseQueryQueue();
        }
        _handleErrorWhileConnecting(e) {
          if (!this._connectionError) {
            if (this._connectionError = true, clearTimeout(this.connectionTimeoutHandle), this._connectionCallback) return this._connectionCallback(e);
            this.emit("error", e);
          }
        }
        _handleErrorEvent(e) {
          if (this._connecting) return this._handleErrorWhileConnecting(e);
          this._queryable = false, this._errorAllQueries(e), this.emit("error", e);
        }
        _handleErrorMessage(e) {
          if (this._connecting) return this._handleErrorWhileConnecting(e);
          let t = this.activeQuery;
          if (!t) {
            this._handleErrorEvent(e);
            return;
          }
          this.activeQuery = null, t.handleError(
            e,
            this.connection
          );
        }
        _handleRowDescription(e) {
          this.activeQuery.handleRowDescription(e);
        }
        _handleDataRow(e) {
          this.activeQuery.handleDataRow(e);
        }
        _handlePortalSuspended(e) {
          this.activeQuery.handlePortalSuspended(this.connection);
        }
        _handleEmptyQuery(e) {
          this.activeQuery.handleEmptyQuery(this.connection);
        }
        _handleCommandComplete(e) {
          this.activeQuery.handleCommandComplete(e, this.connection);
        }
        _handleParseComplete(e) {
          this.activeQuery.name && (this.connection.parsedStatements[this.activeQuery.name] = this.activeQuery.text);
        }
        _handleCopyInResponse(e) {
          this.activeQuery.handleCopyInResponse(this.connection);
        }
        _handleCopyData(e) {
          this.activeQuery.handleCopyData(
            e,
            this.connection
          );
        }
        _handleNotification(e) {
          this.emit("notification", e);
        }
        _handleNotice(e) {
          this.emit("notice", e);
        }
        getStartupConf() {
          var e = this.connectionParameters, t = { user: e.user, database: e.database }, n = e.application_name || e.fallback_application_name;
          return n && (t.application_name = n), e.replication && (t.replication = "" + e.replication), e.statement_timeout && (t.statement_timeout = String(parseInt(e.statement_timeout, 10))), e.lock_timeout && (t.lock_timeout = String(parseInt(e.lock_timeout, 10))), e.idle_in_transaction_session_timeout && (t.idle_in_transaction_session_timeout = String(parseInt(e.idle_in_transaction_session_timeout, 10))), e.options && (t.options = e.options), t;
        }
        cancel(e, t) {
          if (e.activeQuery === t) {
            var n = this.connection;
            this.host && this.host.indexOf("/") === 0 ? n.connect(this.host + "/.s.PGSQL." + this.port) : n.connect(this.port, this.host), n.on("connect", function() {
              n.cancel(
                e.processID,
                e.secretKey
              );
            });
          } else e.queryQueue.indexOf(t) !== -1 && e.queryQueue.splice(e.queryQueue.indexOf(t), 1);
        }
        setTypeParser(e, t, n) {
          return this._types.setTypeParser(e, t, n);
        }
        getTypeParser(e, t) {
          return this._types.getTypeParser(e, t);
        }
        escapeIdentifier(e) {
          return '"' + e.replace(/"/g, '""') + '"';
        }
        escapeLiteral(e) {
          for (var t = false, n = "'", i = 0; i < e.length; i++) {
            var s = e[i];
            s === "'" ? n += s + s : s === "\\" ? (n += s + s, t = true) : n += s;
          }
          return n += "'", t === true && (n = " E" + n), n;
        }
        _pulseQueryQueue() {
          if (this.readyForQuery === true) if (this.activeQuery = this.queryQueue.shift(), this.activeQuery) {
            this.readyForQuery = false, this.hasExecuted = true;
            let e = this.activeQuery.submit(this.connection);
            e && m.nextTick(() => {
              this.activeQuery.handleError(e, this.connection), this.readyForQuery = true, this._pulseQueryQueue();
            });
          } else this.hasExecuted && (this.activeQuery = null, this.emit("drain"));
        }
        query(e, t, n) {
          var i, s, o, u, c;
          if (e == null) throw new TypeError(
            "Client was passed a null or undefined query"
          );
          return typeof e.submit == "function" ? (o = e.query_timeout || this.connectionParameters.query_timeout, s = i = e, typeof t == "function" && (i.callback = i.callback || t)) : (o = this.connectionParameters.query_timeout, i = new Js(e, t, n), i.callback || (s = new this._Promise((l, f) => {
            i.callback = (y, g) => y ? f(y) : l(g);
          }))), o && (c = i.callback, u = setTimeout(() => {
            var l = new Error("Query read timeout");
            m.nextTick(
              () => {
                i.handleError(l, this.connection);
              }
            ), c(l), i.callback = () => {
            };
            var f = this.queryQueue.indexOf(i);
            f > -1 && this.queryQueue.splice(f, 1), this._pulseQueryQueue();
          }, o), i.callback = (l, f) => {
            clearTimeout(u), c(l, f);
          }), this.binary && !i.binary && (i.binary = true), i._result && !i._result._types && (i._result._types = this._types), this._queryable ? this._ending ? (m.nextTick(() => {
            i.handleError(new Error("Client was closed and is not queryable"), this.connection);
          }), s) : (this.queryQueue.push(i), this._pulseQueryQueue(), s) : (m.nextTick(() => {
            i.handleError(new Error("Client has encountered a connection error and is not queryable"), this.connection);
          }), s);
        }
        ref() {
          this.connection.ref();
        }
        unref() {
          this.connection.unref();
        }
        end(e) {
          if (this._ending = true, !this.connection._connecting) if (e) e();
          else return this._Promise.resolve();
          if (this.activeQuery || !this._queryable ? this.connection.stream.destroy() : this.connection.end(), e) this.connection.once("end", e);
          else return new this._Promise((t) => {
            this.connection.once("end", t);
          });
        }
      };
      a(Cn, "Client");
      var Ut = Cn;
      Ut.Query = Js;
      Xs.exports = Ut;
    });
    io = T((op, no) => {
      "use strict";
      p();
      var nl = ge().EventEmitter, to = a(function() {
      }, "NOOP"), ro = a((r, e) => {
        let t = r.findIndex(e);
        return t === -1 ? void 0 : r.splice(t, 1)[0];
      }, "removeWhere"), Tn = class Tn {
        static {
          __name(this, "Tn");
        }
        constructor(e, t, n) {
          this.client = e, this.idleListener = t, this.timeoutId = n;
        }
      };
      a(Tn, "IdleItem");
      var _n = Tn, Pn = class Pn {
        static {
          __name(this, "Pn");
        }
        constructor(e) {
          this.callback = e;
        }
      };
      a(Pn, "PendingItem");
      var Qe = Pn;
      function il() {
        throw new Error("Release called on client which has already been released to the pool.");
      }
      __name(il, "il");
      a(il, "throwOnDoubleRelease");
      function Dt(r, e) {
        if (e)
          return { callback: e, result: void 0 };
        let t, n, i = a(function(o, u) {
          o ? t(o) : n(u);
        }, "cb"), s = new r(function(o, u) {
          n = o, t = u;
        }).catch((o) => {
          throw Error.captureStackTrace(o), o;
        });
        return { callback: i, result: s };
      }
      __name(Dt, "Dt");
      a(Dt, "promisify");
      function sl(r, e) {
        return a(/* @__PURE__ */ __name(function t(n) {
          n.client = e, e.removeListener("error", t), e.on("error", () => {
            r.log(
              "additional client error after disconnection due to error",
              n
            );
          }), r._remove(e), r.emit("error", n, e);
        }, "t"), "idleListener");
      }
      __name(sl, "sl");
      a(sl, "makeIdleListener");
      var Bn = class Bn extends nl {
        static {
          __name(this, "Bn");
        }
        constructor(e, t) {
          super(), this.options = Object.assign({}, e), e != null && "password" in e && Object.defineProperty(this.options, "password", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: e.password
          }), e != null && e.ssl && e.ssl.key && Object.defineProperty(this.options.ssl, "key", { enumerable: false }), this.options.max = this.options.max || this.options.poolSize || 10, this.options.min = this.options.min || 0, this.options.maxUses = this.options.maxUses || 1 / 0, this.options.allowExitOnIdle = this.options.allowExitOnIdle || false, this.options.maxLifetimeSeconds = this.options.maxLifetimeSeconds || 0, this.log = this.options.log || function() {
          }, this.Client = this.options.Client || t || ot().Client, this.Promise = this.options.Promise || b.Promise, typeof this.options.idleTimeoutMillis > "u" && (this.options.idleTimeoutMillis = 1e4), this._clients = [], this._idle = [], this._expired = /* @__PURE__ */ new WeakSet(), this._pendingQueue = [], this._endCallback = void 0, this.ending = false, this.ended = false;
        }
        _isFull() {
          return this._clients.length >= this.options.max;
        }
        _isAboveMin() {
          return this._clients.length > this.options.min;
        }
        _pulseQueue() {
          if (this.log("pulse queue"), this.ended) {
            this.log("pulse queue ended");
            return;
          }
          if (this.ending) {
            this.log("pulse queue on ending"), this._idle.length && this._idle.slice().map((t) => {
              this._remove(t.client);
            }), this._clients.length || (this.ended = true, this._endCallback());
            return;
          }
          if (!this._pendingQueue.length) {
            this.log("no queued requests");
            return;
          }
          if (!this._idle.length && this._isFull()) return;
          let e = this._pendingQueue.shift();
          if (this._idle.length) {
            let t = this._idle.pop();
            clearTimeout(
              t.timeoutId
            );
            let n = t.client;
            n.ref && n.ref();
            let i = t.idleListener;
            return this._acquireClient(n, e, i, false);
          }
          if (!this._isFull()) return this.newClient(e);
          throw new Error("unexpected condition");
        }
        _remove(e) {
          let t = ro(
            this._idle,
            (n) => n.client === e
          );
          t !== void 0 && clearTimeout(t.timeoutId), this._clients = this._clients.filter(
            (n) => n !== e
          ), e.end(), this.emit("remove", e);
        }
        connect(e) {
          if (this.ending) {
            let i = new Error("Cannot use a pool after calling end on the pool");
            return e ? e(i) : this.Promise.reject(i);
          }
          let t = Dt(this.Promise, e), n = t.result;
          if (this._isFull() || this._idle.length) {
            if (this._idle.length && m.nextTick(() => this._pulseQueue()), !this.options.connectionTimeoutMillis) return this._pendingQueue.push(new Qe(t.callback)), n;
            let i = a((u, c, l) => {
              clearTimeout(o), t.callback(u, c, l);
            }, "queueCallback"), s = new Qe(i), o = setTimeout(() => {
              ro(
                this._pendingQueue,
                (u) => u.callback === i
              ), s.timedOut = true, t.callback(new Error("timeout exceeded when trying to connect"));
            }, this.options.connectionTimeoutMillis);
            return o.unref && o.unref(), this._pendingQueue.push(s), n;
          }
          return this.newClient(new Qe(t.callback)), n;
        }
        newClient(e) {
          let t = new this.Client(this.options);
          this._clients.push(
            t
          );
          let n = sl(this, t);
          this.log("checking client timeout");
          let i, s = false;
          this.options.connectionTimeoutMillis && (i = setTimeout(() => {
            this.log("ending client due to timeout"), s = true, t.connection ? t.connection.stream.destroy() : t.end();
          }, this.options.connectionTimeoutMillis)), this.log("connecting new client"), t.connect((o) => {
            if (i && clearTimeout(i), t.on("error", n), o) this.log("client failed to connect", o), this._clients = this._clients.filter((u) => u !== t), s && (o = new Error("Connection terminated due to connection timeout", { cause: o })), this._pulseQueue(), e.timedOut || e.callback(o, void 0, to);
            else {
              if (this.log("new client connected"), this.options.maxLifetimeSeconds !== 0) {
                let u = setTimeout(() => {
                  this.log("ending client due to expired lifetime"), this._expired.add(t), this._idle.findIndex((l) => l.client === t) !== -1 && this._acquireClient(
                    t,
                    new Qe((l, f, y) => y()),
                    n,
                    false
                  );
                }, this.options.maxLifetimeSeconds * 1e3);
                u.unref(), t.once("end", () => clearTimeout(u));
              }
              return this._acquireClient(t, e, n, true);
            }
          });
        }
        _acquireClient(e, t, n, i) {
          i && this.emit("connect", e), this.emit("acquire", e), e.release = this._releaseOnce(e, n), e.removeListener("error", n), t.timedOut ? i && this.options.verify ? this.options.verify(e, e.release) : e.release() : i && this.options.verify ? this.options.verify(e, (s) => {
            if (s) return e.release(s), t.callback(s, void 0, to);
            t.callback(void 0, e, e.release);
          }) : t.callback(void 0, e, e.release);
        }
        _releaseOnce(e, t) {
          let n = false;
          return (i) => {
            n && il(), n = true, this._release(e, t, i);
          };
        }
        _release(e, t, n) {
          if (e.on("error", t), e._poolUseCount = (e._poolUseCount || 0) + 1, this.emit("release", n, e), n || this.ending || !e._queryable || e._ending || e._poolUseCount >= this.options.maxUses) {
            e._poolUseCount >= this.options.maxUses && this.log("remove expended client"), this._remove(e), this._pulseQueue();
            return;
          }
          if (this._expired.has(e)) {
            this.log("remove expired client"), this._expired.delete(e), this._remove(e), this._pulseQueue();
            return;
          }
          let s;
          this.options.idleTimeoutMillis && this._isAboveMin() && (s = setTimeout(() => {
            this.log("remove idle client"), this._remove(e);
          }, this.options.idleTimeoutMillis), this.options.allowExitOnIdle && s.unref()), this.options.allowExitOnIdle && e.unref(), this._idle.push(new _n(
            e,
            t,
            s
          )), this._pulseQueue();
        }
        query(e, t, n) {
          if (typeof e == "function") {
            let s = Dt(this.Promise, e);
            return v(function() {
              return s.callback(new Error("Passing a function as the first parameter to pool.query is not supported"));
            }), s.result;
          }
          typeof t == "function" && (n = t, t = void 0);
          let i = Dt(this.Promise, n);
          return n = i.callback, this.connect((s, o) => {
            if (s) return n(s);
            let u = false, c = a((l) => {
              u || (u = true, o.release(l), n(l));
            }, "onError");
            o.once("error", c), this.log("dispatching query");
            try {
              o.query(e, t, (l, f) => {
                if (this.log("query dispatched"), o.removeListener(
                  "error",
                  c
                ), !u) return u = true, o.release(l), l ? n(l) : n(void 0, f);
              });
            } catch (l) {
              return o.release(l), n(l);
            }
          }), i.result;
        }
        end(e) {
          if (this.log("ending"), this.ending) {
            let n = new Error("Called end on pool more than once");
            return e ? e(n) : this.Promise.reject(n);
          }
          this.ending = true;
          let t = Dt(this.Promise, e);
          return this._endCallback = t.callback, this._pulseQueue(), t.result;
        }
        get waitingCount() {
          return this._pendingQueue.length;
        }
        get idleCount() {
          return this._idle.length;
        }
        get expiredCount() {
          return this._clients.reduce((e, t) => e + (this._expired.has(t) ? 1 : 0), 0);
        }
        get totalCount() {
          return this._clients.length;
        }
      };
      a(Bn, "Pool");
      var In = Bn;
      no.exports = In;
    });
    so = {};
    ie(so, { default: /* @__PURE__ */ __name(() => ol, "default") });
    oo = G(() => {
      "use strict";
      p();
      ol = {};
    });
    ao = T((lp, al) => {
      al.exports = { name: "pg", version: "8.8.0", description: "PostgreSQL client - pure javascript & libpq with the same API", keywords: [
        "database",
        "libpq",
        "pg",
        "postgre",
        "postgres",
        "postgresql",
        "rdbms"
      ], homepage: "https://github.com/brianc/node-postgres", repository: { type: "git", url: "git://github.com/brianc/node-postgres.git", directory: "packages/pg" }, author: "Brian Carlson <brian.m.carlson@gmail.com>", main: "./lib", dependencies: { "buffer-writer": "2.0.0", "packet-reader": "1.0.0", "pg-connection-string": "^2.5.0", "pg-pool": "^3.5.2", "pg-protocol": "^1.5.0", "pg-types": "^2.1.0", pgpass: "1.x" }, devDependencies: {
        async: "2.6.4",
        bluebird: "3.5.2",
        co: "4.6.0",
        "pg-copy-streams": "0.3.0"
      }, peerDependencies: { "pg-native": ">=3.0.1" }, peerDependenciesMeta: { "pg-native": { optional: true } }, scripts: { test: "make test-all" }, files: ["lib", "SPONSORS.md"], license: "MIT", engines: { node: ">= 8.0.0" }, gitHead: "c99fb2c127ddf8d712500db2c7b9a5491a178655" };
    });
    lo = T((fp, co) => {
      "use strict";
      p();
      var uo = ge().EventEmitter, ul = (it(), O(nt)), Rn = rt(), Ne = co.exports = function(r, e, t) {
        uo.call(this), r = Rn.normalizeQueryConfig(r, e, t), this.text = r.text, this.values = r.values, this.name = r.name, this.callback = r.callback, this.state = "new", this._arrayMode = r.rowMode === "array", this._emitRowEvents = false, this.on("newListener", function(n) {
          n === "row" && (this._emitRowEvents = true);
        }.bind(this));
      };
      ul.inherits(Ne, uo);
      var cl = { sqlState: "code", statementPosition: "position", messagePrimary: "message", context: "where", schemaName: "schema", tableName: "table", columnName: "column", dataTypeName: "dataType", constraintName: "constraint", sourceFile: "file", sourceLine: "line", sourceFunction: "routine" };
      Ne.prototype.handleError = function(r) {
        var e = this.native.pq.resultErrorFields();
        if (e) for (var t in e) {
          var n = cl[t] || t;
          r[n] = e[t];
        }
        this.callback ? this.callback(r) : this.emit("error", r), this.state = "error";
      };
      Ne.prototype.then = function(r, e) {
        return this._getPromise().then(
          r,
          e
        );
      };
      Ne.prototype.catch = function(r) {
        return this._getPromise().catch(r);
      };
      Ne.prototype._getPromise = function() {
        return this._promise ? this._promise : (this._promise = new Promise(function(r, e) {
          this._once("end", r), this._once("error", e);
        }.bind(this)), this._promise);
      };
      Ne.prototype.submit = function(r) {
        this.state = "running";
        var e = this;
        this.native = r.native, r.native.arrayMode = this._arrayMode;
        var t = a(function(s, o, u) {
          if (r.native.arrayMode = false, v(function() {
            e.emit("_done");
          }), s) return e.handleError(s);
          e._emitRowEvents && (u.length > 1 ? o.forEach(
            (c, l) => {
              c.forEach((f) => {
                e.emit("row", f, u[l]);
              });
            }
          ) : o.forEach(function(c) {
            e.emit("row", c, u);
          })), e.state = "end", e.emit("end", u), e.callback && e.callback(null, u);
        }, "after");
        if (m.domain && (t = m.domain.bind(t)), this.name) {
          this.name.length > 63 && (console.error("Warning! Postgres only supports 63 characters for query names."), console.error("You supplied %s (%s)", this.name, this.name.length), console.error("This can cause conflicts and silent errors executing queries"));
          var n = (this.values || []).map(Rn.prepareValue);
          if (r.namedQueries[this.name]) {
            if (this.text && r.namedQueries[this.name] !== this.text) {
              let s = new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
              return t(s);
            }
            return r.native.execute(this.name, n, t);
          }
          return r.native.prepare(this.name, this.text, n.length, function(s) {
            return s ? t(s) : (r.namedQueries[e.name] = e.text, e.native.execute(e.name, n, t));
          });
        } else if (this.values) {
          if (!Array.isArray(
            this.values
          )) {
            let s = new Error("Query values must be an array");
            return t(s);
          }
          var i = this.values.map(Rn.prepareValue);
          r.native.query(this.text, i, t);
        } else r.native.query(this.text, t);
      };
    });
    yo = T((yp, po) => {
      "use strict";
      p();
      var ll = (oo(), O(so)), fl = At(), dp = ao(), fo = ge().EventEmitter, hl = (it(), O(nt)), pl = Bt(), ho = lo(), K = po.exports = function(r) {
        fo.call(this), r = r || {}, this._Promise = r.Promise || b.Promise, this._types = new fl(r.types), this.native = new ll({ types: this._types }), this._queryQueue = [], this._ending = false, this._connecting = false, this._connected = false, this._queryable = true;
        var e = this.connectionParameters = new pl(r);
        this.user = e.user, Object.defineProperty(this, "password", { configurable: true, enumerable: false, writable: true, value: e.password }), this.database = e.database, this.host = e.host, this.port = e.port, this.namedQueries = {};
      };
      K.Query = ho;
      hl.inherits(K, fo);
      K.prototype._errorAllQueries = function(r) {
        let e = a((t) => {
          m.nextTick(() => {
            t.native = this.native, t.handleError(r);
          });
        }, "enqueueError");
        this._hasActiveQuery() && (e(this._activeQuery), this._activeQuery = null), this._queryQueue.forEach(e), this._queryQueue.length = 0;
      };
      K.prototype._connect = function(r) {
        var e = this;
        if (this._connecting) {
          m.nextTick(() => r(new Error("Client has already been connected. You cannot reuse a client.")));
          return;
        }
        this._connecting = true, this.connectionParameters.getLibpqConnectionString(function(t, n) {
          if (t) return r(t);
          e.native.connect(n, function(i) {
            if (i) return e.native.end(), r(i);
            e._connected = true, e.native.on("error", function(s) {
              e._queryable = false, e._errorAllQueries(s), e.emit("error", s);
            }), e.native.on("notification", function(s) {
              e.emit("notification", { channel: s.relname, payload: s.extra });
            }), e.emit("connect"), e._pulseQueryQueue(true), r();
          });
        });
      };
      K.prototype.connect = function(r) {
        if (r) {
          this._connect(r);
          return;
        }
        return new this._Promise((e, t) => {
          this._connect((n) => {
            n ? t(n) : e();
          });
        });
      };
      K.prototype.query = function(r, e, t) {
        var n, i, s, o, u;
        if (r == null) throw new TypeError("Client was passed a null or undefined query");
        if (typeof r.submit == "function") s = r.query_timeout || this.connectionParameters.query_timeout, i = n = r, typeof e == "function" && (r.callback = e);
        else if (s = this.connectionParameters.query_timeout, n = new ho(r, e, t), !n.callback) {
          let c, l;
          i = new this._Promise((f, y) => {
            c = f, l = y;
          }), n.callback = (f, y) => f ? l(f) : c(y);
        }
        return s && (u = n.callback, o = setTimeout(() => {
          var c = new Error(
            "Query read timeout"
          );
          m.nextTick(() => {
            n.handleError(c, this.connection);
          }), u(c), n.callback = () => {
          };
          var l = this._queryQueue.indexOf(n);
          l > -1 && this._queryQueue.splice(l, 1), this._pulseQueryQueue();
        }, s), n.callback = (c, l) => {
          clearTimeout(o), u(c, l);
        }), this._queryable ? this._ending ? (n.native = this.native, m.nextTick(() => {
          n.handleError(
            new Error("Client was closed and is not queryable")
          );
        }), i) : (this._queryQueue.push(n), this._pulseQueryQueue(), i) : (n.native = this.native, m.nextTick(() => {
          n.handleError(new Error("Client has encountered a connection error and is not queryable"));
        }), i);
      };
      K.prototype.end = function(r) {
        var e = this;
        this._ending = true, this._connected || this.once("connect", this.end.bind(this, r));
        var t;
        return r || (t = new this._Promise(function(n, i) {
          r = a((s) => s ? i(s) : n(), "cb");
        })), this.native.end(function() {
          e._errorAllQueries(new Error("Connection terminated")), m.nextTick(() => {
            e.emit("end"), r && r();
          });
        }), t;
      };
      K.prototype._hasActiveQuery = function() {
        return this._activeQuery && this._activeQuery.state !== "error" && this._activeQuery.state !== "end";
      };
      K.prototype._pulseQueryQueue = function(r) {
        if (this._connected && !this._hasActiveQuery()) {
          var e = this._queryQueue.shift();
          if (!e) {
            r || this.emit("drain");
            return;
          }
          this._activeQuery = e, e.submit(this);
          var t = this;
          e.once("_done", function() {
            t._pulseQueryQueue();
          });
        }
      };
      K.prototype.cancel = function(r) {
        this._activeQuery === r ? this.native.cancel(function() {
        }) : this._queryQueue.indexOf(r) !== -1 && this._queryQueue.splice(this._queryQueue.indexOf(r), 1);
      };
      K.prototype.ref = function() {
      };
      K.prototype.unref = function() {
      };
      K.prototype.setTypeParser = function(r, e, t) {
        return this._types.setTypeParser(
          r,
          e,
          t
        );
      };
      K.prototype.getTypeParser = function(r, e) {
        return this._types.getTypeParser(r, e);
      };
    });
    Ln = T((gp, mo) => {
      "use strict";
      p();
      mo.exports = yo();
    });
    ot = T((vp, at) => {
      "use strict";
      p();
      var dl = eo(), yl = tt(), ml = En(), wl = io(), { DatabaseError: gl } = vn(), bl = a(
        (r) => {
          var e;
          return e = class extends wl {
            static {
              __name(this, "e");
            }
            constructor(n) {
              super(n, r);
            }
          }, a(e, "BoundPool"), e;
        },
        "poolFactory"
      ), Fn = a(
        function(r) {
          this.defaults = yl, this.Client = r, this.Query = this.Client.Query, this.Pool = bl(this.Client), this._pools = [], this.Connection = ml, this.types = Je(), this.DatabaseError = gl;
        },
        "PG"
      );
      typeof m.env.NODE_PG_FORCE_NATIVE < "u" ? at.exports = new Fn(Ln()) : (at.exports = new Fn(dl), Object.defineProperty(at.exports, "native", {
        configurable: true,
        enumerable: false,
        get() {
          var r = null;
          try {
            r = new Fn(Ln());
          } catch (e) {
            if (e.code !== "MODULE_NOT_FOUND") throw e;
          }
          return Object.defineProperty(at.exports, "native", { value: r }), r;
        }
      }));
    });
    p();
    p();
    Fe();
    Zt();
    p();
    pa = Object.defineProperty;
    da = Object.defineProperties;
    ya = Object.getOwnPropertyDescriptors;
    bi = Object.getOwnPropertySymbols;
    ma = Object.prototype.hasOwnProperty;
    wa = Object.prototype.propertyIsEnumerable;
    vi = a(
      (r, e, t) => e in r ? pa(r, e, { enumerable: true, configurable: true, writable: true, value: t }) : r[e] = t,
      "__defNormalProp"
    );
    ga = a((r, e) => {
      for (var t in e || (e = {})) ma.call(e, t) && vi(r, t, e[t]);
      if (bi) for (var t of bi(e)) wa.call(e, t) && vi(r, t, e[t]);
      return r;
    }, "__spreadValues");
    ba = a((r, e) => da(r, ya(e)), "__spreadProps");
    va = 1008e3;
    xi = new Uint8Array(
      new Uint16Array([258]).buffer
    )[0] === 2;
    xa = new TextDecoder();
    Jt = new TextEncoder();
    yt = Jt.encode("0123456789abcdef");
    mt = Jt.encode("0123456789ABCDEF");
    Sa = Jt.encode("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");
    Si = Sa.slice();
    Si[62] = 45;
    Si[63] = 95;
    __name(Ea, "Ea");
    a(Ea, "_toHex");
    __name(Aa, "Aa");
    a(Aa, "_toHexChunked");
    __name(Ei, "Ei");
    a(Ei, "toHex");
    p();
    gt2 = class gt3 {
      static {
        __name(this, "gt");
      }
      constructor(e, t) {
        this.strings = e;
        this.values = t;
      }
      toParameterizedQuery(e = { query: "", params: [] }) {
        let { strings: t, values: n } = this;
        for (let i = 0, s = t.length; i < s; i++) if (e.query += t[i], i < n.length) {
          let o = n[i];
          if (o instanceof Ge) e.query += o.sql;
          else if (o instanceof Ce) if (o.queryData instanceof gt3) o.queryData.toParameterizedQuery(
            e
          );
          else {
            if (o.queryData.params?.length) throw new Error("This query is not composable");
            e.query += o.queryData.query;
          }
          else {
            let { params: u } = e;
            u.push(o), e.query += "$" + u.length, (o instanceof d || ArrayBuffer.isView(o)) && (e.query += "::bytea");
          }
        }
        return e;
      }
    };
    a(gt2, "SqlTemplate");
    $e = gt2;
    Xt = class Xt2 {
      static {
        __name(this, "Xt");
      }
      constructor(e) {
        this.sql = e;
      }
    };
    a(Xt, "UnsafeRawSql");
    Ge = Xt;
    p();
    __name(bt, "bt");
    a(bt, "warnIfBrowser");
    Fe();
    as = Se(At());
    us = Se(rt());
    _t = class _t2 extends Error {
      static {
        __name(this, "_t");
      }
      constructor(t) {
        super(t);
        E(this, "name", "NeonDbError");
        E(this, "severity");
        E(this, "code");
        E(this, "detail");
        E(this, "hint");
        E(this, "position");
        E(this, "internalPosition");
        E(
          this,
          "internalQuery"
        );
        E(this, "where");
        E(this, "schema");
        E(this, "table");
        E(this, "column");
        E(this, "dataType");
        E(this, "constraint");
        E(this, "file");
        E(this, "line");
        E(this, "routine");
        E(this, "sourceError");
        "captureStackTrace" in Error && typeof Error.captureStackTrace == "function" && Error.captureStackTrace(this, _t2);
      }
    };
    a(
      _t,
      "NeonDbError"
    );
    be = _t;
    is2 = "transaction() expects an array of queries, or a function returning an array of queries";
    Ru = ["severity", "code", "detail", "hint", "position", "internalPosition", "internalQuery", "where", "schema", "table", "column", "dataType", "constraint", "file", "line", "routine"];
    __name(Lu, "Lu");
    a(Lu, "encodeBuffersAsBytea");
    __name(ss, "ss");
    a(ss, "prepareQuery");
    __name(cs, "cs");
    a(cs, "neon");
    dr = class dr2 {
      static {
        __name(this, "dr");
      }
      constructor(e, t, n) {
        this.execute = e;
        this.queryData = t;
        this.opts = n;
      }
      then(e, t) {
        return this.execute(this.queryData, this.opts).then(e, t);
      }
      catch(e) {
        return this.execute(this.queryData, this.opts).catch(e);
      }
      finally(e) {
        return this.execute(
          this.queryData,
          this.opts
        ).finally(e);
      }
    };
    a(dr, "NeonQueryPromise");
    Ce = dr;
    __name(os, "os");
    a(os, "processQueryResult");
    __name(Fu, "Fu");
    a(Fu, "getAuthToken");
    p();
    go = Se(ot());
    p();
    wo = Se(ot());
    kn = class kn2 extends wo.Client {
      static {
        __name(this, "kn");
      }
      constructor(t) {
        super(t);
        this.config = t;
      }
      get neonConfig() {
        return this.connection.stream;
      }
      connect(t) {
        let { neonConfig: n } = this;
        n.forceDisablePgSSL && (this.ssl = this.connection.ssl = false), this.ssl && n.useSecureWebSocket && console.warn("SSL is enabled for both Postgres (e.g. ?sslmode=require in the connection string + forceDisablePgSSL = false) and the WebSocket tunnel (useSecureWebSocket = true). Double encryption will increase latency and CPU usage. It may be appropriate to disable SSL in the Postgres connection parameters or set forceDisablePgSSL = true.");
        let i = typeof this.config != "string" && this.config?.host !== void 0 || typeof this.config != "string" && this.config?.connectionString !== void 0 || m.env.PGHOST !== void 0, s = m.env.USER ?? m.env.USERNAME;
        if (!i && this.host === "localhost" && this.user === s && this.database === s && this.password === null) throw new Error(`No database host or connection string was set, and key parameters have default values (host: localhost, user: ${s}, db: ${s}, password: null). Is an environment variable missing? Alternatively, if you intended to connect with these parameters, please set the host to 'localhost' explicitly.`);
        let o = super.connect(t), u = n.pipelineTLS && this.ssl, c = n.pipelineConnect === "password";
        if (!u && !n.pipelineConnect) return o;
        let l = this.connection;
        if (u && l.on(
          "connect",
          () => l.stream.emit("data", "S")
        ), c) {
          l.removeAllListeners("authenticationCleartextPassword"), l.removeAllListeners("readyForQuery"), l.once("readyForQuery", () => l.on("readyForQuery", this._handleReadyForQuery.bind(this)));
          let f = this.ssl ? "sslconnect" : "connect";
          l.on(f, () => {
            this.neonConfig.disableWarningInBrowsers || bt(), this._handleAuthCleartextPassword(), this._handleReadyForQuery();
          });
        }
        return o;
      }
      async _handleAuthSASLContinue(t) {
        if (typeof crypto > "u" || crypto.subtle === void 0 || crypto.subtle.importKey === void 0) throw new Error("Cannot use SASL auth when `crypto.subtle` is not defined");
        let n = crypto.subtle, i = this.saslSession, s = this.password, o = t.data;
        if (i.message !== "SASLInitialResponse" || typeof s != "string" || typeof o != "string") throw new Error(
          "SASL: protocol error"
        );
        let u = Object.fromEntries(o.split(",").map((M) => {
          if (!/^.=/.test(M)) throw new Error(
            "SASL: Invalid attribute pair entry"
          );
          let $ = M[0], me = M.substring(2);
          return [$, me];
        })), c = u.r, l = u.s, f = u.i;
        if (!c || !/^[!-+--~]+$/.test(c)) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing/unprintable");
        if (!l || !/^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(l)) throw new Error(
          "SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing/not base64"
        );
        if (!f || !/^[1-9][0-9]*$/.test(f)) throw new Error(
          "SASL: SCRAM-SERVER-FIRST-MESSAGE: missing/invalid iteration count"
        );
        if (!c.startsWith(i.clientNonce))
          throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
        if (c.length === i.clientNonce.length) throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
        let y = parseInt(f, 10), g = d.from(l, "base64"), A = new TextEncoder(), C = A.encode(s), D = await n.importKey(
          "raw",
          C,
          { name: "HMAC", hash: { name: "SHA-256" } },
          false,
          ["sign"]
        ), Y = new Uint8Array(await n.sign("HMAC", D, d.concat(
          [g, d.from([0, 0, 0, 1])]
        ))), P = Y;
        for (var I = 0; I < y - 1; I++) Y = new Uint8Array(await n.sign("HMAC", D, Y)), P = d.from(
          P.map((M, $) => P[$] ^ Y[$])
        );
        let w = P, Z = await n.importKey(
          "raw",
          w,
          { name: "HMAC", hash: { name: "SHA-256" } },
          false,
          ["sign"]
        ), W = new Uint8Array(await n.sign("HMAC", Z, A.encode("Client Key"))), J = await n.digest(
          "SHA-256",
          W
        ), X = "n=*,r=" + i.clientNonce, se = "r=" + c + ",s=" + l + ",i=" + y, oe = "c=biws,r=" + c, R = X + "," + se + "," + oe, j = await n.importKey(
          "raw",
          J,
          { name: "HMAC", hash: { name: "SHA-256" } },
          false,
          ["sign"]
        );
        var le = new Uint8Array(await n.sign(
          "HMAC",
          j,
          A.encode(R)
        )), de = d.from(W.map((M, $) => W[$] ^ le[$])), We = de.toString("base64");
        let fe = await n.importKey(
          "raw",
          w,
          { name: "HMAC", hash: { name: "SHA-256" } },
          false,
          ["sign"]
        ), _e = await n.sign("HMAC", fe, A.encode("Server Key")), ye = await n.importKey("raw", _e, { name: "HMAC", hash: { name: "SHA-256" } }, false, ["sign"]);
        var ee = d.from(
          await n.sign("HMAC", ye, A.encode(R))
        );
        i.message = "SASLResponse", i.serverSignature = ee.toString("base64"), i.response = oe + ",p=" + We, this.connection.sendSCRAMClientFinalMessage(this.saslSession.response);
      }
    };
    a(
      kn,
      "NeonClient"
    );
    ut = kn;
    Fe();
    bo = Se(Bt());
    __name(vl, "vl");
    a(vl, "promisify");
    Un = class Un2 extends go.Pool {
      static {
        __name(this, "Un");
      }
      constructor() {
        super(...arguments);
        E(this, "Client", ut);
        E(this, "hasFetchUnsupportedListeners", false);
        E(this, "addListener", this.on);
      }
      on(t, n) {
        return t !== "error" && (this.hasFetchUnsupportedListeners = true), super.on(t, n);
      }
      query(t, n, i) {
        if (!ce.poolQueryViaFetch || this.hasFetchUnsupportedListeners || typeof t == "function") return super.query(
          t,
          n,
          i
        );
        typeof n == "function" && (i = n, n = void 0);
        let s = vl(this.Promise, i);
        i = s.callback;
        try {
          let o = new bo.default(
            this.options
          ), u = encodeURIComponent, c = encodeURI, l = `postgresql://${u(o.user)}:${u(o.password)}@${u(o.host)}/${c(o.database)}`, f = typeof t == "string" ? t : t.text, y = n ?? t.values ?? [];
          cs(l, { fullResults: true, arrayMode: t.rowMode === "array" }).query(f, y, { types: t.types ?? this.options?.types }).then((A) => i(void 0, A)).catch((A) => i(
            A
          ));
        } catch (o) {
          i(o);
        }
        return s.result;
      }
    };
    a(Un, "NeonPool");
    Fe();
    ct = Se(ot());
    export_DatabaseError = ct.DatabaseError;
    export_defaults = ct.defaults;
    export_escapeIdentifier = ct.escapeIdentifier;
    export_escapeLiteral = ct.escapeLiteral;
    export_types = ct.types;
  }
});

// ../node_modules/drizzle-orm/selection-proxy.js
var SelectionProxyHandler;
var init_selection_proxy = __esm({
  "../node_modules/drizzle-orm/selection-proxy.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_alias();
    init_column();
    init_entity();
    init_sql();
    init_subquery();
    init_view_common();
    SelectionProxyHandler = class _SelectionProxyHandler {
      static {
        __name(this, "SelectionProxyHandler");
      }
      static [entityKind] = "SelectionProxyHandler";
      config;
      constructor(config) {
        this.config = { ...config };
      }
      get(subquery, prop) {
        if (prop === "_") {
          return {
            ...subquery["_"],
            selectedFields: new Proxy(
              subquery._.selectedFields,
              this
            )
          };
        }
        if (prop === ViewBaseConfig) {
          return {
            ...subquery[ViewBaseConfig],
            selectedFields: new Proxy(
              subquery[ViewBaseConfig].selectedFields,
              this
            )
          };
        }
        if (typeof prop === "symbol") {
          return subquery[prop];
        }
        const columns = is(subquery, Subquery) ? subquery._.selectedFields : is(subquery, View) ? subquery[ViewBaseConfig].selectedFields : subquery;
        const value = columns[prop];
        if (is(value, SQL.Aliased)) {
          if (this.config.sqlAliasedBehavior === "sql" && !value.isSelectionField) {
            return value.sql;
          }
          const newValue = value.clone();
          newValue.isSelectionField = true;
          return newValue;
        }
        if (is(value, SQL)) {
          if (this.config.sqlBehavior === "sql") {
            return value;
          }
          throw new Error(
            `You tried to reference "${prop}" field from a subquery, which is a raw SQL field, but it doesn't have an alias declared. Please add an alias to the field using ".as('alias')" method.`
          );
        }
        if (is(value, Column)) {
          if (this.config.alias) {
            return new Proxy(
              value,
              new ColumnAliasProxyHandler(
                new Proxy(
                  value.table,
                  new TableAliasProxyHandler(this.config.alias, this.config.replaceOriginalName ?? false)
                )
              )
            );
          }
          return value;
        }
        if (typeof value !== "object" || value === null) {
          return value;
        }
        return new Proxy(value, new _SelectionProxyHandler(this.config));
      }
    };
  }
});

// ../node_modules/drizzle-orm/pg-core/checks.js
var CheckBuilder, Check;
var init_checks = __esm({
  "../node_modules/drizzle-orm/pg-core/checks.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    CheckBuilder = class {
      static {
        __name(this, "CheckBuilder");
      }
      constructor(name, value) {
        this.name = name;
        this.value = value;
      }
      static [entityKind] = "PgCheckBuilder";
      brand;
      /** @internal */
      build(table) {
        return new Check(table, this);
      }
    };
    Check = class {
      static {
        __name(this, "Check");
      }
      constructor(table, builder) {
        this.table = table;
        this.name = builder.name;
        this.value = builder.value;
      }
      static [entityKind] = "PgCheck";
      name;
      value;
    };
  }
});

// ../node_modules/drizzle-orm/pg-core/columns/index.js
var init_columns = __esm({
  "../node_modules/drizzle-orm/pg-core/columns/index.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_bigint();
    init_bigserial();
    init_boolean();
    init_char();
    init_cidr();
    init_common();
    init_custom();
    init_date();
    init_double_precision();
    init_enum();
    init_inet();
    init_int_common();
    init_integer();
    init_interval();
    init_json();
    init_jsonb();
    init_line();
    init_macaddr();
    init_macaddr8();
    init_numeric();
    init_point();
    init_geometry();
    init_real();
    init_serial();
    init_smallint();
    init_smallserial();
    init_text();
    init_time();
    init_timestamp();
    init_uuid();
    init_varchar();
    init_bit();
    init_halfvec();
    init_sparsevec();
    init_vector();
  }
});

// ../node_modules/drizzle-orm/pg-core/indexes.js
var IndexBuilderOn, IndexBuilder, Index;
var init_indexes = __esm({
  "../node_modules/drizzle-orm/pg-core/indexes.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_sql();
    init_entity();
    init_columns();
    IndexBuilderOn = class {
      static {
        __name(this, "IndexBuilderOn");
      }
      constructor(unique, name) {
        this.unique = unique;
        this.name = name;
      }
      static [entityKind] = "PgIndexBuilderOn";
      on(...columns) {
        return new IndexBuilder(
          columns.map((it2) => {
            if (is(it2, SQL)) {
              return it2;
            }
            it2 = it2;
            const clonedIndexedColumn = new IndexedColumn(it2.name, !!it2.keyAsName, it2.columnType, it2.indexConfig);
            it2.indexConfig = JSON.parse(JSON.stringify(it2.defaultConfig));
            return clonedIndexedColumn;
          }),
          this.unique,
          false,
          this.name
        );
      }
      onOnly(...columns) {
        return new IndexBuilder(
          columns.map((it2) => {
            if (is(it2, SQL)) {
              return it2;
            }
            it2 = it2;
            const clonedIndexedColumn = new IndexedColumn(it2.name, !!it2.keyAsName, it2.columnType, it2.indexConfig);
            it2.indexConfig = it2.defaultConfig;
            return clonedIndexedColumn;
          }),
          this.unique,
          true,
          this.name
        );
      }
      /**
       * Specify what index method to use. Choices are `btree`, `hash`, `gist`, `spgist`, `gin`, `brin`, or user-installed access methods like `bloom`. The default method is `btree.
       *
       * If you have the `pg_vector` extension installed in your database, you can use the `hnsw` and `ivfflat` options, which are predefined types.
       *
       * **You can always specify any string you want in the method, in case Drizzle doesn't have it natively in its types**
       *
       * @param method The name of the index method to be used
       * @param columns
       * @returns
       */
      using(method, ...columns) {
        return new IndexBuilder(
          columns.map((it2) => {
            if (is(it2, SQL)) {
              return it2;
            }
            it2 = it2;
            const clonedIndexedColumn = new IndexedColumn(it2.name, !!it2.keyAsName, it2.columnType, it2.indexConfig);
            it2.indexConfig = JSON.parse(JSON.stringify(it2.defaultConfig));
            return clonedIndexedColumn;
          }),
          this.unique,
          true,
          this.name,
          method
        );
      }
    };
    IndexBuilder = class {
      static {
        __name(this, "IndexBuilder");
      }
      static [entityKind] = "PgIndexBuilder";
      /** @internal */
      config;
      constructor(columns, unique, only, name, method = "btree") {
        this.config = {
          name,
          columns,
          unique,
          only,
          method
        };
      }
      concurrently() {
        this.config.concurrently = true;
        return this;
      }
      with(obj) {
        this.config.with = obj;
        return this;
      }
      where(condition) {
        this.config.where = condition;
        return this;
      }
      /** @internal */
      build(table) {
        return new Index(this.config, table);
      }
    };
    Index = class {
      static {
        __name(this, "Index");
      }
      static [entityKind] = "PgIndex";
      config;
      constructor(config, table) {
        this.config = { ...config, table };
      }
    };
  }
});

// ../node_modules/drizzle-orm/pg-core/policies.js
var PgPolicy;
var init_policies = __esm({
  "../node_modules/drizzle-orm/pg-core/policies.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    PgPolicy = class {
      static {
        __name(this, "PgPolicy");
      }
      constructor(name, config) {
        this.name = name;
        if (config) {
          this.as = config.as;
          this.for = config.for;
          this.to = config.to;
          this.using = config.using;
          this.withCheck = config.withCheck;
        }
      }
      static [entityKind] = "PgPolicy";
      as;
      for;
      to;
      using;
      withCheck;
      /** @internal */
      _linkedTable;
      link(table) {
        this._linkedTable = table;
        return this;
      }
    };
  }
});

// ../node_modules/drizzle-orm/pg-core/view-common.js
var PgViewConfig;
var init_view_common2 = __esm({
  "../node_modules/drizzle-orm/pg-core/view-common.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    PgViewConfig = Symbol.for("drizzle:PgViewConfig");
  }
});

// ../node_modules/drizzle-orm/casing.js
function toSnakeCase(input) {
  const words = input.replace(/['\u2019]/g, "").match(/[\da-z]+|[A-Z]+(?![a-z])|[A-Z][\da-z]+/g) ?? [];
  return words.map((word) => word.toLowerCase()).join("_");
}
function toCamelCase(input) {
  const words = input.replace(/['\u2019]/g, "").match(/[\da-z]+|[A-Z]+(?![a-z])|[A-Z][\da-z]+/g) ?? [];
  return words.reduce((acc, word, i) => {
    const formattedWord = i === 0 ? word.toLowerCase() : `${word[0].toUpperCase()}${word.slice(1)}`;
    return acc + formattedWord;
  }, "");
}
function noopCase(input) {
  return input;
}
var CasingCache;
var init_casing = __esm({
  "../node_modules/drizzle-orm/casing.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_table();
    __name(toSnakeCase, "toSnakeCase");
    __name(toCamelCase, "toCamelCase");
    __name(noopCase, "noopCase");
    CasingCache = class {
      static {
        __name(this, "CasingCache");
      }
      static [entityKind] = "CasingCache";
      /** @internal */
      cache = {};
      cachedTables = {};
      convert;
      constructor(casing) {
        this.convert = casing === "snake_case" ? toSnakeCase : casing === "camelCase" ? toCamelCase : noopCase;
      }
      getColumnCasing(column) {
        if (!column.keyAsName) return column.name;
        const schema = column.table[Table.Symbol.Schema] ?? "public";
        const tableName = column.table[Table.Symbol.OriginalName];
        const key = `${schema}.${tableName}.${column.name}`;
        if (!this.cache[key]) {
          this.cacheTable(column.table);
        }
        return this.cache[key];
      }
      cacheTable(table) {
        const schema = table[Table.Symbol.Schema] ?? "public";
        const tableName = table[Table.Symbol.OriginalName];
        const tableKey = `${schema}.${tableName}`;
        if (!this.cachedTables[tableKey]) {
          for (const column of Object.values(table[Table.Symbol.Columns])) {
            const columnKey = `${tableKey}.${column.name}`;
            this.cache[columnKey] = this.convert(column.name);
          }
          this.cachedTables[tableKey] = true;
        }
      }
      clearCache() {
        this.cache = {};
        this.cachedTables = {};
      }
    };
  }
});

// ../node_modules/drizzle-orm/pg-core/view-base.js
var PgViewBase;
var init_view_base = __esm({
  "../node_modules/drizzle-orm/pg-core/view-base.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_sql();
    PgViewBase = class extends View {
      static {
        __name(this, "PgViewBase");
      }
      static [entityKind] = "PgViewBase";
    };
  }
});

// ../node_modules/drizzle-orm/pg-core/dialect.js
var PgDialect;
var init_dialect = __esm({
  "../node_modules/drizzle-orm/pg-core/dialect.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_alias();
    init_casing();
    init_column();
    init_entity();
    init_errors();
    init_columns();
    init_table2();
    init_relations();
    init_sql2();
    init_sql();
    init_subquery();
    init_table();
    init_utils();
    init_view_common();
    init_view_base();
    PgDialect = class {
      static {
        __name(this, "PgDialect");
      }
      static [entityKind] = "PgDialect";
      /** @internal */
      casing;
      constructor(config) {
        this.casing = new CasingCache(config?.casing);
      }
      async migrate(migrations, session, config) {
        const migrationsTable = typeof config === "string" ? "__drizzle_migrations" : config.migrationsTable ?? "__drizzle_migrations";
        const migrationsSchema = typeof config === "string" ? "drizzle" : config.migrationsSchema ?? "drizzle";
        const migrationTableCreate = sql`
			CREATE TABLE IF NOT EXISTS ${sql.identifier(migrationsSchema)}.${sql.identifier(migrationsTable)} (
				id SERIAL PRIMARY KEY,
				hash text NOT NULL,
				created_at bigint
			)
		`;
        await session.execute(sql`CREATE SCHEMA IF NOT EXISTS ${sql.identifier(migrationsSchema)}`);
        await session.execute(migrationTableCreate);
        const dbMigrations = await session.all(
          sql`select id, hash, created_at from ${sql.identifier(migrationsSchema)}.${sql.identifier(migrationsTable)} order by created_at desc limit 1`
        );
        const lastDbMigration = dbMigrations[0];
        await session.transaction(async (tx) => {
          for await (const migration of migrations) {
            if (!lastDbMigration || Number(lastDbMigration.created_at) < migration.folderMillis) {
              for (const stmt of migration.sql) {
                await tx.execute(sql.raw(stmt));
              }
              await tx.execute(
                sql`insert into ${sql.identifier(migrationsSchema)}.${sql.identifier(migrationsTable)} ("hash", "created_at") values(${migration.hash}, ${migration.folderMillis})`
              );
            }
          }
        });
      }
      escapeName(name) {
        return `"${name}"`;
      }
      escapeParam(num) {
        return `$${num + 1}`;
      }
      escapeString(str) {
        return `'${str.replace(/'/g, "''")}'`;
      }
      buildWithCTE(queries) {
        if (!queries?.length) return void 0;
        const withSqlChunks = [sql`with `];
        for (const [i, w] of queries.entries()) {
          withSqlChunks.push(sql`${sql.identifier(w._.alias)} as (${w._.sql})`);
          if (i < queries.length - 1) {
            withSqlChunks.push(sql`, `);
          }
        }
        withSqlChunks.push(sql` `);
        return sql.join(withSqlChunks);
      }
      buildDeleteQuery({ table, where, returning, withList }) {
        const withSql = this.buildWithCTE(withList);
        const returningSql = returning ? sql` returning ${this.buildSelection(returning, { isSingleTable: true })}` : void 0;
        const whereSql = where ? sql` where ${where}` : void 0;
        return sql`${withSql}delete from ${table}${whereSql}${returningSql}`;
      }
      buildUpdateSet(table, set) {
        const tableColumns = table[Table.Symbol.Columns];
        const columnNames = Object.keys(tableColumns).filter(
          (colName) => set[colName] !== void 0 || tableColumns[colName]?.onUpdateFn !== void 0
        );
        const setSize = columnNames.length;
        return sql.join(columnNames.flatMap((colName, i) => {
          const col = tableColumns[colName];
          const value = set[colName] ?? sql.param(col.onUpdateFn(), col);
          const res = sql`${sql.identifier(this.casing.getColumnCasing(col))} = ${value}`;
          if (i < setSize - 1) {
            return [res, sql.raw(", ")];
          }
          return [res];
        }));
      }
      buildUpdateQuery({ table, set, where, returning, withList, from, joins }) {
        const withSql = this.buildWithCTE(withList);
        const tableName = table[PgTable.Symbol.Name];
        const tableSchema = table[PgTable.Symbol.Schema];
        const origTableName = table[PgTable.Symbol.OriginalName];
        const alias = tableName === origTableName ? void 0 : tableName;
        const tableSql = sql`${tableSchema ? sql`${sql.identifier(tableSchema)}.` : void 0}${sql.identifier(origTableName)}${alias && sql` ${sql.identifier(alias)}`}`;
        const setSql = this.buildUpdateSet(table, set);
        const fromSql = from && sql.join([sql.raw(" from "), this.buildFromTable(from)]);
        const joinsSql = this.buildJoins(joins);
        const returningSql = returning ? sql` returning ${this.buildSelection(returning, { isSingleTable: !from })}` : void 0;
        const whereSql = where ? sql` where ${where}` : void 0;
        return sql`${withSql}update ${tableSql} set ${setSql}${fromSql}${joinsSql}${whereSql}${returningSql}`;
      }
      /**
       * Builds selection SQL with provided fields/expressions
       *
       * Examples:
       *
       * `select <selection> from`
       *
       * `insert ... returning <selection>`
       *
       * If `isSingleTable` is true, then columns won't be prefixed with table name
       */
      buildSelection(fields, { isSingleTable = false } = {}) {
        const columnsLen = fields.length;
        const chunks = fields.flatMap(({ field }, i) => {
          const chunk = [];
          if (is(field, SQL.Aliased) && field.isSelectionField) {
            chunk.push(sql.identifier(field.fieldAlias));
          } else if (is(field, SQL.Aliased) || is(field, SQL)) {
            const query = is(field, SQL.Aliased) ? field.sql : field;
            if (isSingleTable) {
              chunk.push(
                new SQL(
                  query.queryChunks.map((c) => {
                    if (is(c, PgColumn)) {
                      return sql.identifier(this.casing.getColumnCasing(c));
                    }
                    return c;
                  })
                )
              );
            } else {
              chunk.push(query);
            }
            if (is(field, SQL.Aliased)) {
              chunk.push(sql` as ${sql.identifier(field.fieldAlias)}`);
            }
          } else if (is(field, Column)) {
            if (isSingleTable) {
              chunk.push(sql.identifier(this.casing.getColumnCasing(field)));
            } else {
              chunk.push(field);
            }
          }
          if (i < columnsLen - 1) {
            chunk.push(sql`, `);
          }
          return chunk;
        });
        return sql.join(chunks);
      }
      buildJoins(joins) {
        if (!joins || joins.length === 0) {
          return void 0;
        }
        const joinsArray = [];
        for (const [index, joinMeta] of joins.entries()) {
          if (index === 0) {
            joinsArray.push(sql` `);
          }
          const table = joinMeta.table;
          const lateralSql = joinMeta.lateral ? sql` lateral` : void 0;
          const onSql = joinMeta.on ? sql` on ${joinMeta.on}` : void 0;
          if (is(table, PgTable)) {
            const tableName = table[PgTable.Symbol.Name];
            const tableSchema = table[PgTable.Symbol.Schema];
            const origTableName = table[PgTable.Symbol.OriginalName];
            const alias = tableName === origTableName ? void 0 : joinMeta.alias;
            joinsArray.push(
              sql`${sql.raw(joinMeta.joinType)} join${lateralSql} ${tableSchema ? sql`${sql.identifier(tableSchema)}.` : void 0}${sql.identifier(origTableName)}${alias && sql` ${sql.identifier(alias)}`}${onSql}`
            );
          } else if (is(table, View)) {
            const viewName = table[ViewBaseConfig].name;
            const viewSchema = table[ViewBaseConfig].schema;
            const origViewName = table[ViewBaseConfig].originalName;
            const alias = viewName === origViewName ? void 0 : joinMeta.alias;
            joinsArray.push(
              sql`${sql.raw(joinMeta.joinType)} join${lateralSql} ${viewSchema ? sql`${sql.identifier(viewSchema)}.` : void 0}${sql.identifier(origViewName)}${alias && sql` ${sql.identifier(alias)}`}${onSql}`
            );
          } else {
            joinsArray.push(
              sql`${sql.raw(joinMeta.joinType)} join${lateralSql} ${table}${onSql}`
            );
          }
          if (index < joins.length - 1) {
            joinsArray.push(sql` `);
          }
        }
        return sql.join(joinsArray);
      }
      buildFromTable(table) {
        if (is(table, Table) && table[Table.Symbol.IsAlias]) {
          let fullName = sql`${sql.identifier(table[Table.Symbol.OriginalName])}`;
          if (table[Table.Symbol.Schema]) {
            fullName = sql`${sql.identifier(table[Table.Symbol.Schema])}.${fullName}`;
          }
          return sql`${fullName} ${sql.identifier(table[Table.Symbol.Name])}`;
        }
        return table;
      }
      buildSelectQuery({
        withList,
        fields,
        fieldsFlat,
        where,
        having,
        table,
        joins,
        orderBy,
        groupBy,
        limit,
        offset,
        lockingClause,
        distinct,
        setOperators
      }) {
        const fieldsList = fieldsFlat ?? orderSelectedFields(fields);
        for (const f of fieldsList) {
          if (is(f.field, Column) && getTableName(f.field.table) !== (is(table, Subquery) ? table._.alias : is(table, PgViewBase) ? table[ViewBaseConfig].name : is(table, SQL) ? void 0 : getTableName(table)) && !((table2) => joins?.some(
            ({ alias }) => alias === (table2[Table.Symbol.IsAlias] ? getTableName(table2) : table2[Table.Symbol.BaseName])
          ))(f.field.table)) {
            const tableName = getTableName(f.field.table);
            throw new Error(
              `Your "${f.path.join("->")}" field references a column "${tableName}"."${f.field.name}", but the table "${tableName}" is not part of the query! Did you forget to join it?`
            );
          }
        }
        const isSingleTable = !joins || joins.length === 0;
        const withSql = this.buildWithCTE(withList);
        let distinctSql;
        if (distinct) {
          distinctSql = distinct === true ? sql` distinct` : sql` distinct on (${sql.join(distinct.on, sql`, `)})`;
        }
        const selection = this.buildSelection(fieldsList, { isSingleTable });
        const tableSql = this.buildFromTable(table);
        const joinsSql = this.buildJoins(joins);
        const whereSql = where ? sql` where ${where}` : void 0;
        const havingSql = having ? sql` having ${having}` : void 0;
        let orderBySql;
        if (orderBy && orderBy.length > 0) {
          orderBySql = sql` order by ${sql.join(orderBy, sql`, `)}`;
        }
        let groupBySql;
        if (groupBy && groupBy.length > 0) {
          groupBySql = sql` group by ${sql.join(groupBy, sql`, `)}`;
        }
        const limitSql = typeof limit === "object" || typeof limit === "number" && limit >= 0 ? sql` limit ${limit}` : void 0;
        const offsetSql = offset ? sql` offset ${offset}` : void 0;
        const lockingClauseSql = sql.empty();
        if (lockingClause) {
          const clauseSql = sql` for ${sql.raw(lockingClause.strength)}`;
          if (lockingClause.config.of) {
            clauseSql.append(
              sql` of ${sql.join(
                Array.isArray(lockingClause.config.of) ? lockingClause.config.of : [lockingClause.config.of],
                sql`, `
              )}`
            );
          }
          if (lockingClause.config.noWait) {
            clauseSql.append(sql` nowait`);
          } else if (lockingClause.config.skipLocked) {
            clauseSql.append(sql` skip locked`);
          }
          lockingClauseSql.append(clauseSql);
        }
        const finalQuery = sql`${withSql}select${distinctSql} ${selection} from ${tableSql}${joinsSql}${whereSql}${groupBySql}${havingSql}${orderBySql}${limitSql}${offsetSql}${lockingClauseSql}`;
        if (setOperators.length > 0) {
          return this.buildSetOperations(finalQuery, setOperators);
        }
        return finalQuery;
      }
      buildSetOperations(leftSelect, setOperators) {
        const [setOperator, ...rest] = setOperators;
        if (!setOperator) {
          throw new Error("Cannot pass undefined values to any set operator");
        }
        if (rest.length === 0) {
          return this.buildSetOperationQuery({ leftSelect, setOperator });
        }
        return this.buildSetOperations(
          this.buildSetOperationQuery({ leftSelect, setOperator }),
          rest
        );
      }
      buildSetOperationQuery({
        leftSelect,
        setOperator: { type, isAll, rightSelect, limit, orderBy, offset }
      }) {
        const leftChunk = sql`(${leftSelect.getSQL()}) `;
        const rightChunk = sql`(${rightSelect.getSQL()})`;
        let orderBySql;
        if (orderBy && orderBy.length > 0) {
          const orderByValues = [];
          for (const singleOrderBy of orderBy) {
            if (is(singleOrderBy, PgColumn)) {
              orderByValues.push(sql.identifier(singleOrderBy.name));
            } else if (is(singleOrderBy, SQL)) {
              for (let i = 0; i < singleOrderBy.queryChunks.length; i++) {
                const chunk = singleOrderBy.queryChunks[i];
                if (is(chunk, PgColumn)) {
                  singleOrderBy.queryChunks[i] = sql.identifier(chunk.name);
                }
              }
              orderByValues.push(sql`${singleOrderBy}`);
            } else {
              orderByValues.push(sql`${singleOrderBy}`);
            }
          }
          orderBySql = sql` order by ${sql.join(orderByValues, sql`, `)} `;
        }
        const limitSql = typeof limit === "object" || typeof limit === "number" && limit >= 0 ? sql` limit ${limit}` : void 0;
        const operatorChunk = sql.raw(`${type} ${isAll ? "all " : ""}`);
        const offsetSql = offset ? sql` offset ${offset}` : void 0;
        return sql`${leftChunk}${operatorChunk}${rightChunk}${orderBySql}${limitSql}${offsetSql}`;
      }
      buildInsertQuery({ table, values: valuesOrSelect, onConflict, returning, withList, select, overridingSystemValue_ }) {
        const valuesSqlList = [];
        const columns = table[Table.Symbol.Columns];
        const colEntries = Object.entries(columns).filter(([_, col]) => !col.shouldDisableInsert());
        const insertOrder = colEntries.map(
          ([, column]) => sql.identifier(this.casing.getColumnCasing(column))
        );
        if (select) {
          const select2 = valuesOrSelect;
          if (is(select2, SQL)) {
            valuesSqlList.push(select2);
          } else {
            valuesSqlList.push(select2.getSQL());
          }
        } else {
          const values = valuesOrSelect;
          valuesSqlList.push(sql.raw("values "));
          for (const [valueIndex, value] of values.entries()) {
            const valueList = [];
            for (const [fieldName, col] of colEntries) {
              const colValue = value[fieldName];
              if (colValue === void 0 || is(colValue, Param) && colValue.value === void 0) {
                if (col.defaultFn !== void 0) {
                  const defaultFnResult = col.defaultFn();
                  const defaultValue = is(defaultFnResult, SQL) ? defaultFnResult : sql.param(defaultFnResult, col);
                  valueList.push(defaultValue);
                } else if (!col.default && col.onUpdateFn !== void 0) {
                  const onUpdateFnResult = col.onUpdateFn();
                  const newValue = is(onUpdateFnResult, SQL) ? onUpdateFnResult : sql.param(onUpdateFnResult, col);
                  valueList.push(newValue);
                } else {
                  valueList.push(sql`default`);
                }
              } else {
                valueList.push(colValue);
              }
            }
            valuesSqlList.push(valueList);
            if (valueIndex < values.length - 1) {
              valuesSqlList.push(sql`, `);
            }
          }
        }
        const withSql = this.buildWithCTE(withList);
        const valuesSql = sql.join(valuesSqlList);
        const returningSql = returning ? sql` returning ${this.buildSelection(returning, { isSingleTable: true })}` : void 0;
        const onConflictSql = onConflict ? sql` on conflict ${onConflict}` : void 0;
        const overridingSql = overridingSystemValue_ === true ? sql`overriding system value ` : void 0;
        return sql`${withSql}insert into ${table} ${insertOrder} ${overridingSql}${valuesSql}${onConflictSql}${returningSql}`;
      }
      buildRefreshMaterializedViewQuery({ view, concurrently, withNoData }) {
        const concurrentlySql = concurrently ? sql` concurrently` : void 0;
        const withNoDataSql = withNoData ? sql` with no data` : void 0;
        return sql`refresh materialized view${concurrentlySql} ${view}${withNoDataSql}`;
      }
      prepareTyping(encoder) {
        if (is(encoder, PgJsonb) || is(encoder, PgJson)) {
          return "json";
        } else if (is(encoder, PgNumeric)) {
          return "decimal";
        } else if (is(encoder, PgTime)) {
          return "time";
        } else if (is(encoder, PgTimestamp) || is(encoder, PgTimestampString)) {
          return "timestamp";
        } else if (is(encoder, PgDate) || is(encoder, PgDateString)) {
          return "date";
        } else if (is(encoder, PgUUID)) {
          return "uuid";
        } else {
          return "none";
        }
      }
      sqlToQuery(sql2, invokeSource) {
        return sql2.toQuery({
          casing: this.casing,
          escapeName: this.escapeName,
          escapeParam: this.escapeParam,
          escapeString: this.escapeString,
          prepareTyping: this.prepareTyping,
          invokeSource
        });
      }
      // buildRelationalQueryWithPK({
      // 	fullSchema,
      // 	schema,
      // 	tableNamesMap,
      // 	table,
      // 	tableConfig,
      // 	queryConfig: config,
      // 	tableAlias,
      // 	isRoot = false,
      // 	joinOn,
      // }: {
      // 	fullSchema: Record<string, unknown>;
      // 	schema: TablesRelationalConfig;
      // 	tableNamesMap: Record<string, string>;
      // 	table: PgTable;
      // 	tableConfig: TableRelationalConfig;
      // 	queryConfig: true | DBQueryConfig<'many', true>;
      // 	tableAlias: string;
      // 	isRoot?: boolean;
      // 	joinOn?: SQL;
      // }): BuildRelationalQueryResult<PgTable, PgColumn> {
      // 	// For { "<relation>": true }, return a table with selection of all columns
      // 	if (config === true) {
      // 		const selectionEntries = Object.entries(tableConfig.columns);
      // 		const selection: BuildRelationalQueryResult<PgTable, PgColumn>['selection'] = selectionEntries.map((
      // 			[key, value],
      // 		) => ({
      // 			dbKey: value.name,
      // 			tsKey: key,
      // 			field: value as PgColumn,
      // 			relationTableTsKey: undefined,
      // 			isJson: false,
      // 			selection: [],
      // 		}));
      // 		return {
      // 			tableTsKey: tableConfig.tsName,
      // 			sql: table,
      // 			selection,
      // 		};
      // 	}
      // 	// let selection: BuildRelationalQueryResult<PgTable, PgColumn>['selection'] = [];
      // 	// let selectionForBuild = selection;
      // 	const aliasedColumns = Object.fromEntries(
      // 		Object.entries(tableConfig.columns).map(([key, value]) => [key, aliasedTableColumn(value, tableAlias)]),
      // 	);
      // 	const aliasedRelations = Object.fromEntries(
      // 		Object.entries(tableConfig.relations).map(([key, value]) => [key, aliasedRelation(value, tableAlias)]),
      // 	);
      // 	const aliasedFields = Object.assign({}, aliasedColumns, aliasedRelations);
      // 	let where, hasUserDefinedWhere;
      // 	if (config.where) {
      // 		const whereSql = typeof config.where === 'function' ? config.where(aliasedFields, operators) : config.where;
      // 		where = whereSql && mapColumnsInSQLToAlias(whereSql, tableAlias);
      // 		hasUserDefinedWhere = !!where;
      // 	}
      // 	where = and(joinOn, where);
      // 	// const fieldsSelection: { tsKey: string; value: PgColumn | SQL.Aliased; isExtra?: boolean }[] = [];
      // 	let joins: Join[] = [];
      // 	let selectedColumns: string[] = [];
      // 	// Figure out which columns to select
      // 	if (config.columns) {
      // 		let isIncludeMode = false;
      // 		for (const [field, value] of Object.entries(config.columns)) {
      // 			if (value === undefined) {
      // 				continue;
      // 			}
      // 			if (field in tableConfig.columns) {
      // 				if (!isIncludeMode && value === true) {
      // 					isIncludeMode = true;
      // 				}
      // 				selectedColumns.push(field);
      // 			}
      // 		}
      // 		if (selectedColumns.length > 0) {
      // 			selectedColumns = isIncludeMode
      // 				? selectedColumns.filter((c) => config.columns?.[c] === true)
      // 				: Object.keys(tableConfig.columns).filter((key) => !selectedColumns.includes(key));
      // 		}
      // 	} else {
      // 		// Select all columns if selection is not specified
      // 		selectedColumns = Object.keys(tableConfig.columns);
      // 	}
      // 	// for (const field of selectedColumns) {
      // 	// 	const column = tableConfig.columns[field]! as PgColumn;
      // 	// 	fieldsSelection.push({ tsKey: field, value: column });
      // 	// }
      // 	let initiallySelectedRelations: {
      // 		tsKey: string;
      // 		queryConfig: true | DBQueryConfig<'many', false>;
      // 		relation: Relation;
      // 	}[] = [];
      // 	// let selectedRelations: BuildRelationalQueryResult<PgTable, PgColumn>['selection'] = [];
      // 	// Figure out which relations to select
      // 	if (config.with) {
      // 		initiallySelectedRelations = Object.entries(config.with)
      // 			.filter((entry): entry is [typeof entry[0], NonNullable<typeof entry[1]>] => !!entry[1])
      // 			.map(([tsKey, queryConfig]) => ({ tsKey, queryConfig, relation: tableConfig.relations[tsKey]! }));
      // 	}
      // 	const manyRelations = initiallySelectedRelations.filter((r) =>
      // 		is(r.relation, Many)
      // 		&& (schema[tableNamesMap[r.relation.referencedTable[Table.Symbol.Name]]!]?.primaryKey.length ?? 0) > 0
      // 	);
      // 	// If this is the last Many relation (or there are no Many relations), we are on the innermost subquery level
      // 	const isInnermostQuery = manyRelations.length < 2;
      // 	const selectedExtras: {
      // 		tsKey: string;
      // 		value: SQL.Aliased;
      // 	}[] = [];
      // 	// Figure out which extras to select
      // 	if (isInnermostQuery && config.extras) {
      // 		const extras = typeof config.extras === 'function'
      // 			? config.extras(aliasedFields, { sql })
      // 			: config.extras;
      // 		for (const [tsKey, value] of Object.entries(extras)) {
      // 			selectedExtras.push({
      // 				tsKey,
      // 				value: mapColumnsInAliasedSQLToAlias(value, tableAlias),
      // 			});
      // 		}
      // 	}
      // 	// Transform `fieldsSelection` into `selection`
      // 	// `fieldsSelection` shouldn't be used after this point
      // 	// for (const { tsKey, value, isExtra } of fieldsSelection) {
      // 	// 	selection.push({
      // 	// 		dbKey: is(value, SQL.Aliased) ? value.fieldAlias : tableConfig.columns[tsKey]!.name,
      // 	// 		tsKey,
      // 	// 		field: is(value, Column) ? aliasedTableColumn(value, tableAlias) : value,
      // 	// 		relationTableTsKey: undefined,
      // 	// 		isJson: false,
      // 	// 		isExtra,
      // 	// 		selection: [],
      // 	// 	});
      // 	// }
      // 	let orderByOrig = typeof config.orderBy === 'function'
      // 		? config.orderBy(aliasedFields, orderByOperators)
      // 		: config.orderBy ?? [];
      // 	if (!Array.isArray(orderByOrig)) {
      // 		orderByOrig = [orderByOrig];
      // 	}
      // 	const orderBy = orderByOrig.map((orderByValue) => {
      // 		if (is(orderByValue, Column)) {
      // 			return aliasedTableColumn(orderByValue, tableAlias) as PgColumn;
      // 		}
      // 		return mapColumnsInSQLToAlias(orderByValue, tableAlias);
      // 	});
      // 	const limit = isInnermostQuery ? config.limit : undefined;
      // 	const offset = isInnermostQuery ? config.offset : undefined;
      // 	// For non-root queries without additional config except columns, return a table with selection
      // 	if (
      // 		!isRoot
      // 		&& initiallySelectedRelations.length === 0
      // 		&& selectedExtras.length === 0
      // 		&& !where
      // 		&& orderBy.length === 0
      // 		&& limit === undefined
      // 		&& offset === undefined
      // 	) {
      // 		return {
      // 			tableTsKey: tableConfig.tsName,
      // 			sql: table,
      // 			selection: selectedColumns.map((key) => ({
      // 				dbKey: tableConfig.columns[key]!.name,
      // 				tsKey: key,
      // 				field: tableConfig.columns[key] as PgColumn,
      // 				relationTableTsKey: undefined,
      // 				isJson: false,
      // 				selection: [],
      // 			})),
      // 		};
      // 	}
      // 	const selectedRelationsWithoutPK:
      // 	// Process all relations without primary keys, because they need to be joined differently and will all be on the same query level
      // 	for (
      // 		const {
      // 			tsKey: selectedRelationTsKey,
      // 			queryConfig: selectedRelationConfigValue,
      // 			relation,
      // 		} of initiallySelectedRelations
      // 	) {
      // 		const normalizedRelation = normalizeRelation(schema, tableNamesMap, relation);
      // 		const relationTableName = relation.referencedTable[Table.Symbol.Name];
      // 		const relationTableTsName = tableNamesMap[relationTableName]!;
      // 		const relationTable = schema[relationTableTsName]!;
      // 		if (relationTable.primaryKey.length > 0) {
      // 			continue;
      // 		}
      // 		const relationTableAlias = `${tableAlias}_${selectedRelationTsKey}`;
      // 		const joinOn = and(
      // 			...normalizedRelation.fields.map((field, i) =>
      // 				eq(
      // 					aliasedTableColumn(normalizedRelation.references[i]!, relationTableAlias),
      // 					aliasedTableColumn(field, tableAlias),
      // 				)
      // 			),
      // 		);
      // 		const builtRelation = this.buildRelationalQueryWithoutPK({
      // 			fullSchema,
      // 			schema,
      // 			tableNamesMap,
      // 			table: fullSchema[relationTableTsName] as PgTable,
      // 			tableConfig: schema[relationTableTsName]!,
      // 			queryConfig: selectedRelationConfigValue,
      // 			tableAlias: relationTableAlias,
      // 			joinOn,
      // 			nestedQueryRelation: relation,
      // 		});
      // 		const field = sql`${sql.identifier(relationTableAlias)}.${sql.identifier('data')}`.as(selectedRelationTsKey);
      // 		joins.push({
      // 			on: sql`true`,
      // 			table: new Subquery(builtRelation.sql as SQL, {}, relationTableAlias),
      // 			alias: relationTableAlias,
      // 			joinType: 'left',
      // 			lateral: true,
      // 		});
      // 		selectedRelations.push({
      // 			dbKey: selectedRelationTsKey,
      // 			tsKey: selectedRelationTsKey,
      // 			field,
      // 			relationTableTsKey: relationTableTsName,
      // 			isJson: true,
      // 			selection: builtRelation.selection,
      // 		});
      // 	}
      // 	const oneRelations = initiallySelectedRelations.filter((r): r is typeof r & { relation: One } =>
      // 		is(r.relation, One)
      // 	);
      // 	// Process all One relations with PKs, because they can all be joined on the same level
      // 	for (
      // 		const {
      // 			tsKey: selectedRelationTsKey,
      // 			queryConfig: selectedRelationConfigValue,
      // 			relation,
      // 		} of oneRelations
      // 	) {
      // 		const normalizedRelation = normalizeRelation(schema, tableNamesMap, relation);
      // 		const relationTableName = relation.referencedTable[Table.Symbol.Name];
      // 		const relationTableTsName = tableNamesMap[relationTableName]!;
      // 		const relationTableAlias = `${tableAlias}_${selectedRelationTsKey}`;
      // 		const relationTable = schema[relationTableTsName]!;
      // 		if (relationTable.primaryKey.length === 0) {
      // 			continue;
      // 		}
      // 		const joinOn = and(
      // 			...normalizedRelation.fields.map((field, i) =>
      // 				eq(
      // 					aliasedTableColumn(normalizedRelation.references[i]!, relationTableAlias),
      // 					aliasedTableColumn(field, tableAlias),
      // 				)
      // 			),
      // 		);
      // 		const builtRelation = this.buildRelationalQueryWithPK({
      // 			fullSchema,
      // 			schema,
      // 			tableNamesMap,
      // 			table: fullSchema[relationTableTsName] as PgTable,
      // 			tableConfig: schema[relationTableTsName]!,
      // 			queryConfig: selectedRelationConfigValue,
      // 			tableAlias: relationTableAlias,
      // 			joinOn,
      // 		});
      // 		const field = sql`case when ${sql.identifier(relationTableAlias)} is null then null else json_build_array(${
      // 			sql.join(
      // 				builtRelation.selection.map(({ field }) =>
      // 					is(field, SQL.Aliased)
      // 						? sql`${sql.identifier(relationTableAlias)}.${sql.identifier(field.fieldAlias)}`
      // 						: is(field, Column)
      // 						? aliasedTableColumn(field, relationTableAlias)
      // 						: field
      // 				),
      // 				sql`, `,
      // 			)
      // 		}) end`.as(selectedRelationTsKey);
      // 		const isLateralJoin = is(builtRelation.sql, SQL);
      // 		joins.push({
      // 			on: isLateralJoin ? sql`true` : joinOn,
      // 			table: is(builtRelation.sql, SQL)
      // 				? new Subquery(builtRelation.sql, {}, relationTableAlias)
      // 				: aliasedTable(builtRelation.sql, relationTableAlias),
      // 			alias: relationTableAlias,
      // 			joinType: 'left',
      // 			lateral: is(builtRelation.sql, SQL),
      // 		});
      // 		selectedRelations.push({
      // 			dbKey: selectedRelationTsKey,
      // 			tsKey: selectedRelationTsKey,
      // 			field,
      // 			relationTableTsKey: relationTableTsName,
      // 			isJson: true,
      // 			selection: builtRelation.selection,
      // 		});
      // 	}
      // 	let distinct: PgSelectConfig['distinct'];
      // 	let tableFrom: PgTable | Subquery = table;
      // 	// Process first Many relation - each one requires a nested subquery
      // 	const manyRelation = manyRelations[0];
      // 	if (manyRelation) {
      // 		const {
      // 			tsKey: selectedRelationTsKey,
      // 			queryConfig: selectedRelationQueryConfig,
      // 			relation,
      // 		} = manyRelation;
      // 		distinct = {
      // 			on: tableConfig.primaryKey.map((c) => aliasedTableColumn(c as PgColumn, tableAlias)),
      // 		};
      // 		const normalizedRelation = normalizeRelation(schema, tableNamesMap, relation);
      // 		const relationTableName = relation.referencedTable[Table.Symbol.Name];
      // 		const relationTableTsName = tableNamesMap[relationTableName]!;
      // 		const relationTableAlias = `${tableAlias}_${selectedRelationTsKey}`;
      // 		const joinOn = and(
      // 			...normalizedRelation.fields.map((field, i) =>
      // 				eq(
      // 					aliasedTableColumn(normalizedRelation.references[i]!, relationTableAlias),
      // 					aliasedTableColumn(field, tableAlias),
      // 				)
      // 			),
      // 		);
      // 		const builtRelationJoin = this.buildRelationalQueryWithPK({
      // 			fullSchema,
      // 			schema,
      // 			tableNamesMap,
      // 			table: fullSchema[relationTableTsName] as PgTable,
      // 			tableConfig: schema[relationTableTsName]!,
      // 			queryConfig: selectedRelationQueryConfig,
      // 			tableAlias: relationTableAlias,
      // 			joinOn,
      // 		});
      // 		const builtRelationSelectionField = sql`case when ${
      // 			sql.identifier(relationTableAlias)
      // 		} is null then '[]' else json_agg(json_build_array(${
      // 			sql.join(
      // 				builtRelationJoin.selection.map(({ field }) =>
      // 					is(field, SQL.Aliased)
      // 						? sql`${sql.identifier(relationTableAlias)}.${sql.identifier(field.fieldAlias)}`
      // 						: is(field, Column)
      // 						? aliasedTableColumn(field, relationTableAlias)
      // 						: field
      // 				),
      // 				sql`, `,
      // 			)
      // 		})) over (partition by ${sql.join(distinct.on, sql`, `)}) end`.as(selectedRelationTsKey);
      // 		const isLateralJoin = is(builtRelationJoin.sql, SQL);
      // 		joins.push({
      // 			on: isLateralJoin ? sql`true` : joinOn,
      // 			table: isLateralJoin
      // 				? new Subquery(builtRelationJoin.sql as SQL, {}, relationTableAlias)
      // 				: aliasedTable(builtRelationJoin.sql as PgTable, relationTableAlias),
      // 			alias: relationTableAlias,
      // 			joinType: 'left',
      // 			lateral: isLateralJoin,
      // 		});
      // 		// Build the "from" subquery with the remaining Many relations
      // 		const builtTableFrom = this.buildRelationalQueryWithPK({
      // 			fullSchema,
      // 			schema,
      // 			tableNamesMap,
      // 			table,
      // 			tableConfig,
      // 			queryConfig: {
      // 				...config,
      // 				where: undefined,
      // 				orderBy: undefined,
      // 				limit: undefined,
      // 				offset: undefined,
      // 				with: manyRelations.slice(1).reduce<NonNullable<typeof config['with']>>(
      // 					(result, { tsKey, queryConfig: configValue }) => {
      // 						result[tsKey] = configValue;
      // 						return result;
      // 					},
      // 					{},
      // 				),
      // 			},
      // 			tableAlias,
      // 		});
      // 		selectedRelations.push({
      // 			dbKey: selectedRelationTsKey,
      // 			tsKey: selectedRelationTsKey,
      // 			field: builtRelationSelectionField,
      // 			relationTableTsKey: relationTableTsName,
      // 			isJson: true,
      // 			selection: builtRelationJoin.selection,
      // 		});
      // 		// selection = builtTableFrom.selection.map((item) =>
      // 		// 	is(item.field, SQL.Aliased)
      // 		// 		? { ...item, field: sql`${sql.identifier(tableAlias)}.${sql.identifier(item.field.fieldAlias)}` }
      // 		// 		: item
      // 		// );
      // 		// selectionForBuild = [{
      // 		// 	dbKey: '*',
      // 		// 	tsKey: '*',
      // 		// 	field: sql`${sql.identifier(tableAlias)}.*`,
      // 		// 	selection: [],
      // 		// 	isJson: false,
      // 		// 	relationTableTsKey: undefined,
      // 		// }];
      // 		// const newSelectionItem: (typeof selection)[number] = {
      // 		// 	dbKey: selectedRelationTsKey,
      // 		// 	tsKey: selectedRelationTsKey,
      // 		// 	field,
      // 		// 	relationTableTsKey: relationTableTsName,
      // 		// 	isJson: true,
      // 		// 	selection: builtRelationJoin.selection,
      // 		// };
      // 		// selection.push(newSelectionItem);
      // 		// selectionForBuild.push(newSelectionItem);
      // 		tableFrom = is(builtTableFrom.sql, PgTable)
      // 			? builtTableFrom.sql
      // 			: new Subquery(builtTableFrom.sql, {}, tableAlias);
      // 	}
      // 	if (selectedColumns.length === 0 && selectedRelations.length === 0 && selectedExtras.length === 0) {
      // 		throw new DrizzleError(`No fields selected for table "${tableConfig.tsName}" ("${tableAlias}")`);
      // 	}
      // 	let selection: BuildRelationalQueryResult<PgTable, PgColumn>['selection'];
      // 	function prepareSelectedColumns() {
      // 		return selectedColumns.map((key) => ({
      // 			dbKey: tableConfig.columns[key]!.name,
      // 			tsKey: key,
      // 			field: tableConfig.columns[key] as PgColumn,
      // 			relationTableTsKey: undefined,
      // 			isJson: false,
      // 			selection: [],
      // 		}));
      // 	}
      // 	function prepareSelectedExtras() {
      // 		return selectedExtras.map((item) => ({
      // 			dbKey: item.value.fieldAlias,
      // 			tsKey: item.tsKey,
      // 			field: item.value,
      // 			relationTableTsKey: undefined,
      // 			isJson: false,
      // 			selection: [],
      // 		}));
      // 	}
      // 	if (isRoot) {
      // 		selection = [
      // 			...prepareSelectedColumns(),
      // 			...prepareSelectedExtras(),
      // 		];
      // 	}
      // 	if (hasUserDefinedWhere || orderBy.length > 0) {
      // 		tableFrom = new Subquery(
      // 			this.buildSelectQuery({
      // 				table: is(tableFrom, PgTable) ? aliasedTable(tableFrom, tableAlias) : tableFrom,
      // 				fields: {},
      // 				fieldsFlat: selectionForBuild.map(({ field }) => ({
      // 					path: [],
      // 					field: is(field, Column) ? aliasedTableColumn(field, tableAlias) : field,
      // 				})),
      // 				joins,
      // 				distinct,
      // 			}),
      // 			{},
      // 			tableAlias,
      // 		);
      // 		selectionForBuild = selection.map((item) =>
      // 			is(item.field, SQL.Aliased)
      // 				? { ...item, field: sql`${sql.identifier(tableAlias)}.${sql.identifier(item.field.fieldAlias)}` }
      // 				: item
      // 		);
      // 		joins = [];
      // 		distinct = undefined;
      // 	}
      // 	const result = this.buildSelectQuery({
      // 		table: is(tableFrom, PgTable) ? aliasedTable(tableFrom, tableAlias) : tableFrom,
      // 		fields: {},
      // 		fieldsFlat: selectionForBuild.map(({ field }) => ({
      // 			path: [],
      // 			field: is(field, Column) ? aliasedTableColumn(field, tableAlias) : field,
      // 		})),
      // 		where,
      // 		limit,
      // 		offset,
      // 		joins,
      // 		orderBy,
      // 		distinct,
      // 	});
      // 	return {
      // 		tableTsKey: tableConfig.tsName,
      // 		sql: result,
      // 		selection,
      // 	};
      // }
      buildRelationalQueryWithoutPK({
        fullSchema,
        schema,
        tableNamesMap,
        table,
        tableConfig,
        queryConfig: config,
        tableAlias,
        nestedQueryRelation,
        joinOn
      }) {
        let selection = [];
        let limit, offset, orderBy = [], where;
        const joins = [];
        if (config === true) {
          const selectionEntries = Object.entries(tableConfig.columns);
          selection = selectionEntries.map(([key, value]) => ({
            dbKey: value.name,
            tsKey: key,
            field: aliasedTableColumn(value, tableAlias),
            relationTableTsKey: void 0,
            isJson: false,
            selection: []
          }));
        } else {
          const aliasedColumns = Object.fromEntries(
            Object.entries(tableConfig.columns).map(([key, value]) => [key, aliasedTableColumn(value, tableAlias)])
          );
          if (config.where) {
            const whereSql = typeof config.where === "function" ? config.where(aliasedColumns, getOperators()) : config.where;
            where = whereSql && mapColumnsInSQLToAlias(whereSql, tableAlias);
          }
          const fieldsSelection = [];
          let selectedColumns = [];
          if (config.columns) {
            let isIncludeMode = false;
            for (const [field, value] of Object.entries(config.columns)) {
              if (value === void 0) {
                continue;
              }
              if (field in tableConfig.columns) {
                if (!isIncludeMode && value === true) {
                  isIncludeMode = true;
                }
                selectedColumns.push(field);
              }
            }
            if (selectedColumns.length > 0) {
              selectedColumns = isIncludeMode ? selectedColumns.filter((c) => config.columns?.[c] === true) : Object.keys(tableConfig.columns).filter((key) => !selectedColumns.includes(key));
            }
          } else {
            selectedColumns = Object.keys(tableConfig.columns);
          }
          for (const field of selectedColumns) {
            const column = tableConfig.columns[field];
            fieldsSelection.push({ tsKey: field, value: column });
          }
          let selectedRelations = [];
          if (config.with) {
            selectedRelations = Object.entries(config.with).filter((entry) => !!entry[1]).map(([tsKey, queryConfig2]) => ({ tsKey, queryConfig: queryConfig2, relation: tableConfig.relations[tsKey] }));
          }
          let extras;
          if (config.extras) {
            extras = typeof config.extras === "function" ? config.extras(aliasedColumns, { sql }) : config.extras;
            for (const [tsKey, value] of Object.entries(extras)) {
              fieldsSelection.push({
                tsKey,
                value: mapColumnsInAliasedSQLToAlias(value, tableAlias)
              });
            }
          }
          for (const { tsKey, value } of fieldsSelection) {
            selection.push({
              dbKey: is(value, SQL.Aliased) ? value.fieldAlias : tableConfig.columns[tsKey].name,
              tsKey,
              field: is(value, Column) ? aliasedTableColumn(value, tableAlias) : value,
              relationTableTsKey: void 0,
              isJson: false,
              selection: []
            });
          }
          let orderByOrig = typeof config.orderBy === "function" ? config.orderBy(aliasedColumns, getOrderByOperators()) : config.orderBy ?? [];
          if (!Array.isArray(orderByOrig)) {
            orderByOrig = [orderByOrig];
          }
          orderBy = orderByOrig.map((orderByValue) => {
            if (is(orderByValue, Column)) {
              return aliasedTableColumn(orderByValue, tableAlias);
            }
            return mapColumnsInSQLToAlias(orderByValue, tableAlias);
          });
          limit = config.limit;
          offset = config.offset;
          for (const {
            tsKey: selectedRelationTsKey,
            queryConfig: selectedRelationConfigValue,
            relation
          } of selectedRelations) {
            const normalizedRelation = normalizeRelation(schema, tableNamesMap, relation);
            const relationTableName = getTableUniqueName(relation.referencedTable);
            const relationTableTsName = tableNamesMap[relationTableName];
            const relationTableAlias = `${tableAlias}_${selectedRelationTsKey}`;
            const joinOn2 = and(
              ...normalizedRelation.fields.map(
                (field2, i) => eq(
                  aliasedTableColumn(normalizedRelation.references[i], relationTableAlias),
                  aliasedTableColumn(field2, tableAlias)
                )
              )
            );
            const builtRelation = this.buildRelationalQueryWithoutPK({
              fullSchema,
              schema,
              tableNamesMap,
              table: fullSchema[relationTableTsName],
              tableConfig: schema[relationTableTsName],
              queryConfig: is(relation, One) ? selectedRelationConfigValue === true ? { limit: 1 } : { ...selectedRelationConfigValue, limit: 1 } : selectedRelationConfigValue,
              tableAlias: relationTableAlias,
              joinOn: joinOn2,
              nestedQueryRelation: relation
            });
            const field = sql`${sql.identifier(relationTableAlias)}.${sql.identifier("data")}`.as(selectedRelationTsKey);
            joins.push({
              on: sql`true`,
              table: new Subquery(builtRelation.sql, {}, relationTableAlias),
              alias: relationTableAlias,
              joinType: "left",
              lateral: true
            });
            selection.push({
              dbKey: selectedRelationTsKey,
              tsKey: selectedRelationTsKey,
              field,
              relationTableTsKey: relationTableTsName,
              isJson: true,
              selection: builtRelation.selection
            });
          }
        }
        if (selection.length === 0) {
          throw new DrizzleError({ message: `No fields selected for table "${tableConfig.tsName}" ("${tableAlias}")` });
        }
        let result;
        where = and(joinOn, where);
        if (nestedQueryRelation) {
          let field = sql`json_build_array(${sql.join(
            selection.map(
              ({ field: field2, tsKey, isJson }) => isJson ? sql`${sql.identifier(`${tableAlias}_${tsKey}`)}.${sql.identifier("data")}` : is(field2, SQL.Aliased) ? field2.sql : field2
            ),
            sql`, `
          )})`;
          if (is(nestedQueryRelation, Many)) {
            field = sql`coalesce(json_agg(${field}${orderBy.length > 0 ? sql` order by ${sql.join(orderBy, sql`, `)}` : void 0}), '[]'::json)`;
          }
          const nestedSelection = [{
            dbKey: "data",
            tsKey: "data",
            field: field.as("data"),
            isJson: true,
            relationTableTsKey: tableConfig.tsName,
            selection
          }];
          const needsSubquery = limit !== void 0 || offset !== void 0 || orderBy.length > 0;
          if (needsSubquery) {
            result = this.buildSelectQuery({
              table: aliasedTable(table, tableAlias),
              fields: {},
              fieldsFlat: [{
                path: [],
                field: sql.raw("*")
              }],
              where,
              limit,
              offset,
              orderBy,
              setOperators: []
            });
            where = void 0;
            limit = void 0;
            offset = void 0;
            orderBy = [];
          } else {
            result = aliasedTable(table, tableAlias);
          }
          result = this.buildSelectQuery({
            table: is(result, PgTable) ? result : new Subquery(result, {}, tableAlias),
            fields: {},
            fieldsFlat: nestedSelection.map(({ field: field2 }) => ({
              path: [],
              field: is(field2, Column) ? aliasedTableColumn(field2, tableAlias) : field2
            })),
            joins,
            where,
            limit,
            offset,
            orderBy,
            setOperators: []
          });
        } else {
          result = this.buildSelectQuery({
            table: aliasedTable(table, tableAlias),
            fields: {},
            fieldsFlat: selection.map(({ field }) => ({
              path: [],
              field: is(field, Column) ? aliasedTableColumn(field, tableAlias) : field
            })),
            joins,
            where,
            limit,
            offset,
            orderBy,
            setOperators: []
          });
        }
        return {
          tableTsKey: tableConfig.tsName,
          sql: result,
          selection
        };
      }
    };
  }
});

// ../node_modules/drizzle-orm/query-builders/query-builder.js
var TypedQueryBuilder;
var init_query_builder = __esm({
  "../node_modules/drizzle-orm/query-builders/query-builder.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    TypedQueryBuilder = class {
      static {
        __name(this, "TypedQueryBuilder");
      }
      static [entityKind] = "TypedQueryBuilder";
      /** @internal */
      getSelectedFields() {
        return this._.selectedFields;
      }
    };
  }
});

// ../node_modules/drizzle-orm/pg-core/query-builders/select.js
function createSetOperator(type, isAll) {
  return (leftSelect, rightSelect, ...restSelects) => {
    const setOperators = [rightSelect, ...restSelects].map((select) => ({
      type,
      isAll,
      rightSelect: select
    }));
    for (const setOperator of setOperators) {
      if (!haveSameKeys(leftSelect.getSelectedFields(), setOperator.rightSelect.getSelectedFields())) {
        throw new Error(
          "Set operator error (union / intersect / except): selected fields are not the same or are in a different order"
        );
      }
    }
    return leftSelect.addSetOperators(setOperators);
  };
}
var PgSelectBuilder, PgSelectQueryBuilderBase, PgSelectBase, getPgSetOperators, union, unionAll, intersect, intersectAll, except, exceptAll;
var init_select2 = __esm({
  "../node_modules/drizzle-orm/pg-core/query-builders/select.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_view_base();
    init_query_builder();
    init_query_promise();
    init_selection_proxy();
    init_sql();
    init_subquery();
    init_table();
    init_tracing();
    init_utils();
    init_utils();
    init_view_common();
    init_utils3();
    PgSelectBuilder = class {
      static {
        __name(this, "PgSelectBuilder");
      }
      static [entityKind] = "PgSelectBuilder";
      fields;
      session;
      dialect;
      withList = [];
      distinct;
      constructor(config) {
        this.fields = config.fields;
        this.session = config.session;
        this.dialect = config.dialect;
        if (config.withList) {
          this.withList = config.withList;
        }
        this.distinct = config.distinct;
      }
      authToken;
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      /**
       * Specify the table, subquery, or other target that you're
       * building a select query against.
       *
       * {@link https://www.postgresql.org/docs/current/sql-select.html#SQL-FROM | Postgres from documentation}
       */
      from(source) {
        const isPartialSelect = !!this.fields;
        const src = source;
        let fields;
        if (this.fields) {
          fields = this.fields;
        } else if (is(src, Subquery)) {
          fields = Object.fromEntries(
            Object.keys(src._.selectedFields).map((key) => [key, src[key]])
          );
        } else if (is(src, PgViewBase)) {
          fields = src[ViewBaseConfig].selectedFields;
        } else if (is(src, SQL)) {
          fields = {};
        } else {
          fields = getTableColumns(src);
        }
        return new PgSelectBase({
          table: src,
          fields,
          isPartialSelect,
          session: this.session,
          dialect: this.dialect,
          withList: this.withList,
          distinct: this.distinct
        }).setToken(this.authToken);
      }
    };
    PgSelectQueryBuilderBase = class extends TypedQueryBuilder {
      static {
        __name(this, "PgSelectQueryBuilderBase");
      }
      static [entityKind] = "PgSelectQueryBuilder";
      _;
      config;
      joinsNotNullableMap;
      tableName;
      isPartialSelect;
      session;
      dialect;
      cacheConfig = void 0;
      usedTables = /* @__PURE__ */ new Set();
      constructor({ table, fields, isPartialSelect, session, dialect, withList, distinct }) {
        super();
        this.config = {
          withList,
          table,
          fields: { ...fields },
          distinct,
          setOperators: []
        };
        this.isPartialSelect = isPartialSelect;
        this.session = session;
        this.dialect = dialect;
        this._ = {
          selectedFields: fields,
          config: this.config
        };
        this.tableName = getTableLikeName(table);
        this.joinsNotNullableMap = typeof this.tableName === "string" ? { [this.tableName]: true } : {};
        for (const item of extractUsedTable(table)) this.usedTables.add(item);
      }
      /** @internal */
      getUsedTables() {
        return [...this.usedTables];
      }
      createJoin(joinType, lateral) {
        return (table, on) => {
          const baseTableName = this.tableName;
          const tableName = getTableLikeName(table);
          for (const item of extractUsedTable(table)) this.usedTables.add(item);
          if (typeof tableName === "string" && this.config.joins?.some((join) => join.alias === tableName)) {
            throw new Error(`Alias "${tableName}" is already used in this query`);
          }
          if (!this.isPartialSelect) {
            if (Object.keys(this.joinsNotNullableMap).length === 1 && typeof baseTableName === "string") {
              this.config.fields = {
                [baseTableName]: this.config.fields
              };
            }
            if (typeof tableName === "string" && !is(table, SQL)) {
              const selection = is(table, Subquery) ? table._.selectedFields : is(table, View) ? table[ViewBaseConfig].selectedFields : table[Table.Symbol.Columns];
              this.config.fields[tableName] = selection;
            }
          }
          if (typeof on === "function") {
            on = on(
              new Proxy(
                this.config.fields,
                new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
              )
            );
          }
          if (!this.config.joins) {
            this.config.joins = [];
          }
          this.config.joins.push({ on, table, joinType, alias: tableName, lateral });
          if (typeof tableName === "string") {
            switch (joinType) {
              case "left": {
                this.joinsNotNullableMap[tableName] = false;
                break;
              }
              case "right": {
                this.joinsNotNullableMap = Object.fromEntries(
                  Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false])
                );
                this.joinsNotNullableMap[tableName] = true;
                break;
              }
              case "cross":
              case "inner": {
                this.joinsNotNullableMap[tableName] = true;
                break;
              }
              case "full": {
                this.joinsNotNullableMap = Object.fromEntries(
                  Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false])
                );
                this.joinsNotNullableMap[tableName] = false;
                break;
              }
            }
          }
          return this;
        };
      }
      /**
       * Executes a `left join` operation by adding another table to the current query.
       *
       * Calling this method associates each row of the table with the corresponding row from the joined table, if a match is found. If no matching row exists, it sets all columns of the joined table to null.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#left-join}
       *
       * @param table the table to join.
       * @param on the `on` clause.
       *
       * @example
       *
       * ```ts
       * // Select all users and their pets
       * const usersWithPets: { user: User; pets: Pet | null; }[] = await db.select()
       *   .from(users)
       *   .leftJoin(pets, eq(users.id, pets.ownerId))
       *
       * // Select userId and petId
       * const usersIdsAndPetIds: { userId: number; petId: number | null; }[] = await db.select({
       *   userId: users.id,
       *   petId: pets.id,
       * })
       *   .from(users)
       *   .leftJoin(pets, eq(users.id, pets.ownerId))
       * ```
       */
      leftJoin = this.createJoin("left", false);
      /**
       * Executes a `left join lateral` operation by adding subquery to the current query.
       *
       * A `lateral` join allows the right-hand expression to refer to columns from the left-hand side.
       *
       * Calling this method associates each row of the table with the corresponding row from the joined table, if a match is found. If no matching row exists, it sets all columns of the joined table to null.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#left-join-lateral}
       *
       * @param table the subquery to join.
       * @param on the `on` clause.
       */
      leftJoinLateral = this.createJoin("left", true);
      /**
       * Executes a `right join` operation by adding another table to the current query.
       *
       * Calling this method associates each row of the joined table with the corresponding row from the main table, if a match is found. If no matching row exists, it sets all columns of the main table to null.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#right-join}
       *
       * @param table the table to join.
       * @param on the `on` clause.
       *
       * @example
       *
       * ```ts
       * // Select all users and their pets
       * const usersWithPets: { user: User | null; pets: Pet; }[] = await db.select()
       *   .from(users)
       *   .rightJoin(pets, eq(users.id, pets.ownerId))
       *
       * // Select userId and petId
       * const usersIdsAndPetIds: { userId: number | null; petId: number; }[] = await db.select({
       *   userId: users.id,
       *   petId: pets.id,
       * })
       *   .from(users)
       *   .rightJoin(pets, eq(users.id, pets.ownerId))
       * ```
       */
      rightJoin = this.createJoin("right", false);
      /**
       * Executes an `inner join` operation, creating a new table by combining rows from two tables that have matching values.
       *
       * Calling this method retrieves rows that have corresponding entries in both joined tables. Rows without matching entries in either table are excluded, resulting in a table that includes only matching pairs.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#inner-join}
       *
       * @param table the table to join.
       * @param on the `on` clause.
       *
       * @example
       *
       * ```ts
       * // Select all users and their pets
       * const usersWithPets: { user: User; pets: Pet; }[] = await db.select()
       *   .from(users)
       *   .innerJoin(pets, eq(users.id, pets.ownerId))
       *
       * // Select userId and petId
       * const usersIdsAndPetIds: { userId: number; petId: number; }[] = await db.select({
       *   userId: users.id,
       *   petId: pets.id,
       * })
       *   .from(users)
       *   .innerJoin(pets, eq(users.id, pets.ownerId))
       * ```
       */
      innerJoin = this.createJoin("inner", false);
      /**
       * Executes an `inner join lateral` operation, creating a new table by combining rows from two queries that have matching values.
       *
       * A `lateral` join allows the right-hand expression to refer to columns from the left-hand side.
       *
       * Calling this method retrieves rows that have corresponding entries in both joined tables. Rows without matching entries in either table are excluded, resulting in a table that includes only matching pairs.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#inner-join-lateral}
       *
       * @param table the subquery to join.
       * @param on the `on` clause.
       */
      innerJoinLateral = this.createJoin("inner", true);
      /**
       * Executes a `full join` operation by combining rows from two tables into a new table.
       *
       * Calling this method retrieves all rows from both main and joined tables, merging rows with matching values and filling in `null` for non-matching columns.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#full-join}
       *
       * @param table the table to join.
       * @param on the `on` clause.
       *
       * @example
       *
       * ```ts
       * // Select all users and their pets
       * const usersWithPets: { user: User | null; pets: Pet | null; }[] = await db.select()
       *   .from(users)
       *   .fullJoin(pets, eq(users.id, pets.ownerId))
       *
       * // Select userId and petId
       * const usersIdsAndPetIds: { userId: number | null; petId: number | null; }[] = await db.select({
       *   userId: users.id,
       *   petId: pets.id,
       * })
       *   .from(users)
       *   .fullJoin(pets, eq(users.id, pets.ownerId))
       * ```
       */
      fullJoin = this.createJoin("full", false);
      /**
       * Executes a `cross join` operation by combining rows from two tables into a new table.
       *
       * Calling this method retrieves all rows from both main and joined tables, merging all rows from each table.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#cross-join}
       *
       * @param table the table to join.
       *
       * @example
       *
       * ```ts
       * // Select all users, each user with every pet
       * const usersWithPets: { user: User; pets: Pet; }[] = await db.select()
       *   .from(users)
       *   .crossJoin(pets)
       *
       * // Select userId and petId
       * const usersIdsAndPetIds: { userId: number; petId: number; }[] = await db.select({
       *   userId: users.id,
       *   petId: pets.id,
       * })
       *   .from(users)
       *   .crossJoin(pets)
       * ```
       */
      crossJoin = this.createJoin("cross", false);
      /**
       * Executes a `cross join lateral` operation by combining rows from two queries into a new table.
       *
       * A `lateral` join allows the right-hand expression to refer to columns from the left-hand side.
       *
       * Calling this method retrieves all rows from both main and joined queries, merging all rows from each query.
       *
       * See docs: {@link https://orm.drizzle.team/docs/joins#cross-join-lateral}
       *
       * @param table the query to join.
       */
      crossJoinLateral = this.createJoin("cross", true);
      createSetOperator(type, isAll) {
        return (rightSelection) => {
          const rightSelect = typeof rightSelection === "function" ? rightSelection(getPgSetOperators()) : rightSelection;
          if (!haveSameKeys(this.getSelectedFields(), rightSelect.getSelectedFields())) {
            throw new Error(
              "Set operator error (union / intersect / except): selected fields are not the same or are in a different order"
            );
          }
          this.config.setOperators.push({ type, isAll, rightSelect });
          return this;
        };
      }
      /**
       * Adds `union` set operator to the query.
       *
       * Calling this method will combine the result sets of the `select` statements and remove any duplicate rows that appear across them.
       *
       * See docs: {@link https://orm.drizzle.team/docs/set-operations#union}
       *
       * @example
       *
       * ```ts
       * // Select all unique names from customers and users tables
       * await db.select({ name: users.name })
       *   .from(users)
       *   .union(
       *     db.select({ name: customers.name }).from(customers)
       *   );
       * // or
       * import { union } from 'drizzle-orm/pg-core'
       *
       * await union(
       *   db.select({ name: users.name }).from(users),
       *   db.select({ name: customers.name }).from(customers)
       * );
       * ```
       */
      union = this.createSetOperator("union", false);
      /**
       * Adds `union all` set operator to the query.
       *
       * Calling this method will combine the result-set of the `select` statements and keep all duplicate rows that appear across them.
       *
       * See docs: {@link https://orm.drizzle.team/docs/set-operations#union-all}
       *
       * @example
       *
       * ```ts
       * // Select all transaction ids from both online and in-store sales
       * await db.select({ transaction: onlineSales.transactionId })
       *   .from(onlineSales)
       *   .unionAll(
       *     db.select({ transaction: inStoreSales.transactionId }).from(inStoreSales)
       *   );
       * // or
       * import { unionAll } from 'drizzle-orm/pg-core'
       *
       * await unionAll(
       *   db.select({ transaction: onlineSales.transactionId }).from(onlineSales),
       *   db.select({ transaction: inStoreSales.transactionId }).from(inStoreSales)
       * );
       * ```
       */
      unionAll = this.createSetOperator("union", true);
      /**
       * Adds `intersect` set operator to the query.
       *
       * Calling this method will retain only the rows that are present in both result sets and eliminate duplicates.
       *
       * See docs: {@link https://orm.drizzle.team/docs/set-operations#intersect}
       *
       * @example
       *
       * ```ts
       * // Select course names that are offered in both departments A and B
       * await db.select({ courseName: depA.courseName })
       *   .from(depA)
       *   .intersect(
       *     db.select({ courseName: depB.courseName }).from(depB)
       *   );
       * // or
       * import { intersect } from 'drizzle-orm/pg-core'
       *
       * await intersect(
       *   db.select({ courseName: depA.courseName }).from(depA),
       *   db.select({ courseName: depB.courseName }).from(depB)
       * );
       * ```
       */
      intersect = this.createSetOperator("intersect", false);
      /**
       * Adds `intersect all` set operator to the query.
       *
       * Calling this method will retain only the rows that are present in both result sets including all duplicates.
       *
       * See docs: {@link https://orm.drizzle.team/docs/set-operations#intersect-all}
       *
       * @example
       *
       * ```ts
       * // Select all products and quantities that are ordered by both regular and VIP customers
       * await db.select({
       *   productId: regularCustomerOrders.productId,
       *   quantityOrdered: regularCustomerOrders.quantityOrdered
       * })
       * .from(regularCustomerOrders)
       * .intersectAll(
       *   db.select({
       *     productId: vipCustomerOrders.productId,
       *     quantityOrdered: vipCustomerOrders.quantityOrdered
       *   })
       *   .from(vipCustomerOrders)
       * );
       * // or
       * import { intersectAll } from 'drizzle-orm/pg-core'
       *
       * await intersectAll(
       *   db.select({
       *     productId: regularCustomerOrders.productId,
       *     quantityOrdered: regularCustomerOrders.quantityOrdered
       *   })
       *   .from(regularCustomerOrders),
       *   db.select({
       *     productId: vipCustomerOrders.productId,
       *     quantityOrdered: vipCustomerOrders.quantityOrdered
       *   })
       *   .from(vipCustomerOrders)
       * );
       * ```
       */
      intersectAll = this.createSetOperator("intersect", true);
      /**
       * Adds `except` set operator to the query.
       *
       * Calling this method will retrieve all unique rows from the left query, except for the rows that are present in the result set of the right query.
       *
       * See docs: {@link https://orm.drizzle.team/docs/set-operations#except}
       *
       * @example
       *
       * ```ts
       * // Select all courses offered in department A but not in department B
       * await db.select({ courseName: depA.courseName })
       *   .from(depA)
       *   .except(
       *     db.select({ courseName: depB.courseName }).from(depB)
       *   );
       * // or
       * import { except } from 'drizzle-orm/pg-core'
       *
       * await except(
       *   db.select({ courseName: depA.courseName }).from(depA),
       *   db.select({ courseName: depB.courseName }).from(depB)
       * );
       * ```
       */
      except = this.createSetOperator("except", false);
      /**
       * Adds `except all` set operator to the query.
       *
       * Calling this method will retrieve all rows from the left query, except for the rows that are present in the result set of the right query.
       *
       * See docs: {@link https://orm.drizzle.team/docs/set-operations#except-all}
       *
       * @example
       *
       * ```ts
       * // Select all products that are ordered by regular customers but not by VIP customers
       * await db.select({
       *   productId: regularCustomerOrders.productId,
       *   quantityOrdered: regularCustomerOrders.quantityOrdered,
       * })
       * .from(regularCustomerOrders)
       * .exceptAll(
       *   db.select({
       *     productId: vipCustomerOrders.productId,
       *     quantityOrdered: vipCustomerOrders.quantityOrdered,
       *   })
       *   .from(vipCustomerOrders)
       * );
       * // or
       * import { exceptAll } from 'drizzle-orm/pg-core'
       *
       * await exceptAll(
       *   db.select({
       *     productId: regularCustomerOrders.productId,
       *     quantityOrdered: regularCustomerOrders.quantityOrdered
       *   })
       *   .from(regularCustomerOrders),
       *   db.select({
       *     productId: vipCustomerOrders.productId,
       *     quantityOrdered: vipCustomerOrders.quantityOrdered
       *   })
       *   .from(vipCustomerOrders)
       * );
       * ```
       */
      exceptAll = this.createSetOperator("except", true);
      /** @internal */
      addSetOperators(setOperators) {
        this.config.setOperators.push(...setOperators);
        return this;
      }
      /**
       * Adds a `where` clause to the query.
       *
       * Calling this method will select only those rows that fulfill a specified condition.
       *
       * See docs: {@link https://orm.drizzle.team/docs/select#filtering}
       *
       * @param where the `where` clause.
       *
       * @example
       * You can use conditional operators and `sql function` to filter the rows to be selected.
       *
       * ```ts
       * // Select all cars with green color
       * await db.select().from(cars).where(eq(cars.color, 'green'));
       * // or
       * await db.select().from(cars).where(sql`${cars.color} = 'green'`)
       * ```
       *
       * You can logically combine conditional operators with `and()` and `or()` operators:
       *
       * ```ts
       * // Select all BMW cars with a green color
       * await db.select().from(cars).where(and(eq(cars.color, 'green'), eq(cars.brand, 'BMW')));
       *
       * // Select all cars with the green or blue color
       * await db.select().from(cars).where(or(eq(cars.color, 'green'), eq(cars.color, 'blue')));
       * ```
       */
      where(where) {
        if (typeof where === "function") {
          where = where(
            new Proxy(
              this.config.fields,
              new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
            )
          );
        }
        this.config.where = where;
        return this;
      }
      /**
       * Adds a `having` clause to the query.
       *
       * Calling this method will select only those rows that fulfill a specified condition. It is typically used with aggregate functions to filter the aggregated data based on a specified condition.
       *
       * See docs: {@link https://orm.drizzle.team/docs/select#aggregations}
       *
       * @param having the `having` clause.
       *
       * @example
       *
       * ```ts
       * // Select all brands with more than one car
       * await db.select({
       * 	brand: cars.brand,
       * 	count: sql<number>`cast(count(${cars.id}) as int)`,
       * })
       *   .from(cars)
       *   .groupBy(cars.brand)
       *   .having(({ count }) => gt(count, 1));
       * ```
       */
      having(having) {
        if (typeof having === "function") {
          having = having(
            new Proxy(
              this.config.fields,
              new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
            )
          );
        }
        this.config.having = having;
        return this;
      }
      groupBy(...columns) {
        if (typeof columns[0] === "function") {
          const groupBy = columns[0](
            new Proxy(
              this.config.fields,
              new SelectionProxyHandler({ sqlAliasedBehavior: "alias", sqlBehavior: "sql" })
            )
          );
          this.config.groupBy = Array.isArray(groupBy) ? groupBy : [groupBy];
        } else {
          this.config.groupBy = columns;
        }
        return this;
      }
      orderBy(...columns) {
        if (typeof columns[0] === "function") {
          const orderBy = columns[0](
            new Proxy(
              this.config.fields,
              new SelectionProxyHandler({ sqlAliasedBehavior: "alias", sqlBehavior: "sql" })
            )
          );
          const orderByArray = Array.isArray(orderBy) ? orderBy : [orderBy];
          if (this.config.setOperators.length > 0) {
            this.config.setOperators.at(-1).orderBy = orderByArray;
          } else {
            this.config.orderBy = orderByArray;
          }
        } else {
          const orderByArray = columns;
          if (this.config.setOperators.length > 0) {
            this.config.setOperators.at(-1).orderBy = orderByArray;
          } else {
            this.config.orderBy = orderByArray;
          }
        }
        return this;
      }
      /**
       * Adds a `limit` clause to the query.
       *
       * Calling this method will set the maximum number of rows that will be returned by this query.
       *
       * See docs: {@link https://orm.drizzle.team/docs/select#limit--offset}
       *
       * @param limit the `limit` clause.
       *
       * @example
       *
       * ```ts
       * // Get the first 10 people from this query.
       * await db.select().from(people).limit(10);
       * ```
       */
      limit(limit) {
        if (this.config.setOperators.length > 0) {
          this.config.setOperators.at(-1).limit = limit;
        } else {
          this.config.limit = limit;
        }
        return this;
      }
      /**
       * Adds an `offset` clause to the query.
       *
       * Calling this method will skip a number of rows when returning results from this query.
       *
       * See docs: {@link https://orm.drizzle.team/docs/select#limit--offset}
       *
       * @param offset the `offset` clause.
       *
       * @example
       *
       * ```ts
       * // Get the 10th-20th people from this query.
       * await db.select().from(people).offset(10).limit(10);
       * ```
       */
      offset(offset) {
        if (this.config.setOperators.length > 0) {
          this.config.setOperators.at(-1).offset = offset;
        } else {
          this.config.offset = offset;
        }
        return this;
      }
      /**
       * Adds a `for` clause to the query.
       *
       * Calling this method will specify a lock strength for this query that controls how strictly it acquires exclusive access to the rows being queried.
       *
       * See docs: {@link https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE}
       *
       * @param strength the lock strength.
       * @param config the lock configuration.
       */
      for(strength, config = {}) {
        this.config.lockingClause = { strength, config };
        return this;
      }
      /** @internal */
      getSQL() {
        return this.dialect.buildSelectQuery(this.config);
      }
      toSQL() {
        const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
        return rest;
      }
      as(alias) {
        const usedTables = [];
        usedTables.push(...extractUsedTable(this.config.table));
        if (this.config.joins) {
          for (const it2 of this.config.joins) usedTables.push(...extractUsedTable(it2.table));
        }
        return new Proxy(
          new Subquery(this.getSQL(), this.config.fields, alias, false, [...new Set(usedTables)]),
          new SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
        );
      }
      /** @internal */
      getSelectedFields() {
        return new Proxy(
          this.config.fields,
          new SelectionProxyHandler({ alias: this.tableName, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
        );
      }
      $dynamic() {
        return this;
      }
      $withCache(config) {
        this.cacheConfig = config === void 0 ? { config: {}, enable: true, autoInvalidate: true } : config === false ? { enable: false } : { enable: true, autoInvalidate: true, ...config };
        return this;
      }
    };
    PgSelectBase = class extends PgSelectQueryBuilderBase {
      static {
        __name(this, "PgSelectBase");
      }
      static [entityKind] = "PgSelect";
      /** @internal */
      _prepare(name) {
        const { session, config, dialect, joinsNotNullableMap, authToken, cacheConfig, usedTables } = this;
        if (!session) {
          throw new Error("Cannot execute a query on a query builder. Please use a database instance instead.");
        }
        const { fields } = config;
        return tracer.startActiveSpan("drizzle.prepareQuery", () => {
          const fieldsList = orderSelectedFields(fields);
          const query = session.prepareQuery(dialect.sqlToQuery(this.getSQL()), fieldsList, name, true, void 0, {
            type: "select",
            tables: [...usedTables]
          }, cacheConfig);
          query.joinsNotNullableMap = joinsNotNullableMap;
          return query.setToken(authToken);
        });
      }
      /**
       * Create a prepared statement for this query. This allows
       * the database to remember this query for the given session
       * and call it by name, rather than specifying the full query.
       *
       * {@link https://www.postgresql.org/docs/current/sql-prepare.html | Postgres prepare documentation}
       */
      prepare(name) {
        return this._prepare(name);
      }
      authToken;
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      execute = /* @__PURE__ */ __name((placeholderValues) => {
        return tracer.startActiveSpan("drizzle.operation", () => {
          return this._prepare().execute(placeholderValues, this.authToken);
        });
      }, "execute");
    };
    applyMixins(PgSelectBase, [QueryPromise]);
    __name(createSetOperator, "createSetOperator");
    getPgSetOperators = /* @__PURE__ */ __name(() => ({
      union,
      unionAll,
      intersect,
      intersectAll,
      except,
      exceptAll
    }), "getPgSetOperators");
    union = createSetOperator("union", false);
    unionAll = createSetOperator("union", true);
    intersect = createSetOperator("intersect", false);
    intersectAll = createSetOperator("intersect", true);
    except = createSetOperator("except", false);
    exceptAll = createSetOperator("except", true);
  }
});

// ../node_modules/drizzle-orm/pg-core/query-builders/query-builder.js
var QueryBuilder;
var init_query_builder2 = __esm({
  "../node_modules/drizzle-orm/pg-core/query-builders/query-builder.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_dialect();
    init_selection_proxy();
    init_subquery();
    init_select2();
    QueryBuilder = class {
      static {
        __name(this, "QueryBuilder");
      }
      static [entityKind] = "PgQueryBuilder";
      dialect;
      dialectConfig;
      constructor(dialect) {
        this.dialect = is(dialect, PgDialect) ? dialect : void 0;
        this.dialectConfig = is(dialect, PgDialect) ? void 0 : dialect;
      }
      $with = /* @__PURE__ */ __name((alias, selection) => {
        const queryBuilder = this;
        const as2 = /* @__PURE__ */ __name((qb) => {
          if (typeof qb === "function") {
            qb = qb(queryBuilder);
          }
          return new Proxy(
            new WithSubquery(
              qb.getSQL(),
              selection ?? ("getSelectedFields" in qb ? qb.getSelectedFields() ?? {} : {}),
              alias,
              true
            ),
            new SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
          );
        }, "as");
        return { as: as2 };
      }, "$with");
      with(...queries) {
        const self = this;
        function select(fields) {
          return new PgSelectBuilder({
            fields: fields ?? void 0,
            session: void 0,
            dialect: self.getDialect(),
            withList: queries
          });
        }
        __name(select, "select");
        function selectDistinct(fields) {
          return new PgSelectBuilder({
            fields: fields ?? void 0,
            session: void 0,
            dialect: self.getDialect(),
            distinct: true
          });
        }
        __name(selectDistinct, "selectDistinct");
        function selectDistinctOn(on, fields) {
          return new PgSelectBuilder({
            fields: fields ?? void 0,
            session: void 0,
            dialect: self.getDialect(),
            distinct: { on }
          });
        }
        __name(selectDistinctOn, "selectDistinctOn");
        return { select, selectDistinct, selectDistinctOn };
      }
      select(fields) {
        return new PgSelectBuilder({
          fields: fields ?? void 0,
          session: void 0,
          dialect: this.getDialect()
        });
      }
      selectDistinct(fields) {
        return new PgSelectBuilder({
          fields: fields ?? void 0,
          session: void 0,
          dialect: this.getDialect(),
          distinct: true
        });
      }
      selectDistinctOn(on, fields) {
        return new PgSelectBuilder({
          fields: fields ?? void 0,
          session: void 0,
          dialect: this.getDialect(),
          distinct: { on }
        });
      }
      // Lazy load dialect to avoid circular dependency
      getDialect() {
        if (!this.dialect) {
          this.dialect = new PgDialect(this.dialectConfig);
        }
        return this.dialect;
      }
    };
  }
});

// ../node_modules/drizzle-orm/pg-core/view.js
function pgViewWithSchema(name, selection, schema) {
  if (selection) {
    return new ManualViewBuilder(name, selection, schema);
  }
  return new ViewBuilder(name, schema);
}
function pgMaterializedViewWithSchema(name, selection, schema) {
  if (selection) {
    return new ManualMaterializedViewBuilder(name, selection, schema);
  }
  return new MaterializedViewBuilder(name, schema);
}
var DefaultViewBuilderCore, ViewBuilder, ManualViewBuilder, MaterializedViewBuilderCore, MaterializedViewBuilder, ManualMaterializedViewBuilder, PgView, PgMaterializedViewConfig, PgMaterializedView;
var init_view = __esm({
  "../node_modules/drizzle-orm/pg-core/view.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_selection_proxy();
    init_utils();
    init_query_builder2();
    init_table2();
    init_view_base();
    init_view_common2();
    DefaultViewBuilderCore = class {
      static {
        __name(this, "DefaultViewBuilderCore");
      }
      constructor(name, schema) {
        this.name = name;
        this.schema = schema;
      }
      static [entityKind] = "PgDefaultViewBuilderCore";
      config = {};
      with(config) {
        this.config.with = config;
        return this;
      }
    };
    ViewBuilder = class extends DefaultViewBuilderCore {
      static {
        __name(this, "ViewBuilder");
      }
      static [entityKind] = "PgViewBuilder";
      as(qb) {
        if (typeof qb === "function") {
          qb = qb(new QueryBuilder());
        }
        const selectionProxy = new SelectionProxyHandler({
          alias: this.name,
          sqlBehavior: "error",
          sqlAliasedBehavior: "alias",
          replaceOriginalName: true
        });
        const aliasedSelection = new Proxy(qb.getSelectedFields(), selectionProxy);
        return new Proxy(
          new PgView({
            pgConfig: this.config,
            config: {
              name: this.name,
              schema: this.schema,
              selectedFields: aliasedSelection,
              query: qb.getSQL().inlineParams()
            }
          }),
          selectionProxy
        );
      }
    };
    ManualViewBuilder = class extends DefaultViewBuilderCore {
      static {
        __name(this, "ManualViewBuilder");
      }
      static [entityKind] = "PgManualViewBuilder";
      columns;
      constructor(name, columns, schema) {
        super(name, schema);
        this.columns = getTableColumns(pgTable(name, columns));
      }
      existing() {
        return new Proxy(
          new PgView({
            pgConfig: void 0,
            config: {
              name: this.name,
              schema: this.schema,
              selectedFields: this.columns,
              query: void 0
            }
          }),
          new SelectionProxyHandler({
            alias: this.name,
            sqlBehavior: "error",
            sqlAliasedBehavior: "alias",
            replaceOriginalName: true
          })
        );
      }
      as(query) {
        return new Proxy(
          new PgView({
            pgConfig: this.config,
            config: {
              name: this.name,
              schema: this.schema,
              selectedFields: this.columns,
              query: query.inlineParams()
            }
          }),
          new SelectionProxyHandler({
            alias: this.name,
            sqlBehavior: "error",
            sqlAliasedBehavior: "alias",
            replaceOriginalName: true
          })
        );
      }
    };
    MaterializedViewBuilderCore = class {
      static {
        __name(this, "MaterializedViewBuilderCore");
      }
      constructor(name, schema) {
        this.name = name;
        this.schema = schema;
      }
      static [entityKind] = "PgMaterializedViewBuilderCore";
      config = {};
      using(using) {
        this.config.using = using;
        return this;
      }
      with(config) {
        this.config.with = config;
        return this;
      }
      tablespace(tablespace) {
        this.config.tablespace = tablespace;
        return this;
      }
      withNoData() {
        this.config.withNoData = true;
        return this;
      }
    };
    MaterializedViewBuilder = class extends MaterializedViewBuilderCore {
      static {
        __name(this, "MaterializedViewBuilder");
      }
      static [entityKind] = "PgMaterializedViewBuilder";
      as(qb) {
        if (typeof qb === "function") {
          qb = qb(new QueryBuilder());
        }
        const selectionProxy = new SelectionProxyHandler({
          alias: this.name,
          sqlBehavior: "error",
          sqlAliasedBehavior: "alias",
          replaceOriginalName: true
        });
        const aliasedSelection = new Proxy(qb.getSelectedFields(), selectionProxy);
        return new Proxy(
          new PgMaterializedView({
            pgConfig: {
              with: this.config.with,
              using: this.config.using,
              tablespace: this.config.tablespace,
              withNoData: this.config.withNoData
            },
            config: {
              name: this.name,
              schema: this.schema,
              selectedFields: aliasedSelection,
              query: qb.getSQL().inlineParams()
            }
          }),
          selectionProxy
        );
      }
    };
    ManualMaterializedViewBuilder = class extends MaterializedViewBuilderCore {
      static {
        __name(this, "ManualMaterializedViewBuilder");
      }
      static [entityKind] = "PgManualMaterializedViewBuilder";
      columns;
      constructor(name, columns, schema) {
        super(name, schema);
        this.columns = getTableColumns(pgTable(name, columns));
      }
      existing() {
        return new Proxy(
          new PgMaterializedView({
            pgConfig: {
              tablespace: this.config.tablespace,
              using: this.config.using,
              with: this.config.with,
              withNoData: this.config.withNoData
            },
            config: {
              name: this.name,
              schema: this.schema,
              selectedFields: this.columns,
              query: void 0
            }
          }),
          new SelectionProxyHandler({
            alias: this.name,
            sqlBehavior: "error",
            sqlAliasedBehavior: "alias",
            replaceOriginalName: true
          })
        );
      }
      as(query) {
        return new Proxy(
          new PgMaterializedView({
            pgConfig: {
              tablespace: this.config.tablespace,
              using: this.config.using,
              with: this.config.with,
              withNoData: this.config.withNoData
            },
            config: {
              name: this.name,
              schema: this.schema,
              selectedFields: this.columns,
              query: query.inlineParams()
            }
          }),
          new SelectionProxyHandler({
            alias: this.name,
            sqlBehavior: "error",
            sqlAliasedBehavior: "alias",
            replaceOriginalName: true
          })
        );
      }
    };
    PgView = class extends PgViewBase {
      static {
        __name(this, "PgView");
      }
      static [entityKind] = "PgView";
      [PgViewConfig];
      constructor({ pgConfig, config }) {
        super(config);
        if (pgConfig) {
          this[PgViewConfig] = {
            with: pgConfig.with
          };
        }
      }
    };
    PgMaterializedViewConfig = Symbol.for("drizzle:PgMaterializedViewConfig");
    PgMaterializedView = class extends PgViewBase {
      static {
        __name(this, "PgMaterializedView");
      }
      static [entityKind] = "PgMaterializedView";
      [PgMaterializedViewConfig];
      constructor({ pgConfig, config }) {
        super(config);
        this[PgMaterializedViewConfig] = {
          with: pgConfig?.with,
          using: pgConfig?.using,
          tablespace: pgConfig?.tablespace,
          withNoData: pgConfig?.withNoData
        };
      }
    };
    __name(pgViewWithSchema, "pgViewWithSchema");
    __name(pgMaterializedViewWithSchema, "pgMaterializedViewWithSchema");
  }
});

// ../node_modules/drizzle-orm/pg-core/utils.js
function extractUsedTable(table) {
  if (is(table, PgTable)) {
    return [table[Schema] ? `${table[Schema]}.${table[Table.Symbol.BaseName]}` : table[Table.Symbol.BaseName]];
  }
  if (is(table, Subquery)) {
    return table._.usedTables ?? [];
  }
  if (is(table, SQL)) {
    return table.usedTables ?? [];
  }
  return [];
}
var init_utils3 = __esm({
  "../node_modules/drizzle-orm/pg-core/utils.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_table2();
    init_sql();
    init_subquery();
    init_table();
    __name(extractUsedTable, "extractUsedTable");
  }
});

// ../node_modules/drizzle-orm/pg-core/query-builders/delete.js
var PgDeleteBase;
var init_delete = __esm({
  "../node_modules/drizzle-orm/pg-core/query-builders/delete.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_query_promise();
    init_selection_proxy();
    init_table();
    init_tracing();
    init_utils();
    init_utils3();
    PgDeleteBase = class extends QueryPromise {
      static {
        __name(this, "PgDeleteBase");
      }
      constructor(table, session, dialect, withList) {
        super();
        this.session = session;
        this.dialect = dialect;
        this.config = { table, withList };
      }
      static [entityKind] = "PgDelete";
      config;
      cacheConfig;
      /**
       * Adds a `where` clause to the query.
       *
       * Calling this method will delete only those rows that fulfill a specified condition.
       *
       * See docs: {@link https://orm.drizzle.team/docs/delete}
       *
       * @param where the `where` clause.
       *
       * @example
       * You can use conditional operators and `sql function` to filter the rows to be deleted.
       *
       * ```ts
       * // Delete all cars with green color
       * await db.delete(cars).where(eq(cars.color, 'green'));
       * // or
       * await db.delete(cars).where(sql`${cars.color} = 'green'`)
       * ```
       *
       * You can logically combine conditional operators with `and()` and `or()` operators:
       *
       * ```ts
       * // Delete all BMW cars with a green color
       * await db.delete(cars).where(and(eq(cars.color, 'green'), eq(cars.brand, 'BMW')));
       *
       * // Delete all cars with the green or blue color
       * await db.delete(cars).where(or(eq(cars.color, 'green'), eq(cars.color, 'blue')));
       * ```
       */
      where(where) {
        this.config.where = where;
        return this;
      }
      returning(fields = this.config.table[Table.Symbol.Columns]) {
        this.config.returningFields = fields;
        this.config.returning = orderSelectedFields(fields);
        return this;
      }
      /** @internal */
      getSQL() {
        return this.dialect.buildDeleteQuery(this.config);
      }
      toSQL() {
        const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
        return rest;
      }
      /** @internal */
      _prepare(name) {
        return tracer.startActiveSpan("drizzle.prepareQuery", () => {
          return this.session.prepareQuery(this.dialect.sqlToQuery(this.getSQL()), this.config.returning, name, true, void 0, {
            type: "delete",
            tables: extractUsedTable(this.config.table)
          }, this.cacheConfig);
        });
      }
      prepare(name) {
        return this._prepare(name);
      }
      authToken;
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      execute = /* @__PURE__ */ __name((placeholderValues) => {
        return tracer.startActiveSpan("drizzle.operation", () => {
          return this._prepare().execute(placeholderValues, this.authToken);
        });
      }, "execute");
      /** @internal */
      getSelectedFields() {
        return this.config.returningFields ? new Proxy(
          this.config.returningFields,
          new SelectionProxyHandler({
            alias: getTableName(this.config.table),
            sqlAliasedBehavior: "alias",
            sqlBehavior: "error"
          })
        ) : void 0;
      }
      $dynamic() {
        return this;
      }
    };
  }
});

// ../node_modules/drizzle-orm/pg-core/query-builders/insert.js
var PgInsertBuilder, PgInsertBase;
var init_insert = __esm({
  "../node_modules/drizzle-orm/pg-core/query-builders/insert.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_query_promise();
    init_selection_proxy();
    init_sql();
    init_table();
    init_tracing();
    init_utils();
    init_utils3();
    init_query_builder2();
    PgInsertBuilder = class {
      static {
        __name(this, "PgInsertBuilder");
      }
      constructor(table, session, dialect, withList, overridingSystemValue_) {
        this.table = table;
        this.session = session;
        this.dialect = dialect;
        this.withList = withList;
        this.overridingSystemValue_ = overridingSystemValue_;
      }
      static [entityKind] = "PgInsertBuilder";
      authToken;
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      overridingSystemValue() {
        this.overridingSystemValue_ = true;
        return this;
      }
      values(values) {
        values = Array.isArray(values) ? values : [values];
        if (values.length === 0) {
          throw new Error("values() must be called with at least one value");
        }
        const mappedValues = values.map((entry) => {
          const result = {};
          const cols = this.table[Table.Symbol.Columns];
          for (const colKey of Object.keys(entry)) {
            const colValue = entry[colKey];
            result[colKey] = is(colValue, SQL) ? colValue : new Param(colValue, cols[colKey]);
          }
          return result;
        });
        return new PgInsertBase(
          this.table,
          mappedValues,
          this.session,
          this.dialect,
          this.withList,
          false,
          this.overridingSystemValue_
        ).setToken(this.authToken);
      }
      select(selectQuery) {
        const select = typeof selectQuery === "function" ? selectQuery(new QueryBuilder()) : selectQuery;
        if (!is(select, SQL) && !haveSameKeys(this.table[Columns], select._.selectedFields)) {
          throw new Error(
            "Insert select error: selected fields are not the same or are in a different order compared to the table definition"
          );
        }
        return new PgInsertBase(this.table, select, this.session, this.dialect, this.withList, true);
      }
    };
    PgInsertBase = class extends QueryPromise {
      static {
        __name(this, "PgInsertBase");
      }
      constructor(table, values, session, dialect, withList, select, overridingSystemValue_) {
        super();
        this.session = session;
        this.dialect = dialect;
        this.config = { table, values, withList, select, overridingSystemValue_ };
      }
      static [entityKind] = "PgInsert";
      config;
      cacheConfig;
      returning(fields = this.config.table[Table.Symbol.Columns]) {
        this.config.returningFields = fields;
        this.config.returning = orderSelectedFields(fields);
        return this;
      }
      /**
       * Adds an `on conflict do nothing` clause to the query.
       *
       * Calling this method simply avoids inserting a row as its alternative action.
       *
       * See docs: {@link https://orm.drizzle.team/docs/insert#on-conflict-do-nothing}
       *
       * @param config The `target` and `where` clauses.
       *
       * @example
       * ```ts
       * // Insert one row and cancel the insert if there's a conflict
       * await db.insert(cars)
       *   .values({ id: 1, brand: 'BMW' })
       *   .onConflictDoNothing();
       *
       * // Explicitly specify conflict target
       * await db.insert(cars)
       *   .values({ id: 1, brand: 'BMW' })
       *   .onConflictDoNothing({ target: cars.id });
       * ```
       */
      onConflictDoNothing(config = {}) {
        if (config.target === void 0) {
          this.config.onConflict = sql`do nothing`;
        } else {
          let targetColumn = "";
          targetColumn = Array.isArray(config.target) ? config.target.map((it2) => this.dialect.escapeName(this.dialect.casing.getColumnCasing(it2))).join(",") : this.dialect.escapeName(this.dialect.casing.getColumnCasing(config.target));
          const whereSql = config.where ? sql` where ${config.where}` : void 0;
          this.config.onConflict = sql`(${sql.raw(targetColumn)})${whereSql} do nothing`;
        }
        return this;
      }
      /**
       * Adds an `on conflict do update` clause to the query.
       *
       * Calling this method will update the existing row that conflicts with the row proposed for insertion as its alternative action.
       *
       * See docs: {@link https://orm.drizzle.team/docs/insert#upserts-and-conflicts}
       *
       * @param config The `target`, `set` and `where` clauses.
       *
       * @example
       * ```ts
       * // Update the row if there's a conflict
       * await db.insert(cars)
       *   .values({ id: 1, brand: 'BMW' })
       *   .onConflictDoUpdate({
       *     target: cars.id,
       *     set: { brand: 'Porsche' }
       *   });
       *
       * // Upsert with 'where' clause
       * await db.insert(cars)
       *   .values({ id: 1, brand: 'BMW' })
       *   .onConflictDoUpdate({
       *     target: cars.id,
       *     set: { brand: 'newBMW' },
       *     targetWhere: sql`${cars.createdAt} > '2023-01-01'::date`,
       *   });
       * ```
       */
      onConflictDoUpdate(config) {
        if (config.where && (config.targetWhere || config.setWhere)) {
          throw new Error(
            'You cannot use both "where" and "targetWhere"/"setWhere" at the same time - "where" is deprecated, use "targetWhere" or "setWhere" instead.'
          );
        }
        const whereSql = config.where ? sql` where ${config.where}` : void 0;
        const targetWhereSql = config.targetWhere ? sql` where ${config.targetWhere}` : void 0;
        const setWhereSql = config.setWhere ? sql` where ${config.setWhere}` : void 0;
        const setSql = this.dialect.buildUpdateSet(this.config.table, mapUpdateSet(this.config.table, config.set));
        let targetColumn = "";
        targetColumn = Array.isArray(config.target) ? config.target.map((it2) => this.dialect.escapeName(this.dialect.casing.getColumnCasing(it2))).join(",") : this.dialect.escapeName(this.dialect.casing.getColumnCasing(config.target));
        this.config.onConflict = sql`(${sql.raw(targetColumn)})${targetWhereSql} do update set ${setSql}${whereSql}${setWhereSql}`;
        return this;
      }
      /** @internal */
      getSQL() {
        return this.dialect.buildInsertQuery(this.config);
      }
      toSQL() {
        const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
        return rest;
      }
      /** @internal */
      _prepare(name) {
        return tracer.startActiveSpan("drizzle.prepareQuery", () => {
          return this.session.prepareQuery(this.dialect.sqlToQuery(this.getSQL()), this.config.returning, name, true, void 0, {
            type: "insert",
            tables: extractUsedTable(this.config.table)
          }, this.cacheConfig);
        });
      }
      prepare(name) {
        return this._prepare(name);
      }
      authToken;
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      execute = /* @__PURE__ */ __name((placeholderValues) => {
        return tracer.startActiveSpan("drizzle.operation", () => {
          return this._prepare().execute(placeholderValues, this.authToken);
        });
      }, "execute");
      /** @internal */
      getSelectedFields() {
        return this.config.returningFields ? new Proxy(
          this.config.returningFields,
          new SelectionProxyHandler({
            alias: getTableName(this.config.table),
            sqlAliasedBehavior: "alias",
            sqlBehavior: "error"
          })
        ) : void 0;
      }
      $dynamic() {
        return this;
      }
    };
  }
});

// ../node_modules/drizzle-orm/pg-core/query-builders/refresh-materialized-view.js
var PgRefreshMaterializedView;
var init_refresh_materialized_view = __esm({
  "../node_modules/drizzle-orm/pg-core/query-builders/refresh-materialized-view.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_query_promise();
    init_tracing();
    PgRefreshMaterializedView = class extends QueryPromise {
      static {
        __name(this, "PgRefreshMaterializedView");
      }
      constructor(view, session, dialect) {
        super();
        this.session = session;
        this.dialect = dialect;
        this.config = { view };
      }
      static [entityKind] = "PgRefreshMaterializedView";
      config;
      concurrently() {
        if (this.config.withNoData !== void 0) {
          throw new Error("Cannot use concurrently and withNoData together");
        }
        this.config.concurrently = true;
        return this;
      }
      withNoData() {
        if (this.config.concurrently !== void 0) {
          throw new Error("Cannot use concurrently and withNoData together");
        }
        this.config.withNoData = true;
        return this;
      }
      /** @internal */
      getSQL() {
        return this.dialect.buildRefreshMaterializedViewQuery(this.config);
      }
      toSQL() {
        const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
        return rest;
      }
      /** @internal */
      _prepare(name) {
        return tracer.startActiveSpan("drizzle.prepareQuery", () => {
          return this.session.prepareQuery(this.dialect.sqlToQuery(this.getSQL()), void 0, name, true);
        });
      }
      prepare(name) {
        return this._prepare(name);
      }
      authToken;
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      execute = /* @__PURE__ */ __name((placeholderValues) => {
        return tracer.startActiveSpan("drizzle.operation", () => {
          return this._prepare().execute(placeholderValues, this.authToken);
        });
      }, "execute");
    };
  }
});

// ../node_modules/drizzle-orm/pg-core/query-builders/select.types.js
var init_select_types = __esm({
  "../node_modules/drizzle-orm/pg-core/query-builders/select.types.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
  }
});

// ../node_modules/drizzle-orm/pg-core/query-builders/update.js
var PgUpdateBuilder, PgUpdateBase;
var init_update = __esm({
  "../node_modules/drizzle-orm/pg-core/query-builders/update.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_table2();
    init_query_promise();
    init_selection_proxy();
    init_sql();
    init_subquery();
    init_table();
    init_utils();
    init_view_common();
    init_utils3();
    PgUpdateBuilder = class {
      static {
        __name(this, "PgUpdateBuilder");
      }
      constructor(table, session, dialect, withList) {
        this.table = table;
        this.session = session;
        this.dialect = dialect;
        this.withList = withList;
      }
      static [entityKind] = "PgUpdateBuilder";
      authToken;
      setToken(token) {
        this.authToken = token;
        return this;
      }
      set(values) {
        return new PgUpdateBase(
          this.table,
          mapUpdateSet(this.table, values),
          this.session,
          this.dialect,
          this.withList
        ).setToken(this.authToken);
      }
    };
    PgUpdateBase = class extends QueryPromise {
      static {
        __name(this, "PgUpdateBase");
      }
      constructor(table, set, session, dialect, withList) {
        super();
        this.session = session;
        this.dialect = dialect;
        this.config = { set, table, withList, joins: [] };
        this.tableName = getTableLikeName(table);
        this.joinsNotNullableMap = typeof this.tableName === "string" ? { [this.tableName]: true } : {};
      }
      static [entityKind] = "PgUpdate";
      config;
      tableName;
      joinsNotNullableMap;
      cacheConfig;
      from(source) {
        const src = source;
        const tableName = getTableLikeName(src);
        if (typeof tableName === "string") {
          this.joinsNotNullableMap[tableName] = true;
        }
        this.config.from = src;
        return this;
      }
      getTableLikeFields(table) {
        if (is(table, PgTable)) {
          return table[Table.Symbol.Columns];
        } else if (is(table, Subquery)) {
          return table._.selectedFields;
        }
        return table[ViewBaseConfig].selectedFields;
      }
      createJoin(joinType) {
        return (table, on) => {
          const tableName = getTableLikeName(table);
          if (typeof tableName === "string" && this.config.joins.some((join) => join.alias === tableName)) {
            throw new Error(`Alias "${tableName}" is already used in this query`);
          }
          if (typeof on === "function") {
            const from = this.config.from && !is(this.config.from, SQL) ? this.getTableLikeFields(this.config.from) : void 0;
            on = on(
              new Proxy(
                this.config.table[Table.Symbol.Columns],
                new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
              ),
              from && new Proxy(
                from,
                new SelectionProxyHandler({ sqlAliasedBehavior: "sql", sqlBehavior: "sql" })
              )
            );
          }
          this.config.joins.push({ on, table, joinType, alias: tableName });
          if (typeof tableName === "string") {
            switch (joinType) {
              case "left": {
                this.joinsNotNullableMap[tableName] = false;
                break;
              }
              case "right": {
                this.joinsNotNullableMap = Object.fromEntries(
                  Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false])
                );
                this.joinsNotNullableMap[tableName] = true;
                break;
              }
              case "inner": {
                this.joinsNotNullableMap[tableName] = true;
                break;
              }
              case "full": {
                this.joinsNotNullableMap = Object.fromEntries(
                  Object.entries(this.joinsNotNullableMap).map(([key]) => [key, false])
                );
                this.joinsNotNullableMap[tableName] = false;
                break;
              }
            }
          }
          return this;
        };
      }
      leftJoin = this.createJoin("left");
      rightJoin = this.createJoin("right");
      innerJoin = this.createJoin("inner");
      fullJoin = this.createJoin("full");
      /**
       * Adds a 'where' clause to the query.
       *
       * Calling this method will update only those rows that fulfill a specified condition.
       *
       * See docs: {@link https://orm.drizzle.team/docs/update}
       *
       * @param where the 'where' clause.
       *
       * @example
       * You can use conditional operators and `sql function` to filter the rows to be updated.
       *
       * ```ts
       * // Update all cars with green color
       * await db.update(cars).set({ color: 'red' })
       *   .where(eq(cars.color, 'green'));
       * // or
       * await db.update(cars).set({ color: 'red' })
       *   .where(sql`${cars.color} = 'green'`)
       * ```
       *
       * You can logically combine conditional operators with `and()` and `or()` operators:
       *
       * ```ts
       * // Update all BMW cars with a green color
       * await db.update(cars).set({ color: 'red' })
       *   .where(and(eq(cars.color, 'green'), eq(cars.brand, 'BMW')));
       *
       * // Update all cars with the green or blue color
       * await db.update(cars).set({ color: 'red' })
       *   .where(or(eq(cars.color, 'green'), eq(cars.color, 'blue')));
       * ```
       */
      where(where) {
        this.config.where = where;
        return this;
      }
      returning(fields) {
        if (!fields) {
          fields = Object.assign({}, this.config.table[Table.Symbol.Columns]);
          if (this.config.from) {
            const tableName = getTableLikeName(this.config.from);
            if (typeof tableName === "string" && this.config.from && !is(this.config.from, SQL)) {
              const fromFields = this.getTableLikeFields(this.config.from);
              fields[tableName] = fromFields;
            }
            for (const join of this.config.joins) {
              const tableName2 = getTableLikeName(join.table);
              if (typeof tableName2 === "string" && !is(join.table, SQL)) {
                const fromFields = this.getTableLikeFields(join.table);
                fields[tableName2] = fromFields;
              }
            }
          }
        }
        this.config.returningFields = fields;
        this.config.returning = orderSelectedFields(fields);
        return this;
      }
      /** @internal */
      getSQL() {
        return this.dialect.buildUpdateQuery(this.config);
      }
      toSQL() {
        const { typings: _typings, ...rest } = this.dialect.sqlToQuery(this.getSQL());
        return rest;
      }
      /** @internal */
      _prepare(name) {
        const query = this.session.prepareQuery(this.dialect.sqlToQuery(this.getSQL()), this.config.returning, name, true, void 0, {
          type: "insert",
          tables: extractUsedTable(this.config.table)
        }, this.cacheConfig);
        query.joinsNotNullableMap = this.joinsNotNullableMap;
        return query;
      }
      prepare(name) {
        return this._prepare(name);
      }
      authToken;
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      execute = /* @__PURE__ */ __name((placeholderValues) => {
        return this._prepare().execute(placeholderValues, this.authToken);
      }, "execute");
      /** @internal */
      getSelectedFields() {
        return this.config.returningFields ? new Proxy(
          this.config.returningFields,
          new SelectionProxyHandler({
            alias: getTableName(this.config.table),
            sqlAliasedBehavior: "alias",
            sqlBehavior: "error"
          })
        ) : void 0;
      }
      $dynamic() {
        return this;
      }
    };
  }
});

// ../node_modules/drizzle-orm/pg-core/query-builders/index.js
var init_query_builders = __esm({
  "../node_modules/drizzle-orm/pg-core/query-builders/index.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_delete();
    init_insert();
    init_query_builder2();
    init_refresh_materialized_view();
    init_select2();
    init_select_types();
    init_update();
  }
});

// ../node_modules/drizzle-orm/pg-core/query-builders/count.js
var PgCountBuilder;
var init_count = __esm({
  "../node_modules/drizzle-orm/pg-core/query-builders/count.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_sql();
    PgCountBuilder = class _PgCountBuilder extends SQL {
      static {
        __name(this, "PgCountBuilder");
      }
      constructor(params) {
        super(_PgCountBuilder.buildEmbeddedCount(params.source, params.filters).queryChunks);
        this.params = params;
        this.mapWith(Number);
        this.session = params.session;
        this.sql = _PgCountBuilder.buildCount(
          params.source,
          params.filters
        );
      }
      sql;
      token;
      static [entityKind] = "PgCountBuilder";
      [Symbol.toStringTag] = "PgCountBuilder";
      session;
      static buildEmbeddedCount(source, filters) {
        return sql`(select count(*) from ${source}${sql.raw(" where ").if(filters)}${filters})`;
      }
      static buildCount(source, filters) {
        return sql`select count(*) as count from ${source}${sql.raw(" where ").if(filters)}${filters};`;
      }
      /** @intrnal */
      setToken(token) {
        this.token = token;
        return this;
      }
      then(onfulfilled, onrejected) {
        return Promise.resolve(this.session.count(this.sql, this.token)).then(
          onfulfilled,
          onrejected
        );
      }
      catch(onRejected) {
        return this.then(void 0, onRejected);
      }
      finally(onFinally) {
        return this.then(
          (value) => {
            onFinally?.();
            return value;
          },
          (reason) => {
            onFinally?.();
            throw reason;
          }
        );
      }
    };
  }
});

// ../node_modules/drizzle-orm/pg-core/query-builders/query.js
var RelationalQueryBuilder, PgRelationalQuery;
var init_query = __esm({
  "../node_modules/drizzle-orm/pg-core/query-builders/query.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_query_promise();
    init_relations();
    init_tracing();
    RelationalQueryBuilder = class {
      static {
        __name(this, "RelationalQueryBuilder");
      }
      constructor(fullSchema, schema, tableNamesMap, table, tableConfig, dialect, session) {
        this.fullSchema = fullSchema;
        this.schema = schema;
        this.tableNamesMap = tableNamesMap;
        this.table = table;
        this.tableConfig = tableConfig;
        this.dialect = dialect;
        this.session = session;
      }
      static [entityKind] = "PgRelationalQueryBuilder";
      findMany(config) {
        return new PgRelationalQuery(
          this.fullSchema,
          this.schema,
          this.tableNamesMap,
          this.table,
          this.tableConfig,
          this.dialect,
          this.session,
          config ? config : {},
          "many"
        );
      }
      findFirst(config) {
        return new PgRelationalQuery(
          this.fullSchema,
          this.schema,
          this.tableNamesMap,
          this.table,
          this.tableConfig,
          this.dialect,
          this.session,
          config ? { ...config, limit: 1 } : { limit: 1 },
          "first"
        );
      }
    };
    PgRelationalQuery = class extends QueryPromise {
      static {
        __name(this, "PgRelationalQuery");
      }
      constructor(fullSchema, schema, tableNamesMap, table, tableConfig, dialect, session, config, mode) {
        super();
        this.fullSchema = fullSchema;
        this.schema = schema;
        this.tableNamesMap = tableNamesMap;
        this.table = table;
        this.tableConfig = tableConfig;
        this.dialect = dialect;
        this.session = session;
        this.config = config;
        this.mode = mode;
      }
      static [entityKind] = "PgRelationalQuery";
      /** @internal */
      _prepare(name) {
        return tracer.startActiveSpan("drizzle.prepareQuery", () => {
          const { query, builtQuery } = this._toSQL();
          return this.session.prepareQuery(
            builtQuery,
            void 0,
            name,
            true,
            (rawRows, mapColumnValue) => {
              const rows = rawRows.map(
                (row) => mapRelationalRow(this.schema, this.tableConfig, row, query.selection, mapColumnValue)
              );
              if (this.mode === "first") {
                return rows[0];
              }
              return rows;
            }
          );
        });
      }
      prepare(name) {
        return this._prepare(name);
      }
      _getQuery() {
        return this.dialect.buildRelationalQueryWithoutPK({
          fullSchema: this.fullSchema,
          schema: this.schema,
          tableNamesMap: this.tableNamesMap,
          table: this.table,
          tableConfig: this.tableConfig,
          queryConfig: this.config,
          tableAlias: this.tableConfig.tsName
        });
      }
      /** @internal */
      getSQL() {
        return this._getQuery().sql;
      }
      _toSQL() {
        const query = this._getQuery();
        const builtQuery = this.dialect.sqlToQuery(query.sql);
        return { query, builtQuery };
      }
      toSQL() {
        return this._toSQL().builtQuery;
      }
      authToken;
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      execute() {
        return tracer.startActiveSpan("drizzle.operation", () => {
          return this._prepare().execute(void 0, this.authToken);
        });
      }
    };
  }
});

// ../node_modules/drizzle-orm/pg-core/query-builders/raw.js
var PgRaw;
var init_raw = __esm({
  "../node_modules/drizzle-orm/pg-core/query-builders/raw.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_query_promise();
    PgRaw = class extends QueryPromise {
      static {
        __name(this, "PgRaw");
      }
      constructor(execute, sql2, query, mapBatchResult) {
        super();
        this.execute = execute;
        this.sql = sql2;
        this.query = query;
        this.mapBatchResult = mapBatchResult;
      }
      static [entityKind] = "PgRaw";
      /** @internal */
      getSQL() {
        return this.sql;
      }
      getQuery() {
        return this.query;
      }
      mapResult(result, isFromBatch) {
        return isFromBatch ? this.mapBatchResult(result) : result;
      }
      _prepare() {
        return this;
      }
      /** @internal */
      isResponseInArrayMode() {
        return false;
      }
    };
  }
});

// ../node_modules/drizzle-orm/pg-core/db.js
var PgDatabase;
var init_db = __esm({
  "../node_modules/drizzle-orm/pg-core/db.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_query_builders();
    init_selection_proxy();
    init_sql();
    init_subquery();
    init_count();
    init_query();
    init_raw();
    init_refresh_materialized_view();
    PgDatabase = class {
      static {
        __name(this, "PgDatabase");
      }
      constructor(dialect, session, schema) {
        this.dialect = dialect;
        this.session = session;
        this._ = schema ? {
          schema: schema.schema,
          fullSchema: schema.fullSchema,
          tableNamesMap: schema.tableNamesMap,
          session
        } : {
          schema: void 0,
          fullSchema: {},
          tableNamesMap: {},
          session
        };
        this.query = {};
        if (this._.schema) {
          for (const [tableName, columns] of Object.entries(this._.schema)) {
            this.query[tableName] = new RelationalQueryBuilder(
              schema.fullSchema,
              this._.schema,
              this._.tableNamesMap,
              schema.fullSchema[tableName],
              columns,
              dialect,
              session
            );
          }
        }
        this.$cache = { invalidate: /* @__PURE__ */ __name(async (_params) => {
        }, "invalidate") };
      }
      static [entityKind] = "PgDatabase";
      query;
      /**
       * Creates a subquery that defines a temporary named result set as a CTE.
       *
       * It is useful for breaking down complex queries into simpler parts and for reusing the result set in subsequent parts of the query.
       *
       * See docs: {@link https://orm.drizzle.team/docs/select#with-clause}
       *
       * @param alias The alias for the subquery.
       *
       * Failure to provide an alias will result in a DrizzleTypeError, preventing the subquery from being referenced in other queries.
       *
       * @example
       *
       * ```ts
       * // Create a subquery with alias 'sq' and use it in the select query
       * const sq = db.$with('sq').as(db.select().from(users).where(eq(users.id, 42)));
       *
       * const result = await db.with(sq).select().from(sq);
       * ```
       *
       * To select arbitrary SQL values as fields in a CTE and reference them in other CTEs or in the main query, you need to add aliases to them:
       *
       * ```ts
       * // Select an arbitrary SQL value as a field in a CTE and reference it in the main query
       * const sq = db.$with('sq').as(db.select({
       *   name: sql<string>`upper(${users.name})`.as('name'),
       * })
       * .from(users));
       *
       * const result = await db.with(sq).select({ name: sq.name }).from(sq);
       * ```
       */
      $with = /* @__PURE__ */ __name((alias, selection) => {
        const self = this;
        const as2 = /* @__PURE__ */ __name((qb) => {
          if (typeof qb === "function") {
            qb = qb(new QueryBuilder(self.dialect));
          }
          return new Proxy(
            new WithSubquery(
              qb.getSQL(),
              selection ?? ("getSelectedFields" in qb ? qb.getSelectedFields() ?? {} : {}),
              alias,
              true
            ),
            new SelectionProxyHandler({ alias, sqlAliasedBehavior: "alias", sqlBehavior: "error" })
          );
        }, "as");
        return { as: as2 };
      }, "$with");
      $count(source, filters) {
        return new PgCountBuilder({ source, filters, session: this.session });
      }
      $cache;
      /**
       * Incorporates a previously defined CTE (using `$with`) into the main query.
       *
       * This method allows the main query to reference a temporary named result set.
       *
       * See docs: {@link https://orm.drizzle.team/docs/select#with-clause}
       *
       * @param queries The CTEs to incorporate into the main query.
       *
       * @example
       *
       * ```ts
       * // Define a subquery 'sq' as a CTE using $with
       * const sq = db.$with('sq').as(db.select().from(users).where(eq(users.id, 42)));
       *
       * // Incorporate the CTE 'sq' into the main query and select from it
       * const result = await db.with(sq).select().from(sq);
       * ```
       */
      with(...queries) {
        const self = this;
        function select(fields) {
          return new PgSelectBuilder({
            fields: fields ?? void 0,
            session: self.session,
            dialect: self.dialect,
            withList: queries
          });
        }
        __name(select, "select");
        function selectDistinct(fields) {
          return new PgSelectBuilder({
            fields: fields ?? void 0,
            session: self.session,
            dialect: self.dialect,
            withList: queries,
            distinct: true
          });
        }
        __name(selectDistinct, "selectDistinct");
        function selectDistinctOn(on, fields) {
          return new PgSelectBuilder({
            fields: fields ?? void 0,
            session: self.session,
            dialect: self.dialect,
            withList: queries,
            distinct: { on }
          });
        }
        __name(selectDistinctOn, "selectDistinctOn");
        function update(table) {
          return new PgUpdateBuilder(table, self.session, self.dialect, queries);
        }
        __name(update, "update");
        function insert(table) {
          return new PgInsertBuilder(table, self.session, self.dialect, queries);
        }
        __name(insert, "insert");
        function delete_(table) {
          return new PgDeleteBase(table, self.session, self.dialect, queries);
        }
        __name(delete_, "delete_");
        return { select, selectDistinct, selectDistinctOn, update, insert, delete: delete_ };
      }
      select(fields) {
        return new PgSelectBuilder({
          fields: fields ?? void 0,
          session: this.session,
          dialect: this.dialect
        });
      }
      selectDistinct(fields) {
        return new PgSelectBuilder({
          fields: fields ?? void 0,
          session: this.session,
          dialect: this.dialect,
          distinct: true
        });
      }
      selectDistinctOn(on, fields) {
        return new PgSelectBuilder({
          fields: fields ?? void 0,
          session: this.session,
          dialect: this.dialect,
          distinct: { on }
        });
      }
      /**
       * Creates an update query.
       *
       * Calling this method without `.where()` clause will update all rows in a table. The `.where()` clause specifies which rows should be updated.
       *
       * Use `.set()` method to specify which values to update.
       *
       * See docs: {@link https://orm.drizzle.team/docs/update}
       *
       * @param table The table to update.
       *
       * @example
       *
       * ```ts
       * // Update all rows in the 'cars' table
       * await db.update(cars).set({ color: 'red' });
       *
       * // Update rows with filters and conditions
       * await db.update(cars).set({ color: 'red' }).where(eq(cars.brand, 'BMW'));
       *
       * // Update with returning clause
       * const updatedCar: Car[] = await db.update(cars)
       *   .set({ color: 'red' })
       *   .where(eq(cars.id, 1))
       *   .returning();
       * ```
       */
      update(table) {
        return new PgUpdateBuilder(table, this.session, this.dialect);
      }
      /**
       * Creates an insert query.
       *
       * Calling this method will create new rows in a table. Use `.values()` method to specify which values to insert.
       *
       * See docs: {@link https://orm.drizzle.team/docs/insert}
       *
       * @param table The table to insert into.
       *
       * @example
       *
       * ```ts
       * // Insert one row
       * await db.insert(cars).values({ brand: 'BMW' });
       *
       * // Insert multiple rows
       * await db.insert(cars).values([{ brand: 'BMW' }, { brand: 'Porsche' }]);
       *
       * // Insert with returning clause
       * const insertedCar: Car[] = await db.insert(cars)
       *   .values({ brand: 'BMW' })
       *   .returning();
       * ```
       */
      insert(table) {
        return new PgInsertBuilder(table, this.session, this.dialect);
      }
      /**
       * Creates a delete query.
       *
       * Calling this method without `.where()` clause will delete all rows in a table. The `.where()` clause specifies which rows should be deleted.
       *
       * See docs: {@link https://orm.drizzle.team/docs/delete}
       *
       * @param table The table to delete from.
       *
       * @example
       *
       * ```ts
       * // Delete all rows in the 'cars' table
       * await db.delete(cars);
       *
       * // Delete rows with filters and conditions
       * await db.delete(cars).where(eq(cars.color, 'green'));
       *
       * // Delete with returning clause
       * const deletedCar: Car[] = await db.delete(cars)
       *   .where(eq(cars.id, 1))
       *   .returning();
       * ```
       */
      delete(table) {
        return new PgDeleteBase(table, this.session, this.dialect);
      }
      refreshMaterializedView(view) {
        return new PgRefreshMaterializedView(view, this.session, this.dialect);
      }
      authToken;
      execute(query) {
        const sequel = typeof query === "string" ? sql.raw(query) : query.getSQL();
        const builtQuery = this.dialect.sqlToQuery(sequel);
        const prepared = this.session.prepareQuery(
          builtQuery,
          void 0,
          void 0,
          false
        );
        return new PgRaw(
          () => prepared.execute(void 0, this.authToken),
          sequel,
          builtQuery,
          (result) => prepared.mapResult(result, true)
        );
      }
      transaction(transaction, config) {
        return this.session.transaction(transaction, config);
      }
    };
  }
});

// ../node_modules/drizzle-orm/cache/core/cache.js
async function hashQuery(sql2, params) {
  const dataToHash = `${sql2}-${JSON.stringify(params)}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(dataToHash);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = [...new Uint8Array(hashBuffer)];
  const hashHex = hashArray.map((b2) => b2.toString(16).padStart(2, "0")).join("");
  return hashHex;
}
var Cache, NoopCache;
var init_cache = __esm({
  "../node_modules/drizzle-orm/cache/core/cache.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    Cache = class {
      static {
        __name(this, "Cache");
      }
      static [entityKind] = "Cache";
    };
    NoopCache = class extends Cache {
      static {
        __name(this, "NoopCache");
      }
      strategy() {
        return "all";
      }
      static [entityKind] = "NoopCache";
      async get(_key) {
        return void 0;
      }
      async put(_hashedQuery, _response, _tables, _config) {
      }
      async onMutate(_params) {
      }
    };
    __name(hashQuery, "hashQuery");
  }
});

// ../node_modules/drizzle-orm/cache/core/index.js
var init_core = __esm({
  "../node_modules/drizzle-orm/cache/core/index.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_cache();
  }
});

// ../node_modules/drizzle-orm/pg-core/alias.js
var init_alias2 = __esm({
  "../node_modules/drizzle-orm/pg-core/alias.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
  }
});

// ../node_modules/drizzle-orm/pg-core/roles.js
var PgRole;
var init_roles = __esm({
  "../node_modules/drizzle-orm/pg-core/roles.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    PgRole = class {
      static {
        __name(this, "PgRole");
      }
      constructor(name, config) {
        this.name = name;
        if (config) {
          this.createDb = config.createDb;
          this.createRole = config.createRole;
          this.inherit = config.inherit;
        }
      }
      static [entityKind] = "PgRole";
      /** @internal */
      _existing;
      /** @internal */
      createDb;
      /** @internal */
      createRole;
      /** @internal */
      inherit;
      existing() {
        this._existing = true;
        return this;
      }
    };
  }
});

// ../node_modules/drizzle-orm/pg-core/sequence.js
function pgSequenceWithSchema(name, options, schema) {
  return new PgSequence(name, options, schema);
}
var PgSequence;
var init_sequence = __esm({
  "../node_modules/drizzle-orm/pg-core/sequence.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    PgSequence = class {
      static {
        __name(this, "PgSequence");
      }
      constructor(seqName, seqOptions, schema) {
        this.seqName = seqName;
        this.seqOptions = seqOptions;
        this.schema = schema;
      }
      static [entityKind] = "PgSequence";
    };
    __name(pgSequenceWithSchema, "pgSequenceWithSchema");
  }
});

// ../node_modules/drizzle-orm/pg-core/schema.js
var PgSchema;
var init_schema = __esm({
  "../node_modules/drizzle-orm/pg-core/schema.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_entity();
    init_sql();
    init_enum();
    init_sequence();
    init_table2();
    init_view();
    PgSchema = class {
      static {
        __name(this, "PgSchema");
      }
      constructor(schemaName) {
        this.schemaName = schemaName;
      }
      static [entityKind] = "PgSchema";
      table = /* @__PURE__ */ __name((name, columns, extraConfig) => {
        return pgTableWithSchema(name, columns, extraConfig, this.schemaName);
      }, "table");
      view = /* @__PURE__ */ __name((name, columns) => {
        return pgViewWithSchema(name, columns, this.schemaName);
      }, "view");
      materializedView = /* @__PURE__ */ __name((name, columns) => {
        return pgMaterializedViewWithSchema(name, columns, this.schemaName);
      }, "materializedView");
      enum(enumName, input) {
        return Array.isArray(input) ? pgEnumWithSchema(
          enumName,
          [...input],
          this.schemaName
        ) : pgEnumObjectWithSchema(enumName, input, this.schemaName);
      }
      sequence = /* @__PURE__ */ __name((name, options) => {
        return pgSequenceWithSchema(name, options, this.schemaName);
      }, "sequence");
      getSQL() {
        return new SQL([sql.identifier(this.schemaName)]);
      }
      shouldOmitSQLParens() {
        return true;
      }
    };
  }
});

// ../node_modules/drizzle-orm/pg-core/session.js
var PgPreparedQuery, PgSession, PgTransaction;
var init_session = __esm({
  "../node_modules/drizzle-orm/pg-core/session.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_cache();
    init_entity();
    init_errors();
    init_sql2();
    init_tracing();
    init_db();
    PgPreparedQuery = class {
      static {
        __name(this, "PgPreparedQuery");
      }
      constructor(query, cache, queryMetadata, cacheConfig) {
        this.query = query;
        this.cache = cache;
        this.queryMetadata = queryMetadata;
        this.cacheConfig = cacheConfig;
        if (cache && cache.strategy() === "all" && cacheConfig === void 0) {
          this.cacheConfig = { enable: true, autoInvalidate: true };
        }
        if (!this.cacheConfig?.enable) {
          this.cacheConfig = void 0;
        }
      }
      authToken;
      getQuery() {
        return this.query;
      }
      mapResult(response, _isFromBatch) {
        return response;
      }
      /** @internal */
      setToken(token) {
        this.authToken = token;
        return this;
      }
      static [entityKind] = "PgPreparedQuery";
      /** @internal */
      joinsNotNullableMap;
      /** @internal */
      async queryWithCache(queryString, params, query) {
        if (this.cache === void 0 || is(this.cache, NoopCache) || this.queryMetadata === void 0) {
          try {
            return await query();
          } catch (e) {
            throw new DrizzleQueryError(queryString, params, e);
          }
        }
        if (this.cacheConfig && !this.cacheConfig.enable) {
          try {
            return await query();
          } catch (e) {
            throw new DrizzleQueryError(queryString, params, e);
          }
        }
        if ((this.queryMetadata.type === "insert" || this.queryMetadata.type === "update" || this.queryMetadata.type === "delete") && this.queryMetadata.tables.length > 0) {
          try {
            const [res] = await Promise.all([
              query(),
              this.cache.onMutate({ tables: this.queryMetadata.tables })
            ]);
            return res;
          } catch (e) {
            throw new DrizzleQueryError(queryString, params, e);
          }
        }
        if (!this.cacheConfig) {
          try {
            return await query();
          } catch (e) {
            throw new DrizzleQueryError(queryString, params, e);
          }
        }
        if (this.queryMetadata.type === "select") {
          const fromCache = await this.cache.get(
            this.cacheConfig.tag ?? await hashQuery(queryString, params),
            this.queryMetadata.tables,
            this.cacheConfig.tag !== void 0,
            this.cacheConfig.autoInvalidate
          );
          if (fromCache === void 0) {
            let result;
            try {
              result = await query();
            } catch (e) {
              throw new DrizzleQueryError(queryString, params, e);
            }
            await this.cache.put(
              this.cacheConfig.tag ?? await hashQuery(queryString, params),
              result,
              // make sure we send tables that were used in a query only if user wants to invalidate it on each write
              this.cacheConfig.autoInvalidate ? this.queryMetadata.tables : [],
              this.cacheConfig.tag !== void 0,
              this.cacheConfig.config
            );
            return result;
          }
          return fromCache;
        }
        try {
          return await query();
        } catch (e) {
          throw new DrizzleQueryError(queryString, params, e);
        }
      }
    };
    PgSession = class {
      static {
        __name(this, "PgSession");
      }
      constructor(dialect) {
        this.dialect = dialect;
      }
      static [entityKind] = "PgSession";
      /** @internal */
      execute(query, token) {
        return tracer.startActiveSpan("drizzle.operation", () => {
          const prepared = tracer.startActiveSpan("drizzle.prepareQuery", () => {
            return this.prepareQuery(
              this.dialect.sqlToQuery(query),
              void 0,
              void 0,
              false
            );
          });
          return prepared.setToken(token).execute(void 0, token);
        });
      }
      all(query) {
        return this.prepareQuery(
          this.dialect.sqlToQuery(query),
          void 0,
          void 0,
          false
        ).all();
      }
      /** @internal */
      async count(sql2, token) {
        const res = await this.execute(sql2, token);
        return Number(
          res[0]["count"]
        );
      }
    };
    PgTransaction = class extends PgDatabase {
      static {
        __name(this, "PgTransaction");
      }
      constructor(dialect, session, schema, nestedIndex = 0) {
        super(dialect, session, schema);
        this.schema = schema;
        this.nestedIndex = nestedIndex;
      }
      static [entityKind] = "PgTransaction";
      rollback() {
        throw new TransactionRollbackError();
      }
      /** @internal */
      getTransactionConfigSQL(config) {
        const chunks = [];
        if (config.isolationLevel) {
          chunks.push(`isolation level ${config.isolationLevel}`);
        }
        if (config.accessMode) {
          chunks.push(config.accessMode);
        }
        if (typeof config.deferrable === "boolean") {
          chunks.push(config.deferrable ? "deferrable" : "not deferrable");
        }
        return sql.raw(chunks.join(" "));
      }
      setTransaction(config) {
        return this.session.execute(sql`set transaction ${this.getTransactionConfigSQL(config)}`);
      }
    };
  }
});

// ../node_modules/drizzle-orm/pg-core/subquery.js
var init_subquery2 = __esm({
  "../node_modules/drizzle-orm/pg-core/subquery.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
  }
});

// ../node_modules/drizzle-orm/pg-core/utils/index.js
var init_utils4 = __esm({
  "../node_modules/drizzle-orm/pg-core/utils/index.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_array();
  }
});

// ../node_modules/drizzle-orm/pg-core/index.js
var init_pg_core = __esm({
  "../node_modules/drizzle-orm/pg-core/index.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_alias2();
    init_checks();
    init_columns();
    init_db();
    init_dialect();
    init_foreign_keys();
    init_indexes();
    init_policies();
    init_primary_keys();
    init_query_builders();
    init_roles();
    init_schema();
    init_sequence();
    init_session();
    init_subquery2();
    init_table2();
    init_unique_constraint();
    init_utils3();
    init_utils4();
    init_view_common2();
    init_view();
  }
});

// ../node_modules/drizzle-orm/neon-http/session.js
var rawQueryConfig, queryConfig, NeonHttpPreparedQuery, NeonHttpSession, NeonTransaction;
var init_session2 = __esm({
  "../node_modules/drizzle-orm/neon-http/session.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_core();
    init_entity();
    init_logger();
    init_pg_core();
    init_session();
    init_sql();
    init_utils();
    rawQueryConfig = {
      arrayMode: false,
      fullResults: true
    };
    queryConfig = {
      arrayMode: true,
      fullResults: true
    };
    NeonHttpPreparedQuery = class extends PgPreparedQuery {
      static {
        __name(this, "NeonHttpPreparedQuery");
      }
      constructor(client, query, logger, cache, queryMetadata, cacheConfig, fields, _isResponseInArrayMode, customResultMapper) {
        super(query, cache, queryMetadata, cacheConfig);
        this.client = client;
        this.logger = logger;
        this.fields = fields;
        this._isResponseInArrayMode = _isResponseInArrayMode;
        this.customResultMapper = customResultMapper;
        this.clientQuery = client.query ?? client;
      }
      static [entityKind] = "NeonHttpPreparedQuery";
      clientQuery;
      /** @internal */
      async execute(placeholderValues = {}, token = this.authToken) {
        const params = fillPlaceholders(this.query.params, placeholderValues);
        this.logger.logQuery(this.query.sql, params);
        const { fields, clientQuery, query, customResultMapper } = this;
        if (!fields && !customResultMapper) {
          return this.queryWithCache(query.sql, params, async () => {
            return clientQuery(
              query.sql,
              params,
              token === void 0 ? rawQueryConfig : {
                ...rawQueryConfig,
                authToken: token
              }
            );
          });
        }
        const result = await this.queryWithCache(query.sql, params, async () => {
          return await clientQuery(
            query.sql,
            params,
            token === void 0 ? queryConfig : {
              ...queryConfig,
              authToken: token
            }
          );
        });
        return this.mapResult(result);
      }
      mapResult(result) {
        if (!this.fields && !this.customResultMapper) {
          return result;
        }
        const rows = result.rows;
        if (this.customResultMapper) {
          return this.customResultMapper(rows);
        }
        return rows.map((row) => mapResultRow(this.fields, row, this.joinsNotNullableMap));
      }
      all(placeholderValues = {}) {
        const params = fillPlaceholders(this.query.params, placeholderValues);
        this.logger.logQuery(this.query.sql, params);
        return this.clientQuery(
          this.query.sql,
          params,
          this.authToken === void 0 ? rawQueryConfig : {
            ...rawQueryConfig,
            authToken: this.authToken
          }
        ).then((result) => result.rows);
      }
      /** @internal */
      values(placeholderValues = {}, token) {
        const params = fillPlaceholders(this.query.params, placeholderValues);
        this.logger.logQuery(this.query.sql, params);
        return this.clientQuery(this.query.sql, params, { arrayMode: true, fullResults: true, authToken: token }).then((result) => result.rows);
      }
      /** @internal */
      isResponseInArrayMode() {
        return this._isResponseInArrayMode;
      }
    };
    NeonHttpSession = class extends PgSession {
      static {
        __name(this, "NeonHttpSession");
      }
      constructor(client, dialect, schema, options = {}) {
        super(dialect);
        this.client = client;
        this.schema = schema;
        this.options = options;
        this.clientQuery = client.query ?? client;
        this.logger = options.logger ?? new NoopLogger();
        this.cache = options.cache ?? new NoopCache();
      }
      static [entityKind] = "NeonHttpSession";
      clientQuery;
      logger;
      cache;
      prepareQuery(query, fields, name, isResponseInArrayMode, customResultMapper, queryMetadata, cacheConfig) {
        return new NeonHttpPreparedQuery(
          this.client,
          query,
          this.logger,
          this.cache,
          queryMetadata,
          cacheConfig,
          fields,
          isResponseInArrayMode,
          customResultMapper
        );
      }
      async batch(queries) {
        const preparedQueries = [];
        const builtQueries = [];
        for (const query of queries) {
          const preparedQuery = query._prepare();
          const builtQuery = preparedQuery.getQuery();
          preparedQueries.push(preparedQuery);
          builtQueries.push(
            this.clientQuery(builtQuery.sql, builtQuery.params, {
              fullResults: true,
              arrayMode: preparedQuery.isResponseInArrayMode()
            })
          );
        }
        const batchResults = await this.client.transaction(builtQueries, queryConfig);
        return batchResults.map((result, i) => preparedQueries[i].mapResult(result, true));
      }
      // change return type to QueryRows<true>
      async query(query, params) {
        this.logger.logQuery(query, params);
        const result = await this.clientQuery(query, params, { arrayMode: true, fullResults: true });
        return result;
      }
      // change return type to QueryRows<false>
      async queryObjects(query, params) {
        return this.clientQuery(query, params, { arrayMode: false, fullResults: true });
      }
      /** @internal */
      async count(sql2, token) {
        const res = await this.execute(sql2, token);
        return Number(
          res["rows"][0]["count"]
        );
      }
      async transaction(_transaction, _config = {}) {
        throw new Error("No transactions support in neon-http driver");
      }
    };
    NeonTransaction = class extends PgTransaction {
      static {
        __name(this, "NeonTransaction");
      }
      static [entityKind] = "NeonHttpTransaction";
      async transaction(_transaction) {
        throw new Error("No transactions support in neon-http driver");
      }
    };
  }
});

// ../node_modules/drizzle-orm/neon-http/driver.js
function wrap(target, token, cb, deep) {
  return new Proxy(target, {
    get(target2, p2) {
      const element = target2[p2];
      if (typeof element !== "function" && (typeof element !== "object" || element === null)) return element;
      if (deep) return wrap(element, token, cb);
      if (p2 === "query") return wrap(element, token, cb, true);
      return new Proxy(element, {
        apply(target3, thisArg, argArray) {
          const res = target3.call(thisArg, ...argArray);
          if (typeof res === "object" && res !== null && "setToken" in res && typeof res.setToken === "function") {
            res.setToken(token);
          }
          return cb(target3, p2, res);
        }
      });
    }
  });
}
function construct(client, config = {}) {
  const dialect = new PgDialect({ casing: config.casing });
  let logger;
  if (config.logger === true) {
    logger = new DefaultLogger();
  } else if (config.logger !== false) {
    logger = config.logger;
  }
  let schema;
  if (config.schema) {
    const tablesConfig = extractTablesRelationalConfig(
      config.schema,
      createTableRelationsHelpers
    );
    schema = {
      fullSchema: config.schema,
      schema: tablesConfig.tables,
      tableNamesMap: tablesConfig.tableNamesMap
    };
  }
  const driver = new NeonHttpDriver(client, dialect, { logger, cache: config.cache });
  const session = driver.createSession(schema);
  const db2 = new NeonHttpDatabase(
    dialect,
    session,
    schema
  );
  db2.$client = client;
  db2.$cache = config.cache;
  if (db2.$cache) {
    db2.$cache["invalidate"] = config.cache?.onMutate;
  }
  return db2;
}
function drizzle(...params) {
  if (typeof params[0] === "string") {
    const instance = cs(params[0]);
    return construct(instance, params[1]);
  }
  if (isConfig(params[0])) {
    const { connection, client, ...drizzleConfig } = params[0];
    if (client) return construct(client, drizzleConfig);
    if (typeof connection === "object") {
      const { connectionString, ...options } = connection;
      const instance2 = cs(connectionString, options);
      return construct(instance2, drizzleConfig);
    }
    const instance = cs(connection);
    return construct(instance, drizzleConfig);
  }
  return construct(params[0], params[1]);
}
var NeonHttpDriver, NeonHttpDatabase;
var init_driver = __esm({
  "../node_modules/drizzle-orm/neon-http/driver.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_serverless();
    init_entity();
    init_logger();
    init_db();
    init_dialect();
    init_relations();
    init_utils();
    init_session2();
    NeonHttpDriver = class {
      static {
        __name(this, "NeonHttpDriver");
      }
      constructor(client, dialect, options = {}) {
        this.client = client;
        this.dialect = dialect;
        this.options = options;
        this.initMappers();
      }
      static [entityKind] = "NeonHttpDriver";
      createSession(schema) {
        return new NeonHttpSession(this.client, this.dialect, schema, {
          logger: this.options.logger,
          cache: this.options.cache
        });
      }
      initMappers() {
        export_types.setTypeParser(export_types.builtins.TIMESTAMPTZ, (val) => val);
        export_types.setTypeParser(export_types.builtins.TIMESTAMP, (val) => val);
        export_types.setTypeParser(export_types.builtins.DATE, (val) => val);
        export_types.setTypeParser(export_types.builtins.INTERVAL, (val) => val);
        export_types.setTypeParser(1231, (val) => val);
        export_types.setTypeParser(1115, (val) => val);
        export_types.setTypeParser(1185, (val) => val);
        export_types.setTypeParser(1187, (val) => val);
        export_types.setTypeParser(1182, (val) => val);
      }
    };
    __name(wrap, "wrap");
    NeonHttpDatabase = class extends PgDatabase {
      static {
        __name(this, "NeonHttpDatabase");
      }
      static [entityKind] = "NeonHttpDatabase";
      $withAuth(token) {
        this.authToken = token;
        return wrap(this, token, (target, p2, res) => {
          if (p2 === "with") {
            return wrap(res, token, (_, __, res2) => res2);
          }
          return res;
        });
      }
      async batch(batch) {
        return this.session.batch(batch);
      }
    };
    __name(construct, "construct");
    __name(drizzle, "drizzle");
    ((drizzle2) => {
      function mock(config) {
        return construct({}, config);
      }
      __name(mock, "mock");
      drizzle2.mock = mock;
    })(drizzle || (drizzle = {}));
  }
});

// ../node_modules/drizzle-orm/neon-http/index.js
var init_neon_http = __esm({
  "../node_modules/drizzle-orm/neon-http/index.js"() {
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_driver();
    init_session2();
  }
});

// _shared/db.ts
function createDb(env) {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  const sql2 = cs(databaseUrl);
  return drizzle(sql2, {
    schema: {
      users,
      userSessions,
      promptHistory,
      feedback,
      enhancementLogs,
      dsarRequests,
      trainingExamples
    }
  });
}
var users, userSessions, promptHistory, feedback, enhancementLogs, dsarRequests, trainingExamples;
var init_db2 = __esm({
  "_shared/db.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_serverless();
    init_neon_http();
    init_pg_core();
    init_drizzle_orm();
    users = pgTable("users", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      email: text("email").notNull().unique(),
      username: text("username").unique(),
      passwordHash: text("password_hash").notNull(),
      emailVerified: boolean("email_verified").default(false),
      mfaEnabled: boolean("mfa_enabled").default(false),
      mfaSecret: text("mfa_secret"),
      isActive: boolean("is_active").default(true),
      lastLogin: timestamp("last_login", { withTimezone: true }),
      loginAttempts: integer("login_attempts").default(0),
      lockedUntil: timestamp("locked_until", { withTimezone: true }),
      metadata: text("metadata"),
      // JSON string
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
      updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`)
    });
    userSessions = pgTable("user_sessions", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      tokenHash: text("token_hash").notNull().unique(),
      ipAddress: text("ip_address"),
      userAgent: text("user_agent"),
      expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
      isRevoked: boolean("is_revoked").default(false),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
      lastAccessed: timestamp("last_accessed", { withTimezone: true }).notNull().default(sql`now()`)
    });
    promptHistory = pgTable("prompt_history", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      original: text("original").notNull(),
      refined: text("refined").notNull(),
      context: text("context"),
      timestamp: timestamp("timestamp", { withTimezone: true }).notNull().default(sql`now()`),
      metadata: text("metadata"),
      // JSON string for source, processing time, etc.
      ipAddress: text("ip_address"),
      // Store user's IP for history isolation (legacy)
      userId: uuid("user_id").references(() => users.id),
      // User-based isolation (new)
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
      updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`)
    });
    feedback = pgTable("feedback", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      enhancementId: uuid("enhancement_id"),
      originalPrompt: text("original_prompt").notNull(),
      enhancedPrompt: text("enhanced_prompt").notNull(),
      wasSuccessful: boolean("was_successful").notNull(),
      score: integer("score").default(0),
      feedbackText: text("feedback_text"),
      userAgent: text("user_agent"),
      ipAddress: text("ip_address"),
      // Legacy
      userId: uuid("user_id").references(() => users.id),
      // User-based isolation (new)
      timestamp: timestamp("timestamp", { withTimezone: true }).notNull().default(sql`now()`),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`)
    });
    enhancementLogs = pgTable("enhancement_logs", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      originalPrompt: text("original_prompt"),
      enhancedPrompt: text("enhanced_prompt"),
      promptLength: integer("prompt_length").notNull(),
      hasContext: boolean("has_context").notNull(),
      isRefinement: boolean("is_refinement").notNull(),
      isExpansion: boolean("is_expansion").notNull(),
      repeatCount: integer("repeat_count").default(0),
      source: text("source").notNull(),
      // 'deepseek', 'mistral', 'gemini', 'local', 'fallback'
      enhancementModel: text("enhancement_model"),
      responseTime: integer("response_time"),
      // milliseconds
      processingTime: integer("processing_time"),
      // milliseconds
      wasIdentical: boolean("was_identical").default(false),
      hadError: boolean("had_error").default(false),
      context: text("context"),
      userId: uuid("user_id").references(() => users.id),
      // User-based isolation (new)
      timestamp: timestamp("timestamp", { withTimezone: true }).notNull().default(sql`now()`),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`)
    });
    __name(createDb, "createDb");
    dsarRequests = pgTable("dsar_requests", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      requestType: text("request_type").notNull(),
      // 'access', 'deletion', 'rectification'
      status: text("status").notNull().default("pending"),
      // 'pending', 'processing', 'completed', 'rejected'
      requestData: text("request_data"),
      // JSON string with request details
      responseData: text("response_data"),
      // JSON string with response
      adminNotes: text("admin_notes"),
      expiresAt: timestamp("expires_at", { withTimezone: true }),
      processedAt: timestamp("processed_at", { withTimezone: true }),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
      updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`)
    });
    trainingExamples = pgTable("training_examples", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      rawPrompt: text("raw_prompt").notNull(),
      enhancedPrompt: text("enhanced_prompt").notNull(),
      context: text("context"),
      category: text("category"),
      keywords: text("keywords"),
      source: text("source").notNull(),
      // 'api', 'manual', 'feedback'
      quality: integer("quality").default(0),
      // Quality score based on feedback
      usageCount: integer("usage_count").default(0),
      metadata: text("metadata"),
      // JSON string for additional data
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
      updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`)
    });
  }
});

// ../app/lib/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  enhancementLogs: () => enhancementLogs2,
  feedback: () => feedback2,
  promptHistory: () => promptHistory2,
  promptVersions: () => promptVersions,
  prompts: () => prompts,
  trainingExamples: () => trainingExamples2,
  userSessions: () => userSessions2,
  users: () => users2
});
var users2, userSessions2, promptHistory2, feedback2, enhancementLogs2, prompts, promptVersions, trainingExamples2;
var init_schema2 = __esm({
  "../app/lib/db/schema.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_pg_core();
    init_drizzle_orm();
    users2 = pgTable("users", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      email: text("email").notNull().unique(),
      username: text("username").unique(),
      passwordHash: text("password_hash").notNull(),
      emailVerified: boolean("email_verified").default(false),
      mfaEnabled: boolean("mfa_enabled").default(false),
      mfaSecret: text("mfa_secret"),
      isActive: boolean("is_active").default(true),
      lastLogin: timestamp("last_login", { withTimezone: true }),
      loginAttempts: integer("login_attempts").default(0),
      lockedUntil: timestamp("locked_until", { withTimezone: true }),
      metadata: text("metadata"),
      // JSON string
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
      updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`)
    });
    userSessions2 = pgTable("user_sessions", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: uuid("user_id").notNull().references(() => users2.id, { onDelete: "cascade" }),
      tokenHash: text("token_hash").notNull().unique(),
      userAgent: text("user_agent"),
      expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
      isRevoked: boolean("is_revoked").default(false),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
      lastAccessed: timestamp("last_accessed", { withTimezone: true }).notNull().default(sql`now()`)
    });
    promptHistory2 = pgTable("prompt_history", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      original: text("original").notNull(),
      refined: text("refined").notNull(),
      context: text("context"),
      timestamp: timestamp("timestamp", { withTimezone: true }).notNull().default(sql`now()`),
      metadata: text("metadata"),
      // JSON string for source, processing time, etc.
      userId: uuid("user_id").references(() => users2.id),
      // GDPR-compliant user-based isolation
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
      updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`)
    });
    feedback2 = pgTable("feedback", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      enhancementId: uuid("enhancement_id"),
      originalPrompt: text("original_prompt").notNull(),
      enhancedPrompt: text("enhanced_prompt").notNull(),
      wasSuccessful: boolean("was_successful").notNull(),
      score: integer("score").default(0),
      feedbackText: text("feedback_text"),
      userAgent: text("user_agent"),
      userId: uuid("user_id").references(() => users2.id),
      // GDPR-compliant user-based isolation
      timestamp: timestamp("timestamp", { withTimezone: true }).notNull().default(sql`now()`),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`)
    });
    enhancementLogs2 = pgTable("enhancement_logs", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      originalPrompt: text("original_prompt"),
      enhancedPrompt: text("enhanced_prompt"),
      promptLength: integer("prompt_length").notNull(),
      hasContext: boolean("has_context").notNull(),
      isRefinement: boolean("is_refinement").notNull(),
      isExpansion: boolean("is_expansion").notNull(),
      repeatCount: integer("repeat_count").default(0),
      source: text("source").notNull(),
      // 'deepseek', 'mistral', 'gemini', 'local', 'fallback'
      enhancementModel: text("enhancement_model"),
      responseTime: integer("response_time"),
      // milliseconds
      processingTime: integer("processing_time"),
      // milliseconds
      wasIdentical: boolean("was_identical").default(false),
      hadError: boolean("had_error").default(false),
      context: text("context"),
      userId: uuid("user_id").references(() => users2.id),
      // User-based isolation (new)
      timestamp: timestamp("timestamp", { withTimezone: true }).notNull().default(sql`now()`),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`)
    });
    prompts = pgTable("prompts", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      originalText: text("original_text").notNull(),
      textHash: text("text_hash").notNull(),
      categoryId: uuid("category_id"),
      latestVersion: integer("latest_version").notNull().default(1),
      totalUses: integer("total_uses").notNull().default(0),
      avgQualityScore: integer("avg_quality_score"),
      isPublic: boolean("is_public").default(false),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
      updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`)
    });
    promptVersions = pgTable("prompt_versions", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      promptId: uuid("prompt_id").notNull(),
      versionNumber: integer("version_number").notNull(),
      enhancedText: text("enhanced_text").notNull(),
      enhancementSource: text("enhancement_source").notNull(),
      qualityScore: integer("quality_score"),
      metricsData: text("metrics_data"),
      // JSON
      isBaseline: boolean("is_baseline").default(false),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`)
    });
    trainingExamples2 = pgTable("training_examples", {
      id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
      rawPrompt: text("raw_prompt").notNull(),
      enhancedPrompt: text("enhanced_prompt").notNull(),
      context: text("context"),
      category: text("category"),
      keywords: text("keywords"),
      source: text("source").notNull(),
      // 'api', 'manual', 'feedback'
      quality: integer("quality").default(0),
      // Quality score based on feedback
      usageCount: integer("usage_count").default(0),
      metadata: text("metadata"),
      // JSON string for additional data
      isActive: boolean("is_active").default(true),
      createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
      updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`)
    });
  }
});

// _shared/auth-service-workers.ts
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const salt = crypto2.getRandomValues(new Uint8Array(SALT_LENGTH));
  const keyMaterial = await crypto2.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const hash = await crypto2.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: "SHA-256"
    },
    keyMaterial,
    KEY_LENGTH * 8
  );
  const combined = new Uint8Array(salt.length + KEY_LENGTH);
  combined.set(salt);
  combined.set(new Uint8Array(hash), salt.length);
  return btoa(String.fromCharCode(...combined));
}
async function verifyPassword(password, storedHash) {
  try {
    const encoder = new TextEncoder();
    const combined = Uint8Array.from(atob(storedHash), (c) => c.charCodeAt(0));
    const salt = combined.slice(0, SALT_LENGTH);
    const storedHashBytes = combined.slice(SALT_LENGTH);
    const keyMaterial = await crypto2.subtle.importKey(
      "raw",
      encoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );
    const hash = await crypto2.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt,
        iterations: ITERATIONS,
        hash: "SHA-256"
      },
      keyMaterial,
      KEY_LENGTH * 8
    );
    const hashArray = new Uint8Array(hash);
    if (hashArray.length !== storedHashBytes.length) return false;
    let result = 0;
    for (let i = 0; i < hashArray.length; i++) {
      result |= hashArray[i] ^ storedHashBytes[i];
    }
    return result === 0;
  } catch {
    return false;
  }
}
async function generateJWT(payload, secret, expiresIn = 900) {
  const header = {
    alg: "HS256",
    typ: "JWT"
  };
  const now = Math.floor(Date.now() / 1e3);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn
  };
  const encoder = new TextEncoder();
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "");
  const encodedPayload = btoa(JSON.stringify(fullPayload)).replace(/=/g, "");
  const message = `${encodedHeader}.${encodedPayload}`;
  const key = await crypto2.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto2.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  );
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${message}.${encodedSignature}`;
}
async function verifyJWT(token, secret) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const message = `${encodedHeader}.${encodedPayload}`;
    const encoder = new TextEncoder();
    const key = await crypto2.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const signature = Uint8Array.from(
      atob(encodedSignature.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );
    const isValid = await crypto2.subtle.verify(
      "HMAC",
      key,
      signature,
      encoder.encode(message)
    );
    if (!isValid) return null;
    const payload = JSON.parse(atob(encodedPayload));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1e3)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
function generateTOTPSecret() {
  const bytes = crypto2.getRandomValues(new Uint8Array(20));
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let secret = "";
  for (let i = 0; i < bytes.length; i++) {
    secret += alphabet[bytes[i] % 32];
  }
  return secret;
}
async function verifyTOTP(secret, token) {
  const timeStep = 30;
  const time2 = Math.floor(Date.now() / 1e3 / timeStep);
  const encoder = new TextEncoder();
  const key = await crypto2.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(4, time2, false);
  const hmac = await crypto2.subtle.sign("HMAC", key, buffer);
  const hmacArray = new Uint8Array(hmac);
  const offset = hmacArray[hmacArray.length - 1] & 15;
  const code = ((hmacArray[offset] & 127) << 24 | (hmacArray[offset + 1] & 255) << 16 | (hmacArray[offset + 2] & 255) << 8 | hmacArray[offset + 3] & 255) % 1e6;
  return code.toString().padStart(6, "0") === token;
}
var crypto2, ITERATIONS, SALT_LENGTH, KEY_LENGTH, MAX_LOGIN_ATTEMPTS, LOCKOUT_DURATION, CloudflareAuthService;
var init_auth_service_workers = __esm({
  "_shared/auth-service-workers.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_drizzle_orm();
    init_db2();
    init_schema2();
    crypto2 = globalThis.crypto;
    ITERATIONS = 1e5;
    SALT_LENGTH = 16;
    KEY_LENGTH = 32;
    MAX_LOGIN_ATTEMPTS = 3;
    LOCKOUT_DURATION = 15 * 60 * 1e3;
    __name(hashPassword, "hashPassword");
    __name(verifyPassword, "verifyPassword");
    __name(generateJWT, "generateJWT");
    __name(verifyJWT, "verifyJWT");
    __name(generateTOTPSecret, "generateTOTPSecret");
    __name(verifyTOTP, "verifyTOTP");
    CloudflareAuthService = class {
      static {
        __name(this, "CloudflareAuthService");
      }
      constructor(env) {
        this.db = createDb(env);
        this.jwtSecret = env.JWT_SECRET || "dev-secret-change-in-production";
      }
      /**
       * User Registration
       */
      async register(email, password, username, metadata) {
        try {
          if (!this.isValidEmail(email)) {
            return { success: false, error: "Invalid email format" };
          }
          if (password.length < 12) {
            return {
              success: false,
              error: "Password must be at least 12 characters long"
            };
          }
          const existingUser = await this.db.select().from(users2).where(eq(users2.email, email.toLowerCase())).limit(1);
          if (existingUser.length > 0) {
            return { success: false, error: "User already exists" };
          }
          const passwordHash = await hashPassword(password);
          const [newUser] = await this.db.insert(users2).values({
            email: email.toLowerCase(),
            username: username?.toLowerCase(),
            passwordHash,
            emailVerified: false,
            mfaEnabled: false,
            isActive: true,
            loginAttempts: 0,
            metadata: metadata ? JSON.stringify(metadata) : null
          }).returning();
          return {
            success: true,
            user: this.sanitizeUser(newUser)
          };
        } catch (error) {
          console.error("Registration error:", error);
          return { success: false, error: "Registration failed" };
        }
      }
      /**
       * User Login
       */
      async login(email, password, totpCode) {
        try {
          const [user] = await this.db.select().from(users2).where(eq(users2.email, email.toLowerCase())).limit(1);
          if (!user) {
            return { success: false, error: "Invalid credentials" };
          }
          if (user.lockedUntil && new Date(user.lockedUntil) > /* @__PURE__ */ new Date()) {
            const remainingTime = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 6e4);
            return {
              success: false,
              error: `Account locked. Try again in ${remainingTime} minutes`
            };
          }
          if (!user.isActive) {
            return { success: false, error: "Account is disabled" };
          }
          const passwordMatch = await verifyPassword(password, user.passwordHash);
          if (!passwordMatch) {
            await this.handleFailedLogin(user.id);
            return { success: false, error: "Invalid credentials" };
          }
          if (user.mfaEnabled && user.totpSecret) {
            if (!totpCode) {
              return {
                success: false,
                requiresMFA: true,
                error: "MFA code required"
              };
            }
            const mfaValid = await verifyTOTP(user.totpSecret, totpCode);
            if (!mfaValid) {
              await this.handleFailedLogin(user.id);
              return { success: false, error: "Invalid MFA code" };
            }
          }
          await this.db.update(users2).set({
            loginAttempts: 0,
            lockedUntil: null,
            lastLogin: /* @__PURE__ */ new Date()
          }).where(eq(users2.id, user.id));
          const session = await this.createSession(user);
          return {
            success: true,
            user: this.sanitizeUser(user),
            session
          };
        } catch (error) {
          console.error("Login error:", error);
          return { success: false, error: "Login failed" };
        }
      }
      /**
       * Create session with JWT
       */
      async createSession(user) {
        const sessionId = crypto2.randomUUID();
        const accessToken = await generateJWT(
          {
            sub: user.id,
            email: user.email,
            session_id: sessionId
          },
          this.jwtSecret,
          900
          // 15 minutes
        );
        const refreshToken = btoa(crypto2.getRandomValues(new Uint8Array(32)).join(""));
        const idToken = await generateJWT(
          {
            sub: user.id,
            email: user.email,
            email_verified: user.emailVerified
          },
          this.jwtSecret,
          3600
          // 1 hour
        );
        const expiresAt = new Date(Date.now() + 15 * 60 * 1e3);
        await this.db.insert(userSessions2).values({
          id: sessionId,
          userId: user.id,
          tokenHash: await this.hashToken(accessToken),
          expiresAt
        });
        return {
          id: sessionId,
          userId: user.id,
          accessToken,
          refreshToken,
          idToken,
          expiresAt,
          scope: "read:history write:history"
        };
      }
      /**
       * Validate token
       */
      async validateToken(token) {
        try {
          const payload = await verifyJWT(token, this.jwtSecret);
          if (!payload) return null;
          const [user] = await this.db.select().from(users2).where(and(
            eq(users2.id, payload.sub),
            eq(users2.isActive, true)
          )).limit(1);
          return user ? this.sanitizeUser(user) : null;
        } catch (error) {
          console.error("Token validation error:", error);
          return null;
        }
      }
      /**
       * Setup MFA
       */
      async setupMFA(userId) {
        try {
          const secret = generateTOTPSecret();
          const backupCodes = Array.from(
            { length: 8 },
            () => btoa(crypto2.getRandomValues(new Uint8Array(4)).join("")).substring(0, 8).toUpperCase()
          );
          await this.db.update(users2).set({
            totpSecret: secret,
            backupCodes: JSON.stringify(backupCodes)
          }).where(eq(users2.id, userId));
          return {
            secret,
            qrCode: `otpauth://totp/ZeidGeist:user?secret=${secret}&issuer=ZeidGeist`,
            backupCodes
          };
        } catch (error) {
          console.error("MFA setup error:", error);
          return null;
        }
      }
      /**
       * Enable MFA after verification
       */
      async enableMFA(userId, totpCode) {
        try {
          const [user] = await this.db.select().from(users2).where(eq(users2.id, userId)).limit(1);
          if (!user || !user.mfaSecret) {
            return false;
          }
          const isValid = await verifyTOTP(user.mfaSecret, totpCode);
          if (!isValid) {
            return false;
          }
          await this.db.update(users2).set({ mfaEnabled: true }).where(eq(users2.id, userId));
          return true;
        } catch (error) {
          console.error("MFA enable error:", error);
          return false;
        }
      }
      /**
       * Helper methods
       */
      async hashToken(token) {
        const encoder = new TextEncoder();
        const data = encoder.encode(token);
        const hashBuffer = await crypto2.subtle.digest("SHA-256", data);
        return btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
      }
      async handleFailedLogin(userId) {
        const [user] = await this.db.select().from(users2).where(eq(users2.id, userId)).limit(1);
        if (!user) return;
        const attempts = user.loginAttempts + 1;
        const shouldLock = attempts >= MAX_LOGIN_ATTEMPTS;
        await this.db.update(users2).set({
          loginAttempts: attempts,
          lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION) : null
        }).where(eq(users2.id, userId));
      }
      isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      }
      sanitizeUser(user) {
        return {
          id: user.id,
          email: user.email,
          username: user.username,
          emailVerified: user.emailVerified,
          mfaEnabled: user.mfaEnabled,
          isActive: user.isActive,
          lastLogin: user.lastLogin
        };
      }
    };
  }
});

// _shared/privacy-guard.ts
async function createSha256Hash(data) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto3.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b2) => b2.toString(16).padStart(2, "0")).join("");
}
function validatePrivacyAccess(requestContext, dataOwnerId) {
  if (requestContext.userId !== dataOwnerId && requestContext.ipAddress !== dataOwnerId) {
    trackViolationAttempt(requestContext.ipAddress);
    return {
      isValid: false,
      reason: "Unauthorized access attempt to another user's data",
      riskScore: 1
    };
  }
  const violationCount = getViolationCount(requestContext.ipAddress);
  if (violationCount >= VIOLATION_THRESHOLD) {
    return {
      isValid: false,
      reason: "Too many unauthorized access attempts",
      riskScore: 1
    };
  }
  return {
    isValid: true,
    riskScore: violationCount / VIOLATION_THRESHOLD
  };
}
function trackViolationAttempt(identifier) {
  const key = `violation:${identifier}:${Math.floor(Date.now() / VIOLATION_WINDOW_MS)}`;
  const current = violationAttempts.get(key) || 0;
  violationAttempts.set(key, current + 1);
  cleanupViolationTracking();
  console.warn(`Privacy violation attempt tracked for ${identifier}. Count: ${current + 1}`);
}
function getViolationCount(identifier) {
  const key = `violation:${identifier}:${Math.floor(Date.now() / VIOLATION_WINDOW_MS)}`;
  return violationAttempts.get(key) || 0;
}
function cleanupViolationTracking() {
  const currentWindow = Math.floor(Date.now() / VIOLATION_WINDOW_MS);
  for (const key of violationAttempts.keys()) {
    const windowId = parseInt(key.split(":")[2]);
    if (windowId < currentWindow - 1) {
      violationAttempts.delete(key);
    }
  }
}
async function anonymizeIP(ipAddress) {
  if (!ipAddress || ipAddress === "unknown") return "anonymous";
  const hash = await createSha256Hash(ipAddress);
  return hash.substring(0, 8);
}
async function logPrivacyEvent(event) {
  const logEntry = {
    ...event,
    timestamp: event.timestamp.toISOString(),
    requesterId: await anonymizeIP(event.requesterId)
  };
  if (event.action === "violation" || event.action === "denied") {
    console.error("[PRIVACY AUDIT]", JSON.stringify(logEntry));
  } else {
    console.log("[PRIVACY AUDIT]", JSON.stringify(logEntry));
  }
}
function isSharedNetwork(ipAddress) {
  const sharedPatterns = [
    /^10\./,
    // Private network
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    // Private network
    /^192\.168\./,
    // Private network
    /^127\./,
    // Localhost
    /^::1$/,
    // IPv6 localhost
    /^fc00:/,
    // IPv6 private
    /^fe80:/
    // IPv6 link-local
  ];
  return sharedPatterns.some((pattern) => pattern.test(ipAddress));
}
async function generateSessionFingerprint(request) {
  const components = [
    request.headers.get("user-agent") || "unknown",
    request.headers.get("accept-language") || "unknown",
    request.headers.get("accept-encoding") || "unknown"
    // Add more entropy sources as needed
  ];
  const hash = await createSha256Hash(components.join("|"));
  return hash.substring(0, 16);
}
function getSecurityHeaders(origin = "https://mstprmpt.zeidgeist.com") {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "false",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
  };
}
var crypto3, violationAttempts, VIOLATION_THRESHOLD, VIOLATION_WINDOW_MS;
var init_privacy_guard = __esm({
  "_shared/privacy-guard.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    crypto3 = globalThis.crypto;
    __name(createSha256Hash, "createSha256Hash");
    violationAttempts = /* @__PURE__ */ new Map();
    VIOLATION_THRESHOLD = 5;
    VIOLATION_WINDOW_MS = 36e5;
    __name(validatePrivacyAccess, "validatePrivacyAccess");
    __name(trackViolationAttempt, "trackViolationAttempt");
    __name(getViolationCount, "getViolationCount");
    __name(cleanupViolationTracking, "cleanupViolationTracking");
    __name(anonymizeIP, "anonymizeIP");
    __name(logPrivacyEvent, "logPrivacyEvent");
    __name(isSharedNetwork, "isSharedNetwork");
    __name(generateSessionFingerprint, "generateSessionFingerprint");
    __name(getSecurityHeaders, "getSecurityHeaders");
  }
});

// _shared/privacy-monitor.ts
function monitorRequest(request, context) {
  const ipAddress = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
  const endpoint = new URL(request.url).pathname;
  privacyMonitor.trackRequest(ipAddress, endpoint, {
    method: request.method,
    userAgent: request.headers.get("user-agent"),
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
}
var PrivacyMonitor, privacyMonitor;
var init_privacy_monitor = __esm({
  "_shared/privacy-monitor.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    PrivacyMonitor = class {
      constructor() {
        this.metrics = {
          totalRequests: 0,
          uniqueIPs: 0,
          violationAttempts: 0,
          sharedNetworkAccess: 0,
          rateLimitExceeded: 0,
          crossUserAttempts: 0
        };
        this.alerts = [];
        this.ipSet = /* @__PURE__ */ new Set();
        this.suspiciousPatterns = /* @__PURE__ */ new Map();
        // Thresholds for alerting
        this.THRESHOLDS = {
          VIOLATION_ATTEMPTS_PER_HOUR: 10,
          CROSS_USER_ATTEMPTS_PER_IP: 3,
          RATE_LIMIT_VIOLATIONS_PER_IP: 5,
          SHARED_NETWORK_THRESHOLD: 0.3
          // 30% of traffic
        };
      }
      static {
        __name(this, "PrivacyMonitor");
      }
      /**
       * Track a request for monitoring
       */
      trackRequest(ipAddress, endpoint, metadata) {
        this.metrics.totalRequests++;
        if (!this.ipSet.has(ipAddress)) {
          this.ipSet.add(ipAddress);
          this.metrics.uniqueIPs++;
        }
        this.detectSuspiciousPatterns(ipAddress, endpoint, metadata);
      }
      /**
       * Track a privacy violation attempt
       */
      trackViolation(ipAddress, violationType, details) {
        this.metrics.violationAttempts++;
        const patternKey = `${ipAddress}:${violationType}`;
        const count = (this.suspiciousPatterns.get(patternKey) || 0) + 1;
        this.suspiciousPatterns.set(patternKey, count);
        if (count >= this.THRESHOLDS.CROSS_USER_ATTEMPTS_PER_IP) {
          this.generateAlert({
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: /* @__PURE__ */ new Date(),
            severity: count >= 5 ? "CRITICAL" : "HIGH",
            type: "PRIVACY_VIOLATION_PATTERN",
            description: `IP ${this.anonymizeIP(ipAddress)} has attempted ${count} privacy violations`,
            metadata: {
              ipAddress: this.anonymizeIP(ipAddress),
              violationType,
              attemptCount: count,
              ...details
            }
          });
        }
      }
      /**
       * Track shared network access
       */
      trackSharedNetworkAccess(ipAddress) {
        this.metrics.sharedNetworkAccess++;
        const sharedRatio = this.metrics.sharedNetworkAccess / this.metrics.totalRequests;
        if (sharedRatio > this.THRESHOLDS.SHARED_NETWORK_THRESHOLD) {
          this.generateAlert({
            id: `alert-${Date.now()}-shared`,
            timestamp: /* @__PURE__ */ new Date(),
            severity: "MEDIUM",
            type: "HIGH_SHARED_NETWORK_USAGE",
            description: `${(sharedRatio * 100).toFixed(1)}% of traffic from shared networks`,
            metadata: {
              ratio: sharedRatio,
              totalShared: this.metrics.sharedNetworkAccess,
              totalRequests: this.metrics.totalRequests
            }
          });
        }
      }
      /**
       * Track rate limit violations
       */
      trackRateLimitViolation(ipAddress) {
        this.metrics.rateLimitExceeded++;
        const key = `ratelimit:${ipAddress}`;
        const count = (this.suspiciousPatterns.get(key) || 0) + 1;
        this.suspiciousPatterns.set(key, count);
        if (count >= this.THRESHOLDS.RATE_LIMIT_VIOLATIONS_PER_IP) {
          this.generateAlert({
            id: `alert-${Date.now()}-ratelimit`,
            timestamp: /* @__PURE__ */ new Date(),
            severity: "MEDIUM",
            type: "EXCESSIVE_RATE_LIMIT_VIOLATIONS",
            description: `IP has exceeded rate limits ${count} times`,
            metadata: {
              ipAddress: this.anonymizeIP(ipAddress),
              violationCount: count
            }
          });
        }
      }
      /**
       * Detect suspicious patterns in requests
       */
      detectSuspiciousPatterns(ipAddress, endpoint, metadata) {
        const scanKey = `scan:${ipAddress}`;
        const endpoints = this.suspiciousPatterns.get(scanKey) || 0;
        if (endpoints > 10) {
          this.generateAlert({
            id: `alert-${Date.now()}-scan`,
            timestamp: /* @__PURE__ */ new Date(),
            severity: "HIGH",
            type: "ENDPOINT_SCANNING",
            description: "Potential endpoint scanning detected",
            metadata: {
              ipAddress: this.anonymizeIP(ipAddress),
              endpointCount: endpoints
            }
          });
        }
        if (metadata?.userAgentChanged) {
          this.generateAlert({
            id: `alert-${Date.now()}-ua`,
            timestamp: /* @__PURE__ */ new Date(),
            severity: "LOW",
            type: "USER_AGENT_ROTATION",
            description: "User agent rotation detected",
            metadata: {
              ipAddress: this.anonymizeIP(ipAddress)
            }
          });
        }
        if (metadata?.crossUserAttempt) {
          this.metrics.crossUserAttempts++;
          this.trackViolation(ipAddress, "CROSS_USER_ACCESS", metadata);
        }
      }
      /**
       * Generate and store an alert
       */
      generateAlert(alert) {
        this.alerts.push(alert);
        if (alert.severity === "CRITICAL" || alert.severity === "HIGH") {
          console.error("[PRIVACY ALERT]", JSON.stringify(alert, null, 2));
        } else {
          console.warn("[PRIVACY ALERT]", JSON.stringify(alert, null, 2));
        }
        if (this.alerts.length > 1e3) {
          this.alerts = this.alerts.slice(-1e3);
        }
      }
      /**
       * Get current metrics
       */
      getMetrics() {
        return { ...this.metrics };
      }
      /**
       * Get recent alerts
       */
      getAlerts(severity) {
        if (severity) {
          return this.alerts.filter((a2) => a2.severity === severity);
        }
        return [...this.alerts];
      }
      /**
       * Reset metrics (for testing or scheduled resets)
       */
      resetMetrics() {
        this.metrics = {
          totalRequests: 0,
          uniqueIPs: 0,
          violationAttempts: 0,
          sharedNetworkAccess: 0,
          rateLimitExceeded: 0,
          crossUserAttempts: 0
        };
        this.ipSet.clear();
        this.suspiciousPatterns.clear();
      }
      /**
       * Anonymize IP for logging
       */
      anonymizeIP(ip) {
        const parts = ip.split(".");
        if (parts.length === 4) {
          return `${parts[0]}.${parts[1]}.xxx.xxx`;
        }
        return "anonymous";
      }
      /**
       * Export metrics for monitoring dashboard
       */
      exportMetrics() {
        const metrics = this.getMetrics();
        const criticalAlerts = this.alerts.filter((a2) => a2.severity === "CRITICAL").length;
        const highAlerts = this.alerts.filter((a2) => a2.severity === "HIGH").length;
        return JSON.stringify({
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          metrics,
          alertCounts: {
            critical: criticalAlerts,
            high: highAlerts,
            total: this.alerts.length
          },
          health: {
            status: criticalAlerts > 0 ? "CRITICAL" : highAlerts > 2 ? "WARNING" : "HEALTHY",
            violationRate: this.metrics.violationAttempts / Math.max(1, this.metrics.totalRequests),
            uniqueIPRatio: this.metrics.uniqueIPs / Math.max(1, this.metrics.totalRequests)
          }
        }, null, 2);
      }
    };
    privacyMonitor = new PrivacyMonitor();
    __name(monitorRequest, "monitorRequest");
  }
});

// api/auth/login.ts
async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      ...getSecurityHeaders(),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
async function onRequestPost(context) {
  const { request, env } = context;
  monitorRequest(request, context);
  const corsHeaders = {
    ...getSecurityHeaders(),
    "Content-Type": "application/json",
    "Cache-Control": "no-store, no-cache, must-revalidate"
  };
  try {
    const body = await request.json();
    const { email, password, totpCode } = body;
    const clientIP = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    if (!email || !password) {
      privacyMonitor.trackViolation(clientIP, "INVALID_LOGIN_DATA");
      return new Response(JSON.stringify({
        success: false,
        error: "Email and password are required"
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    const authService = new CloudflareAuthService(env);
    const result = await authService.login(email, password, totpCode);
    if (!result.success) {
      if (result.error === "Invalid credentials") {
        privacyMonitor.trackViolation(clientIP, "FAILED_LOGIN_ATTEMPT", {
          email: email.substring(0, 3) + "***",
          // Partial email for logging
          userAgent
        });
      }
      return new Response(JSON.stringify({
        success: false,
        error: result.error,
        requiresMFA: result.requiresMFA
      }), {
        status: result.requiresMFA ? 200 : 401,
        headers: corsHeaders
      });
    }
    privacyMonitor.trackRequest(clientIP, "/api/auth/login", {
      successful: true,
      mfaUsed: result.user.mfaEnabled,
      userId: result.user.id
    });
    return new Response(JSON.stringify({
      success: true,
      message: "Login successful",
      user: {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        emailVerified: result.user.emailVerified,
        mfaEnabled: result.user.mfaEnabled
      }
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        // Security headers for secure token handling
        "Set-Cookie": [
          `access_token=${result.session.accessToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`,
          // 1 hour
          `id_token=${result.session.idToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`,
          // 1 hour  
          `refresh_token=${result.session.refreshToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`
          // 7 days
        ].join(", ")
      }
    });
  } catch (error) {
    console.error("Login endpoint error:", error);
    const clientIP = request.headers.get("cf-connecting-ip") || "unknown";
    privacyMonitor.trackViolation(clientIP, "LOGIN_SYSTEM_ERROR");
    return new Response(JSON.stringify({
      success: false,
      error: "Login failed. Please try again."
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
var init_login = __esm({
  "api/auth/login.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_auth_service_workers();
    init_privacy_guard();
    init_privacy_monitor();
    __name(onRequestOptions, "onRequestOptions");
    __name(onRequestPost, "onRequestPost");
  }
});

// api/auth/mfa.ts
async function onRequestOptions2() {
  return new Response(null, {
    status: 200,
    headers: {
      ...getSecurityHeaders(),
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}
async function onRequestGet(context) {
  const { request, env } = context;
  monitorRequest(request, context);
  const corsHeaders = {
    ...getSecurityHeaders(),
    "Content-Type": "application/json",
    "Cache-Control": "no-store, no-cache, must-revalidate"
  };
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({
        success: false,
        error: "Authorization required"
      }), {
        status: 401,
        headers: corsHeaders
      });
    }
    const token = authHeader.substring(7);
    const authService = new CloudflareAuthService(env);
    const user = await authService.validateToken(token);
    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        error: "Invalid or expired token"
      }), {
        status: 401,
        headers: corsHeaders
      });
    }
    const mfaSetup = await authService.setupMFA(user.id);
    if (!mfaSetup) {
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to setup MFA"
      }), {
        status: 500,
        headers: corsHeaders
      });
    }
    return new Response(JSON.stringify({
      success: true,
      mfa: {
        secret: mfaSetup.secret,
        qrCode: mfaSetup.qrCode,
        backupCodes: mfaSetup.backupCodes
      },
      instructions: {
        step1: "Install an authenticator app (Google Authenticator, Authy, etc.)",
        step2: "Scan the QR code or manually enter the secret",
        step3: "Save the backup codes in a secure location",
        step4: "Use the verify endpoint to enable MFA"
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    console.error("MFA setup error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "MFA setup failed"
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
async function onRequestPost2(context) {
  const { request, env } = context;
  monitorRequest(request, context);
  const corsHeaders = {
    ...getSecurityHeaders(),
    "Content-Type": "application/json",
    "Cache-Control": "no-store, no-cache, must-revalidate"
  };
  try {
    const url = new URL(request.url);
    const endpoint = url.pathname.split("/").pop();
    const body = await request.json();
    const { totpCode } = body;
    if (!totpCode) {
      return new Response(JSON.stringify({
        success: false,
        error: "TOTP code is required"
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({
        success: false,
        error: "Authorization required"
      }), {
        status: 401,
        headers: corsHeaders
      });
    }
    const token = authHeader.substring(7);
    const authService = new CloudflareAuthService(env);
    const user = await authService.validateToken(token);
    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        error: "Invalid or expired token"
      }), {
        status: 401,
        headers: corsHeaders
      });
    }
    if (endpoint === "enable") {
      const enabled = await authService.enableMFA(user.id, totpCode);
      if (!enabled) {
        const clientIP = request.headers.get("cf-connecting-ip") || "unknown";
        privacyMonitor.trackViolation(clientIP, "FAILED_MFA_VERIFICATION", {
          userId: user.id
        });
        return new Response(JSON.stringify({
          success: false,
          error: "Invalid TOTP code. Please try again."
        }), {
          status: 400,
          headers: corsHeaders
        });
      }
      return new Response(JSON.stringify({
        success: true,
        message: "MFA enabled successfully",
        mfaEnabled: true
      }), {
        status: 200,
        headers: corsHeaders
      });
    }
    return new Response(JSON.stringify({
      success: false,
      error: "Invalid endpoint"
    }), {
      status: 404,
      headers: corsHeaders
    });
  } catch (error) {
    console.error("MFA endpoint error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "MFA operation failed"
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
var init_mfa = __esm({
  "api/auth/mfa.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_auth_service_workers();
    init_privacy_guard();
    init_privacy_monitor();
    __name(onRequestOptions2, "onRequestOptions");
    __name(onRequestGet, "onRequestGet");
    __name(onRequestPost2, "onRequestPost");
  }
});

// api/auth/register.ts
async function onRequestOptions3() {
  return new Response(null, {
    status: 200,
    headers: {
      ...getSecurityHeaders(),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
async function onRequestPost3(context) {
  const { request, env } = context;
  monitorRequest(request, context);
  const corsHeaders = {
    ...getSecurityHeaders(),
    "Content-Type": "application/json",
    "Cache-Control": "no-store, no-cache, must-revalidate"
  };
  try {
    const body = await request.json();
    const { email, password, username } = body;
    if (!email || !password) {
      return new Response(JSON.stringify({
        success: false,
        error: "Email and password are required"
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    const authService = new CloudflareAuthService(env);
    const result = await authService.register(email, password, username);
    if (!result.success) {
      return new Response(JSON.stringify({
        success: false,
        error: result.error,
        suggestions: result.suggestions
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    return new Response(JSON.stringify({
      success: true,
      message: "Registration successful. Please check your email for verification.",
      user: {
        id: result.user.id,
        email: result.user.email,
        username: result.user.username,
        emailVerified: result.user.emailVerified
      }
    }), {
      status: 201,
      headers: corsHeaders
    });
  } catch (error) {
    console.error("Registration endpoint error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Registration failed. Please try again."
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
var init_register = __esm({
  "api/auth/register.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_auth_service_workers();
    init_privacy_guard();
    init_privacy_monitor();
    __name(onRequestOptions3, "onRequestOptions");
    __name(onRequestPost3, "onRequestPost");
  }
});

// api/engineer/feedback.ts
async function onRequestOptions4() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "https://mstprmpt.zeidgeist.com",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
async function onRequestPost4(context) {
  const { request, env } = context;
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  try {
    const db2 = createDb(env);
    const body = await request.json();
    const { original, refined, wasSuccessful, feedbackText } = body;
    if (!original || !refined || typeof wasSuccessful !== "boolean") {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: corsHeaders
      });
    }
    const userAgent = request.headers.get("user-agent") || null;
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const newFeedback = {
      originalPrompt: original,
      enhancedPrompt: refined,
      wasSuccessful,
      feedbackText: feedbackText || null,
      userAgent,
      ipAddress
    };
    await db2.insert(feedback).values(newFeedback);
    console.log("Feedback stored in database:", {
      wasSuccessful,
      originalLength: original.length,
      refinedLength: refined.length,
      hasFeedback: !!feedbackText,
      ipAddress: ipAddress.substring(0, 10) + "...",
      // Partial IP for privacy
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return new Response(JSON.stringify({
      success: true,
      message: "Feedback received successfully"
    }), {
      headers: corsHeaders
    });
  } catch (error) {
    console.error("Error storing feedback in database:", error);
    return new Response(JSON.stringify({ error: "Failed to process feedback" }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
var init_feedback = __esm({
  "api/engineer/feedback.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_db2();
    __name(onRequestOptions4, "onRequestOptions");
    __name(onRequestPost4, "onRequestPost");
  }
});

// api/engineer/history.ts
async function onRequestOptions5() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "https://mstprmpt.zeidgeist.com",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
async function onRequestGet2(context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://mstprmpt.zeidgeist.com",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  return new Response(JSON.stringify({
    error: "This endpoint has been deprecated for security reasons. Please use the secure endpoint instead.",
    deprecated: true,
    secureEndpoint: "/api/engineer/history-dual-mode",
    reason: "Enhanced privacy protection and user authentication required",
    migrationGuide: "Update your client code to use /api/engineer/history-dual-mode"
  }), {
    status: 410,
    // Gone
    headers: corsHeaders
  });
}
async function onRequestPost5(context) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://mstprmpt.zeidgeist.com",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  return new Response(JSON.stringify({
    error: "This endpoint has been deprecated for security reasons. Please use the secure endpoint instead.",
    deprecated: true,
    secureEndpoint: "/api/engineer/history-dual-mode",
    reason: "Enhanced privacy protection and user authentication required",
    migrationGuide: "Update your client code to use /api/engineer/history-dual-mode"
  }), {
    status: 410,
    // Gone
    headers: corsHeaders
  });
}
var init_history = __esm({
  "api/engineer/history.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    __name(onRequestOptions5, "onRequestOptions");
    __name(onRequestGet2, "onRequestGet");
    __name(onRequestPost5, "onRequestPost");
  }
});

// _shared/db-pool.ts
function getOptimizedDb(env) {
  const cacheKey = env.DATABASE_URL;
  const now = Date.now();
  const cached = connectionCache.get(cacheKey);
  if (cached && now - cached.timestamp < CONNECTION_TTL) {
    return cached.db;
  }
  const db2 = createDb(env);
  connectionCache.set(cacheKey, { db: db2, timestamp: now });
  if (connectionCache.size > 10) {
    const entries = Array.from(connectionCache.entries());
    const oldEntries = entries.filter(([, value]) => now - value.timestamp >= CONNECTION_TTL);
    oldEntries.forEach(([key]) => connectionCache.delete(key));
  }
  return db2;
}
async function executeWithRetry(operation, retries = 3, delay = 100) {
  const startTime = Date.now();
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      if (duration > 1e3) {
        console.warn(`Slow database query detected: ${duration}ms`);
      }
      return result;
    } catch (error) {
      if (attempt === retries - 1) {
        console.error("Database operation failed after retries:", error);
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, attempt)));
    }
  }
  throw new Error("Max retries reached");
}
var connectionCache, CONNECTION_TTL;
var init_db_pool = __esm({
  "_shared/db-pool.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_db2();
    connectionCache = /* @__PURE__ */ new Map();
    CONNECTION_TTL = 5 * 60 * 1e3;
    __name(getOptimizedDb, "getOptimizedDb");
    __name(executeWithRetry, "executeWithRetry");
  }
});

// api/engineer/history-dual-mode.ts
function getFeatures(env) {
  return {
    USER_AUTH_ENABLED: env.USER_AUTH_ENABLED === "true",
    IP_FALLBACK_ENABLED: env.IP_FALLBACK_ENABLED !== "false",
    DUAL_MODE_ENABLED: env.DUAL_MODE_ENABLED === "true",
    FORCE_USER_AUTH: env.FORCE_USER_AUTH === "true"
  };
}
async function onRequestOptions6() {
  return new Response(null, {
    status: 200,
    headers: {
      ...getSecurityHeaders(),
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}
async function onRequestGet3(context) {
  const { request, env } = context;
  monitorRequest(request, context);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "0");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const offset = page * limit;
  const requestContext = await extractRequestContext(request, env);
  const corsHeaders = {
    ...getSecurityHeaders(),
    "Content-Type": "application/json",
    "Cache-Control": "private, no-store",
    "X-Auth-Method": requestContext.authMethod,
    "X-Dual-Mode": getFeatures(env).DUAL_MODE_ENABLED ? "enabled" : "disabled"
  };
  try {
    if (!env?.DATABASE_URL) {
      console.error("Database configuration missing");
      return new Response(JSON.stringify({ error: "Service temporarily unavailable" }), {
        status: 503,
        headers: corsHeaders
      });
    }
    const db2 = getOptimizedDb(env);
    const isolationResult = await determineIsolationStrategy(requestContext, env);
    if (!isolationResult.allowed) {
      await logPrivacyEvent({
        timestamp: /* @__PURE__ */ new Date(),
        action: "denied",
        resource: "/api/engineer/history",
        requesterId: requestContext.ipAddress,
        reason: isolationResult.reason
      });
      return new Response(JSON.stringify({
        error: isolationResult.reason,
        requiresAuth: isolationResult.requiresAuth,
        migrationRequired: isolationResult.migrationRequired
      }), {
        status: isolationResult.requiresAuth ? 401 : 403,
        headers: corsHeaders
      });
    }
    const [history, totalCountResult] = await executeWithRetry(async () => {
      if (requestContext.authMethod === "USER") {
        return Promise.all([
          db2.select().from(promptHistory).where(eq(promptHistory.userId, requestContext.userId)).orderBy(desc(promptHistory.timestamp)).limit(limit).offset(offset),
          db2.select({ count: sql`count(*)` }).from(promptHistory).where(eq(promptHistory.userId, requestContext.userId))
        ]);
      } else {
        return Promise.all([
          db2.select().from(promptHistory).where(and(
            eq(promptHistory.ipAddress, requestContext.ipAddress),
            isNull(promptHistory.userId)
            // Only unlinked records
          )).orderBy(desc(promptHistory.timestamp)).limit(limit).offset(offset),
          db2.select({ count: sql`count(*)` }).from(promptHistory).where(and(
            eq(promptHistory.ipAddress, requestContext.ipAddress),
            isNull(promptHistory.userId)
          ))
        ]);
      }
    });
    const totalCount = totalCountResult[0]?.count || 0;
    const hasMore = offset + history.length < totalCount;
    const totalPages = Math.ceil(totalCount / limit);
    await logPrivacyEvent({
      timestamp: /* @__PURE__ */ new Date(),
      action: "access",
      resource: "/api/engineer/history",
      requesterId: requestContext.ipAddress,
      dataOwnerId: requestContext.userId || requestContext.ipAddress
    });
    const items = history.map((item) => ({
      original: item.original,
      refined: item.refined,
      context: item.context || void 0,
      timestamp: item.timestamp ? item.timestamp.toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
      metadata: item.metadata ? JSON.parse(item.metadata) : void 0
    }));
    const response = {
      items,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore,
        hasPrevious: page > 0
      }
    };
    if (requestContext.authMethod === "IP" && getFeatures(env).USER_AUTH_ENABLED) {
      response.migrationPrompt = {
        message: "Create an account to secure your data and access from any device",
        benefits: [
          "Secure access from multiple devices",
          "Better privacy protection",
          "Two-factor authentication",
          "Preserved history across sessions"
        ],
        action: {
          url: "/auth/register",
          text: "Create Account"
        }
      };
    }
    return new Response(JSON.stringify(response), {
      headers: corsHeaders
    });
  } catch (error) {
    console.error("Error fetching history:", error);
    privacyMonitor.trackViolation(requestContext.ipAddress, "SYSTEM_ERROR", {
      endpoint: "/api/engineer/history",
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return new Response(JSON.stringify({
      error: "Failed to fetch history. Please try again.",
      retryAfter: 5
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
async function onRequestPost6(context) {
  const { request, env } = context;
  monitorRequest(request, context);
  const requestContext = await extractRequestContext(request, env);
  const corsHeaders = {
    ...getSecurityHeaders(),
    "Content-Type": "application/json",
    "X-Auth-Method": requestContext.authMethod
  };
  try {
    const db2 = createDb(env);
    const body = await request.json();
    const { original, refined, context: context2, timestamp: timestamp2, metadata } = body;
    if (!original || !refined) {
      return new Response(JSON.stringify({
        error: "Missing required fields: original and refined prompts"
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    const isolationResult = await determineIsolationStrategy(requestContext, env);
    if (!isolationResult.allowed) {
      return new Response(JSON.stringify({
        error: isolationResult.reason,
        requiresAuth: isolationResult.requiresAuth
      }), {
        status: isolationResult.requiresAuth ? 401 : 403,
        headers: corsHeaders
      });
    }
    const newHistory = {
      original,
      refined,
      context: context2 || null,
      timestamp: new Date(timestamp2 || Date.now()),
      metadata: metadata ? JSON.stringify(metadata) : null,
      userId: requestContext.userId || null,
      ipAddress: requestContext.ipAddress
    };
    await db2.insert(promptHistory).values(newHistory);
    console.log("History item stored:", {
      authMethod: requestContext.authMethod,
      userId: requestContext.userId || "anonymous",
      ipAddress: requestContext.ipAddress,
      originalLength: original.length,
      refinedLength: refined.length,
      hasContext: !!context2,
      timestamp: newHistory.timestamp?.toISOString()
    });
    await logPrivacyEvent({
      timestamp: /* @__PURE__ */ new Date(),
      action: "access",
      resource: "/api/engineer/history",
      requesterId: requestContext.ipAddress,
      dataOwnerId: requestContext.userId || requestContext.ipAddress
    });
    const response = {
      success: true,
      message: "History item stored successfully",
      authMethod: requestContext.authMethod
    };
    if (requestContext.authMethod === "IP" && getFeatures(env).USER_AUTH_ENABLED) {
      response.migrationPrompt = {
        message: "Your data is saved! Create an account to keep it secure.",
        action: { url: "/auth/register", text: "Secure My Data" }
      };
    }
    return new Response(JSON.stringify(response), {
      headers: corsHeaders
    });
  } catch (error) {
    console.error("Error storing history:", error);
    return new Response(JSON.stringify({
      error: "Failed to store history. Please try again."
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
async function extractRequestContext(request, env) {
  const ipAddress = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  const sessionFingerprint = await generateSessionFingerprint(request);
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ") && getFeatures(env).USER_AUTH_ENABLED) {
    try {
      const token = authHeader.substring(7);
      const authService = new CloudflareAuthService(env);
      const user = await authService.validateToken(token);
      if (user) {
        return {
          userId: user.id,
          email: user.email,
          ipAddress,
          userAgent,
          sessionFingerprint,
          isAuthenticated: true,
          authMethod: "USER"
        };
      }
    } catch (error) {
      console.warn("Token validation failed:", error);
    }
  }
  return {
    ipAddress,
    userAgent,
    sessionFingerprint,
    isAuthenticated: false,
    authMethod: "IP"
  };
}
async function determineIsolationStrategy(requestContext, env) {
  if (requestContext.isAuthenticated && requestContext.userId) {
    return { allowed: true };
  }
  const features = getFeatures(env);
  if (features.FORCE_USER_AUTH) {
    return {
      allowed: false,
      reason: "User authentication is required. Please log in or create an account.",
      requiresAuth: true
    };
  }
  if (!features.DUAL_MODE_ENABLED && features.USER_AUTH_ENABLED) {
    return {
      allowed: false,
      reason: "Account required. IP-based access has been deprecated.",
      requiresAuth: true,
      migrationRequired: true
    };
  }
  if (!features.IP_FALLBACK_ENABLED) {
    return {
      allowed: false,
      reason: "User authentication is required.",
      requiresAuth: true
    };
  }
  if (requestContext.ipAddress === "unknown") {
    return {
      allowed: false,
      reason: "Unable to identify request source. Please ensure proper network configuration."
    };
  }
  const privacyCheck = validatePrivacyAccess(
    {
      userId: requestContext.ipAddress,
      // Use IP as user ID for legacy check
      ipAddress: requestContext.ipAddress
    },
    requestContext.ipAddress
  );
  if (!privacyCheck.isValid) {
    privacyMonitor.trackViolation(requestContext.ipAddress, "PRIVACY_VIOLATION", {
      reason: privacyCheck.reason,
      riskScore: privacyCheck.riskScore
    });
    return {
      allowed: false,
      reason: privacyCheck.reason || "Access denied for security reasons"
    };
  }
  if (isSharedNetwork(requestContext.ipAddress)) {
    console.warn(`Shared network access detected: ${requestContext.ipAddress}`);
    privacyMonitor.trackSharedNetworkAccess(requestContext.ipAddress);
  }
  return { allowed: true };
}
var init_history_dual_mode = __esm({
  "api/engineer/history-dual-mode.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_db2();
    init_db_pool();
    init_drizzle_orm();
    init_auth_service_workers();
    init_privacy_guard();
    init_privacy_monitor();
    __name(getFeatures, "getFeatures");
    __name(onRequestOptions6, "onRequestOptions");
    __name(onRequestGet3, "onRequestGet");
    __name(onRequestPost6, "onRequestPost");
    __name(extractRequestContext, "extractRequestContext");
    __name(determineIsolationStrategy, "determineIsolationStrategy");
  }
});

// ../app/lib/config/environment.ts
function validateEnvironment(env) {
  const environment = env || (typeof process !== "undefined" ? process.env : {});
  const nodeEnv = environment.NODE_ENV || "development";
  const missing = [];
  for (const varName of REQUIRED_VARS.all) {
    if (!environment[varName]) {
      missing.push(varName);
    }
  }
  if (nodeEnv === "production") {
    const envVars = REQUIRED_VARS[nodeEnv];
    if (Array.isArray(envVars)) {
      for (const varName of envVars) {
        if (!environment[varName]) {
          missing.push(varName);
        }
      }
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}
Please set these variables before starting the application.`
    );
  }
}
function getConfig(env) {
  validateEnvironment(env);
  const environment = env || (typeof process !== "undefined" ? process.env : {});
  const nodeEnv = environment.NODE_ENV || "development";
  const appEnv = environment.APP_ENV || nodeEnv;
  return {
    app: {
      env: appEnv,
      name: "zeidgeist-prompter",
      version: environment.APP_VERSION || "1.0.0",
      baseUrl: environment.API_BASE_URL || (appEnv === "production" ? "https://mstprmpt.zeidgeist.com" : appEnv === "staging" ? "https://staging.mstprmpt.zeidgeist.com" : "http://localhost:8788")
    },
    database: {
      url: environment.DATABASE_URL,
      maxConnections: parseInt(environment.DB_MAX_CONNECTIONS || "10"),
      connectionTimeout: parseInt(environment.DB_CONNECTION_TIMEOUT || "30000"),
      retryAttempts: parseInt(environment.DB_RETRY_ATTEMPTS || "3")
    },
    security: {
      jwtSecret: environment.JWT_SECRET,
      nextAuthSecret: environment.NEXTAUTH_SECRET || environment.JWT_SECRET,
      corsOrigins: environment.CORS_ORIGINS?.split(",") || [
        "https://mstprmpt.zeidgeist.com",
        "https://staging.mstprmpt.zeidgeist.com",
        ...nodeEnv === "development" ? ["http://localhost:3000", "http://localhost:8788"] : []
      ],
      rateLimit: {
        windowMs: parseInt(environment.RATE_LIMIT_WINDOW || "900000"),
        // 15 minutes
        max: parseInt(environment.RATE_LIMIT_MAX || "100")
      },
      sessionTimeout: parseInt(environment.SESSION_TIMEOUT || "86400000")
      // 24 hours
    },
    apis: {
      claudeApiKey: environment.CLAUDE_API_KEY,
      openaiApiKey: environment.OPENAI_API_KEY,
      deepseekApiKey: environment.DEEPSEEK_API_KEY,
      mistralApiKey: environment.MISTRAL_API_KEY,
      moonshotApiKey: environment.MOONSHOT_API_KEY
    },
    monitoring: {
      logLevel: environment.LOG_LEVEL || (appEnv === "production" ? "info" : "debug"),
      enablePerformanceLogging: environment.ENABLE_PERFORMANCE_LOGGING === "true" || appEnv !== "production",
      enableErrorTracking: environment.ENABLE_ERROR_TRACKING !== "false",
      sentryDsn: environment.SENTRY_DSN
    },
    features: {
      enableAnalytics: environment.ENABLE_ANALYTICS !== "false" && appEnv === "production",
      enableErrorReporting: environment.ENABLE_ERROR_REPORTING !== "false",
      enablePerformanceMonitoring: environment.ENABLE_PERFORMANCE_MONITORING !== "false"
    }
  };
}
function getDatabaseConfig(env) {
  return getConfig(env).database;
}
var REQUIRED_VARS;
var init_environment = __esm({
  "../app/lib/config/environment.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    REQUIRED_VARS = {
      all: ["NODE_ENV", "DATABASE_URL", "JWT_SECRET"],
      production: ["NEXTAUTH_SECRET", "APP_ENV"],
      staging: ["NEXTAUTH_SECRET", "APP_ENV"]
    };
    __name(validateEnvironment, "validateEnvironment");
    __name(getConfig, "getConfig");
    __name(getDatabaseConfig, "getDatabaseConfig");
  }
});

// ../app/lib/health/health-checks.ts
async function checkDatabase(env) {
  const start = Date.now();
  const check = {
    name: "database",
    status: "healthy",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    const config = getDatabaseConfig(env);
    const testConnection = /* @__PURE__ */ __name(async () => {
      if (!config.url) {
        throw new Error("Database URL not configured");
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
      return true;
    }, "testConnection");
    await testConnection();
    check.responseTime = Date.now() - start;
    check.details = {
      connectionTimeout: config.connectionTimeout,
      maxConnections: config.maxConnections
    };
  } catch (error) {
    check.status = "unhealthy";
    check.error = error instanceof Error ? error.message : "Unknown database error";
    check.responseTime = Date.now() - start;
  }
  return check;
}
async function checkMemory() {
  const check = {
    name: "memory",
    status: "healthy",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    if (typeof process !== "undefined" && process.memoryUsage) {
      const usage = process.memoryUsage();
      const usageInMB = {
        rss: Math.round(usage.rss / 1024 / 1024),
        heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
        external: Math.round(usage.external / 1024 / 1024)
      };
      const heapUsagePercent = usage.heapUsed / usage.heapTotal * 100;
      if (heapUsagePercent > 90) {
        check.status = "unhealthy";
        check.error = "Memory usage critically high";
      } else if (heapUsagePercent > 75) {
        check.status = "degraded";
      }
      check.details = {
        ...usageInMB,
        heapUsagePercent: Math.round(heapUsagePercent)
      };
    } else {
      check.details = { environment: "cloudflare-workers", memoryInfo: "not-available" };
    }
  } catch (error) {
    check.status = "unhealthy";
    check.error = error instanceof Error ? error.message : "Memory check failed";
  }
  return check;
}
async function checkApiDependencies() {
  const start = Date.now();
  const check = {
    name: "api-dependencies",
    status: "healthy",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    const apis = ["claude", "openai", "mistral"];
    const results = await Promise.allSettled(
      apis.map(async (api) => {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));
        if (Math.random() < 0.1) {
          throw new Error(`${api} API unavailable`);
        }
        return { api, status: "healthy" };
      })
    );
    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - successful;
    if (failed === results.length) {
      check.status = "unhealthy";
      check.error = "All external APIs unavailable";
    } else if (failed > 0) {
      check.status = "degraded";
    }
    check.responseTime = Date.now() - start;
    check.details = {
      total: results.length,
      successful,
      failed,
      results: results.map((r, i) => ({
        api: apis[i],
        status: r.status === "fulfilled" ? "healthy" : "unhealthy",
        error: r.status === "rejected" ? r.reason?.message : void 0
      }))
    };
  } catch (error) {
    check.status = "unhealthy";
    check.error = error instanceof Error ? error.message : "API dependency check failed";
    check.responseTime = Date.now() - start;
  }
  return check;
}
async function checkEnvironment(env) {
  const check = {
    name: "environment",
    status: "healthy",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  try {
    const environment = env || (typeof process !== "undefined" ? process.env : {});
    const requiredVars = ["DATABASE_URL", "JWT_SECRET"];
    const missing = requiredVars.filter((varName) => !environment[varName]);
    if (missing.length > 0) {
      check.status = "unhealthy";
      check.error = `Missing environment variables: ${missing.join(", ")}`;
    }
    const configuredApis = [
      environment.CLAUDE_API_KEY && "claude",
      environment.OPENAI_API_KEY && "openai",
      environment.MISTRAL_API_KEY && "mistral",
      environment.DEEPSEEK_API_KEY && "deepseek",
      environment.MOONSHOT_API_KEY && "moonshot"
    ].filter(Boolean);
    if (configuredApis.length === 0) {
      check.status = "degraded";
      check.error = "No external API keys configured, using local enhancement only";
    }
    check.details = {
      environment: environment.NODE_ENV || "development",
      configuredApis,
      requiredVarsPresent: requiredVars.length - missing.length,
      totalRequiredVars: requiredVars.length
    };
  } catch (error) {
    check.status = "unhealthy";
    check.error = error instanceof Error ? error.message : "Environment check failed";
  }
  return check;
}
async function runHealthChecks(env) {
  const startTime = Date.now();
  const checks = await Promise.all([
    checkDatabase(env),
    checkMemory(),
    checkApiDependencies(),
    checkEnvironment(env)
  ]);
  const healthy = checks.filter((c) => c.status === "healthy").length;
  const degraded = checks.filter((c) => c.status === "degraded").length;
  const unhealthy = checks.filter((c) => c.status === "unhealthy").length;
  let overallStatus = "healthy";
  if (unhealthy > 0) {
    overallStatus = "unhealthy";
  } else if (degraded > 0) {
    overallStatus = "degraded";
  }
  const uptime = typeof process !== "undefined" && process.uptime ? Math.floor(process.uptime()) : Math.floor((Date.now() - startTime) / 1e3);
  const environment = env || (typeof process !== "undefined" ? process.env : {});
  return {
    status: overallStatus,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    version: environment.APP_VERSION || "1.0.0",
    uptime,
    checks,
    summary: {
      total: checks.length,
      healthy,
      unhealthy,
      degraded
    }
  };
}
async function livenessCheck() {
  return {
    status: "healthy",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function readinessCheck(env) {
  const dbCheck = await checkDatabase(env);
  const envCheck = await checkEnvironment(env);
  const criticalChecks = [dbCheck, envCheck];
  const unhealthy = criticalChecks.filter((c) => c.status === "unhealthy");
  if (unhealthy.length > 0) {
    return {
      name: "readiness",
      status: "unhealthy",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      error: "Service not ready",
      details: {
        failedChecks: unhealthy.map((c) => ({ name: c.name, error: c.error }))
      }
    };
  }
  return {
    name: "readiness",
    status: "healthy",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    details: {
      message: "Service ready to handle requests"
    }
  };
}
var init_health_checks = __esm({
  "../app/lib/health/health-checks.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_environment();
    __name(checkDatabase, "checkDatabase");
    __name(checkMemory, "checkMemory");
    __name(checkApiDependencies, "checkApiDependencies");
    __name(checkEnvironment, "checkEnvironment");
    __name(runHealthChecks, "runHealthChecks");
    __name(livenessCheck, "livenessCheck");
    __name(readinessCheck, "readinessCheck");
  }
});

// api/health/liveness.ts
async function onRequestGet4() {
  try {
    const result = await livenessCheck();
    return Response.json(result, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    return Response.json(
      {
        status: "unhealthy",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: "Liveness check failed"
      },
      { status: 500 }
    );
  }
}
var init_liveness = __esm({
  "api/health/liveness.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_health_checks();
    __name(onRequestGet4, "onRequestGet");
  }
});

// api/health/readiness.ts
async function onRequestGet5(context) {
  try {
    const result = await readinessCheck(context.env);
    const status = result.status === "healthy" ? 200 : 503;
    return Response.json(result, {
      status,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Content-Type": "application/json"
      }
    });
  } catch (error) {
    return Response.json(
      {
        status: "unhealthy",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: "Readiness check failed",
        details: {
          message: "Service is not ready to handle requests"
        }
      },
      { status: 503 }
    );
  }
}
var init_readiness = __esm({
  "api/health/readiness.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_health_checks();
    __name(onRequestGet5, "onRequestGet");
  }
});

// ../app/lib/db/index.ts
function getDb() {
  if (!_db) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    const sql2 = cs(databaseUrl);
    _db = drizzle(sql2, { schema: schema_exports });
  }
  return _db;
}
var _db, db;
var init_db3 = __esm({
  "../app/lib/db/index.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_serverless();
    init_neon_http();
    init_schema2();
    init_schema2();
    _db = null;
    __name(getDb, "getDb");
    db = new Proxy({}, {
      get(target, prop) {
        return getDb()[prop];
      }
    });
  }
});

// ../app/lib/db.ts
var init_db4 = __esm({
  "../app/lib/db.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_db3();
  }
});

// ../app/lib/learning/pattern-extractor.ts
var PatternExtractor;
var init_pattern_extractor = __esm({
  "../app/lib/learning/pattern-extractor.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_db4();
    init_drizzle_orm();
    PatternExtractor = class {
      constructor() {
        this.MIN_CONFIDENCE_THRESHOLD = 0.7;
        this.MIN_EXAMPLES_FOR_PATTERN = 3;
      }
      static {
        __name(this, "PatternExtractor");
      }
      /**
       * Extract patterns from successful LLM enhancements
       */
      async extractPatterns(timeWindow = 7) {
        const startDate = /* @__PURE__ */ new Date();
        startDate.setDate(startDate.getDate() - timeWindow);
        const successfulEnhancements = await db.select({
          original: enhancementLogs2.originalPrompt,
          enhanced: enhancementLogs2.enhancedPrompt,
          context: enhancementLogs2.context,
          feedbackScore: feedback2.score
        }).from(enhancementLogs2).leftJoin(
          feedback2,
          and(
            eq(feedback2.enhancementId, enhancementLogs2.id),
            eq(feedback2.wasSuccessful, true)
          )
        ).where(
          and(
            gte(enhancementLogs2.createdAt, startDate),
            sql`${feedback2.score} >= 4`
          )
        );
        return this.analyzeEnhancements(successfulEnhancements);
      }
      /**
       * Analyze enhancements to identify reusable patterns
       */
      analyzeEnhancements(enhancements) {
        const patterns = [];
        const patternGroups = /* @__PURE__ */ new Map();
        for (const enhancement of enhancements) {
          if (!enhancement.original || !enhancement.enhanced) continue;
          const transformations = this.extractTransformations(
            enhancement.original,
            enhancement.enhanced
          );
          const keywords = this.extractKeywords(enhancement.original);
          const patternKey = this.generatePatternKey(transformations, keywords);
          const pattern = {
            originalText: enhancement.original,
            enhancedText: enhancement.enhanced,
            context: enhancement.context || "",
            keywords,
            transformations,
            confidence: (enhancement.feedbackScore || 0) / 5
          };
          if (!patternGroups.has(patternKey)) {
            patternGroups.set(patternKey, []);
          }
          patternGroups.get(patternKey).push(pattern);
        }
        for (const [key, group] of patternGroups) {
          if (group.length >= this.MIN_EXAMPLES_FOR_PATTERN) {
            const avgConfidence = group.reduce((sum, p2) => sum + p2.confidence, 0) / group.length;
            if (avgConfidence >= this.MIN_CONFIDENCE_THRESHOLD) {
              patterns.push(this.mergePatterns(group));
            }
          }
        }
        return patterns;
      }
      /**
       * Extract specific transformations between original and enhanced text
       */
      extractTransformations(original, enhanced) {
        const transformations = [];
        const originalWords = original.toLowerCase().split(/\s+/);
        const enhancedWords = enhanced.toLowerCase().split(/\s+/);
        const commonPhrases = this.findCommonPhrases(originalWords, enhancedWords);
        for (let i = 0; i < originalWords.length; i++) {
          const word = originalWords[i];
          if (!enhancedWords.includes(word) && !commonPhrases.has(word)) {
            const context = originalWords.slice(
              Math.max(0, i - 2),
              Math.min(originalWords.length, i + 3)
            );
            const replacement = this.findReplacement(context, enhancedWords);
            if (replacement) {
              transformations.push({
                type: "replacement",
                from: word,
                to: replacement,
                position: i
              });
            }
          }
        }
        const addedWords = enhancedWords.filter(
          (word) => !originalWords.includes(word) && !commonPhrases.has(word)
        );
        for (const added of addedWords) {
          transformations.push({
            type: "addition",
            from: "",
            to: added
          });
        }
        return transformations;
      }
      /**
       * Extract keywords from text for pattern matching
       */
      extractKeywords(text2) {
        const stopWords = /* @__PURE__ */ new Set([
          "the",
          "a",
          "an",
          "and",
          "or",
          "but",
          "in",
          "on",
          "at",
          "to",
          "for",
          "of",
          "with",
          "by",
          "from",
          "as",
          "is",
          "was",
          "are",
          "were",
          "been",
          "be",
          "have",
          "has",
          "had",
          "do",
          "does",
          "did",
          "will",
          "would",
          "should",
          "could",
          "may",
          "might",
          "must",
          "can",
          "this",
          "that",
          "these",
          "those",
          "i",
          "you",
          "he",
          "she",
          "it",
          "we",
          "they"
        ]);
        return text2.toLowerCase().split(/\s+/).filter((word) => word.length > 2 && !stopWords.has(word)).slice(0, 10);
      }
      /**
       * Generate a unique key for pattern grouping
       */
      generatePatternKey(transformations, keywords) {
        const transformationTypes = transformations.map((t) => t.type).sort().join("-");
        const keywordSet = keywords.slice(0, 3).sort().join("-");
        return `${transformationTypes}:${keywordSet}`;
      }
      /**
       * Find common phrases between two word arrays
       */
      findCommonPhrases(words1, words2) {
        const common = /* @__PURE__ */ new Set();
        const words2Set = new Set(words2);
        for (const word of words1) {
          if (words2Set.has(word)) {
            common.add(word);
          }
        }
        return common;
      }
      /**
       * Find replacement word in enhanced text based on context
       */
      findReplacement(context, enhancedWords) {
        for (let i = 0; i < enhancedWords.length; i++) {
          const enhancedContext = enhancedWords.slice(
            Math.max(0, i - 2),
            Math.min(enhancedWords.length, i + 3)
          );
          const similarity = this.contextSimilarity(context, enhancedContext);
          if (similarity > 0.6) {
            return enhancedWords[i];
          }
        }
        return null;
      }
      /**
       * Calculate context similarity
       */
      contextSimilarity(context1, context2) {
        const set1 = new Set(context1);
        const set2 = new Set(context2);
        const intersection = new Set([...set1].filter((x2) => set2.has(x2)));
        const union2 = /* @__PURE__ */ new Set([...set1, ...set2]);
        return intersection.size / union2.size;
      }
      /**
       * Merge similar patterns into a single pattern
       */
      mergePatterns(patterns) {
        const avgConfidence = patterns.reduce((sum, p2) => sum + p2.confidence, 0) / patterns.length;
        const allKeywords = /* @__PURE__ */ new Set();
        const allTransformations = /* @__PURE__ */ new Map();
        for (const pattern of patterns) {
          pattern.keywords.forEach((k) => allKeywords.add(k));
          pattern.transformations.forEach((t) => {
            const key = `${t.type}-${t.from}-${t.to}`;
            allTransformations.set(key, t);
          });
        }
        return {
          originalText: patterns[0].originalText,
          enhancedText: patterns[0].enhancedText,
          context: patterns[0].context,
          keywords: Array.from(allKeywords),
          transformations: Array.from(allTransformations.values()),
          confidence: avgConfidence
        };
      }
    };
  }
});

// ../app/lib/learning/learning-service.ts
var LearningService;
var init_learning_service = __esm({
  "../app/lib/learning/learning-service.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_db4();
    init_pattern_extractor();
    init_drizzle_orm();
    LearningService = class {
      constructor() {
        this.LEARNING_CYCLE_INTERVAL = 24 * 60 * 60 * 1e3;
        // 24 hours
        this.PATTERN_CONFIDENCE_THRESHOLD = 0.75;
        this.LLM_FALLBACK_THRESHOLD = 0.6;
        this.patternExtractor = new PatternExtractor();
      }
      static {
        __name(this, "LearningService");
      }
      /**
       * Main learning cycle - should be run periodically
       */
      async runLearningCycle() {
        console.log("Starting learning cycle...");
        const patterns = await this.patternExtractor.extractPatterns(7);
        const newPatterns = await this.storePatterns(patterns);
        await this.updatePatternQuality();
        const metrics = await this.calculateMetrics(newPatterns);
        console.log("Learning cycle completed:", metrics);
        return metrics;
      }
      /**
       * Store learned patterns in the database
       */
      async storePatterns(patterns) {
        let newPatternsCount = 0;
        for (const pattern of patterns) {
          if (pattern.confidence < this.PATTERN_CONFIDENCE_THRESHOLD) continue;
          const existingPattern = await this.findSimilarPattern(pattern);
          if (existingPattern) {
            await this.updatePattern(existingPattern.id, pattern);
          } else {
            await db.insert(trainingExamples2).values({
              rawPrompt: pattern.originalText,
              enhancedPrompt: pattern.enhancedText,
              context: pattern.context,
              source: "learning",
              quality: Math.round(pattern.confidence * 100),
              // Convert to integer scale
              usageCount: 1
            });
            newPatternsCount++;
          }
        }
        return newPatternsCount;
      }
      /**
       * Find similar existing pattern
       */
      async findSimilarPattern(pattern) {
        const keywordOverlapThreshold = 0.5;
        const existingPatterns = await db.select().from(trainingExamples2).where(eq(trainingExamples2.source, "learning"));
        for (const existing of existingPatterns) {
          const existingWords = new Set(
            existing.rawPrompt.toLowerCase().split(/\s+/)
          );
          const patternWords = new Set(pattern.originalText.toLowerCase().split(/\s+/));
          const intersection = new Set(
            [...existingWords].filter((x2) => patternWords.has(x2))
          );
          const overlap = intersection.size / patternWords.size;
          if (overlap >= keywordOverlapThreshold) {
            return existing;
          }
        }
        return null;
      }
      /**
       * Update existing pattern with new information
       */
      async updatePattern(patternId, newPattern) {
        const existing = await db.select().from(trainingExamples2).where(eq(trainingExamples2.id, patternId)).limit(1);
        if (existing.length === 0) return;
        const currentPattern = existing[0];
        const updatedQuality = Math.round(
          ((currentPattern.quality || 0) + newPattern.confidence * 100) / 2
        );
        const updatedUsageCount = (currentPattern.usageCount || 0) + 1;
        await db.update(trainingExamples2).set({
          quality: updatedQuality,
          usageCount: updatedUsageCount
        }).where(eq(trainingExamples2.id, patternId));
      }
      /**
       * Update pattern quality based on user feedback
       */
      async updatePatternQuality() {
        const recentFeedback = await db.select({
          enhancementId: feedback2.enhancementId,
          score: feedback2.score,
          successful: feedback2.wasSuccessful
        }).from(feedback2).where(
          gte(feedback2.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3))
        );
        for (const fb of recentFeedback) {
          if (!fb.enhancementId) continue;
          const enhancement = await db.select().from(enhancementLogs2).where(eq(enhancementLogs2.id, fb.enhancementId)).limit(1);
          if (enhancement.length === 0) continue;
          const relatedPatterns = await this.findRelatedPatterns(
            enhancement[0].originalPrompt || ""
          );
          for (const pattern of relatedPatterns) {
            const qualityAdjustment = fb.successful ? ((fb.score || 3) - 3) * 0.1 : -0.2;
            const newQuality = Math.max(
              0,
              Math.min(100, (pattern.quality || 0) + qualityAdjustment * 10)
            );
            await db.update(trainingExamples2).set({ quality: newQuality }).where(eq(trainingExamples2.id, pattern.id));
          }
        }
      }
      /**
       * Find patterns related to a given prompt
       */
      async findRelatedPatterns(prompt) {
        const promptKeywords = prompt.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
        const patterns = await db.select().from(trainingExamples2).where(gte(trainingExamples2.quality, 0.5));
        return patterns.filter((pattern) => {
          const patternWords = new Set(
            pattern.rawPrompt.toLowerCase().split(/\s+/)
          );
          return promptKeywords.some((k) => patternWords.has(k));
        });
      }
      /**
       * Categorize pattern based on content
       */
      categorizePattern(pattern) {
        const text2 = pattern.originalText.toLowerCase();
        if (text2.includes("website") || text2.includes("web") || text2.includes("app")) {
          return "website";
        } else if (text2.includes("write") || text2.includes("essay") || text2.includes("article")) {
          return "writing";
        } else if (text2.includes("plan") || text2.includes("organize") || text2.includes("schedule")) {
          return "planning";
        } else if (text2.includes("code") || text2.includes("program") || text2.includes("develop")) {
          return "coding";
        } else if (text2.includes("analyze") || text2.includes("data") || text2.includes("research")) {
          return "analysis";
        }
        return "general";
      }
      /**
       * Calculate learning metrics
       */
      async calculateMetrics(newPatterns) {
        const totalPatternsResult = await db.select({ count: trainingExamples2.id }).from(trainingExamples2);
        const totalPatterns = totalPatternsResult.length;
        const llmDependency = await this.calculateLLMDependency();
        const accuracy = await this.calculateAccuracy();
        return {
          totalPatterns,
          newPatternsLearned: newPatterns,
          llmDependencyScore: llmDependency,
          accuracyScore: accuracy,
          lastLearningCycle: /* @__PURE__ */ new Date()
        };
      }
      /**
       * Calculate how dependent the system is on LLMs
       */
      async calculateLLMDependency() {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
        const recentEnhancements = await db.select({
          source: enhancementLogs2.source
        }).from(enhancementLogs2).where(gte(enhancementLogs2.createdAt, oneWeekAgo));
        if (recentEnhancements.length === 0) return 1;
        const localEnhancements = recentEnhancements.filter(
          (e) => e.source === "local"
        ).length;
        return 1 - localEnhancements / recentEnhancements.length;
      }
      /**
       * Calculate accuracy of local enhancements
       */
      async calculateAccuracy() {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
        const localEnhancementsWithFeedback = await db.select({
          successful: feedback2.wasSuccessful,
          score: feedback2.score
        }).from(enhancementLogs2).leftJoin(feedback2, eq(feedback2.enhancementId, enhancementLogs2.id)).where(
          and(
            eq(enhancementLogs2.source, "local"),
            gte(enhancementLogs2.createdAt, oneWeekAgo)
          )
        );
        if (localEnhancementsWithFeedback.length === 0) return 0;
        const successfulCount = localEnhancementsWithFeedback.filter(
          (e) => e.successful === true && (e.score || 0) >= 4
        ).length;
        return successfulCount / localEnhancementsWithFeedback.length;
      }
      /**
       * Check if system should use local enhancement instead of LLM
       */
      async shouldUseLocalEnhancement(prompt) {
        const relatedPatterns = await this.findRelatedPatterns(prompt);
        if (relatedPatterns.length === 0) return false;
        const avgQuality = relatedPatterns.reduce((sum, p2) => sum + p2.quality, 0) / relatedPatterns.length;
        return avgQuality >= this.LLM_FALLBACK_THRESHOLD;
      }
      /**
       * Get best pattern for a given prompt
       */
      async getBestPattern(prompt) {
        const relatedPatterns = await this.findRelatedPatterns(prompt);
        if (relatedPatterns.length === 0) return null;
        relatedPatterns.sort((a2, b2) => {
          const scoreA = a2.quality * 0.7 + a2.usageCount / 100 * 0.3;
          const scoreB = b2.quality * 0.7 + b2.usageCount / 100 * 0.3;
          return scoreB - scoreA;
        });
        return relatedPatterns[0];
      }
    };
  }
});

// ../app/lib/learning/adaptive-enhancer.ts
var AdaptiveEnhancer;
var init_adaptive_enhancer = __esm({
  "../app/lib/learning/adaptive-enhancer.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_db4();
    init_learning_service();
    init_drizzle_orm();
    AdaptiveEnhancer = class {
      constructor() {
        this.MIN_CONFIDENCE_FOR_LOCAL = 0.7;
        this.HYBRID_THRESHOLD = 0.5;
        this.learningService = new LearningService();
      }
      static {
        __name(this, "AdaptiveEnhancer");
      }
      /**
       * Enhance prompt using learned patterns
       */
      async enhance(prompt) {
        const shouldUseLocal = await this.learningService.shouldUseLocalEnhancement(prompt);
        if (shouldUseLocal) {
          return await this.localEnhance(prompt);
        }
        const bestPattern = await this.learningService.getBestPattern(prompt);
        if (bestPattern && bestPattern.quality >= this.HYBRID_THRESHOLD) {
          return await this.hybridEnhance(prompt, bestPattern);
        }
        return {
          enhanced: prompt,
          // Return original for LLM to handle
          confidence: 0,
          source: "fallback",
          patterns: []
        };
      }
      /**
       * Enhance using only learned patterns
       */
      async localEnhance(prompt) {
        const patterns = await this.findApplicablePatterns(prompt);
        if (patterns.length === 0) {
          return {
            enhanced: prompt,
            confidence: 0,
            source: "fallback",
            patterns: []
          };
        }
        let enhanced = prompt;
        const appliedPatterns = [];
        for (const pattern of patterns) {
          const transformations = pattern.metadata?.transformations || [];
          for (const transformation of transformations) {
            if (transformation.type === "replacement") {
              enhanced = enhanced.replace(
                new RegExp(`\\b${transformation.from}\\b`, "gi"),
                transformation.to
              );
              appliedPatterns.push({
                id: pattern.id,
                transformation: `${transformation.from} \u2192 ${transformation.to}`,
                confidence: pattern.quality
              });
            } else if (transformation.type === "addition") {
              enhanced = this.applyAddition(enhanced, transformation.to, pattern);
              appliedPatterns.push({
                id: pattern.id,
                transformation: `+ ${transformation.to}`,
                confidence: pattern.quality
              });
            }
          }
        }
        enhanced = this.applyStructuralImprovements(enhanced, patterns);
        const avgConfidence = patterns.reduce((sum, p2) => sum + p2.quality, 0) / patterns.length;
        await this.logEnhancement(prompt, enhanced, "local", appliedPatterns);
        return {
          enhanced,
          confidence: avgConfidence,
          source: "learned",
          patterns: appliedPatterns
        };
      }
      /**
       * Hybrid enhancement combining patterns with LLM refinement
       */
      async hybridEnhance(prompt, bestPattern) {
        const localResult = await this.localEnhance(prompt);
        const template = bestPattern.enhancedPrompt;
        const enhanced = this.applyTemplate(localResult.enhanced, template);
        return {
          enhanced,
          confidence: (localResult.confidence + bestPattern.quality) / 2,
          source: "hybrid",
          patterns: localResult.patterns
        };
      }
      /**
       * Find patterns applicable to the given prompt
       */
      async findApplicablePatterns(prompt) {
        const promptWords = this.extractKeywords(prompt);
        const patterns = await db.select().from(trainingExamples2).where(gte(trainingExamples2.quality, this.MIN_CONFIDENCE_FOR_LOCAL)).orderBy(desc(trainingExamples2.quality)).limit(10);
        return patterns.filter((pattern) => {
          const patternKeywords = new Set(pattern.keywords?.split(", ") || []);
          const overlap = promptWords.filter((w) => patternKeywords.has(w)).length;
          return overlap >= Math.min(3, promptWords.length * 0.3);
        });
      }
      /**
       * Apply contextual additions to the prompt
       */
      applyAddition(text2, addition, pattern) {
        const category = pattern.category;
        switch (category) {
          case "website":
            if (addition.includes("responsive") || addition.includes("modern")) {
              return text2 + ` with ${addition}`;
            }
            break;
          case "writing":
            if (addition.includes("engaging") || addition.includes("clear")) {
              return text2.replace(/write/i, `write ${addition}`);
            }
            break;
          case "planning":
            if (addition.includes("detailed") || addition.includes("comprehensive")) {
              return text2.replace(/plan/i, `${addition} plan`);
            }
            break;
        }
        return `${text2} ${addition}`;
      }
      /**
       * Apply structural improvements based on patterns
       */
      applyStructuralImprovements(text2, patterns) {
        let improved = text2;
        if (!improved.includes("specific") && patterns.some((p2) => p2.category === "general")) {
          improved = improved.replace(/^(create|build|make|develop)/i, "$1 a specific");
        }
        if (!improved.includes("clear") && !improved.includes("objective")) {
          const hasActionVerb = /^(create|build|write|develop|design|implement)/i.test(improved);
          if (hasActionVerb) {
            improved += " with clear objectives and measurable outcomes";
          }
        }
        if (improved.split(" ").length < 10) {
          const category = patterns[0]?.category;
          const contextAdditions = {
            website: " including user experience considerations and responsive design",
            writing: " with engaging content and clear structure",
            planning: " with timeline, milestones, and success metrics",
            coding: " following best practices and clean code principles",
            analysis: " with data-driven insights and actionable recommendations"
          };
          if (category && contextAdditions[category]) {
            improved += contextAdditions[category];
          }
        }
        return improved;
      }
      /**
       * Apply a template pattern to text
       */
      applyTemplate(text2, template) {
        const templateStructure = this.extractStructure(template);
        const textStructure = this.extractStructure(text2);
        let enhanced = text2;
        for (const element of templateStructure) {
          if (!textStructure.includes(element)) {
            enhanced += ` ${element}`;
          }
        }
        return enhanced;
      }
      /**
       * Extract structural elements from text
       */
      extractStructure(text2) {
        const structures = [];
        const patterns = [
          /with\s+[\w\s]+(?:and|,)/gi,
          /including\s+[\w\s]+(?:and|,)/gi,
          /focusing on\s+[\w\s]+/gi,
          /that\s+[\w\s]+/gi
        ];
        for (const pattern of patterns) {
          const matches = text2.match(pattern);
          if (matches) {
            structures.push(...matches);
          }
        }
        return structures;
      }
      /**
       * Extract keywords from text
       */
      extractKeywords(text2) {
        const stopWords = /* @__PURE__ */ new Set([
          "the",
          "a",
          "an",
          "and",
          "or",
          "but",
          "in",
          "on",
          "at",
          "to",
          "for",
          "of",
          "with",
          "by",
          "from",
          "as",
          "is"
        ]);
        return text2.toLowerCase().split(/\s+/).filter((word) => word.length > 2 && !stopWords.has(word));
      }
      /**
       * Log enhancement for future learning
       */
      async logEnhancement(original, enhanced, source, patterns) {
        await db.insert(enhancementLogs2).values({
          originalPrompt: original,
          enhancedPrompt: enhanced,
          promptLength: original.length,
          hasContext: false,
          isRefinement: false,
          isExpansion: false,
          source,
          enhancementModel: "adaptive-local",
          responseTime: 50,
          // Local enhancement is fast
          context: JSON.stringify({ patterns }),
          createdAt: /* @__PURE__ */ new Date()
        });
      }
      /**
       * Get enhancement statistics
       */
      async getStats() {
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
        const enhancements = await db.select().from(enhancementLogs2).where(gte(enhancementLogs2.createdAt, oneWeekAgo));
        const localEnhancements = enhancements.filter((e) => e.source === "local");
        const topPatterns = await db.select().from(trainingExamples2).orderBy(desc(trainingExamples2.usageCount)).limit(5);
        return {
          totalEnhancements: enhancements.length,
          localEnhancements: localEnhancements.length,
          averageConfidence: topPatterns.reduce((sum, p2) => sum + (p2.quality || 0), 0) / topPatterns.length,
          topPatterns
        };
      }
    };
  }
});

// ../app/lib/learning/learning-scheduler.ts
var learning_scheduler_exports = {};
__export(learning_scheduler_exports, {
  LearningScheduler: () => LearningScheduler,
  getLearningScheduler: () => getLearningScheduler
});
function getLearningScheduler() {
  if (!schedulerInstance) {
    schedulerInstance = new LearningScheduler();
  }
  return schedulerInstance;
}
var LearningScheduler, schedulerInstance;
var init_learning_scheduler = __esm({
  "../app/lib/learning/learning-scheduler.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_learning_service();
    init_adaptive_enhancer();
    LearningScheduler = class {
      constructor() {
        this.isRunning = false;
        this.lastRunTime = null;
        this.intervalId = null;
        this.learningService = new LearningService();
        this.adaptiveEnhancer = new AdaptiveEnhancer();
      }
      static {
        __name(this, "LearningScheduler");
      }
      /**
       * Start the learning scheduler
       */
      start(intervalHours = 24) {
        if (this.isRunning) {
          console.log("Learning scheduler is already running");
          return;
        }
        this.isRunning = true;
        console.log(`Starting learning scheduler with ${intervalHours} hour interval`);
        this.runLearningCycle();
        this.intervalId = setInterval(
          () => this.runLearningCycle(),
          intervalHours * 60 * 60 * 1e3
        );
      }
      /**
       * Stop the learning scheduler
       */
      stop() {
        if (!this.isRunning) {
          console.log("Learning scheduler is not running");
          return;
        }
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = null;
        }
        this.isRunning = false;
        console.log("Learning scheduler stopped");
      }
      /**
       * Run a learning cycle
       */
      async runLearningCycle() {
        try {
          console.log("Starting scheduled learning cycle...");
          this.lastRunTime = /* @__PURE__ */ new Date();
          const metrics = await this.learningService.runLearningCycle();
          console.log("Learning cycle completed with metrics:", metrics);
          if (metrics.llmDependencyScore < 0.3 && metrics.accuracyScore > 0.85) {
            console.log("\u{1F389} System is achieving high independence from LLMs!");
            console.log(`LLM dependency: ${(metrics.llmDependencyScore * 100).toFixed(1)}%`);
            console.log(`Local accuracy: ${(metrics.accuracyScore * 100).toFixed(1)}%`);
          }
          if (metrics.newPatternsLearned > 10) {
            console.log("High learning rate detected, consider increasing frequency");
          } else if (metrics.newPatternsLearned === 0 && metrics.llmDependencyScore > 0.8) {
            console.log("Low learning rate, system still highly dependent on LLMs");
          }
        } catch (error) {
          console.error("Error in learning cycle:", error);
        }
      }
      /**
       * Get scheduler status
       */
      getStatus() {
        let nextRunTime = null;
        if (this.isRunning && this.lastRunTime && this.intervalId) {
          const intervalMs = 24 * 60 * 60 * 1e3;
          nextRunTime = new Date(this.lastRunTime.getTime() + intervalMs);
        }
        return {
          isRunning: this.isRunning,
          lastRunTime: this.lastRunTime,
          nextRunTime
        };
      }
      /**
       * Force a learning cycle (manual trigger)
       */
      async forceLearningCycle() {
        console.log("Manually triggering learning cycle...");
        return await this.learningService.runLearningCycle();
      }
      /**
       * Get learning statistics
       */
      async getLearningStats() {
        const enhancerStats = await this.adaptiveEnhancer.getStats();
        const metrics = await this.learningService.calculateMetrics(0);
        return {
          scheduler: this.getStatus(),
          enhancer: enhancerStats,
          metrics
        };
      }
    };
    schedulerInstance = null;
    __name(getLearningScheduler, "getLearningScheduler");
  }
});

// api/learning/status.ts
async function onRequestOptions7() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
async function onRequestGet6(context) {
  try {
    const { env } = context;
    if (env.DATABASE_URL) {
      if (!globalThis.process) {
        globalThis.process = { env: {} };
      }
      globalThis.process.env.DATABASE_URL = env.DATABASE_URL;
    }
    const { LearningScheduler: LearningScheduler2 } = await Promise.resolve().then(() => (init_learning_scheduler(), learning_scheduler_exports));
    const scheduler = new LearningScheduler2();
    const stats = await scheduler.getLearningStats();
    const responseBody = {
      success: true,
      stats,
      summary: {
        isActive: stats.scheduler.isRunning,
        llmIndependence: `${((1 - stats.metrics.llmDependencyScore) * 100).toFixed(1)}%`,
        localAccuracy: `${(stats.metrics.accuracyScore * 100).toFixed(1)}%`,
        totalPatterns: stats.metrics.totalPatterns,
        recentLocalEnhancements: stats.enhancer.localEnhancements
      }
    };
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "https://mstprmpt.zeidgeist.com"
      }
    });
  } catch (error) {
    console.error("Error getting learning status:", error);
    const errorResponse = {
      success: false,
      error: "Failed to get learning status"
      // Error details removed for security
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "https://mstprmpt.zeidgeist.com"
      }
    });
  }
}
var init_status = __esm({
  "api/learning/status.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    __name(onRequestOptions7, "onRequestOptions");
    __name(onRequestGet6, "onRequestGet");
  }
});

// api/learning/trigger.ts
async function onRequestOptions8() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
async function onRequestPost7(context) {
  try {
    const { request, env } = context;
    if (env.DATABASE_URL) {
      if (!globalThis.process) {
        globalThis.process = { env: {} };
      }
      globalThis.process.env.DATABASE_URL = env.DATABASE_URL;
    }
    const { LearningScheduler: LearningScheduler2 } = await Promise.resolve().then(() => (init_learning_scheduler(), learning_scheduler_exports));
    const scheduler = new LearningScheduler2();
    const body = await request.json().catch(() => ({}));
    const { force = false } = body;
    const metrics = await scheduler.forceLearningCycle();
    const responseBody = {
      success: true,
      message: "Learning cycle triggered successfully",
      metrics
    };
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "https://mstprmpt.zeidgeist.com"
      }
    });
  } catch (error) {
    console.error("Error triggering learning cycle:", error);
    const errorResponse = {
      success: false,
      error: "Failed to trigger learning cycle"
      // Error details removed for security
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "https://mstprmpt.zeidgeist.com"
      }
    });
  }
}
var init_trigger = __esm({
  "api/learning/trigger.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    __name(onRequestOptions8, "onRequestOptions");
    __name(onRequestPost7, "onRequestPost");
  }
});

// api/privacy/dsar.ts
async function onRequestOptions9() {
  return new Response(null, {
    status: 200,
    headers: {
      ...getSecurityHeaders(),
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}
async function onRequestPost8(context) {
  const { request, env } = context;
  monitorRequest(request, context);
  const corsHeaders = {
    ...getSecurityHeaders(),
    "Content-Type": "application/json",
    "Cache-Control": "no-store, no-cache, must-revalidate"
  };
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({
        error: "Authentication required for privacy requests"
      }), {
        status: 401,
        headers: corsHeaders
      });
    }
    const token = authHeader.substring(7);
    const authService = new CloudflareAuthService(env);
    const user = await authService.validateToken(token);
    if (!user) {
      return new Response(JSON.stringify({
        error: "Invalid or expired authentication token"
      }), {
        status: 401,
        headers: corsHeaders
      });
    }
    const body = await request.json();
    const { requestType, additionalInfo } = body;
    const validTypes = ["access", "deletion", "rectification", "portability", "restriction", "objection"];
    if (!validTypes.includes(requestType)) {
      return new Response(JSON.stringify({
        error: "Invalid request type",
        validTypes
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    const db2 = createDb(env);
    const existingRequest = await db2.select().from(dsarRequests).where(and(
      eq(dsarRequests.userId, user.id),
      eq(dsarRequests.requestType, requestType),
      eq(dsarRequests.status, "pending")
    )).limit(1);
    if (existingRequest.length > 0) {
      return new Response(JSON.stringify({
        error: "A pending request of this type already exists",
        existingRequestId: existingRequest[0].id
      }), {
        status: 409,
        headers: corsHeaders
      });
    }
    const requestId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3);
    const dsarRequest = {
      id: requestId,
      userId: user.id,
      requestType,
      status: "pending",
      submittedAt: /* @__PURE__ */ new Date(),
      expiresAt,
      requestData: additionalInfo ? JSON.stringify(additionalInfo) : null
    };
    await db2.insert(dsarRequests).values(dsarRequest);
    console.log(`DSAR request submitted: ${requestType} for user ${user.id}`);
    if (requestType === "access") {
      await processAccessRequestAsync(requestId, user.id, env);
    } else if (requestType === "deletion") {
      await processDeletionRequestAsync(requestId, user.id, env);
    }
    return new Response(JSON.stringify({
      success: true,
      requestId,
      requestType,
      status: "pending",
      estimatedCompletion: expiresAt.toISOString(),
      message: `Your ${requestType} request has been submitted and will be processed within 30 days as required by GDPR.`,
      nextSteps: {
        checkStatus: `/api/privacy/dsar/status/${requestId}`,
        expectedTimeframe: "1-30 days",
        notification: "You will receive an email when your request is completed"
      }
    }), {
      status: 202,
      // Accepted for processing
      headers: corsHeaders
    });
  } catch (error) {
    console.error("DSAR request error:", error);
    privacyMonitor.trackViolation(
      request.headers.get("cf-connecting-ip") || "unknown",
      "DSAR_SYSTEM_ERROR",
      { error: error instanceof Error ? error.message : "Unknown error" }
    );
    return new Response(JSON.stringify({
      error: "Failed to process privacy request. Please try again."
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
async function onRequestGet7(context) {
  const { request, env, params } = context;
  monitorRequest(request, context);
  const corsHeaders = {
    ...getSecurityHeaders(),
    "Content-Type": "application/json"
  };
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({
        error: "Authentication required"
      }), {
        status: 401,
        headers: corsHeaders
      });
    }
    const token = authHeader.substring(7);
    const authService = new CloudflareAuthService(env);
    const user = await authService.validateToken(token);
    if (!user) {
      return new Response(JSON.stringify({
        error: "Invalid or expired token"
      }), {
        status: 401,
        headers: corsHeaders
      });
    }
    const requestId = params?.requestId;
    if (!requestId) {
      return new Response(JSON.stringify({
        error: "Request ID is required"
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    const db2 = createDb(env);
    const [dsarRequest] = await db2.select().from(dsarRequests).where(and(
      eq(dsarRequests.id, requestId),
      eq(dsarRequests.userId, user.id)
    )).limit(1);
    if (!dsarRequest) {
      return new Response(JSON.stringify({
        error: "Request not found"
      }), {
        status: 404,
        headers: corsHeaders
      });
    }
    if (dsarRequest.status === "pending" && dsarRequest.expiresAt && /* @__PURE__ */ new Date() > dsarRequest.expiresAt) {
      await db2.update(dsarRequests).set({ status: "expired" }).where(eq(dsarRequests.id, requestId));
      dsarRequest.status = "expired";
    }
    const response = {
      requestId: dsarRequest.id,
      requestType: dsarRequest.requestType,
      status: dsarRequest.status,
      submittedAt: dsarRequest.createdAt.toISOString(),
      expiresAt: dsarRequest.expiresAt?.toISOString()
    };
    if (dsarRequest.processedAt) {
      response.completedAt = dsarRequest.processedAt.toISOString();
    }
    if (dsarRequest.status === "completed") {
      response.downloadUrl = `/api/privacy/dsar/download/${requestId}`;
    }
    if (dsarRequest.status === "denied" && dsarRequest.adminNotes) {
      response.denialReason = dsarRequest.adminNotes;
    }
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    console.error("DSAR status check error:", error);
    return new Response(JSON.stringify({
      error: "Failed to check request status"
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
async function onRequestDelete(context) {
  const { request, env } = context;
  return new Response(JSON.stringify({
    message: 'Please use POST /api/privacy/dsar/request with requestType: "deletion"'
  }), {
    status: 405,
    headers: {
      ...getSecurityHeaders(),
      "Content-Type": "application/json"
    }
  });
}
async function processAccessRequestAsync(requestId, userId, env) {
  try {
    const db2 = createDb(env);
    await db2.update(dsarRequests).set({ status: "processing" }).where(eq(dsarRequests.id, requestId));
    const exportData = await generatePersonalDataExport(userId, requestId, env);
    await db2.update(dsarRequests).set({
      status: "completed",
      processedAt: /* @__PURE__ */ new Date(),
      responseData: JSON.stringify(exportData)
    }).where(eq(dsarRequests.id, requestId));
    console.log(`DSAR access request completed: ${requestId}`);
  } catch (error) {
    console.error(`DSAR processing failed for ${requestId}:`, error);
    await createDb(env).update(dsarRequests).set({
      status: "denied",
      adminNotes: "Technical error during processing"
    }).where(eq(dsarRequests.id, requestId));
  }
}
async function processDeletionRequestAsync(requestId, userId, env) {
  try {
    const db2 = createDb(env);
    await db2.update(dsarRequests).set({ status: "processing" }).where(eq(dsarRequests.id, requestId));
    await db2.transaction(async (tx) => {
      await tx.delete(promptHistory).where(eq(promptHistory.userId, userId));
      await tx.delete(feedback).where(eq(feedback.userId, userId));
      await tx.delete(userSessions).where(eq(userSessions.userId, userId));
      await tx.delete(dsarRequests).where(eq(dsarRequests.userId, userId));
      await tx.update(users).set({
        email: `deleted-${userId}@deleted.local`,
        username: `deleted-${userId}`,
        isActive: false
      }).where(eq(users.id, userId));
    });
    console.log(`DSAR deletion request completed: ${requestId}`);
  } catch (error) {
    console.error(`DSAR deletion failed for ${requestId}:`, error);
    await createDb(env).update(dsarRequests).set({
      status: "denied",
      adminNotes: "Technical error during deletion"
    }).where(eq(dsarRequests.id, requestId));
  }
}
async function generatePersonalDataExport(userId, requestId, env) {
  const db2 = createDb(env);
  const [user] = await db2.select().from(users).where(eq(users.id, userId)).limit(1);
  const userPromptHistory = await db2.select().from(promptHistory).where(eq(promptHistory.userId, userId)).orderBy(desc(promptHistory.timestamp));
  const userFeedback = await db2.select().from(feedback).where(eq(feedback.userId, userId)).orderBy(desc(feedback.createdAt));
  const sessions = await db2.select().from(userSessions).where(eq(userSessions.userId, userId)).orderBy(desc(userSessions.createdAt)).limit(10);
  const consents = [];
  return {
    requestId,
    exportDate: /* @__PURE__ */ new Date(),
    dataSubject: {
      userId: user.id,
      email: user.email,
      verificationStatus: user.emailVerified ?? false
    },
    personalData: {
      profile: {
        id: user.id,
        email: user.email,
        username: user.username,
        emailVerified: user.emailVerified,
        mfaEnabled: user.mfaEnabled,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      },
      promptHistory: userPromptHistory.map((item) => ({
        original: item.original,
        refined: item.refined,
        context: item.context,
        timestamp: item.timestamp,
        metadata: item.metadata ? JSON.parse(item.metadata) : null
      })),
      feedback: userFeedback,
      sessions: sessions.map((session) => ({
        createdAt: session.createdAt,
        lastAccessed: session.lastAccessed,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent
      })),
      consents
    },
    metadata: {
      lawfulBasis: "GDPR Article 6(1)(a) - Consent",
      dataRetentionPeriod: "24 months",
      processingPurposes: [
        "Service delivery",
        "User experience personalization",
        "Service improvement",
        "Security and fraud prevention"
      ],
      dataCategories: [
        "Identity data",
        "Contact data",
        "Usage data",
        "Technical data"
      ]
    },
    rights: {
      rectification: "You can update your profile information in your account settings",
      erasure: "You can request deletion of your data through this privacy portal",
      restriction: "You can request restriction of processing by contacting privacy@zeidgeist.com",
      portability: "This export provides your data in a machine-readable format",
      objection: "You can object to processing by contacting privacy@zeidgeist.com"
    }
  };
}
var init_dsar = __esm({
  "api/privacy/dsar.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_db2();
    init_auth_service_workers();
    init_privacy_guard();
    init_privacy_monitor();
    init_drizzle_orm();
    __name(onRequestOptions9, "onRequestOptions");
    __name(onRequestPost8, "onRequestPost");
    __name(onRequestGet7, "onRequestGet");
    __name(onRequestDelete, "onRequestDelete");
    __name(processAccessRequestAsync, "processAccessRequestAsync");
    __name(processDeletionRequestAsync, "processDeletionRequestAsync");
    __name(generatePersonalDataExport, "generatePersonalDataExport");
  }
});

// _shared/llm-enhancer.ts
function isAlreadyRefined(prompt) {
  if (prompt.length < 100) {
    return false;
  }
  const hasNumberedList = /\d+\.\s/.test(prompt);
  const hasBulletPoints = /[•\-\*]\s/.test(prompt);
  const hasColonSeparation = prompt.includes(":") && prompt.includes(",");
  const hasMultipleSentences = (prompt.match(/\.\s/g) || []).length >= 3;
  const specificityKeywords = [
    "include",
    "ensure",
    "incorporate",
    "consider",
    "address",
    "provide",
    "comprehensive",
    "detailed",
    "specific",
    "professional",
    "clear",
    "sections",
    "requirements",
    "guidelines",
    "specifications",
    "criteria"
  ];
  const specificityScore = specificityKeywords.reduce((score, keyword) => {
    return score + (prompt.toLowerCase().includes(keyword) ? 1 : 0);
  }, 0);
  const hasInstructionalLanguage = /\b(should|must|need to|required|essential)\b/i.test(prompt);
  const hasActionableItems = /\b(create|design|develop|implement|establish|organize)\b/i.test(prompt);
  const hasContextSetup = prompt.toLowerCase().includes("context") || prompt.toLowerCase().includes("background") || prompt.toLowerCase().includes("considering");
  let refinementScore = 0;
  if (hasNumberedList) refinementScore += 3;
  if (hasBulletPoints) refinementScore += 2;
  if (hasColonSeparation) refinementScore += 2;
  if (hasMultipleSentences) refinementScore += 2;
  refinementScore += Math.min(specificityScore, 4);
  if (hasInstructionalLanguage) refinementScore += 2;
  if (hasActionableItems) refinementScore += 1;
  if (hasContextSetup) refinementScore += 1;
  if (prompt.length > 300) refinementScore += 2;
  if (prompt.length > 500) refinementScore += 1;
  const isRefined = refinementScore >= 8;
  return isRefined;
}
function minimalEnhance(prompt, context) {
  let enhanced = prompt;
  enhanced = enhanced.replace(/\s+/g, " ").trim();
  enhanced = enhanced.replace(/\.\s*,/g, ".");
  enhanced = enhanced.replace(/,,/g, ",");
  enhanced = enhanced.replace(/\.\./g, ".");
  if (!enhanced.endsWith(".") && !enhanced.endsWith("!") && !enhanced.endsWith("?")) {
    enhanced += ".";
  }
  if (context && !prompt.toLowerCase().includes(context.toLowerCase())) {
    if (context.length < prompt.length / 2) {
      const insertPoint = enhanced.indexOf(", ") + 2;
      if (insertPoint > 2) {
        enhanced = enhanced.slice(0, insertPoint) + "considering " + context + ", " + enhanced.slice(insertPoint);
      }
    }
  }
  return enhanced;
}
function enhanceByDomain(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  let subject = prompt;
  if (prompt.includes(" for ")) {
    subject = prompt.split(" for ")[1].trim();
  } else if (prompt.includes("website")) {
    subject = prompt.replace("website", "").trim();
  }
  if (lowerPrompt.includes("website") || lowerPrompt.includes("webpage") || lowerPrompt.includes("site")) {
    if (lowerPrompt.includes("professor") || lowerPrompt.includes("academic") || lowerPrompt.includes("university") || lowerPrompt.includes("faculty") || lowerPrompt.includes("lecturer") || lowerPrompt.includes("researcher")) {
      let academicHealthcareContent = "";
      if (lowerPrompt.includes("doctor") || lowerPrompt.includes("dentist") || lowerPrompt.includes("orthodontist") || lowerPrompt.includes("medical")) {
        academicHealthcareContent = "\n9. Patient care services and clinic information\n10. Integration between clinical practice and academic research";
      }
      return `Design a professional website for ${subject}. Include sections for:
1. Academic biography and research interests
2. Publications and scholarly works with downloadable papers
3. Courses taught and teaching philosophy
4. Research projects and laboratory information
5. Student resources and mentorship opportunities
6. CV/resume with academic appointments and honors
7. Conference presentations and upcoming speaking engagements
8. Contact information and office hours${academicHealthcareContent}`;
    }
    if (lowerPrompt.includes("doctor") || lowerPrompt.includes("physician") || lowerPrompt.includes("dentist") || lowerPrompt.includes("orthodontist") || lowerPrompt.includes("clinic") || lowerPrompt.includes("medical") || lowerPrompt.includes("healthcare")) {
      return `Design a professional website for ${subject}. Include sections for:
1. Services and treatments offered with detailed descriptions
2. Professional credentials, education, and certifications
3. Patient testimonials and success stories
4. Before-and-after galleries (where appropriate)
5. Insurance information and payment options
6. Easy-to-use appointment scheduling system
7. Resource library for patient education
8. Contact information and office location/hours`;
    }
    if (lowerPrompt.includes("restaurant") || lowerPrompt.includes("cafe") || lowerPrompt.includes("bakery")) {
      return `Design an appealing website for ${subject}. Include sections for menu, location information, opening hours, photo gallery of food and ambiance, customer reviews, and an online reservation system.`;
    }
    return `Design a professional website for ${subject}. Include sections for services, about us information, contact details, testimonials/reviews, and a clean modern design that reflects the brand identity.`;
  }
  if (lowerPrompt.includes("write") || lowerPrompt.includes("essay") || lowerPrompt.includes("article")) {
    return `${prompt} with a clear structure including introduction, main points with supporting evidence, and a strong conclusion. Ensure the content is well-researched, engaging, and tailored to the target audience.`;
  }
  return "";
}
function enhanceLocally(prompt, context, options = { env: {} }) {
  const startTime = Date.now();
  if (!options.isRefinement && isAlreadyRefined(prompt)) {
    console.log("Prompt appears already refined, applying minimal enhancement");
    const enhanced2 = minimalEnhance(prompt, context);
    return {
      enhancedPrompt: enhanced2,
      source: "local",
      metadata: {
        processingTime: Date.now() - startTime,
        enhancementType: "minimal",
        alreadyRefined: true
      }
    };
  }
  const domainEnhanced = enhanceByDomain(prompt);
  if (domainEnhanced) {
    let enhanced2 = domainEnhanced;
    if (context && context.trim()) {
      enhanced2 = `Context: ${context}

Prompt: ${enhanced2}`;
    }
    return {
      enhancedPrompt: enhanced2,
      source: "local",
      metadata: {
        processingTime: Date.now() - startTime,
        enhancementType: "domain-specific"
      }
    };
  }
  let enhanced = prompt;
  if (!enhanced.endsWith(".") && !enhanced.endsWith("?") && !enhanced.endsWith("!")) {
    enhanced += ".";
  }
  if (options.isExpansion) {
    enhanced = `${enhanced} Please provide detailed analysis and comprehensive coverage of this topic.`;
  }
  if (context && context.trim()) {
    enhanced = `Context: ${context}

Prompt: ${enhanced}`;
  }
  return {
    enhancedPrompt: enhanced,
    source: "local",
    metadata: {
      processingTime: Date.now() - startTime,
      enhancementType: "generic"
    }
  };
}
function buildPromptEnhancementMessages(prompt, context, isRefinement = false) {
  const systemPrompt = isRefinement ? `<prompt_enhancement_system version="3.0">
  <role expertise="maximum">Elite Prompt Refinement Specialist</role>
  
  <prime_directive>
    OUTPUT_MODE: REFINED_TEXT_ONLY
    META_TEXT: FORBIDDEN
    EXPLANATIONS: FORBIDDEN
    FORMAT: DIRECT_PROMPT_OUTPUT
  </prime_directive>
  
  <absolute_constraint>
    OUTPUT = refined_prompt_text_only
    NO_PHRASES = ["Here's", "Here is", "Here's an", "Here is an", "This is", "The enhanced", "The refined", "Below", "I've improved", "I have", "version of your prompt", "enhanced prompt", "refined version"]
    DIRECT_OUTPUT = true
  </absolute_constraint>
  
  <refinement_strategy>
    <analyze>Identify gaps in current prompt</analyze>
    <enhance>Add missing edge cases and specifications</enhance>
    <optimize>Remove redundancy while preserving clarity</optimize>
    <structure>Improve logical flow and hierarchy</structure>
    <validate>Ensure all ambiguity eliminated</validate>
  </refinement_strategy>
  
  <enhancement_checklist>
    \u25A1 Has clear success criteria?
    \u25A1 Includes failure handling?
    \u25A1 Specifies exact format?
    \u25A1 Contains examples?
    \u25A1 Defines constraints?
    \u25A1 Sets quality bar?
    \u25A1 Actionable steps?
  </enhancement_checklist>
  
  <output_validator>
    if response.contains(["Here's", "This is", "The enhanced", "Below"]):
      REJECT_AND_RETRY
    else:
      RETURN enhanced_text_only
  </output_validator>
</prompt_enhancement_system>` : `<prompt_enhancement_system version="3.0">
  <role expertise="maximum">Elite Prompt Engineering Specialist</role>
  
  <prime_directive>
    OUTPUT_MODE: ENHANCED_TEXT_ONLY
    META_TEXT: FORBIDDEN
    EXPLANATIONS: FORBIDDEN
    FORMAT: DIRECT_PROMPT_OUTPUT
  </prime_directive>
  
  <critical_rules>
    <rule priority="ABSOLUTE">Output ONLY the enhanced prompt text</rule>
    <rule priority="ABSOLUTE">No meta-text, introductions, or explanations</rule>
    <rule priority="ABSOLUTE">Response = enhanced_prompt_only</rule>
    <rule priority="ABSOLUTE">Never use phrases like "Here's", "This is", "Below", etc.</rule>
  </critical_rules>
  
  <enhancement_pipeline>
    <stage_1>Intent extraction with semantic analysis</stage_1>
    <stage_2>Gap identification using completeness matrix</stage_2>
    <stage_3>Structure optimization with hierarchy design</stage_3>
    <stage_4>Specificity injection with examples where needed</stage_4>
    <stage_5>Token optimization without clarity loss</stage_5>
    <stage_6>Output validation against rules</stage_6>
  </enhancement_pipeline>
  
  <quality_gates>
    <gate_1>Specificity \u2265 90%</gate_1>
    <gate_2>Ambiguity = 0</gate_2>
    <gate_3>Actionability = 100%</gate_3>
  </quality_gates>
  
  <output_validator>
    <regex_check pattern="^(?!.*Here's|.*Here is|.*This is|.*Below).*$"/>
    <format_check type="direct_text_only"/>
    <quality_check minimum_score="85"/>
  </output_validator>
</prompt_enhancement_system>`;
  const messages = [
    { role: "system", content: systemPrompt }
  ];
  let userMessage = prompt;
  if (context && context.trim()) {
    userMessage = `<input_data>
<context>${context}</context>
<prompt_to_enhance>${prompt}</prompt_to_enhance>
</input_data>`;
  } else {
    userMessage = `<prompt_to_enhance>${prompt}</prompt_to_enhance>`;
  }
  messages.push({ role: "user", content: userMessage });
  return messages;
}
function cleanEnhancedPrompt(text2) {
  const introPatterns = [
    // Exact pattern from screenshot
    /^Here's an enhanced,.*?version of your prompt:?\s*/i,
    /^Here is an enhanced,.*?version of your prompt:?\s*/i,
    // Enhanced prompt specific patterns (user requested)
    /^Here's the enhanced prompt:?\s*/i,
    /^Here is the enhanced prompt:?\s*/i,
    /^The enhanced prompt is:?\s*/i,
    /^Your enhanced prompt:?\s*/i,
    /^Below is the enhanced prompt:?\s*/i,
    /^This enhanced prompt:?\s*/i,
    // Comprehensive patterns for any descriptive intro
    /^Here's an? (?:enhanced|refined|improved|better|more specific|detailed).*?(?:prompt|version):?\s*/i,
    /^Here is an? (?:enhanced|refined|improved|better|more specific|detailed).*?(?:prompt|version):?\s*/i,
    /^Here's the (?:enhanced|refined|improved).*?(?:prompt|version):?\s*/i,
    /^Here is the (?:enhanced|refined|improved).*?(?:prompt|version):?\s*/i,
    // Original patterns
    /^Here's the (?:enhanced|refined|improved) (?:prompt|version):?\s*/i,
    /^Here is the (?:enhanced|refined|improved) (?:prompt|version):?\s*/i,
    /^This is the (?:enhanced|refined|improved) (?:prompt|version):?\s*/i,
    /^The (?:enhanced|refined|improved) (?:prompt|version) is:?\s*/i,
    /^I've (?:enhanced|refined|improved) (?:the|your) prompt:?\s*/i,
    /^I have (?:enhanced|refined|improved) (?:the|your) prompt:?\s*/i,
    /^Below is the (?:enhanced|refined|improved) (?:prompt|version):?\s*/i,
    /^Your (?:enhanced|refined|improved) prompt:?\s*/i,
    /^Enhanced prompt:?\s*/i,
    /^Refined prompt:?\s*/i,
    /^Improved prompt:?\s*/i,
    /^\*\*Enhanced Prompt\*\*:?\s*/i,
    /^\*\*Refined Prompt\*\*:?\s*/i
  ];
  let cleaned = text2.trim();
  for (const pattern of introPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }
  if (cleaned.startsWith('"') && cleaned.endsWith('"') || cleaned.startsWith("'") && cleaned.endsWith("'")) {
    cleaned = cleaned.slice(1, -1);
  }
  if (cleaned.startsWith("```") && cleaned.endsWith("```")) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/, "").replace(/\n?```$/, "");
  }
  const outroPatterns = [
    /\n+(?:This|The above) (?:enhanced|refined|improved) prompt.*$/i,
    /\n+I hope this (?:enhanced|refined|improved) version.*$/i,
    /\n+Feel free to (?:use|modify|adjust).*$/i,
    /\n+Let me know if you.*$/i
  ];
  for (const pattern of outroPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }
  return cleaned.trim();
}
async function enhanceWithMistral(prompt, context, isRefinement = false, env = {}) {
  const apiKey = env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error("Mistral API key not configured");
  }
  const messages = buildPromptEnhancementMessages(prompt, context, isRefinement);
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "mistral-large-latest",
      messages,
      temperature: 0.2,
      max_tokens: 4096
    })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Mistral API error: ${JSON.stringify(error)}`);
  }
  const data = await response.json();
  return {
    enhancedPrompt: cleanEnhancedPrompt(data.choices[0].message.content),
    source: "mistral",
    metadata: { model: "mistral-large-latest", usage: data.usage }
  };
}
async function enhanceWithClaude(prompt, context, isRefinement = false, env = {}) {
  const apiKey = env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error("Claude API key not configured");
  }
  const systemPrompt = isRefinement ? `<prompt_enhancement_system version="3.0">
  <role expertise="maximum">Elite Prompt Refinement Specialist</role>
  
  <prime_directive>
    OUTPUT_MODE: REFINED_TEXT_ONLY
    META_TEXT: FORBIDDEN
    EXPLANATIONS: FORBIDDEN
    FORMAT: DIRECT_PROMPT_OUTPUT
  </prime_directive>
  
  <absolute_constraint>
    OUTPUT = refined_prompt_text_only
    NO_PHRASES = ["Here's", "Here is", "Here's an", "Here is an", "This is", "The enhanced", "The refined", "Below", "I've improved", "I have", "version of your prompt", "enhanced prompt", "refined version"]
    DIRECT_OUTPUT = true
  </absolute_constraint>
  
  <refinement_strategy>
    <analyze>Identify gaps in current prompt</analyze>
    <enhance>Add missing edge cases and specifications</enhance>
    <optimize>Remove redundancy while preserving clarity</optimize>
    <structure>Improve logical flow and hierarchy</structure>
    <validate>Ensure all ambiguity eliminated</validate>
  </refinement_strategy>
  
  <output_validator>
    if response.contains(["Here's", "This is", "The enhanced", "Below"]):
      REJECT_AND_RETRY
    else:
      RETURN enhanced_text_only
  </output_validator>
</prompt_enhancement_system>` : `<prompt_enhancement_system version="3.0">
  <role expertise="maximum">Elite Prompt Engineering Specialist</role>
  
  <prime_directive>
    OUTPUT_MODE: ENHANCED_TEXT_ONLY
    META_TEXT: FORBIDDEN
    EXPLANATIONS: FORBIDDEN
    FORMAT: DIRECT_PROMPT_OUTPUT
  </prime_directive>
  
  <critical_rules>
    <rule priority="ABSOLUTE">Output ONLY the enhanced prompt text</rule>
    <rule priority="ABSOLUTE">No meta-text, introductions, or explanations</rule>
    <rule priority="ABSOLUTE">Response = enhanced_prompt_only</rule>
    <rule priority="ABSOLUTE">Never use phrases like "Here's", "This is", "Below", etc.</rule>
  </critical_rules>
  
  <enhancement_pipeline>
    <stage_1>Intent extraction with semantic analysis</stage_1>
    <stage_2>Gap identification using completeness matrix</stage_2>
    <stage_3>Structure optimization with hierarchy design</stage_3>
    <stage_4>Specificity injection with examples where needed</stage_4>
    <stage_5>Token optimization without clarity loss</stage_5>
    <stage_6>Output validation against rules</stage_6>
  </enhancement_pipeline>
  
  <quality_gates>
    <gate_1>Specificity \u2265 90%</gate_1>
    <gate_2>Ambiguity = 0</gate_2>
    <gate_3>Actionability = 100%</gate_3>
  </quality_gates>
  
  <output_validator>
    <regex_check pattern="^(?!.*Here's|.*Here is|.*This is|.*Below).*$"/>
    <format_check type="direct_text_only"/>
    <quality_check minimum_score="85"/>
  </output_validator>
</prompt_enhancement_system>`;
  let userMessage = prompt;
  if (context && context.trim()) {
    userMessage = `<input_data>
<context>${context}</context>
<prompt_to_enhance>${prompt}</prompt_to_enhance>
</input_data>`;
  } else {
    userMessage = `<prompt_to_enhance>${prompt}</prompt_to_enhance>`;
  }
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 4096,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }]
    })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Claude API error: ${JSON.stringify(error)}`);
  }
  const data = await response.json();
  return {
    enhancedPrompt: cleanEnhancedPrompt(data.content[0].text),
    source: "claude",
    metadata: { model: "claude-3-haiku", usage: data.usage }
  };
}
async function enhanceWithOpenAI(prompt, context, isRefinement = false, env = {}) {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }
  const messages = buildPromptEnhancementMessages(prompt, context, isRefinement);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.2,
      max_tokens: 4096
    })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
  }
  const data = await response.json();
  return {
    enhancedPrompt: cleanEnhancedPrompt(data.choices[0].message.content),
    source: "openai",
    metadata: { model: "gpt-4o-mini", usage: data.usage }
  };
}
async function enhanceWithMoonshot(prompt, context, isRefinement = false, env = {}) {
  const apiKey = env.MOONSHOT_API_KEY;
  if (!apiKey) {
    throw new Error("Moonshot API key not configured");
  }
  const messages = buildPromptEnhancementMessages(prompt, context, isRefinement);
  const response = await fetch("https://api.moonshot.cn/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "moonshot-v1-8k",
      messages,
      temperature: 0.2,
      max_tokens: 4096
    })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Moonshot API error: ${JSON.stringify(error)}`);
  }
  const data = await response.json();
  return {
    enhancedPrompt: cleanEnhancedPrompt(data.choices[0].message.content),
    source: "moonshot",
    metadata: { model: "moonshot-v1-8k", usage: data.usage }
  };
}
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
async function enhancePrompt(prompt, context, options = {}) {
  const { isRefinement = false, env = {} } = options;
  const availableProviders = [];
  console.log("\u{1F50D} Checking API keys...");
  console.log("Available env keys:", Object.keys(env));
  console.log("Claude key:", !!env.CLAUDE_API_KEY);
  console.log("OpenAI key:", !!env.OPENAI_API_KEY);
  console.log("DeepSeek key:", !!env.DEEPSEEK_API_KEY, "(DISABLED - too much intro/outro text)");
  console.log("Mistral key:", !!env.MISTRAL_API_KEY);
  console.log("Moonshot key:", !!env.MOONSHOT_API_KEY);
  if (env.CLAUDE_API_KEY) {
    availableProviders.push({ name: "claude", fn: /* @__PURE__ */ __name((p2, c, r) => enhanceWithClaude(p2, c, r, env), "fn") });
  }
  if (env.OPENAI_API_KEY) {
    availableProviders.push({ name: "openai", fn: /* @__PURE__ */ __name((p2, c, r) => enhanceWithOpenAI(p2, c, r, env), "fn") });
  }
  if (env.MISTRAL_API_KEY) {
    availableProviders.push({ name: "mistral", fn: /* @__PURE__ */ __name((p2, c, r) => enhanceWithMistral(p2, c, r, env), "fn") });
  }
  if (env.MOONSHOT_API_KEY) {
    availableProviders.push({ name: "moonshot", fn: /* @__PURE__ */ __name((p2, c, r) => enhanceWithMoonshot(p2, c, r, env), "fn") });
  }
  if (availableProviders.length === 0) {
    console.log("No API keys configured, using local enhancement");
    return {
      enhancedPrompt: prompt + ". (No API keys found - using local enhancement)",
      source: "local",
      metadata: {
        debugInfo: "No API keys configured",
        availableEnvKeys: Object.keys(env),
        keysChecked: {
          claude: !!env.CLAUDE_API_KEY,
          openai: !!env.OPENAI_API_KEY,
          deepseek: `${!!env.DEEPSEEK_API_KEY} (DISABLED)`,
          mistral: !!env.MISTRAL_API_KEY,
          moonshot: !!env.MOONSHOT_API_KEY
        }
      }
    };
  }
  const shuffledProviders = shuffleArray(availableProviders);
  console.log(`Available providers: ${shuffledProviders.map((p2) => p2.name).join(", ")}`);
  for (const provider of shuffledProviders) {
    try {
      console.log(`\u{1F680} Trying enhancement with ${provider.name}...`);
      const result = await provider.fn(prompt, context, isRefinement);
      console.log(`\u2705 Successfully enhanced with ${provider.name}`);
      return result;
    } catch (error) {
      console.error(`\u274C ${provider.name} enhancement failed:`, {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : void 0,
        name: error instanceof Error ? error.name : "Unknown"
      });
      continue;
    }
  }
  console.log("\u{1F504} All external providers failed, using local enhancement");
  return enhanceLocally(prompt, context, { ...options, env: options.env || {} });
}
var init_llm_enhancer = __esm({
  "_shared/llm-enhancer.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    __name(isAlreadyRefined, "isAlreadyRefined");
    __name(minimalEnhance, "minimalEnhance");
    __name(enhanceByDomain, "enhanceByDomain");
    __name(enhanceLocally, "enhanceLocally");
    __name(buildPromptEnhancementMessages, "buildPromptEnhancementMessages");
    __name(cleanEnhancedPrompt, "cleanEnhancedPrompt");
    __name(enhanceWithMistral, "enhanceWithMistral");
    __name(enhanceWithClaude, "enhanceWithClaude");
    __name(enhanceWithOpenAI, "enhanceWithOpenAI");
    __name(enhanceWithMoonshot, "enhanceWithMoonshot");
    __name(shuffleArray, "shuffleArray");
    __name(enhancePrompt, "enhancePrompt");
  }
});

// _shared/auth.ts
function authenticateRequest(request, env) {
  if (env.NODE_ENV === "development") {
    return { success: true, userId: "dev-user" };
  }
  const url = new URL(request.url);
  const isPublicEndpoint = url.pathname === "/api/engineer" || url.pathname.includes("/api/engineer") && !url.pathname.includes("/history") && !url.pathname.includes("/feedback") && !url.pathname.includes("/admin") && !url.pathname.includes("/learning");
  if (isPublicEndpoint) {
    return { success: true, userId: "anonymous" };
  }
  const apiKey = request.headers.get("x-api-key") || request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!apiKey) {
    return { success: false, error: "API key required for this endpoint. Please include x-api-key header." };
  }
  const validApiKeys = env.VALID_API_KEYS?.split(",") || [];
  if (validApiKeys.length === 0) {
    return { success: false, error: "Server configuration error: API authentication not properly configured" };
  }
  if (!validApiKeys.includes(apiKey)) {
    return { success: false, error: "Invalid API key" };
  }
  return { success: true, userId: `user-${apiKey.slice(-8)}` };
}
function checkRateLimit(request, endpoint) {
  const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || request.headers.get("cf-connecting-ip") || "unknown";
  const rateLimitKey = `${clientIP}:${endpoint}`;
  const config = RATE_LIMITS[endpoint] || { windowMs: 6e4, maxRequests: 30 };
  const now = Date.now();
  let entry = rateLimitStore.get(rateLimitKey);
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + config.windowMs };
    rateLimitStore.set(rateLimitKey, entry);
  }
  if (entry.count >= config.maxRequests) {
    const resetIn = Math.ceil((entry.resetTime - now) / 1e3);
    return {
      success: false,
      error: `Rate limit exceeded. Try again in ${resetIn} seconds.`
    };
  }
  entry.count++;
  return { success: true };
}
function validateRequest(request, env, endpoint) {
  const rateLimitResult = checkRateLimit(request, endpoint);
  if (!rateLimitResult.success) {
    return rateLimitResult;
  }
  const authResult = authenticateRequest(request, env);
  if (!authResult.success) {
    return authResult;
  }
  return { success: true, userId: authResult.userId };
}
function createAuthErrorResponse(error, corsHeaders) {
  return new Response(JSON.stringify({
    error: "Authentication failed",
    message: error,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }), {
    status: 401,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
var RATE_LIMITS, rateLimitStore;
var init_auth = __esm({
  "_shared/auth.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    RATE_LIMITS = {
      "/api/engineer": { windowMs: 6e4, maxRequests: 10 },
      // 10 requests per minute
      "/api/engineer/feedback": { windowMs: 6e4, maxRequests: 5 },
      // 5 feedback per minute
      "/api/engineer/history": { windowMs: 6e4, maxRequests: 20 },
      // 20 history requests per minute
      "/api/learning/status": { windowMs: 6e4, maxRequests: 5 },
      // 5 status checks per minute
      "/api/learning/trigger": { windowMs: 3e5, maxRequests: 1 }
      // 1 trigger per 5 minutes
    };
    rateLimitStore = /* @__PURE__ */ new Map();
    __name(authenticateRequest, "authenticateRequest");
    __name(checkRateLimit, "checkRateLimit");
    __name(validateRequest, "validateRequest");
    __name(createAuthErrorResponse, "createAuthErrorResponse");
  }
});

// api/engineer.ts
async function onRequestOptions10() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "https://mstprmpt.zeidgeist.com",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization"
    }
  });
}
async function onRequestPost9(context) {
  const { request, env } = context;
  const startTime = Date.now();
  const corsHeaders = {
    "Access-Control-Allow-Origin": "https://mstprmpt.zeidgeist.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization",
    "Content-Type": "application/json",
    "Content-Encoding": "gzip",
    // Enable compression
    "Cache-Control": "no-cache, no-store, must-revalidate",
    // Prevent caching of sensitive data
    "X-Content-Type-Options": "nosniff",
    "X-Response-Time": `${Date.now() - startTime}ms`
    // Add response time header
  };
  const authResult = validateRequest(request, env, "/api/engineer");
  if (!authResult.success) {
    return createAuthErrorResponse(authResult.error, corsHeaders);
  }
  try {
    console.log("Function started, parsing JSON...");
    const body = await request.json();
    console.log("JSON parsed successfully");
    const { prompt, context: context2, isRefinement, isExpansion, repeatCount } = body;
    console.log("Request data extracted:", { hasPrompt: !!prompt });
    if (!prompt || typeof prompt !== "string") {
      console.log("Invalid prompt provided");
      return new Response(JSON.stringify({
        error: "Please provide a valid prompt to enhance."
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      console.log("Empty prompt provided");
      return new Response(JSON.stringify({
        error: "Prompt cannot be empty. Please enter some text to enhance."
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    console.log("About to enhance prompt...");
    try {
      console.log("\u{1F527} Calling enhancePrompt function...");
      const enhancementResponse = await enhancePrompt(
        trimmedPrompt,
        context2 || "",
        { isRefinement: !!isRefinement, isExpansion: !!isExpansion, repeatCount, env }
      );
      console.log("\u{1F389} enhancePrompt returned:", enhancementResponse?.source);
      const processingTime = Date.now() - startTime;
      console.log("Enhancement completed successfully");
      try {
        const db2 = getOptimizedDb(env);
        const enhancementLog = {
          promptLength: trimmedPrompt.length,
          hasContext: !!(context2 && context2.trim()),
          isRefinement: !!isRefinement,
          isExpansion: !!isExpansion,
          repeatCount: repeatCount || 0,
          source: enhancementResponse.source,
          processingTime,
          wasIdentical: trimmedPrompt === enhancementResponse.enhancedPrompt,
          hadError: false
        };
        await executeWithRetry(async () => {
          return db2.insert(enhancementLogs).values(enhancementLog);
        });
      } catch (logError) {
        console.error("Failed to log enhancement:", logError);
      }
      return new Response(JSON.stringify({
        result: enhancementResponse.enhancedPrompt,
        metadata: {
          source: enhancementResponse.source,
          processingTime,
          originalLength: trimmedPrompt.length,
          enhancedLength: enhancementResponse.enhancedPrompt.length
          // Debug information removed for security
        }
      }), {
        headers: corsHeaders
      });
    } catch (enhancementError) {
      console.error("\u274C Error enhancing prompt:", {
        message: enhancementError instanceof Error ? enhancementError.message : String(enhancementError),
        name: enhancementError instanceof Error ? enhancementError.name : "Unknown"
      });
      const processingTime = Date.now() - startTime;
      let fallbackEnhanced = trimmedPrompt;
      if (!fallbackEnhanced.endsWith(".") && !fallbackEnhanced.endsWith("?") && !fallbackEnhanced.endsWith("!")) {
        fallbackEnhanced += ".";
      }
      if (context2 && context2.trim()) {
        fallbackEnhanced = `Context: ${context2}

Prompt: ${fallbackEnhanced}`;
      }
      return new Response(JSON.stringify({
        result: fallbackEnhanced,
        metadata: {
          source: "fallback-error",
          processingTime,
          hadError: true
        }
      }), {
        headers: corsHeaders
      });
    }
  } catch (error) {
    console.error("Critical error processing request:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : "Unknown"
    });
    const processingTime = Date.now() - startTime;
    return new Response(JSON.stringify({
      result: "I'm having trouble processing your request right now. Please try rephrasing your prompt or try again in a moment.",
      metadata: {
        source: "error-handler",
        processingTime,
        hadCriticalError: true
      }
    }), {
      status: 200,
      // Use 200 to avoid showing error UI
      headers: corsHeaders
    });
  }
}
var init_engineer = __esm({
  "api/engineer.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_db2();
    init_db_pool();
    init_llm_enhancer();
    init_auth();
    __name(onRequestOptions10, "onRequestOptions");
    __name(onRequestPost9, "onRequestPost");
  }
});

// api/health/index.ts
async function onRequestGet8(context) {
  try {
    const url = new URL(context.request.url);
    const endpoint = url.pathname.split("/").pop();
    const env = context.env;
    switch (endpoint) {
      case "liveness":
        const liveness = await livenessCheck();
        return Response.json(liveness, { status: 200 });
      case "readiness":
        const readiness = await readinessCheck(env);
        const status = readiness.status === "healthy" ? 200 : 503;
        return Response.json(readiness, { status });
      case "health":
      default:
        const health = await runHealthChecks(env);
        const healthStatus = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;
        return Response.json(health, {
          status: healthStatus,
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Content-Type": "application/json"
          }
        });
    }
  } catch (error) {
    console.error("Health check error:", error);
    return Response.json(
      {
        status: "unhealthy",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
var init_health = __esm({
  "api/health/index.ts"() {
    "use strict";
    init_functionsRoutes_0_8621545542704551();
    init_checked_fetch();
    init_health_checks();
    __name(onRequestGet8, "onRequestGet");
  }
});

// ../.wrangler/tmp/pages-7VLcsd/functionsRoutes-0.8621545542704551.mjs
var routes;
var init_functionsRoutes_0_8621545542704551 = __esm({
  "../.wrangler/tmp/pages-7VLcsd/functionsRoutes-0.8621545542704551.mjs"() {
    "use strict";
    init_login();
    init_login();
    init_mfa();
    init_mfa();
    init_mfa();
    init_register();
    init_register();
    init_feedback();
    init_feedback();
    init_history();
    init_history();
    init_history();
    init_history_dual_mode();
    init_history_dual_mode();
    init_history_dual_mode();
    init_liveness();
    init_readiness();
    init_status();
    init_status();
    init_trigger();
    init_trigger();
    init_dsar();
    init_dsar();
    init_dsar();
    init_dsar();
    init_engineer();
    init_engineer();
    init_health();
    routes = [
      {
        routePath: "/api/auth/login",
        mountPath: "/api/auth",
        method: "OPTIONS",
        middlewares: [],
        modules: [onRequestOptions]
      },
      {
        routePath: "/api/auth/login",
        mountPath: "/api/auth",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost]
      },
      {
        routePath: "/api/auth/mfa",
        mountPath: "/api/auth",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet]
      },
      {
        routePath: "/api/auth/mfa",
        mountPath: "/api/auth",
        method: "OPTIONS",
        middlewares: [],
        modules: [onRequestOptions2]
      },
      {
        routePath: "/api/auth/mfa",
        mountPath: "/api/auth",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost2]
      },
      {
        routePath: "/api/auth/register",
        mountPath: "/api/auth",
        method: "OPTIONS",
        middlewares: [],
        modules: [onRequestOptions3]
      },
      {
        routePath: "/api/auth/register",
        mountPath: "/api/auth",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost3]
      },
      {
        routePath: "/api/engineer/feedback",
        mountPath: "/api/engineer",
        method: "OPTIONS",
        middlewares: [],
        modules: [onRequestOptions4]
      },
      {
        routePath: "/api/engineer/feedback",
        mountPath: "/api/engineer",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost4]
      },
      {
        routePath: "/api/engineer/history",
        mountPath: "/api/engineer",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet2]
      },
      {
        routePath: "/api/engineer/history",
        mountPath: "/api/engineer",
        method: "OPTIONS",
        middlewares: [],
        modules: [onRequestOptions5]
      },
      {
        routePath: "/api/engineer/history",
        mountPath: "/api/engineer",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost5]
      },
      {
        routePath: "/api/engineer/history-dual-mode",
        mountPath: "/api/engineer",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet3]
      },
      {
        routePath: "/api/engineer/history-dual-mode",
        mountPath: "/api/engineer",
        method: "OPTIONS",
        middlewares: [],
        modules: [onRequestOptions6]
      },
      {
        routePath: "/api/engineer/history-dual-mode",
        mountPath: "/api/engineer",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost6]
      },
      {
        routePath: "/api/health/liveness",
        mountPath: "/api/health",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet4]
      },
      {
        routePath: "/api/health/readiness",
        mountPath: "/api/health",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet5]
      },
      {
        routePath: "/api/learning/status",
        mountPath: "/api/learning",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet6]
      },
      {
        routePath: "/api/learning/status",
        mountPath: "/api/learning",
        method: "OPTIONS",
        middlewares: [],
        modules: [onRequestOptions7]
      },
      {
        routePath: "/api/learning/trigger",
        mountPath: "/api/learning",
        method: "OPTIONS",
        middlewares: [],
        modules: [onRequestOptions8]
      },
      {
        routePath: "/api/learning/trigger",
        mountPath: "/api/learning",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost7]
      },
      {
        routePath: "/api/privacy/dsar",
        mountPath: "/api/privacy",
        method: "DELETE",
        middlewares: [],
        modules: [onRequestDelete]
      },
      {
        routePath: "/api/privacy/dsar",
        mountPath: "/api/privacy",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet7]
      },
      {
        routePath: "/api/privacy/dsar",
        mountPath: "/api/privacy",
        method: "OPTIONS",
        middlewares: [],
        modules: [onRequestOptions9]
      },
      {
        routePath: "/api/privacy/dsar",
        mountPath: "/api/privacy",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost8]
      },
      {
        routePath: "/api/engineer",
        mountPath: "/api",
        method: "OPTIONS",
        middlewares: [],
        modules: [onRequestOptions10]
      },
      {
        routePath: "/api/engineer",
        mountPath: "/api",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost9]
      },
      {
        routePath: "/api/health",
        mountPath: "/api/health",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet8]
      }
    ];
  }
});

// ../.wrangler/tmp/bundle-54FTSV/middleware-loader.entry.ts
init_functionsRoutes_0_8621545542704551();
init_checked_fetch();

// ../.wrangler/tmp/bundle-54FTSV/middleware-insertion-facade.js
init_functionsRoutes_0_8621545542704551();
init_checked_fetch();

// ../../../../../../opt/homebrew/lib/node_modules/wrangler/templates/pages-template-worker.ts
init_functionsRoutes_0_8621545542704551();
init_checked_fetch();

// ../../../../../../opt/homebrew/lib/node_modules/wrangler/node_modules/path-to-regexp/dist.es2015/index.js
init_functionsRoutes_0_8621545542704551();
init_checked_fetch();
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char2 = str[i];
    if (char2 === "*" || char2 === "+" || char2 === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char2 === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char2 === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char2 === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char2 === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char2 === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char3 = delimiter_1[_i];
      if (value2.indexOf(char3) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char2 = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char2 || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char2 || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x2) {
    return x2;
  } : _a;
  return function(pathname) {
    var m2 = re.exec(pathname);
    if (!m2)
      return false;
    var path = m2[0], index = m2.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m2[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m2[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m2[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m2.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x2) {
    return x2;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../../../../opt/homebrew/lib/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../../../../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
init_functionsRoutes_0_8621545542704551();
init_checked_fetch();
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
init_functionsRoutes_0_8621545542704551();
init_checked_fetch();
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-54FTSV/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../../../../../../opt/homebrew/lib/node_modules/wrangler/templates/middleware/common.ts
init_functionsRoutes_0_8621545542704551();
init_checked_fetch();
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-54FTSV/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
/*! Bundled license information:

@neondatabase/serverless/index.mjs:
  (*! Bundled license information:
  
  ieee754/index.js:
    (*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> *)
  
  buffer/index.js:
    (*!
     * The buffer module from node.js, for the browser.
     *
     * @author   Feross Aboukhadijeh <https://feross.org>
     * @license  MIT
     *)
  *)
*/
//# sourceMappingURL=functionsWorker-0.4227397393173471.mjs.map
