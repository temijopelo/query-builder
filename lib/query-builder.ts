export type FieldType = "string" | "number" | "enum" | "date" | "boolean";

export type OperatorId =
  | "equals"
  | "notEquals"
  | "contains"
  | "startsWith"
  | "greaterThan"
  | "lessThan"
  | "inArray"
  | "between"
  | "regex"
  | "isNull"
  | "isNotNull";

export type LogicOperator = "and" | "or";
export type PreviewMode = "sql" | "mongo" | "graphql";
export type ThemeMode = "dark" | "light";

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
}

export interface DataSourceDefinition {
  id: string;
  label: string;
  description: string;
  tableName: string;
  fields: Record<string, FieldDefinition>;
  rows: Array<Record<string, unknown>>;
}

export interface RuleNode {
  kind: "rule";
  id: string;
  fieldKey: string;
  operator: OperatorId;
  value: string;
}

export interface GroupNode {
  kind: "group";
  id: string;
  logic: LogicOperator;
  collapsed: boolean;
  children: ConditionNode[];
}

export type ConditionNode = RuleNode | GroupNode;

export interface QueryState {
  sourceId: string;
  root: GroupNode;
}

export interface ValidationIssue {
  nodeId: string;
  message: string;
}

export interface ExecutionSummary {
  rows: Array<Record<string, unknown>>;
  count: number;
  valid: boolean;
  issues: ValidationIssue[];
}

const operatorLabels: Record<OperatorId, string> = {
  equals: "equals",
  notEquals: "not equals",
  contains: "contains",
  startsWith: "starts with",
  greaterThan: "greater than",
  lessThan: "less than",
  inArray: "in array",
  between: "between",
  regex: "regex",
  isNull: "is null",
  isNotNull: "is not null",
};

const operatorByFieldType: Record<FieldType, OperatorId[]> = {
  string: [
    "equals",
    "notEquals",
    "contains",
    "startsWith",
    "inArray",
    "regex",
    "isNull",
    "isNotNull",
  ],
  number: [
    "equals",
    "notEquals",
    "greaterThan",
    "lessThan",
    "between",
    "inArray",
    "isNull",
    "isNotNull",
  ],
  enum: ["equals", "notEquals", "inArray", "isNull", "isNotNull"],
  date: [
    "equals",
    "notEquals",
    "greaterThan",
    "lessThan",
    "between",
    "isNull",
    "isNotNull",
  ],
  boolean: ["equals", "notEquals", "isNull", "isNotNull"],
};

const schemaTemplates: Array<Omit<DataSourceDefinition, "rows">> = [
  {
    id: "users",
    label: "Users",
    description: "Customer profile data used for lifecycle and access queries.",
    tableName: "users",
    fields: {
      name: { key: "name", label: "Name", type: "string" },
      age: { key: "age", label: "Age", type: "number" },
      status: {
        key: "status",
        label: "Status",
        type: "enum",
        options: ["active", "inactive", "invited"],
      },
      country: {
        key: "country",
        label: "Country",
        type: "enum",
        options: ["Nigeria", "Kenya", "Ghana", "South Africa", "Morocco"],
      },
      createdAt: { key: "createdAt", label: "Created At", type: "date" },
      purchases: { key: "purchases", label: "Purchases", type: "number" },
      tags: { key: "tags", label: "Tags", type: "string" },
      active: { key: "active", label: "Active", type: "boolean" },
    },
  },
  {
    id: "orders",
    label: "Orders",
    description: "Transactional orders with fulfillment and payment states.",
    tableName: "orders",
    fields: {
      orderId: { key: "orderId", label: "Order ID", type: "string" },
      total: { key: "total", label: "Total", type: "number" },
      region: {
        key: "region",
        label: "Region",
        type: "enum",
        options: ["west", "east", "north", "south"],
      },
      state: {
        key: "state",
        label: "State",
        type: "enum",
        options: ["paid", "pending", "refunded", "failed"],
      },
      placedAt: { key: "placedAt", label: "Placed At", type: "date" },
      channel: {
        key: "channel",
        label: "Channel",
        type: "enum",
        options: ["web", "mobile", "partner"],
      },
      refunded: { key: "refunded", label: "Refunded", type: "boolean" },
    },
  },
  {
    id: "events",
    label: "Events",
    description: "Telemetry and workflow events emitted by a product.",
    tableName: "events",
    fields: {
      event: { key: "event", label: "Event", type: "string" },
      actor: { key: "actor", label: "Actor", type: "string" },
      outcome: {
        key: "outcome",
        label: "Outcome",
        type: "enum",
        options: ["success", "warning", "failure"],
      },
      severity: {
        key: "severity",
        label: "Severity",
        type: "enum",
        options: ["low", "medium", "high"],
      },
      duration: { key: "duration", label: "Duration", type: "number" },
      occurredAt: { key: "occurredAt", label: "Occurred At", type: "date" },
      acknowledged: {
        key: "acknowledged",
        label: "Acknowledged",
        type: "boolean",
      },
    },
  },
];

