// charts.js - renders Chart.js visualizations
const COLOR = "#1f4e79";
const COLOR_LIGHT = "rgba(31, 78, 121, 0.15)";
const chartObjects = {};

function drawChart(canvasId, type, labels, values, label) {
  if (chartObjects[canvasId]) {
    chartObjects[canvasId].data.labels = labels;
    chartObjects[canvasId].data.datasets[0].data = values;
    chartObjects[canvasId].update();
    return;
  }

  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  chartObjects[canvasId] = new Chart(canvas, {
    type: type,
    data: {
      labels: labels,
      datasets: [{
        label: label,
        data: values,
        borderColor: COLOR,
        backgroundColor: type === "line" ? COLOR_LIGHT : COLOR,
        fill: type === "line",
        tension: 0.25,
        pointRadius: type === "line" ? 2 : 0,
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: type === "bar" } },
    },
  });
}

const charts = {
  daily(rows) {
    drawChart("chart-daily", "line", rows.map(r => r.date.slice(5)), rows.map(r => r.trips), "Trips");
  },
  hourly(rows) {
    drawChart("chart-hourly", "bar", rows.map(r => hourLabel(r.hour)), rows.map(r => Math.round(r.trips / r.days)), "Trips per hour");
    drawChart("chart-speed", "line", rows.map(r => hourLabel(r.hour)), rows.map(r => r.avg_speed), "Average speed (mph)");
  },
  distance(rows) {
    drawChart("chart-distance", "bar", rows.map(r => r.label), rows.map(r => r.fare_per_mile), "Fare per mile ($)");
  },
};
// Chart rendering module verified