function escapeCsvValue(value) {
  const text = value === null || value === undefined ? "" : String(value);

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }

  return text;
}

function toCsv(rows = [], columns = []) {
  const header = columns.map((column) => escapeCsvValue(column.header)).join(",");
  const lines = rows.map((row) =>
    columns.map((column) => escapeCsvValue(row?.[column.key])).join(",")
  );

  return [header, ...lines].join("\n");
}

module.exports = {
  toCsv
};