const schemaRows: Record<string, Array<Record<string, unknown>>> = {
  users: [
    {
      name: "Ada Lovelace",
      age: 36,
      status: "active",
      country: "Nigeria",
      createdAt: "2026-02-02",
      purchases: 24,
      tags: "vip,travel",
      active: true,
    },
    {
      name: "Tunde Bello",
      age: 19,
      status: "active",
      country: "Kenya",
      createdAt: "2026-01-12",
      purchases: 4,
      tags: "starter",
      active: true,
    },
    {
      name: "Chinwe Okafor",
      age: 29,
      status: "inactive",
      country: "Ghana",
      createdAt: "2025-12-20",
      purchases: 11,
      tags: "finance,ops",
      active: false,
    },
    {
      name: "Maya Yusuf",
      age: 41,
      status: "invited",
      country: "South Africa",
      createdAt: "2025-11-09",
      purchases: 17,
      tags: "enterprise",
      active: false,
    },
    {
      name: "Ibrahim Sani",
      age: 24,
      status: "active",
      country: "Morocco",
      createdAt: "2026-03-01",
      purchases: 8,
      tags: "growth",
      active: true,
    },
    {
      name: "Nia Brown",
      age: 52,
      status: "inactive",
      country: "Nigeria",
      createdAt: "2024-09-17",
      purchases: 3,
      tags: "legacy",
      active: false,
    },
    {
      name: "Ayo Martins",
      age: 31,
      status: "active",
      country: "Kenya",
      createdAt: "2025-10-10",
      purchases: 15,
      tags: "vip,security",
      active: true,
    },
    {
      name: "Fatima Ali",
      age: 27,
      status: "active",
      country: "Ghana",
      createdAt: "2026-05-01",
      purchases: 20,
      tags: "beta",
      active: true,
    },
  ],
  orders: [
    {
      orderId: "ORD-1001",
      total: 320,
      region: "west",
      state: "paid",
      placedAt: "2026-01-03",
      channel: "web",
      refunded: false,
    },
    {
      orderId: "ORD-1002",
      total: 1200,
      region: "east",
      state: "pending",
      placedAt: "2026-02-11",
      channel: "mobile",
      refunded: false,
    },
    {
      orderId: "ORD-1003",
      total: 89,
      region: "north",
      state: "refunded",
      placedAt: "2026-02-18",
      channel: "partner",
      refunded: true,
    },
    {
      orderId: "ORD-1004",
      total: 642,
      region: "south",
      state: "paid",
      placedAt: "2025-12-30",
      channel: "web",
      refunded: false,
    },
    {
      orderId: "ORD-1005",
      total: 77,
      region: "west",
      state: "failed",
      placedAt: "2025-12-01",
      channel: "mobile",
      refunded: false,
    },
    {
      orderId: "ORD-1006",
      total: 214,
      region: "east",
      state: "paid",
      placedAt: "2026-04-14",
      channel: "partner",
      refunded: false,
    },
  ],
  events: [
    {
      event: "sign_in",
      actor: "Ada Lovelace",
      outcome: "success",
      severity: "low",
      duration: 1.2,
      occurredAt: "2026-03-19",
      acknowledged: true,
    },
    {
      event: "export_csv",
      actor: "Tunde Bello",
      outcome: "warning",
      severity: "medium",
      duration: 4.4,
      occurredAt: "2026-01-20",
      acknowledged: false,
    },
    {
      event: "sync_failed",
      actor: "Chinwe Okafor",
      outcome: "failure",
      severity: "high",
      duration: 7.8,
      occurredAt: "2026-02-07",
      acknowledged: false,
    },
    {
      event: "role_update",
      actor: "Maya Yusuf",
      outcome: "success",
      severity: "low",
      duration: 0.8,
      occurredAt: "2026-05-09",
      acknowledged: true,
    },
    {
      event: "billing_retry",
      actor: "Ibrahim Sani",
      outcome: "warning",
      severity: "medium",
      duration: 2.1,
      occurredAt: "2025-11-30",
      acknowledged: true,
    },
    {
      event: "webhook_delivered",
      actor: "Fatima Ali",
      outcome: "success",
      severity: "low",
      duration: 3.6,
      occurredAt: "2026-04-01",
      acknowledged: true,
    },
  ],
};

