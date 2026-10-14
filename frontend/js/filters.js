// filters.js - fills the filters form and reads user input
const form = document.getElementById("filters");

function hourLabel(h) {
  if (h === 0) return "12 AM";
  if (h < 12) return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

function addOptions(select, items) {
  if (!select || !items) return;
  for (const item of items) {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = item.name;
    select.appendChild(opt);
  }
}

function setupFilters(meta) {
  for (const input of [form.start, form.end]) {
    if (input && meta.date_range) {
      input.min = meta.date_range.min;
      input.max = meta.date_range.max;
    }
  }

  const hours = [];
  for (let h = 0; h < 24; h++) hours.push({ id: h, name: hourLabel(h) });
  addOptions(form.hour_from, [{ id: "", name: "Any" }, ...hours]);
  addOptions(form.hour_to, [{ id: "", name: "Any" }, ...hours]);

  if (meta.boroughs) addOptions(form.borough, meta.boroughs.filter(b => b.name !== "Unknown"));
  if (meta.zones) addOptions(form.zone, meta.zones.map(z => ({ id: z.id, name: `${z.name} (${z.borough})` })));
  if (meta.distance_bands) addOptions(form.dist, meta.distance_bands);
  if (meta.fare_bands) addOptions(form.fare, meta.fare_bands);
  if (meta.payment_types) addOptions(form.payment, meta.payment_types);
}

function getFilters() {
  const filters = {};
  if (!form) return filters;
  for (const [key, value] of new FormData(form).entries()) {
    if (value !== "") filters[key] = value;
  }
  if (filters.hour_from && !filters.hour_to) filters.hour_to = 23;
  if (filters.hour_to && !filters.hour_from) filters.hour_from = 0;
  return filters;
}
//verified filter event handlerd and querry strings parser