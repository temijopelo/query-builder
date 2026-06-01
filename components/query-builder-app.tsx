"use client";

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { memo, useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  addNodeToGroup,
  createGroupNode,
  createInitialQuery,
  createRuleNode,
  DATA_SOURCES,
  executeQuery,
  generateGraphqlPreview,
  generateMongoPreview,
  generateSqlPreview,
  getAllowedOperators,
  getDataSource,
  getDefaultFieldKey,
  getDefaultOperator,
  getDefaultRuleValue,
  getFieldDefinition,
  getOperatorLabel,
  LogicOperator,
  moveNodeWithinGroup,
  normalizeQueryState,
  parseQueryState,
  PreviewMode,
  PRESET_STORAGE_KEY,
  HISTORY_STORAGE_KEY,
  QueryState,
  removeNodeAtPath,
  RuleNode,
  serializeQueryState,
  ThemeMode,
  updateGroupNode,
  updateNodeAtPath,
  updateRuleNode,
  validateQuery,
} from "../lib/query-builder";

type QueryAction =
  | { type: "setSource"; sourceId: string }
  | { type: "updateRule"; path: number[]; updates: Partial<RuleNode> }
  | {
      type: "updateGroup";
      path: number[];
      updates: Partial<{ logic: LogicOperator; collapsed: boolean }>;
    }
  | { type: "addRule"; path: number[] }
  | { type: "addGroup"; path: number[] }
  | { type: "removeNode"; path: number[] }
  | { type: "toggleGroup"; path: number[] }
  | {
      type: "moveNode";
      parentPath: number[];
      fromIndex: number;
      toIndex: number;
    }
  | { type: "reset"; sourceId?: string }
  | { type: "replace"; query: QueryState };

interface HistoryItem {
  id: string;
  timestamp: string;
  label: string;
  sourceId: string;
  count: number;
  snapshot: QueryState;
}

interface PresetItem {
  id: string;
  name: string;
  createdAt: string;
  snapshot: QueryState;
}

interface DragLocation {
  parentPath: number[];
  index: number;
}

function queryReducer(state: QueryState, action: QueryAction): QueryState {
  const source = getDataSource(state.sourceId);

  switch (action.type) {
    case "setSource":
      return normalizeQueryState({
        sourceId: action.sourceId,
        root: state.root,
      });
    case "updateRule": {
      const nextRoot = updateNodeAtPath(state.root, action.path, (node) => {
        if (node.kind !== "rule") {
          return node;
        }

        return updateRuleNode(source, node, action.updates);
      });

      return { ...state, root: nextRoot };
    }
    case "updateGroup": {
      const nextRoot = updateNodeAtPath(state.root, action.path, (node) => {
        if (node.kind !== "group") {
          return node;
        }

        return updateGroupNode(node, action.updates);
      });

      return { ...state, root: nextRoot };
    }
    case "addRule": {
      const nextRoot = addNodeToGroup(
        state.root,
        action.path,
        createRuleNode(source),
      );
      return { ...state, root: nextRoot };
    }
    case "addGroup": {
      const nextRoot = addNodeToGroup(
        state.root,
        action.path,
        createGroupNode(source),
      );
      return { ...state, root: nextRoot };
    }
    case "removeNode":
      return {
        ...state,
        root: removeNodeAtPath(state.root, action.path, source),
      };
    case "toggleGroup": {
      const nextRoot = updateNodeAtPath(state.root, action.path, (node) => {
        if (node.kind !== "group") {
          return node;
        }

        return { ...node, collapsed: !node.collapsed };
      });

      return { ...state, root: nextRoot };
    }
    case "moveNode":
      return {
        ...state,
        root: moveNodeWithinGroup(
          state.root,
          action.parentPath,
          action.fromIndex,
          action.toIndex,
        ),
      };
    case "reset":
      return createInitialQuery(action.sourceId ?? state.sourceId);
    case "replace":
      return action.query;
    default:
      return state;
  }
}

function prettyTimestamp(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function readStoredItems<T>(key: string): T[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function useThemeMode(): [ThemeMode, (next: ThemeMode) => void] {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }

    const stored = window.localStorage.getItem("query-builder-theme-v1");
    if (stored === "dark" || stored === "light") {
      return stored;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("query-builder-theme-v1", theme);
  }, [theme]);

  return [theme, setTheme];
}