export const DATA_SOURCES: DataSourceDefinition[] = schemaTemplates.map(
  (template) => ({
    ...template,
    rows: schemaRows[template.id],
  }),
);

export const PRESET_STORAGE_KEY = "query-builder-presets-v1";
export const HISTORY_STORAGE_KEY = "query-builder-history-v1";
export const THEME_STORAGE_KEY = "query-builder-theme-v1";

export function getDataSource(sourceId: string): DataSourceDefinition {
  return (
    DATA_SOURCES.find((source) => source.id === sourceId) ?? DATA_SOURCES[0]
  );
}

export function getFieldDefinition(
  source: DataSourceDefinition,
  fieldKey: string,
): FieldDefinition {
  return source.fields[fieldKey] ?? Object.values(source.fields)[0];
}

export function getAllowedOperators(
  source: DataSourceDefinition,
  fieldKey: string,
): OperatorId[] {
  return operatorByFieldType[getFieldDefinition(source, fieldKey).type];
}

export function getOperatorLabel(operator: OperatorId): string {
  return operatorLabels[operator];
}

export function createId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `node_${Math.random().toString(36).slice(2, 11)}`;
}

export function getDefaultFieldKey(source: DataSourceDefinition): string {
  return Object.keys(source.fields)[0];
}

export function getDefaultOperator(
  source: DataSourceDefinition,
  fieldKey: string,
): OperatorId {
  return getAllowedOperators(source, fieldKey)[0];
}

export function getDefaultRuleValue(
  fieldType: FieldType,
  operator: OperatorId,
): string {
  if (operator === "isNull" || operator === "isNotNull") {
    return "";
  }

  if (operator === "between") {
    return fieldType === "date" ? "2026-01-01, 2026-12-31" : "10, 20";
  }

  if (operator === "inArray") {
    return fieldType === "number" ? "5, 10, 15" : "active, invited";
  }

  if (fieldType === "boolean") {
    return "true";
  }

  return fieldType === "date"
    ? "2026-01-01"
    : fieldType === "number"
      ? "18"
      : "active";
}

export function createRuleNode(
  source: DataSourceDefinition,
  fieldKey = getDefaultFieldKey(source),
): RuleNode {
  const field = getFieldDefinition(source, fieldKey);
  const operator = getDefaultOperator(source, fieldKey);

  return {
    kind: "rule",
    id: createId(),
    fieldKey: field.key,
    operator,
    value: getDefaultRuleValue(field.type, operator),
  };
}

export function createGroupNode(
  source: DataSourceDefinition,
  logic: LogicOperator = "and",
  children?: ConditionNode[],
): GroupNode {
  return {
    kind: "group",
    id: createId(),
    logic,
    collapsed: false,
    children: children ?? [createRuleNode(source)],
  };
}

