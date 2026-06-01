import {
  executeQuery,
  generateGraphqlPreview,
  generateMongoPreview,
  generateSqlPreview,
  getDataSource,
  parseQueryState,
  validateQuery,
  type GroupNode,
} from "../lib/query-builder";

function createManualQuery(): GroupNode {
  return {
    kind: "group",
    id: "root",
    logic: "and",
    collapsed: false,
    children: [
      {
        kind: "rule",
        id: "age-rule",
        fieldKey: "age",
        operator: "greaterThan",
        value: "18",
      },
      {
        kind: "rule",
        id: "status-rule",
        fieldKey: "status",
        operator: "equals",
        value: "active",
      },
    ],
  };
}

describe("query engine", () => {
  it("generates previews and executes the dataset with nested rules", () => {
    const source = getDataSource("users");
    const root = createManualQuery();

    expect(validateQuery(source, root)).toEqual([]);
    expect(generateSqlPreview(source, root)).toContain("SELECT * FROM users");
    expect(generateSqlPreview(source, root)).toContain("age > 18");
    expect(generateMongoPreview(source, root)).toContain("$gt");
    expect(generateGraphqlPreview(source, root)).toContain('"filter"');

    const execution = executeQuery(source, root);
    const expected = source.rows.filter(
      (row) => Number(row.age) > 18 && row.status === "active",
    );

    expect(execution.valid).toBe(true);
    expect(execution.count).toBe(expected.length);
    expect(execution.rows).toEqual(expected);
  });

  it("reports incompatible operators and invalid ranges", () => {
    const source = getDataSource("users");
    const invalidRoot: GroupNode = {
      kind: "group",
      id: "root",
      logic: "and",
      collapsed: false,
      children: [
        {
          kind: "rule",
          id: "bad-rule",
          fieldKey: "age",
          operator: "contains",
          value: "18",
        },
        {
          kind: "rule",
          id: "range-rule",
          fieldKey: "createdAt",
          operator: "between",
          value: "2026-05-01, 2026-01-01",
        },
      ],
    };

    const issues = validateQuery(source, invalidRoot);

    expect(issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("only available on string fields"),
        expect.stringContaining("start must be before or equal to end"),
      ]),
    );
  });

  it("sanitizes malformed imported JSON", () => {
    const parsed = parseQueryState(
      JSON.stringify({
        sourceId: "orders",
        root: {
          kind: "group",
          id: "group-1",
          logic: "or",
          collapsed: false,
          children: [
            {
              kind: "rule",
              id: "rule-1",
              fieldKey: "missingField",
              operator: "contains",
              value: 42,
            },
          ],
        },
      }),
    );

    expect(parsed).not.toBeNull();
    expect(parsed?.sourceId).toBe("orders");
    expect(parsed?.root.children[0].kind).toBe("rule");
  });
});
