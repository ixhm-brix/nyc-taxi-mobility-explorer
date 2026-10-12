// Dana's Frontend Logic & Mobility Dashboard
// Mock Data structure representing TLC trip fact records joined with zone lookups
const mockTrips = [
  {
    id: 101,
    pickup_time: "2024-01-15T08:15:00",
    dropoff_time: "2024-01-15T08:35:00",
    pickup_borough: "Manhattan",
    pickup_zone: "Upper East Side South",
    dropoff_borough: "Manhattan",
    dropoff_zone: "Midtown Center",
    distance: 2.3,
    fare: 15.5,
    tip: 3.5,
    total: 21.8,
    speed_mph: 6.9
  },
  {
    id: 102,
    pickup_time: "2024-01-15T09:05:00",
    dropoff_time: "2024-01-15T09:45:00",
    pickup_borough: "Queens",
    pickup_zone: "JFK Airport",
    dropoff_borough: "Manhattan",
    dropoff_zone: "Times Square",
    distance: 16.8,
    fare: 70.0,
    tip: 14.0,
    total: 89.5,
    speed_mph: 25.2
  },
  {
    id: 103,
    pickup_time: "2024-01-15T13:40:00",
    dropoff_time: "2024-01-15T14:05:00",
    pickup_borough: "Brooklyn",
    pickup_zone: "Williamsburg",
    dropoff_borough: "Brooklyn",
    dropoff_zone: "DUMBO",
    distance: 3.4,
    fare: 17.0,
    tip: 3.0,
    total: 22.0,
    speed_mph: 8.2
  },
  {
    id: 104,
    pickup_time: "2024-01-15T17:50:00",
    dropoff_time: "2024-01-15T18:35:00",
    pickup_borough: "Manhattan",
    pickup_zone: "Financial District North",
    dropoff_borough: "Brooklyn",
    dropoff_zone: "Downtown Brooklyn",
    distance: 4.1,
    fare: 23.0,
    tip: 4.5,
    total: 30.5,
    speed_mph: 5.5
  },
  {
    id: 105,
    pickup_time: "2024-01-15T21:10:00",
    dropoff_time: "2024-01-15T21:28:00",
    pickup_borough: "Bronx",
    pickup_zone: "Mott Haven",
    dropoff_borough: "Bronx",
    dropoff_zone: "Fordham",
    distance: 5.6,
    fare: 21.0,
    tip: 2.0,
    total: 25.5,
    speed_mph: 18.7
  },
  {
    id: 106,
    pickup_time: "2024-01-15T23:15:00",
    dropoff_time: "2024-01-15T23:30:00",
    pickup_borough: "Queens",
    pickup_zone: "Astoria",
    dropoff_borough: "Queens",
    dropoff_zone: "Long Island City",
    distance: 2.9,
    fare: 13.5,
    tip: 2.5,
    total: 18.0,
    speed_mph: 11.6
  }
];

// Application State
let currentTrips = [...mockTrips];
let chartHourlyInstance = null;
let chartBoroughInstance = null;

// DOM Elements Selection
const kpiTotalTrips = document.getElementById("kpi-total-trips");
const kpiAvgFare = document.getElementById("kpi-avg-fare");
const kpiAvgDistance = document.getElementById("kpi-avg-distance");
const kpiAvgSpeed = document.getElementById("kpi-avg-speed");

const filterBorough = document.getElementById("filter-borough");
const filterMaxDistance = document.getElementById("filter-max-distance");
const filterMaxFare = document.getElementById("filter-max-fare");
const sortSelect = document.getElementById("sort-select");
const btnReset = document.getElementById("btn-reset");

const tripsTableBody = document.getElementById("trips-table-body");
const tripModal = document.getElementById("trip-modal");
const modalBody = document.getElementById("modal-body");
const modalClose = document.getElementById("modal-close");