function createStarterTree(source: DataSourceDefinition): GroupNode {
  const primary = createRuleNode(source, getDefaultFieldKey(source));
  const secondary = createRuleNode(
    source,
    Object.keys(source.fields)[1] ?? getDefaultFieldKey(source),
  );
  const nested = createGroupNode(source, "and", [
    createRuleNode(source),
    createRuleNode(source),
  ]);

  return {
    kind: "group",
    id: createId(),
    logic: "or",
    collapsed: false,
    children: [
      {
        kind: "group",
        id: createId(),
        logic: "and",
        collapsed: false,
        children: [primary, secondary],
      },
      nested,
    ],
  };
}

export function createInitialQuery(sourceId = DATA_SOURCES[0].id): QueryState {
  const source = getDataSource(sourceId);

  return {
    sourceId: source.id,
    root: createStarterTree(source),
  };
}

export function serializeQueryState(query: QueryState): string {
  return JSON.stringify(query, null, 2);
}

export function parseQueryState(json: string): QueryState | null {
  try {
    const parsed = JSON.parse(json) as Partial<QueryState>;

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const sourceId =
      typeof parsed.sourceId === "string"
        ? parsed.sourceId
        : DATA_SOURCES[0].id;
    const source = getDataSource(sourceId);
    const root = sanitizeGroupNode(source, parsed.root);

    return { sourceId: source.id, root };
  } catch {
    return null;
  }
}

function sanitizeGroupNode(
  source: DataSourceDefinition,
  value: unknown,
): GroupNode {
  if (!value || typeof value !== "object") {
    return createGroupNode(source);
  }

  const candidate = value as Partial<GroupNode>;
  const children = Array.isArray(candidate.children)
    ? (candidate.children
        .map((child) => sanitizeNode(source, child))
        .filter(Boolean) as ConditionNode[])
    : [];

  return {
    kind: "group",
    id: typeof candidate.id === "string" ? candidate.id : createId(),
    logic: candidate.logic === "or" ? "or" : "and",
    collapsed: Boolean(candidate.collapsed),
    children: children.length > 0 ? children : [createRuleNode(source)],
  };
}

function sanitizeNode(
  source: DataSourceDefinition,
  value: unknown,
): ConditionNode | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Partial<ConditionNode> & { kind?: string };

  if (candidate.kind === "group") {
    return sanitizeGroupNode(source, candidate);
  }

  if (candidate.kind !== "rule") {
    return null;
  }

  const fieldKey =
    typeof candidate.fieldKey === "string" && source.fields[candidate.fieldKey]
      ? candidate.fieldKey
      : getDefaultFieldKey(source);
  const operator = isOperatorAllowed(source, fieldKey, candidate.operator)
    ? candidate.operator
    : getDefaultOperator(source, fieldKey);

  return {
    kind: "rule",
    id: typeof candidate.id === "string" ? candidate.id : createId(),
    fieldKey,
    operator,
    value:
      typeof candidate.value === "string"
        ? candidate.value
        : getDefaultRuleValue(
            getFieldDefinition(source, fieldKey).type,
            operator,
          ),
  };
}

export function isOperatorAllowed(
  source: DataSourceDefinition,
  fieldKey: string,
  operator: OperatorId | undefined,
): operator is OperatorId {
  if (!operator) {
    return false;
  }

  return getAllowedOperators(source, fieldKey).includes(operator);
}

function resolveFieldType(
  source: DataSourceDefinition,
  fieldKey: string,
): FieldType {
  return getFieldDefinition(source, fieldKey).type;
}

