import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import {
  DASHBOARD_EXAMPLE_FLOW,
  DASHBOARD_EXAMPLE_RECIPES,
  DASHBOARD_LANGUAGE_PRIMITIVES,
  type DashboardRecipe,
} from "@/features/home-analytics/dashboard-examples";
import { HOME_DASHBOARD_SECTIONS, getHomeDashboardSectionVisuals } from "@/features/home-analytics/dashboard-config";

const recipeKindLabel: Record<DashboardRecipe["kind"], string> = {
  metric: "Metric",
  chart: "Chart",
  filter: "Filter",
  export: "Export",
  "backend-field": "Backend field",
};

function formatDeclaration(recipe: DashboardRecipe): string {
  if (!recipe.visualDeclaration) return recipe.code;
  return JSON.stringify(recipe.visualDeclaration, null, 2);
}

function getNumericValue(row: Record<string, string | number>, keys: string[]): number {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return 0;
}

function MockMetric({ recipe }: { recipe: DashboardRecipe }) {
  const clearRow = recipe.mockRows.find((row) => row.label === "Clear");
  const damageRow = recipe.mockRows.find((row) => row.label === "Damaged");
  const rateRow = recipe.mockRows.find((row) => row.label === "Clear Rate");

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Mock metric</p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-black tracking-tight text-slate-950">{String(rateRow?.value ?? "n/a")}</p>
          <p className="mt-1 text-xs font-semibold text-slate-600">Clear rate</p>
        </div>
        <div className="text-right text-xs font-bold text-slate-700">
          <p>Clear {String(clearRow?.value ?? 0)}</p>
          <p>Damaged {String(damageRow?.value ?? 0)}</p>
        </div>
      </div>
    </div>
  );
}

function MockBars({ recipe }: { recipe: DashboardRecipe }) {
  const maxValue = Math.max(
    1,
    ...recipe.mockRows.map((row) => getNumericValue(row, ["damaged", "clear", "total", "value"]))
  );

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Mock chart rows</p>
      {recipe.mockRows.map((row) => {
        const damaged = getNumericValue(row, ["damaged"]);
        const clear = getNumericValue(row, ["clear"]);
        const label = String(row.label ?? row.inspectionType ?? row.field ?? row.key ?? "Row");

        return (
          <div key={label} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-700">
              <span>{label}</span>
              <span>
                {damaged ? `${damaged} damaged` : ""}
                {damaged && clear ? " / " : ""}
                {clear ? `${clear} clear` : ""}
              </span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-white ring-1 ring-slate-200">
              <div className="bg-rose-500" style={{ width: `${Math.max(3, (damaged / maxValue) * 100)}%` }} />
              <div className="bg-emerald-500" style={{ width: `${Math.max(3, (clear / maxValue) * 100)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MockTable({ recipe }: { recipe: DashboardRecipe }) {
  const headers = Array.from(new Set(recipe.mockRows.flatMap((row) => Object.keys(row))));

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
        <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-3 py-2">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white font-semibold text-slate-700">
          {recipe.mockRows.map((row, index) => (
            <tr key={`${recipe.id}-${index}`}>
              {headers.map((header) => (
                <td key={header} className="px-3 py-2">
                  {String(row[header] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MockFilters({ recipe }: { recipe: DashboardRecipe }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Mock active filters</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {recipe.mockRows.map((row) => (
          <span
            key={String(row.key)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700"
          >
            {String(row.key)}: {String(row.value)}
          </span>
        ))}
      </div>
    </div>
  );
}

function RecipePreview({ recipe }: { recipe: DashboardRecipe }) {
  if (recipe.kind === "metric") return <MockMetric recipe={recipe} />;
  if (recipe.kind === "chart") return <MockBars recipe={recipe} />;
  if (recipe.kind === "filter") return <MockFilters recipe={recipe} />;
  return <MockTable recipe={recipe} />;
}

export default function DashboardExamplesPage() {
  return (
    <main className="space-y-6">
      <section className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.32em] text-slate-500">Dashboard examples</p>
        <h1 className="text-2xl font-black tracking-tight text-slate-950">Home Analytics Framework Examples</h1>
        <p className="max-w-4xl text-sm leading-6 text-slate-700">
          This page shows the small dashboard language behind `/home`: measures, dimensions, slicers, adapters, visual
          declarations, rendered visuals, and exports. It uses mock examples only and does not change production data.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-9">
          {DASHBOARD_EXAMPLE_FLOW.map((step, index) => (
            <div key={step} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Step {index + 1}</p>
              <p className="mt-2 text-xs font-black text-slate-900">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {HOME_DASHBOARD_SECTIONS.map((section) => (
          <Card key={section.id}>
            <CardHeader title={section.title} subtitle={section.description} />
            <CardContent className="space-y-2">
              {getHomeDashboardSectionVisuals(section.id).map((visual) => (
                <div key={visual.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-black text-slate-950">{visual.title}</p>
                  <p className="mt-1 text-[11px] leading-5 text-slate-600">{visual.measures.join(" + ")}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DASHBOARD_LANGUAGE_PRIMITIVES.map((primitive) => (
          <div key={primitive.name} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black text-slate-950">{primitive.name}</p>
            <p className="mt-2 text-xs leading-5 text-slate-700">{primitive.businessMeaning}</p>
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-[11px] font-semibold leading-5 text-slate-700">
              {primitive.codeMeaning}
            </p>
            <p className="mt-3 text-[11px] font-bold text-slate-500">{primitive.homeExample}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-950">Copyable Recipes</h2>
          <p className="mt-1 text-sm text-slate-700">
            Each recipe shows the business question, the declaration, the implementation steps, and a mock rendering.
          </p>
        </div>

        {DASHBOARD_EXAMPLE_RECIPES.map((recipe) => (
          <article key={recipe.id} className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_420px]">
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                  {recipeKindLabel[recipe.kind]}
                </p>
                <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950">{recipe.title}</h3>
                <p className="mt-2 text-sm font-semibold text-slate-700">{recipe.businessQuestion}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{recipe.shortAnswer}</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {recipe.copyableSteps.map((step, index) => (
                  <div key={step} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Step {index + 1}</p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-700">{step}</p>
                  </div>
                ))}
              </div>

              <pre className="max-h-[360px] overflow-auto rounded-lg bg-slate-950 p-4 text-[11px] leading-5 text-slate-100">
                <code>{formatDeclaration(recipe)}</code>
              </pre>
            </div>

            <div className="space-y-4">
              <RecipePreview recipe={recipe} />
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950">
                Damaged and clear values must be explicit backend fields. Missing split fields should create a coverage
                warning, not a guessed number.
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