function buildLocationIndex(
  root: QueryState["root"],
): Map<string, DragLocation> {
  const index = new Map<string, DragLocation>();

  const walk = (group: QueryState["root"], parentPath: number[]) => {
    group.children.forEach((child, childIndex) => {
      index.set(child.id, { parentPath, index: childIndex });

      if (child.kind === "group") {
        walk(child, [...parentPath, childIndex]);
      }
    });
  };

  walk(root, []);
  return index;
}

export default function QueryBuilderApp() {
  const [query, dispatch] = useReducer(queryReducer, undefined, () =>
    createInitialQuery(),
  );
  const [previewMode, setPreviewMode] = useState<PreviewMode>("sql");
  const [theme, setTheme] = useThemeMode();
  const [history, setHistory] = useState<HistoryItem[]>(() =>
    readStoredItems<HistoryItem>(HISTORY_STORAGE_KEY),
  );
  const [presets, setPresets] = useState<PresetItem[]>(() =>
    readStoredItems<PresetItem>(PRESET_STORAGE_KEY),
  );
  const [presetName, setPresetName] = useState("Executive filter");
  const [importText, setImportText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(4);
  const [sortField, setSortField] = useState(() =>
    getDefaultFieldKey(getDataSource(query.sourceId)),
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const executeTimer = useRef<number | null>(null);

  const source = useMemo(() => getDataSource(query.sourceId), [query.sourceId]);
  const validationIssues = useMemo(
    () => validateQuery(source, query.root),
    [source, query.root],
  );
  const issueMap = useMemo(() => {
    const map = new Map<string, string[]>();
    validationIssues.forEach((issue) => {
      const current = map.get(issue.nodeId) ?? [];
      current.push(issue.message);
      map.set(issue.nodeId, current);
    });
    return map;
  }, [validationIssues]);
  const execution = useMemo(
    () => executeQuery(source, query.root),
    [source, query.root],
  );
  const previewText = useMemo(() => {
    if (previewMode === "mongo") {
      return generateMongoPreview(source, query.root);
    }

    if (previewMode === "graphql") {
      return generateGraphqlPreview(source, query.root);
    }

    return generateSqlPreview(source, query.root);
  }, [previewMode, query.root, source]);

  const effectiveSortField = source.fields[sortField]
    ? sortField
    : getDefaultFieldKey(source);

  const sortedRows = useMemo(() => {
    const rows = [...execution.rows];
    rows.sort((left, right) => {
      const leftValue = left[effectiveSortField];
      const rightValue = right[effectiveSortField];

      if (leftValue === rightValue) {
        return 0;
      }

      if (leftValue === undefined || leftValue === null) {
        return 1;
      }

      if (rightValue === undefined || rightValue === null) {
        return -1;
      }

      const leftComparable = String(leftValue).toLowerCase();
      const rightComparable = String(rightValue).toLowerCase();
      return sortDirection === "asc"
        ? leftComparable.localeCompare(rightComparable, undefined, {
            numeric: true,
          })
        : rightComparable.localeCompare(leftComparable, undefined, {
            numeric: true,
          });
    });

    return rows;
  }, [effectiveSortField, execution.rows, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const effectivePage = Math.min(page, totalPages);
  const visibleRows = sortedRows.slice(
    (effectivePage - 1) * pageSize,
    effectivePage * pageSize,
  );
  const locationIndex = useMemo(
    () => buildLocationIndex(query.root),
    [query.root],
  );
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  useEffect(() => {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    window.localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
  }, [presets]);

  useEffect(() => {
    return () => {
      if (executeTimer.current) {
        window.clearTimeout(executeTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }

      if (event.key.toLowerCase() === "enter") {
        event.preventDefault();
        handleExecute();
      }

      if (event.key.toLowerCase() === "e") {
        event.preventDefault();
        copyExportJson();
      }

      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleSavePreset();
      }

      if (event.key.toLowerCase() === "i") {
        event.preventDefault();
        handleImportJson();
      }

      if (event.key.toLowerCase() === "d") {
        event.preventDefault();
        setTheme(theme === "dark" ? "light" : "dark");
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  function persistHistoryItem(count: number) {
    const snapshot = JSON.parse(serializeQueryState(query)) as QueryState;
    const label = `${source.label} • ${previewMode.toUpperCase()} • ${count} match${count === 1 ? "" : "es"}`;
    const entry: HistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
      label,
      sourceId: source.id,
      count,
      snapshot,
    };

    setHistory((current) => [entry, ...current].slice(0, 10));
  }

  function handleExecute() {
    if (executeTimer.current) {
      window.clearTimeout(executeTimer.current);
    }

    setIsExecuting(true);
    executeTimer.current = window.setTimeout(() => {
      persistHistoryItem(execution.count);
      setPage(1);
      setIsExecuting(false);
    }, 220);
  }

  function handleSavePreset() {
    const trimmed = presetName.trim();
    if (!trimmed) {
      return;
    }

    const nextPreset: PresetItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: trimmed,
      createdAt: new Date().toISOString(),
      snapshot: JSON.parse(serializeQueryState(query)) as QueryState,
    };

    setPresets((current) => [nextPreset, ...current].slice(0, 8));
    setPresetName("");
  }

  function handleImportJson() {
    const parsed = parseQueryState(importText);
    if (!parsed) {
      return;
    }

    dispatch({ type: "replace", query: parsed });
    setImportText("");
  }

  async function copyExportJson() {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(serializeQueryState(query));
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);

    if (!event.over || event.active.id === event.over.id) {
      return;
    }

    const activeLocation = locationIndex.get(String(event.active.id));
    const overLocation = locationIndex.get(String(event.over.id));

    if (!activeLocation || !overLocation) {
      return;
    }

    if (
      JSON.stringify(activeLocation.parentPath) !==
      JSON.stringify(overLocation.parentPath)
    ) {
      return;
    }

    dispatch({
      type: "moveNode",
      parentPath: activeLocation.parentPath,
      fromIndex: activeLocation.index,
      toIndex: overLocation.index,
    });
  }

  function restoreSnapshot(snapshot: QueryState) {
    dispatch({ type: "replace", query: normalizeQueryState(snapshot) });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(65,184,255,0.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,112,67,0.16),transparent_34%),linear-gradient(180deg,#09111f_0%,#0b1220_45%,#060b16_100%)] text-slate-50">
        <div className="mx-auto flex min-h-screen w-full max-w-425 flex-col gap-6 px-4 py-5 md:px-6 xl:px-8">
          <header className="overflow-hidden rounded-4xl border border-white/10 bg-white/5 px-5 py-5 shadow-2xl shadow-slate-950/25 backdrop-blur-xl md:px-7">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl space-y-3">
                <div className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
                  Visual Query Builder
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                    Compose nested filters, preview the query, and run the
                    dataset without writing raw syntax.
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
                    Switch schemas, build recursive condition trees, reorder
                    groups, validate operators, and inspect live SQL, Mongo, and
                    GraphQL-style previews in one workspace.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:min-w-85 xl:grid-cols-2">
                <StatCard
                  label="Visible rules"
                  value={String(validationIssues.length)}
                  accent="text-cyan-300"
                />
                <StatCard
                  label="Matching rows"
                  value={String(execution.count)}
                  accent="text-emerald-300"
                />
                <StatCard
                  label="Saved presets"
                  value={String(presets.length)}
                  accent="text-amber-300"
                />
                <StatCard
                  label="History items"
                  value={String(history.length)}
                  accent="text-violet-300"
                />
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr]">
              <ControlBar
                label="Data source"
                helper="Schema-driven controls and preview outputs update instantly."
              >
                <select
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
                  value={query.sourceId}
                  onChange={(event) =>
                    dispatch({
                      type: "setSource",
                      sourceId: event.target.value,
                    })
                  }
                >
                  {DATA_SOURCES.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.label}
                    </option>
                  ))}
                </select>
              </ControlBar>

              <ControlBar
                label="Query mode"
                helper="Preview the same tree as SQL-like text, Mongo object, or GraphQL filter JSON."
              >
                <div className="grid grid-cols-3 gap-2">
                  {(["sql", "mongo", "graphql"] as PreviewMode[]).map(
                    (candidate) => (
                      <button
                        key={candidate}
                        className={`rounded-2xl border px-3 py-3 text-xs font-semibold uppercase tracking-[0.22em] transition ${previewMode === candidate ? "border-cyan-300/60 bg-cyan-400/20 text-cyan-100" : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10"}`}
                        onClick={() => setPreviewMode(candidate)}
                        type="button"
                      >
                        {candidate}
                      </button>
                    ),
                  )}
                </div>
              </ControlBar>

              <ControlBar
                label="Theme"
                helper="Keyboard shortcut: Cmd/Ctrl + D."
              >
                <button
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  type="button"
                >
                  {theme === "dark" ? "Switch to light" : "Switch to dark"}
                </button>
              </ControlBar>
            </div>
          </header>

          <div className="grid flex-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)_minmax(0,0.9fr)]">
            <section className="space-y-5">
              <PanelShell
                title="Recursive Builder"
                subtitle="Drag nodes to reorder within each group, add nested groups as deep as needed, and use the collapse control to manage tall trees."
                actions={
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100 transition hover:bg-cyan-400/20"
                      onClick={handleExecute}
                      type="button"
                    >
                      {isExecuting ? "Running..." : "Run simulation"}
                    </button>
                    <button
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:bg-white/10"
                      onClick={() =>
                        dispatch({ type: "reset", sourceId: query.sourceId })
                      }
                      type="button"
                    >
                      Reset tree
                    </button>
                    <button
                      className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100 transition hover:bg-emerald-400/20"
                      onClick={copyExportJson}
                      type="button"
                    >
                      Copy JSON
                    </button>
                  </div>
                }
              >
                <div className="space-y-4">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/50 p-4">
                    <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.24em] text-slate-400">
                      <span>{source.description}</span>
                      <span>•</span>
                      <span>{query.root.children.length} top-level groups</span>
                      <span>•</span>
                      <span>
                        {validationIssues.length} validation issue
                        {validationIssues.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="mt-4 rounded-3xl border border-white/10 bg-white/3 p-4 shadow-inner shadow-black/20">
                      <QueryGroupCard
                        dispatch={dispatch}
                        group={query.root}
                        groupPath={[]}
                        issueMap={issueMap}
                        source={source}
                        activeDragId={activeDragId}
                      />
                    </div>
                  </div>

                  {validationIssues.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {validationIssues.map((issue) => (
                        <div
                          key={`${issue.nodeId}-${issue.message}`}
                          className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100"
                        >
                          {issue.message}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                      Query validation passed. The builder will block malformed
                      group structures and incompatible operator/value
                      combinations.
                    </div>
                  )}
                </div>
              </PanelShell>

              <div className="grid gap-5 lg:grid-cols-2">
                <PanelShell
                  title="Query preview"
                  subtitle="Updates in real time as you tweak any rule or nested group."
                >
                  <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-400">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      {previewMode}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      {execution.valid ? "valid" : "blocked"}
                    </span>
                  </div>
                  <pre className="max-h-130 overflow-auto rounded-3xl border border-white/10 bg-slate-950/80 p-4 text-[0.8rem] leading-6 text-slate-100">
                    {previewText}
                  </pre>
                </PanelShell>

                <PanelShell
                  title="Execution simulator"
                  subtitle="A filtered slice of the mock dataset with sorting and pagination controls."
                >
                  <div className="mb-4 flex flex-wrap gap-3">
                    <select
                      className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                      value={effectiveSortField}
                      onChange={(event) => setSortField(event.target.value)}
                    >
                      {Object.values(source.fields).map((field) => (
                        <option key={field.key} value={field.key}>
                          Sort by {field.label}
                        </option>
                      ))}
                    </select>
                    <button
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
                      onClick={() =>
                        setSortDirection((current) =>
                          current === "asc" ? "desc" : "asc",
                        )
                      }
                      type="button"
                    >
                      {sortDirection === "asc" ? "Ascending" : "Descending"}
                    </button>
                    <select
                      className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white"
                      value={pageSize}
                      onChange={(event) =>
                        setPageSize(Number(event.target.value))
                      }
                    >
                      {[3, 4, 5, 8].map((candidate) => (
                        <option key={candidate} value={candidate}>
                          {candidate} rows per page
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3">
                    {visibleRows.length === 0 ? (
                      <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-8 text-sm text-slate-300">
                        No rows matched this query. Broaden the filter or remove
                        the current nested condition group.
                      </div>
                    ) : (
                      visibleRows.map((row, index) => (
                        <div
                          key={`${index}-${JSON.stringify(row)}`}
                          className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4"
                        >
                          <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.22em] text-slate-400">
                            <span>
                              Row {(effectivePage - 1) * pageSize + index + 1}
                            </span>
                            <span>{source.label}</span>
                          </div>
                          <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {Object.entries(row).map(([key, value]) => (
                              <div
                                key={key}
                                className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-3"
                              >
                                <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">
                                  {key}
                                </dt>
                                <dd className="mt-1 text-sm text-white">
                                  {String(value)}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-300">
                    <button
                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 disabled:opacity-40"
                      disabled={effectivePage === 1}
                      onClick={() =>
                        setPage((current) => Math.max(1, current - 1))
                      }
                      type="button"
                    >
                      Previous
                    </button>
                    <span>
                      Page {effectivePage} of {totalPages}
                    </span>
                    <button
                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 disabled:opacity-40"
                      disabled={effectivePage === totalPages}
                      onClick={() =>
                        setPage((current) => Math.min(totalPages, current + 1))
                      }
                      type="button"
                    >
                      Next
                    </button>
                  </div>
                </PanelShell>
              </div>
            </section>

            <aside className="space-y-5">
              <PanelShell
                title="Controls and shortcuts"
                subtitle="Use the buttons below or keyboard shortcuts to keep the workflow fast."
              >
                <div className="grid gap-3 text-sm text-slate-300">
                  <ShortcutRow
                    shortcut="Cmd/Ctrl + Enter"
                    label="Run simulation"
                  />
                  <ShortcutRow shortcut="Cmd/Ctrl + S" label="Save preset" />
                  <ShortcutRow
                    shortcut="Cmd/Ctrl + E"
                    label="Copy export JSON"
                  />
                  <ShortcutRow
                    shortcut="Cmd/Ctrl + I"
                    label="Import JSON from the textarea"
                  />
                  <ShortcutRow shortcut="Cmd/Ctrl + D" label="Toggle theme" />
                </div>

                <div className="mt-5 space-y-3">
                  <label className="grid gap-2 text-sm text-slate-300">
                    Preset name
                    <input
                      className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
                      value={presetName}
                      onChange={(event) => setPresetName(event.target.value)}
                      placeholder="High-value users"
                    />
                  </label>
                  <button
                    className="w-full rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
                    onClick={handleSavePreset}
                    type="button"
                  >
                    Save current query preset
                  </button>
                </div>

                <div className="mt-6 space-y-3">
                  <label className="grid gap-2 text-sm text-slate-300">
                    Import query JSON
                    <textarea
                      className="min-h-40 rounded-3xl border border-white/10 bg-slate-950/70 px-4 py-3 font-mono text-xs text-slate-100 outline-none focus:border-cyan-300/60"
                      value={importText}
                      onChange={(event) => setImportText(event.target.value)}
                      placeholder={serializeQueryState(query)}
                    />
                  </label>
                  <button
                    className="w-full rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
                    onClick={handleImportJson}
                    type="button"
                  >
                    Import JSON
                  </button>
                </div>
              </PanelShell>

              <PanelShell
                title="Query history"
                subtitle="Recent executions are cached locally and can be restored instantly."
              >
                <div className="space-y-3">
                  {history.length === 0 ? (
                    <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-8 text-sm text-slate-400">
                      Run the simulator to start capturing execution history.
                    </div>
                  ) : (
                    history.map((entry) => (
                      <button
                        key={entry.id}
                        className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/10"
                        onClick={() => restoreSnapshot(entry.snapshot)}
                        type="button"
                      >
                        <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                          <span>{prettyTimestamp(entry.timestamp)}</span>
                          <span>
                            {entry.count} row{entry.count === 1 ? "" : "s"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-white">{entry.label}</p>
                      </button>
                    ))
                  )}
                </div>
              </PanelShell>

              <PanelShell
                title="Saved presets"
                subtitle="Each preset stores the entire nested tree for one-click reuse."
              >
                <div className="space-y-3">
                  {presets.length === 0 ? (
                    <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-8 text-sm text-slate-400">
                      Save a preset to reuse a nested filter definition later.
                    </div>
                  ) : (
                    presets.map((preset) => (
                      <button
                        key={preset.id}
                        className="w-full rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-left transition hover:border-white/20 hover:bg-white/10"
                        onClick={() => restoreSnapshot(preset.snapshot)}
                        type="button"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-white">
                            {preset.name}
                          </p>
                          <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                            preset
                          </span>
                        </div>
                        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                          {prettyTimestamp(preset.createdAt)}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </PanelShell>
            </aside>
          </div>
        </div>
      </div>
    </DndContext>
  );
}

interface PanelShellProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

function PanelShell({ title, subtitle, children, actions }: PanelShellProps) {
  return (
    <section className="overflow-hidden rounded-4xl border border-white/10 bg-white/5 shadow-2xl shadow-slate-950/25 backdrop-blur-xl">
      <div className="border-b border-white/10 px-5 py-5 md:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-7 text-slate-400">
              {subtitle}
            </p>
          </div>
          {actions}
        </div>
      </div>
      <div className="px-5 py-5 md:px-6">{children}</div>
    </section>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur">
      <div className={`text-2xl font-semibold ${accent}`}>{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
        {label}
      </div>
    </div>
  );
}

function ControlBar({
  label,
  helper,
  children,
}: {
  label: string;
  helper: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
        {label}
      </div>
      <p className="mt-1 text-sm leading-6 text-slate-300">{helper}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function ShortcutRow({ shortcut, label }: { shortcut: string; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
      <span className="font-mono text-xs uppercase tracking-[0.18em] text-cyan-200">
        {shortcut}
      </span>
      <span className="text-right text-sm text-slate-300">{label}</span>
    </div>
  );
}

const QueryGroupCard = memo(function QueryGroupCard({
  group,
  groupPath,
  dispatch,
  issueMap,
  source,
  activeDragId,
}: {
  group: QueryState["root"];
  groupPath: number[];
  dispatch: React.Dispatch<QueryAction>;
  issueMap: Map<string, string[]>;
  source: ReturnType<typeof getDataSource>;
  activeDragId: string | null;
}) {
  const childIds = group.children.map((child) => child.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-white/10 bg-slate-950/70 px-4 py-4">
        <span className="text-xs uppercase tracking-[0.24em] text-slate-400">
          Group
        </span>
        <select
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          value={group.logic}
          onChange={(event) =>
            dispatch({
              type: "updateGroup",
              path: groupPath,
              updates: { logic: event.target.value as LogicOperator },
            })
          }
        >
          <option value="and">AND</option>
          <option value="or">OR</option>
        </select>
        <button
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
          onClick={() => dispatch({ type: "toggleGroup", path: groupPath })}
          type="button"
        >
          {group.collapsed ? "Expand" : "Collapse"}
        </button>
        <button
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
          onClick={() => dispatch({ type: "addRule", path: groupPath })}
          type="button"
        >
          + Rule
        </button>
        <button
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100"
          onClick={() => dispatch({ type: "addGroup", path: groupPath })}
          type="button"
        >
          + Group
        </button>
        <span className="ml-auto text-xs uppercase tracking-[0.2em] text-slate-400">
          {group.children.length} node{group.children.length === 1 ? "" : "s"}
        </span>
      </div>

      {!group.collapsed && (
        <SortableContext
          items={childIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4 pl-2">
            {group.children.map((child, index) => (
              <QueryNodeCard
                key={child.id}
                child={child}
                childPath={[...groupPath, index]}
                dispatch={dispatch}
                issueMap={issueMap}
                source={source}
                activeDragId={activeDragId}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </div>
  );
});

function QueryNodeCard({
  child,
  childPath,
  dispatch,
  issueMap,
  source,
  activeDragId,
}: {
  child: QueryState["root"]["children"][number];
  childPath: number[];
  dispatch: React.Dispatch<QueryAction>;
  issueMap: Map<string, string[]>;
  source: ReturnType<typeof getDataSource>;
  activeDragId: string | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: child.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  const issueMessages = issueMap.get(child.id) ?? [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-3xl border ${activeDragId === child.id ? "border-cyan-300/60 bg-cyan-400/10" : "border-white/10 bg-slate-950/60"} px-4 py-4 shadow-xl shadow-slate-950/20`}
    >
      <div className="flex items-start gap-4">
        <button
          className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300"
          {...attributes}
          {...listeners}
          ref={setActivatorNodeRef}
          type="button"
          aria-label="Drag node"
        >
          ⋮⋮
        </button>

        <div className="min-w-0 flex-1">
          {child.kind === "group" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs uppercase tracking-[0.24em] text-slate-400">
                  Nested group
                </span>
                <button
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-200"
                  onClick={() =>
                    dispatch({ type: "toggleGroup", path: childPath })
                  }
                  type="button"
                >
                  {child.collapsed ? "Expand" : "Collapse"}
                </button>
                <button
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-200"
                  onClick={() =>
                    dispatch({ type: "removeNode", path: childPath })
                  }
                  type="button"
                >
                  Remove
                </button>
              </div>

              {!child.collapsed && (
                <QueryGroupCard
                  dispatch={dispatch}
                  group={child}
                  groupPath={childPath}
                  issueMap={issueMap}
                  source={source}
                  activeDragId={activeDragId}
                />
              )}
            </div>
          ) : (
            <RuleEditor
              child={child}
              childPath={childPath}
              dispatch={dispatch}
              issueMessages={issueMessages}
              source={source}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const RuleEditor = memo(function RuleEditor({
  child,
  childPath,
  dispatch,
  issueMessages,
  source,
}: {
  child: RuleNode;
  childPath: number[];
  dispatch: React.Dispatch<QueryAction>;
  issueMessages: string[];
  source: ReturnType<typeof getDataSource>;
}) {
  const field = getFieldDefinition(source, child.fieldKey);
  const operators = getAllowedOperators(source, child.fieldKey);
  const needsValue = !["isNull", "isNotNull"].includes(child.operator);
  const valueControl = renderValueControl(
    field.type,
    child.operator,
    child.value,
    (nextValue) =>
      dispatch({
        type: "updateRule",
        path: childPath,
        updates: { value: nextValue },
      }),
    field,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs uppercase tracking-[0.24em] text-slate-400">
          Rule
        </span>
        <button
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-slate-200"
          onClick={() => dispatch({ type: "removeNode", path: childPath })}
          type="button"
        >
          Remove
        </button>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_1fr_1.1fr]">
        <label className="grid gap-2 text-sm text-slate-300">
          Field
          <select
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
            value={child.fieldKey}
            onChange={(event) => {
              const nextFieldKey = event.target.value;
              const nextOperator = getDefaultOperator(source, nextFieldKey);
              const nextField = getFieldDefinition(source, nextFieldKey);

              dispatch({
                type: "updateRule",
                path: childPath,
                updates: {
                  fieldKey: nextFieldKey,
                  operator: nextOperator,
                  value: getDefaultRuleValue(nextField.type, nextOperator),
                },
              });
            }}
          >
            {Object.values(source.fields).map((candidate) => (
              <option key={candidate.key} value={candidate.key}>
                {candidate.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm text-slate-300">
          Operator
          <select
            className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
            value={child.operator}
            onChange={(event) => {
              const nextOperator = event.target.value as RuleNode["operator"];
              const nextField = getFieldDefinition(source, child.fieldKey);
              dispatch({
                type: "updateRule",
                path: childPath,
                updates: {
                  operator: nextOperator,
                  value: getDefaultRuleValue(nextField.type, nextOperator),
                },
              });
            }}
          >
            {operators.map((candidate) => (
              <option key={candidate} value={candidate}>
                {getOperatorLabel(candidate)}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-2 text-sm text-slate-300">
          Value
          {needsValue ? (
            valueControl
          ) : (
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-slate-400">
              This operator does not require a value.
            </div>
          )}
        </div>
      </div>

      {issueMessages.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {issueMessages.map((message) => (
            <div key={message}>{message}</div>
          ))}
        </div>
      )}
    </div>
  );
});

function renderValueControl(
  fieldType: ReturnType<typeof getFieldDefinition>["type"],
  operator: RuleNode["operator"],
  value: string,
  onChange: (nextValue: string) => void,
  field: ReturnType<typeof getFieldDefinition>,
) {
  if (fieldType === "enum" && !["between", "inArray"].includes(operator)) {
    return (
      <select
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {field.options?.map((candidate) => (
          <option key={candidate} value={candidate}>
            {candidate}
          </option>
        ))}
      </select>
    );
  }

  if (fieldType === "boolean") {
    return (
      <select
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }

  if (
    fieldType === "date" &&
    operator !== "between" &&
    operator !== "inArray"
  ) {
    return (
      <input
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (
    fieldType === "number" &&
    operator !== "between" &&
    operator !== "inArray"
  ) {
    return (
      <input
        className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <input
      className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-cyan-300/60"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={
        operator === "between"
          ? "start, end"
          : operator === "inArray"
            ? "value 1, value 2"
            : "Enter a value"
      }
      type="text"
    />
  );
}