function toNumber(value: string): number | null {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function toDate(value: string): Date | null {
  const parsed = new Date(value.trim());
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function splitValues(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function coerceScalar(
  source: DataSourceDefinition,
  fieldKey: string,
  raw: string,
): string | number | boolean | Date | null {
  const fieldType = resolveFieldType(source, fieldKey);

  if (fieldType === "number") {
    return toNumber(raw);
  }

  if (fieldType === "date") {
    return toDate(raw);
  }

  if (fieldType === "boolean") {
    if (raw.trim() === "true") {
      return true;
    }

    if (raw.trim() === "false") {
      return false;
    }

    return null;
  }

  return raw.trim();
}

function formatSqlValue(
  value: string | number | boolean | Date | null,
): string {
  if (value === null) {
    return "NULL";
  }

  if (value instanceof Date) {
    return `'${value.toISOString().slice(0, 10)}'`;
  }

  if (typeof value === "number") {
    return `${value}`;
  }

  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }

  return `'${value.replace(/'/g, "''")}'`;
}

function buildMongoScalar(
  source: DataSourceDefinition,
  fieldKey: string,
  raw: string,
): string | number | boolean | null {
  const coerced = coerceScalar(source, fieldKey, raw);
  return coerced instanceof Date ? coerced.toISOString().slice(0, 10) : coerced;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildComparisonExpression(
  source: DataSourceDefinition,
  rule: RuleNode,
): string {
  const field = rule.fieldKey;
  const value = rule.value.trim();

  switch (rule.operator) {
    case "equals":
      return `${field} = ${formatSqlValue(coerceScalar(source, field, value))}`;
    case "notEquals":
      return `${field} <> ${formatSqlValue(coerceScalar(source, field, value))}`;
    case "contains":
      return `${field} LIKE ${formatSqlValue(`%${value}%`)}`;
    case "startsWith":
      return `${field} LIKE ${formatSqlValue(`${value}%`)}`;
    case "greaterThan":
      return `${field} > ${formatSqlValue(coerceScalar(source, field, value))}`;
    case "lessThan":
      return `${field} < ${formatSqlValue(coerceScalar(source, field, value))}`;
    case "inArray":
      return `${field} IN (${splitValues(value)
        .map((entry) => formatSqlValue(coerceScalar(source, field, entry)))
        .join(", ")})`;
    case "between": {
      const [start, end] = splitValues(value);
      return `${field} BETWEEN ${formatSqlValue(coerceScalar(source, field, start ?? ""))} AND ${formatSqlValue(coerceScalar(source, field, end ?? ""))}`;
    }
    case "regex":
      return `${field} REGEXP ${formatSqlValue(value)}`;
    case "isNull":
      return `${field} IS NULL`;
    case "isNotNull":
      return `${field} IS NOT NULL`;
    default:
      return `${field} = ${formatSqlValue(coerceScalar(source, field, value))}`;
  }
}

function buildMongoRule(
  source: DataSourceDefinition,
  rule: RuleNode,
): Record<string, unknown> {
  const field = rule.fieldKey;
  const value = rule.value.trim();

  switch (rule.operator) {
    case "equals":
      return { [field]: buildMongoScalar(source, field, value) };
    case "notEquals":
      return { [field]: { $ne: buildMongoScalar(source, field, value) } };
    case "contains":
      return { [field]: { $regex: value, $options: "i" } };
    case "startsWith":
      return { [field]: { $regex: `^${escapeRegExp(value)}`, $options: "i" } };
    case "greaterThan":
      return { [field]: { $gt: buildMongoScalar(source, field, value) } };
    case "lessThan":
      return { [field]: { $lt: buildMongoScalar(source, field, value) } };
    case "inArray":
      return {
        [field]: {
          $in: splitValues(value).map((entry) =>
            buildMongoScalar(source, field, entry),
          ),
        },
      };
    case "between": {
      const [start, end] = splitValues(value);
      return {
        [field]: {
          $gte: buildMongoScalar(source, field, start ?? ""),
          $lte: buildMongoScalar(source, field, end ?? ""),
        },
      };
    }
    case "regex":
      return { [field]: { $regex: value } };
    case "isNull":
      return { [field]: null };
    case "isNotNull":
      return { [field]: { $ne: null } };
    default:
      return { [field]: buildMongoScalar(source, field, value) };
  }
}

function renderGroupSql(
  source: DataSourceDefinition,
  group: GroupNode,
): string {
  const clauses = group.children
    .map((child) =>
      child.kind === "group"
        ? renderGroupSql(source, child)
        : buildComparisonExpression(source, child),
    )
    .filter(Boolean);

  if (clauses.length === 0) {
    return "";
  }

  if (clauses.length === 1) {
    return clauses[0];
  }

  return `(${clauses.join(group.logic === "and" ? " AND " : " OR ")})`;
}

function renderGroupMongo(
  source: DataSourceDefinition,
  group: GroupNode,
): Record<string, unknown> {
  const clauses = group.children.map((child) =>
    child.kind === "group"
      ? renderGroupMongo(source, child)
      : buildMongoRule(source, child),
  );

  if (clauses.length === 1) {
    return clauses[0];
  }

  return { [group.logic]: clauses };
}

function renderGroupGraphql(
  source: DataSourceDefinition,
  group: GroupNode,
): Record<string, unknown> {
  const clauses = group.children.map((child) => {
    if (child.kind === "group") {
      return renderGroupGraphql(source, child);
    }

    return {
      [child.fieldKey]: {
        operator: child.operator,
        value: child.value,
        type: resolveFieldType(source, child.fieldKey),
      },
    };
  });

  if (clauses.length === 1) {
    return clauses[0];
  }

  return { [group.logic]: clauses };
}

export function generateSqlPreview(
  source: DataSourceDefinition,
  root: GroupNode,
): string {
  const where = renderGroupSql(source, root);
  return where
    ? `SELECT * FROM ${source.tableName}\nWHERE ${where};`
    : `SELECT * FROM ${source.tableName};`;
}

export function generateMongoPreview(
  source: DataSourceDefinition,
  root: GroupNode,
): string {
  return JSON.stringify(renderGroupMongo(source, root), null, 2);
}

export function generateGraphqlPreview(
  source: DataSourceDefinition,
  root: GroupNode,
): string {
  return JSON.stringify(
    { filter: renderGroupGraphql(source, root), source: source.id },
    null,
    2,
  );
}

function validateScalarValue(
  source: DataSourceDefinition,
  fieldKey: string,
  operator: OperatorId,
  raw: string,
): string | null {
  const fieldType = resolveFieldType(source, fieldKey);

  if (operator === "isNull" || operator === "isNotNull") {
    return null;
  }

  if (operator === "between") {
    const [start, end] = splitValues(raw);
    if (!start || !end) {
      return "between requires two comma-separated values";
    }

    if (fieldType === "number") {
      const startNumber = toNumber(start);
      const endNumber = toNumber(end);
      if (startNumber === null || endNumber === null) {
        return "between requires valid numbers";
      }

      if (startNumber > endNumber) {
        return "between start must be less than or equal to end";
      }
    }

    if (fieldType === "date") {
      const startDate = toDate(start);
      const endDate = toDate(end);
      if (!startDate || !endDate) {
        return "between requires valid dates in YYYY-MM-DD format";
      }

      if (startDate.getTime() > endDate.getTime()) {
        return "date range start must be before or equal to end";
      }
    }

    return null;
  }

  if (operator === "inArray") {
    if (splitValues(raw).length === 0) {
      return "in array requires at least one value";
    }

    return null;
  }

  if (operator === "regex") {
    try {
      new RegExp(raw);
      return null;
    } catch {
      return "regex value must be a valid regular expression";
    }
  }

  const coerced = coerceScalar(source, fieldKey, raw);
  if (coerced === null) {
    return `value is not valid for ${fieldType} fields`;
  }

  if (
    (operator === "contains" || operator === "startsWith") &&
    fieldType !== "string"
  ) {
    return `${operatorLabels[operator]} is only available on string fields`;
  }

  return null;
}

function validateNode(
  source: DataSourceDefinition,
  node: ConditionNode,
  issues: ValidationIssue[],
): void {
  if (node.kind === "group") {
    if (node.children.length === 0) {
      issues.push({ nodeId: node.id, message: "groups cannot be empty" });
      return;
    }

    node.children.forEach((child) => validateNode(source, child, issues));
    return;
  }

  if (!source.fields[node.fieldKey]) {
    issues.push({
      nodeId: node.id,
      message: "field is no longer available in the selected schema",
    });
    return;
  }

  if (!getAllowedOperators(source, node.fieldKey).includes(node.operator)) {
    issues.push({
      nodeId: node.id,
      message: `${getFieldDefinition(source, node.fieldKey).label} does not support ${operatorLabels[node.operator]}`,
    });
  }

  const scalarIssue = validateScalarValue(
    source,
    node.fieldKey,
    node.operator,
    node.value,
  );
  if (scalarIssue) {
    issues.push({ nodeId: node.id, message: scalarIssue });
  }
}

export function validateQuery(
  source: DataSourceDefinition,
  root: GroupNode,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  validateNode(source, root, issues);
  return issues;
}

function evaluateRule(
  source: DataSourceDefinition,
  row: Record<string, unknown>,
  rule: RuleNode,
): boolean {
  const fieldType = resolveFieldType(source, rule.fieldKey);
  const raw = row[rule.fieldKey];
  const value = rule.value.trim();

  if (rule.operator === "isNull") {
    return raw === null || raw === undefined || raw === "";
  }

  if (rule.operator === "isNotNull") {
    return !(raw === null || raw === undefined || raw === "");
  }

  if (raw === null || raw === undefined) {
    return false;
  }

  if (fieldType === "number") {
    const left = Number(raw);
    if (!Number.isFinite(left)) {
      return false;
    }

    if (rule.operator === "between") {
      const [start, end] = splitValues(value).map((entry) => toNumber(entry));
      return start !== null && end !== null && left >= start && left <= end;
    }

    const right = toNumber(value);
    if (right === null) {
      return false;
    }

    switch (rule.operator) {
      case "equals":
        return left === right;
      case "notEquals":
        return left !== right;
      case "greaterThan":
        return left > right;
      case "lessThan":
        return left < right;
      case "inArray":
        return splitValues(value)
          .map((entry) => toNumber(entry))
          .includes(left);
      default:
        return false;
    }
  }

  if (fieldType === "date") {
    const left = toDate(String(raw));
    if (!left) {
      return false;
    }

    if (rule.operator === "between") {
      const [start, end] = splitValues(value).map((entry) => toDate(entry));
      return Boolean(
        start &&
        end &&
        left.getTime() >= start.getTime() &&
        left.getTime() <= end.getTime(),
      );
    }

    const right = toDate(value);
    if (!right) {
      return false;
    }

    switch (rule.operator) {
      case "equals":
        return (
          left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10)
        );
      case "notEquals":
        return (
          left.toISOString().slice(0, 10) !== right.toISOString().slice(0, 10)
        );
      case "greaterThan":
        return left.getTime() > right.getTime();
      case "lessThan":
        return left.getTime() < right.getTime();
      default:
        return false;
    }
  }

  if (fieldType === "boolean") {
    const left = Boolean(raw);
    const right = value === "true";

    if (value !== "true" && value !== "false") {
      return false;
    }

    switch (rule.operator) {
      case "equals":
        return left === right;
      case "notEquals":
        return left !== right;
      default:
        return false;
    }
  }

  const left = String(raw);

  switch (rule.operator) {
    case "equals":
      return left === value;
    case "notEquals":
      return left !== value;
    case "contains":
      return left.toLowerCase().includes(value.toLowerCase());
    case "startsWith":
      return left.toLowerCase().startsWith(value.toLowerCase());
    case "inArray":
      return splitValues(value).some(
        (entry) => entry.toLowerCase() === left.toLowerCase(),
      );
    case "regex":
      try {
        return new RegExp(value, "i").test(left);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

function evaluateGroup(
  source: DataSourceDefinition,
  row: Record<string, unknown>,
  group: GroupNode,
): boolean {
  const outcomes = group.children.map((child) =>
    child.kind === "group"
      ? evaluateGroup(source, row, child)
      : evaluateRule(source, row, child),
  );
  return group.logic === "and"
    ? outcomes.every(Boolean)
    : outcomes.some(Boolean);
}

export function executeQuery(
  source: DataSourceDefinition,
  root: GroupNode,
): ExecutionSummary {
  const issues = validateQuery(source, root);

  if (issues.length > 0) {
    return {
      rows: [],
      count: 0,
      valid: false,
      issues,
    };
  }

  const rows = source.rows.filter((row) => evaluateGroup(source, row, root));
  return {
    rows,
    count: rows.length,
    valid: true,
    issues,
  };
}

export function normalizeQueryState(query: QueryState): QueryState {
  const source = getDataSource(query.sourceId);
  return {
    sourceId: source.id,
    root: sanitizeGroupNode(source, query.root),
  };
}

export function updateNodeAtPath(
  root: GroupNode,
  path: number[],
  updater: (node: ConditionNode) => ConditionNode,
): GroupNode {
  if (path.length === 0) {
    return root;
  }

  const [index, ...rest] = path;
  const children = [...root.children];
  const current = children[index];

  if (!current) {
    return root;
  }

  children[index] =
    rest.length === 0
      ? updater(current)
      : current.kind === "group"
        ? updateNodeAtPath(current, rest, updater)
        : current;

  return {
    ...root,
    children,
  };
}

export function addNodeToGroup(
  root: GroupNode,
  path: number[],
  node: ConditionNode,
): GroupNode {
  if (path.length === 0) {
    return {
      ...root,
      children: [...root.children, node],
    };
  }

  return updateNodeAtPath(root, path, (current) => {
    if (current.kind !== "group") {
      return current;
    }

    return {
      ...current,
      children: [...current.children, node],
    };
  });
}

export function moveNodeWithinGroup(
  root: GroupNode,
  parentPath: number[],
  fromIndex: number,
  toIndex: number,
): GroupNode {
  const reorder = (group: GroupNode): GroupNode => ({
    ...group,
    children: moveArray(group.children, fromIndex, toIndex),
  });

  if (parentPath.length === 0) {
    return reorder(root);
  }

  return updateNodeAtPath(root, parentPath, (current) => {
    if (current.kind !== "group") {
      return current;
    }

    return reorder(current);
  });
}

function moveArray<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...array];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function removeNodeAtPath(
  root: GroupNode,
  path: number[],
  source: DataSourceDefinition,
): GroupNode {
  if (path.length === 0) {
    return root;
  }

  const [index, ...rest] = path;
  const children = [...root.children];

  if (rest.length === 0) {
    children.splice(index, 1);
    if (children.length === 0) {
      children.push(createRuleNode(source));
    }

    return {
      ...root,
      children,
    };
  }

  const current = children[index];
  if (!current || current.kind !== "group") {
    return root;
  }

  children[index] = removeNodeAtPath(current, rest, source);
  return {
    ...root,
    children,
  };
}

export function findNodeLocation(
  root: GroupNode,
  nodeId: string,
): { parentPath: number[]; index: number; node: ConditionNode } | null {
  const walk = (
    group: GroupNode,
    parentPath: number[],
  ): { parentPath: number[]; index: number; node: ConditionNode } | null => {
    for (let index = 0; index < group.children.length; index += 1) {
      const child = group.children[index];
      if (child.id === nodeId) {
        return { parentPath, index, node: child };
      }

      if (child.kind === "group") {
        const nested = walk(child, [...parentPath, index]);
        if (nested) {
          return nested;
        }
      }
    }

    return null;
  };

  return walk(root, []);
}

export function updateRuleNode(
  source: DataSourceDefinition,
  node: RuleNode,
  updates: Partial<RuleNode>,
): RuleNode {
  const nextFieldKey =
    updates.fieldKey && source.fields[updates.fieldKey]
      ? updates.fieldKey
      : node.fieldKey;
  const nextOperator =
    updates.operator &&
    isOperatorAllowed(source, nextFieldKey, updates.operator)
      ? updates.operator
      : node.operator;

  return {
    ...node,
    fieldKey: nextFieldKey,
    operator: nextOperator,
    value: updates.value ?? node.value,
  };
}

export function updateGroupNode(
  node: GroupNode,
  updates: Partial<GroupNode>,
): GroupNode {
  return {
    ...node,
    logic: updates.logic ?? node.logic,
    collapsed:
      typeof updates.collapsed === "boolean"
        ? updates.collapsed
        : node.collapsed,
  };
}

export function getNodeByPath(
  root: GroupNode,
  path: number[],
): ConditionNode | GroupNode {
  if (path.length === 0) {
    return root;
  }

  const [index, ...rest] = path;
  const child = root.children[index];

  if (!child) {
    return root;
  }

  if (rest.length === 0) {
    return child;
  }

  if (child.kind !== "group") {
    return child;
  }

  return getNodeByPath(child, rest);
}