// Update KPI Metric Cards
function updateKPIs(trips) {
  if (trips.length === 0) {
    kpiTotalTrips.textContent = "0";
    kpiAvgFare.textContent = "$0.00";
    kpiAvgDistance.textContent = "0.0 mi";
    kpiAvgSpeed.textContent = "0.0 mph";
    return;
  }

  const count = trips.length;
  const avgFare = trips.reduce((sum, t) => sum + t.fare, 0) / count;
  const avgDist = trips.reduce((sum, t) => sum + t.distance, 0) / count;
  const avgSpeed = trips.reduce((sum, t) => sum + t.speed_mph, 0) / count;

  kpiTotalTrips.textContent = count.toLocaleString();
  kpiAvgFare.textContent = `$${avgFare.toFixed(2)}`;
  kpiAvgDistance.textContent = `${avgDist.toFixed(1)} mi`;
  kpiAvgSpeed.textContent = `${avgSpeed.toFixed(1)} mph`;
}

// Render Trips Table Rows
function renderTable(trips) {
  tripsTableBody.innerHTML = "";

  if (trips.length === 0) {
    tripsTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:16px;">No trips match current filters.</td></tr>`;
    return;
  }

  trips.forEach((trip) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>#${trip.id}</td>
      <td>${trip.pickup_zone} (${trip.pickup_borough})</td>
      <td>${trip.dropoff_zone} (${trip.dropoff_borough})</td>
      <td>${trip.distance.toFixed(1)}</td>
      <td>$${trip.fare.toFixed(2)}</td>
      <td>$${trip.total.toFixed(2)}</td>
      <td><button class="btn secondary" style="padding: 4px 10px; font-size: 12px;">View</button></td>
    `;
    row.addEventListener("click", () => showDetailModal(trip));
    tripsTableBody.appendChild(row);
  });
}

// Display Detail Modal for Selected Trip
function showDetailModal(trip) {
  modalBody.innerHTML = `
    <div class="detail-item"><strong>Trip ID:</strong> <span>#${trip.id}</span></div>
    <div class="detail-item"><strong>Pickup Time:</strong> <span>${new Date(trip.pickup_time).toLocaleString()}</span></div>
    <div class="detail-item"><strong>Dropoff Time:</strong> <span>${new Date(trip.dropoff_time).toLocaleString()}</span></div>
    <div class="detail-item"><strong>Origin:</strong> <span>${trip.pickup_zone} (${trip.pickup_borough})</span></div>
    <div class="detail-item"><strong>Destination:</strong> <span>${trip.dropoff_zone} (${trip.dropoff_borough})</span></div>
    <div class="detail-item"><strong>Trip Distance:</strong> <span>${trip.distance} miles</span></div>
    <div class="detail-item"><strong>Calculated Speed:</strong> <span>${trip.speed_mph} mph</span></div>
    <div class="detail-item"><strong>Base Fare:</strong> <span>$${trip.fare.toFixed(2)}</span></div>
    <div class="detail-item"><strong>Tip:</strong> <span>$${trip.tip.toFixed(2)}</span></div>
    <div class="detail-item"><strong>Total Amount:</strong> <span>$${trip.total.toFixed(2)}</span></div>
  `;
  tripModal.classList.remove("hidden");
}

modalClose.addEventListener("click", () => tripModal.classList.add("hidden"));
window.addEventListener("click", (e) => {
  if (e.target === tripModal) tripModal.classList.add("hidden");
});

// Update Analytics Charts with Chart.js
function updateCharts(trips) {
  // 1. Hourly Mobility Demand
  const hourCounts = new Array(24).fill(0);
  trips.forEach((t) => {
    const hour = new Date(t.pickup_time).getHours();
    hourCounts[hour] += 1;
  });

  if (chartHourlyInstance) chartHourlyInstance.destroy();
  const ctxHourly = document.getElementById("chart-hourly").getContext("2d");
  chartHourlyInstance = new Chart(ctxHourly, {
    type: "bar",
    data: {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [{
        label: "Trip Volume",
        data: hourCounts,
        backgroundColor: "#2563eb"
      }]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });

  // 2. Borough Distribution Share
  const boroughCounts = {};
  trips.forEach((t) => {
    boroughCounts[t.pickup_borough] = (boroughCounts[t.pickup_borough] || 0) + 1;
  });

  if (chartBoroughInstance) chartBoroughInstance.destroy();
  const ctxBorough = document.getElementById("chart-borough").getContext("2d");
  chartBoroughInstance = new Chart(ctxBorough, {
    type: "doughnut",
    data: {
      labels: Object.keys(boroughCounts),
      datasets: [{
        data: Object.values(boroughCounts),
        backgroundColor: ["#10b981", "#6366f1", "#f59e0b", "#ec4899", "#8b5cf6"]
      }]
    },
    options: { responsive: true }
  });
}

// Filtering and Sorting Pipeline
function applyFiltersAndSort() {
  const selectedBorough = filterBorough.value;
  const maxDistance = parseFloat(filterMaxDistance.value);
  const maxFare = parseFloat(filterMaxFare.value);
  const sortMode = sortSelect.value;

  let filtered = mockTrips.filter((trip) => {
    if (selectedBorough !== "ALL" && trip.pickup_borough !== selectedBorough) return false;
    if (!isNaN(maxDistance) && trip.distance > maxDistance) return false;
    if (!isNaN(maxFare) && trip.fare > maxFare) return false;
    return true;
  });

  if (sortMode === "fare-desc") {
    filtered.sort((a, b) => b.fare - a.fare);
  } else if (sortMode === "fare-asc") {
    filtered.sort((a, b) => a.fare - b.fare);
  } else if (sortMode === "distance-desc") {
    filtered.sort((a, b) => b.distance - a.distance);
  } else if (sortMode === "distance-asc") {
    filtered.sort((a, b) => a.distance - b.distance);
  }

  currentTrips = filtered;
  updateKPIs(currentTrips);
  renderTable(currentTrips);
  updateCharts(currentTrips);
}

// Setup Event Listeners
filterBorough.addEventListener("change", applyFiltersAndSort);
filterMaxDistance.addEventListener("input", applyFiltersAndSort);
filterMaxFare.addEventListener("input", applyFiltersAndSort);
sortSelect.addEventListener("change", applyFiltersAndSort);

btnReset.addEventListener("click", () => {
  filterBorough.value = "ALL";
  filterMaxDistance.value = "";
  filterMaxFare.value = "";
  sortSelect.value = "fare-desc";
  applyFiltersAndSort();
});

// Initial Render on page load
console.log("Dashboard initialized successfully with mock dataset!");
applyFiltersAndSort();

// Data table and modal utility helpers
function formatUSD(val) {
 if (typeof val !== "number"){
  return"$0.00";
}
return "$" + val.toFixed(2);
}
function formatMiles(dist){
if (typeof dist !== "number"){
  return "0.0 mi";
}
return dist.toFixed(1) +" mi";
}
function getCongestionCategory(speedMph){
  if (speedMph < 10){
    return "High Congestion";
  }
  if (speedMph < 20){
    return "Moderate Flow";
  }
  return "Free Flow";
}
function getBoroughBadColor(borough){
  switch (borough){
    case "Manahattan":
      return "2563eb";
    case "Brooklyn":
      return "10b981";
    case "Queens":
      return "f59e0b";  
    case "Bronx":
      return"ec4899";
    case "Staten Island":
      return "#8b5cf6"
    default:
      return "6b7200";        
  }
}
function  computeTippercentage(fare, tip){
  if (!fare || fare <= 0){
    return 0;
}
const ratio =(tip / fare) * 100;
return parseFloat(ratio.toFixed(1));  
}
function classifyTripDistance(miles){
  if(miles<=2.0){
    return "Short Commute";
  }
  if(miles <= 10.0){
    return "short Commute";
  
  }
  return "Long Distance";
}
function getTripCostPerMile(fare, miles){
  if(!miles || miles <=0){
    return 0.0;
  }
  const costPermile = fare / miles;
  return parseFloat(costPermile.toFixed(2));
}
function ValidateTripRecord(trip) {
  const hasId = typeof trip.id == "number";
  const hasFar =typeof trip.fare == "number" && trip.fare >= 0;
  const hasDist = typeof trip.distance == "number" && trip.distance >= 0;
  return hasId && hasFar && hasDist;
}