export interface CircleVehicleDraft {
  key: string;
  vin: string;
  year: string;
  make: string;
  model: string;
  submodel: string;
  color: string;
  bay: string;
}

export interface CircleCsvRowError {
  row: number;
  value: string;
  message: string;
}

export interface CircleCsvPreview {
  vehicles: CircleVehicleDraft[];
  errors: CircleCsvRowError[];
}

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
const HEADER_ALIASES: Record<keyof Omit<CircleVehicleDraft, "key">, string[]> = {
  vin: ["vin", "vehicle identification number"],
  year: ["year", "model year"],
  make: ["make"],
  model: ["model"],
  submodel: ["submodel", "sub model", "trim"],
  color: ["color", "colour"],
  bay: ["bay", "bay location", "slot"],
};

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === "\"") {
      if (quoted && line[index + 1] === "\"") {
        value += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      cells.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  cells.push(value.trim());
  return cells;
}

function normalizedHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

export function normalizeCircleVin(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function isValidCircleVin(value: string): boolean {
  return VIN_PATTERN.test(normalizeCircleVin(value));
}

export function createCircleVehicleDraft(
  input: Partial<Omit<CircleVehicleDraft, "key">> = {},
): CircleVehicleDraft {
  return {
    key: crypto.randomUUID(),
    vin: normalizeCircleVin(input.vin ?? ""),
    year: input.year?.trim() ?? "",
    make: input.make?.trim() ?? "",
    model: input.model?.trim() ?? "",
    submodel: input.submodel?.trim() ?? "",
    color: input.color?.trim() ?? "",
    bay: input.bay?.trim() ?? "",
  };
}

export function parseCircleVehicleCsv(text: string): CircleCsvPreview {
  const rows = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map(parseCsvLine)
    .filter((row) => row.some((cell) => cell.trim()));
  if (rows.length === 0) return { vehicles: [], errors: [] };

  const first = rows[0].map(normalizedHeader);
  const indexes = Object.fromEntries(
    Object.entries(HEADER_ALIASES).map(([field, aliases]) => [
      field,
      first.findIndex((header) => aliases.includes(header)),
    ]),
  ) as Record<keyof Omit<CircleVehicleDraft, "key">, number>;
  const hasHeader = indexes.vin >= 0;
  if (!hasHeader) {
    indexes.vin = 0;
    indexes.year = 1;
    indexes.make = 2;
    indexes.model = 3;
    indexes.submodel = 4;
    indexes.color = 5;
    indexes.bay = 6;
  }

  const vehicles: CircleVehicleDraft[] = [];
  const errors: CircleCsvRowError[] = [];
  const seen = new Set<string>();
  rows.slice(hasHeader ? 1 : 0).forEach((cells, offset) => {
    const rowNumber = offset + (hasHeader ? 2 : 1);
    const read = (field: keyof Omit<CircleVehicleDraft, "key">) =>
      indexes[field] >= 0 ? cells[indexes[field]] ?? "" : "";
    const vin = normalizeCircleVin(read("vin"));
    if (!isValidCircleVin(vin)) {
      errors.push({ row: rowNumber, value: read("vin"), message: "VIN must contain 17 valid characters." });
      return;
    }
    if (seen.has(vin)) {
      errors.push({ row: rowNumber, value: vin, message: "Duplicate VIN in this CSV." });
      return;
    }
    seen.add(vin);
    vehicles.push(createCircleVehicleDraft({
      vin,
      year: read("year"),
      make: read("make"),
      model: read("model"),
      submodel: read("submodel"),
      color: read("color"),
      bay: read("bay"),
    }));
  });
  return { vehicles, errors };
}
