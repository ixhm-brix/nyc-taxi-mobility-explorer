# Urban Mobility Data Explorer: API

Base URL: `http://127.0.0.1:5000`. All endpoints are `GET` and return JSON.

## Contents

- [Response envelope](#response-envelope)
- [Errors](#errors)
- [Shared filters](#shared-filters)
- [Metric fields](#metric-fields)
- [Endpoints](#endpoints)
- [Trip explorer in detail](#trip-explorer-in-detail)
- [Examples](#examples)
- [Mock data](#mock-data)

## Response envelope

Every successful response has the same shape:

```json
{
  "data": { },
  "meta": { "ignored_filters": [] }
}
```

- `data` holds the payload: an object or an array, depending on the endpoint.
- `meta` holds context: paging, ranking details, and `ignored_filters`.
  `ignored_filters` lists any active filters this endpoint could not apply. For example, the route endpoints read the origin–destination roll-up, which has no date column. The dashboard shows a note when this list is not empty.

## Errors

Errors on any `/api/` path return JSON with an `error` code and a readable `message`:

```json
{ "error": "invalid_filter", "message": "hour_from must be between 0 and 23" }
```

| Status | `error` | When |
|---|---|---|
| 400 | `invalid_filter` | A query parameter fails validation (bad date, out-of-range id, unknown sort key). |
| 404 | `not_found` | Unknown zone id or trip id. |
| 405 | `method_not_allowed` | Any method other than `GET` (e.g. `POST`). |
| 503 | `query_timeout` | A filter combination needed a scan longer than `QUERY_TIMEOUT_S` (default 8 s) and was stopped. |
| 503 | `database_missing` | The SQLite file has not been built yet. |

## Shared filters

Every analytical endpoint accepts the same optional query parameters. Combine them freely.

| Param | Type | Example | Meaning |
|---|---|---|---|
| `start` | `YYYY-MM-DD` | `2019-01-07` | Pickup date, inclusive |
| `end` | `YYYY-MM-DD` | `2019-01-13` | Pickup date, inclusive |
| `hour_from` | 0–23 | `22` | Pickup hour window start |
| `hour_to` | 0–23 | `4` | Pickup hour window end. If `hour_from` > `hour_to`, the window wraps past midnight. |
| `days` | list of 0–6 | `5,6` | Day of week (0 = Monday) |
| `borough` | id | `4` | Pickup borough (ids from `/api/meta`) |
| `zone` | 1–265 | `161` | Pickup zone (overrides `borough`) |
| `payment` | list of ids | `1,2` | Payment type |
| `dist` | list of ids | `1,2` | Distance band: 1 = under 1 mi, 2 = 1–2, 3 = 2–5, 4 = 5–10, 5 = 10–20, 6 = 20+ |
| `fare` | list of ids | `4,5` | Fare band: 1 = under $10, 2 = $10–20, 3 = $20–40, 4 = $40–70, 5 = $70+ |

Lists are comma-separated.

**Rules worth knowing**

- An invalid format, an impossible date, an out-of-range value, or `start` after `end` returns `400 invalid_filter`.
- An hour window wraps past midnight when `hour_from` > `hour_to`: `22` to `4` means 22:00–04:59.
- Duplicates in a list are removed. Selecting all seven `days` means no day filter.
- If both `zone` and `borough` are given, the zone wins and the borough is ignored.

## Metric fields

Every aggregate row carries these fields. All are ratio-of-sums, so a zone with 30,000 trips weighs more than a zone with 3.

| Field | Definition |
|---|---|
| `trips` | Trip count |
| `revenue` | Σ total_amount (USD) |
| `avg_fare` | Σ fare ÷ trips |
| `avg_distance` | Σ miles ÷ trips |
| `avg_duration` | Σ minutes ÷ trips |
| `avg_speed` | Σ miles ÷ Σ hours (network speed, mph) |
| `fare_per_mile` | Σ fare ÷ Σ miles |
| `tip_pct` | Mean card tip as a % of fare (card trips only; cash tips are not recorded) |
| `airport_share` | % of trips touching JFK, LaGuardia or Newark |
| `cross_borough_share` | % of trips ending in a different borough |
| `card_share` | % of trips paid by card |

## Endpoints

### Reference

| Endpoint | Returns |
|---|---|
| `GET /api/health` | `{status, trips}` |
| `GET /api/meta` | Date range, boroughs, zones, payment types, distance/fare/time bands, and the last load run. Used to build the filter controls. |
| `GET /api/quality` | `{run, rules[]}`: the cleaning log. Each rule has `rule_code`, `action` (`excluded`, `flagged` or `repaired`), `description` and `record_count`. |

### Overview and time

| Endpoint | Returns |
|---|---|
| `GET /api/summary` | `{current, baseline}`. KPIs for the filtered set and for the whole month, so the client can show deltas. `current.days` is the number of distinct dates. |
| `GET /api/timeseries/daily` | `[{date, dow, …metrics}]`, one row per day |
| `GET /api/timeseries/hourly` | `[{hour, time_band, days, …metrics}]`. Divide `trips` by `days` for an average hour. |
| `GET /api/heatmap` | `[{dow, hour, days, trips_per_day, …metrics}]`, a 7 × 24 grid normalised by the number of matching dates |
| `GET /api/insights` | Three insight cards: `[{id, title, headline, detail, value, value_label, series[], unit}]` |

### Space

| Endpoint | Returns |
|---|---|
| `GET /api/zones/geojson` | A FeatureCollection of 263 zone polygons in WGS84. `feature.id` = LocationID. Cached by the server. |
| `GET /api/zones/metrics` | `[{location_id, zone, borough, …metrics}]`, one row per pickup zone |
| `GET /api/zones/rank?metric=&order=&k=&min_trips=` | Top-K zones. `metric` is any metric field; `order` is `desc` (default) or `asc`; `k` defaults to 10; `min_trips` defaults to 100. Ranked with `algorithms/top_k_heap.py`. `meta.candidates` = zones considered. |
| `GET /api/zones/<id>` | `{zone, metrics, hourly[], top_destinations[], top_origins[]}` |

### Routes

| Endpoint | Returns |
|---|---|
| `GET /api/routes/top?by=&order=&k=&min_trips=&same_zone=` | Top-K origin→destination pairs. `by` is one of `trips`, `avg_fare`, `avg_distance`, `avg_duration`, `avg_speed` or `detour_index`. `min_trips` defaults to 50 for averages. `same_zone=1` keeps trips that start and end in the same zone. Applies only the hour, day and area filters (see `meta.ignored_filters`). |
| `GET /api/flows/boroughs` | Borough × borough matrix: `[{origin, destination, trips, avg_fare, …}]` |

### Economics

| Endpoint | Returns |
|---|---|
| `GET /api/breakdown/distance` | `[{band_id, label, …metrics}]`, one row per distance band |
| `GET /api/breakdown/payment` | `[{id, label, …metrics}]`, one row per payment type |

### Trips

| Endpoint | Returns |
|---|---|
| `GET /api/trips?sort=&order=&page=&page_size=` | One page of trips. `meta` = `{page, page_size, total, pages, sort, order, ignored_filters}`. See [Trip explorer in detail](#trip-explorer-in-detail). |
| `GET /api/trips/<id>` | `{trip, route_peers}`. Every column, with labels joined in, plus the average for the same route, hour and day type, for comparison. |

## Trip explorer in detail

Files: `backend/routes/trips.py`, `backend/queries/trips_page.sql`, `backend/queries/trip_detail.sql`.

### Parameters

| Parameter | Allowed values | What happens otherwise |
|---|---|---|
| `sort` | `pickup` (default), `distance`, `fare`, `duration`, `speed`. Case-sensitive. | `400 invalid_filter`, also for an empty value. |
| `order` | `asc` or `desc` (default). Case-insensitive. | Any other value is treated as `desc`. Not rejected. |
| `page` | Integer, default 1. | Not an integer: 400. Below 1: set to 1. Past the last page: 200 with an empty `data` list. |
| `page_size` | Integer 1–100, default 25. | Not an integer: 400. Below 1: set to 1. Above 100: set to 100. |
| Shared filters | All of them (see [Shared filters](#shared-filters)). | Same rules as everywhere else. |

The trip explorer supports every shared filter, so `meta.ignored_filters` is always empty here.

### Response

| Endpoint | `data` | `meta` |
|---|---|---|
| `GET /api/trips` | List of trips for the page: ids, pickup/drop-off times, zones and boroughs, passengers, distance, duration, speed, fare, tip, tip %, total, $/mile, payment. | `page`, `page_size`, `total`, `pages`, `sort`, `order`, `ignored_filters` |
| `GET /api/trips/<id>` | `{trip, route_peers}`: every column of the trip with labels joined in, plus the average trips, fare, duration and speed for the same pickup zone, drop-off zone, pickup hour and weekday/weekend type. | Empty |

`route_peers` is computed from the `agg_od` roll-up, so the trip being viewed is included in its own comparison group.

A trip id that is not a whole number (e.g. `abc`, `-1`) returns `404 not_found`, because the route only matches non-negative integers.

### Design decisions

- **Total without counting millions of rows.** `meta.total` is `SUM(trips)` from the `agg_zone_hour` roll-up, not `COUNT(*)` over the 7.6 M-row `trips` table. Every filter maps onto a roll-up column, so the number is exact.
- **Stable pages.** Rows are ordered by the chosen column and then by `trip_id` in the same direction. Many trips share a fare or distance; without the tie-breaker, SQLite could return a tied trip on two pages or skip it.
- **Every sort uses an index.** Each sort option maps to an indexed column (`pickup_datetime`, `trip_distance`, `fare_amount`, `trip_duration_min`, `avg_speed_mph`), so a page can be read in index order instead of sorting the whole table.
- **Query plan chosen by borough size.** For a borough filter, the endpoint first checks the borough's share of all trips. At 5% or more, the borough test is written as `+pu_location_id IN (...)`, which tells SQLite not to use the zone index, so it walks the sort index and finds a page of matches almost at once. Small boroughs (e.g. Staten Island) use the zone index instead, which is faster when matches are rare.
- **Join labels last.** The inner query picks the page from `trips` alone; zone, borough and payment names are joined only onto those rows.
- **Safe from SQL injection.** All user values are bound parameters. The only text placed into the SQL is a column chosen from the `SORTS` whitelist and the literal `ASC` or `DESC`.

### Known limitations

Found by reviewing the code; suggested fixes are listed but not yet applied.

| Limitation | Effect | Suggested fix |
|---|---|---|
| Very large trip id (above 9,223,372,036,854,775,807) | SQLite raises `OverflowError`, which is not handled, so the request fails with 500 instead of 404. | Return 404 when the id is above SQLite's integer limit. |
| `order` is not validated | A typo such as `order=acs` silently gives descending order, unlike `sort`, which returns 400. | Reject values other than `asc`/`desc` with 400. |
| Deep pages use `OFFSET` | SQLite still reads every skipped row. On the full dataset a page near the end can exceed the 8 s limit and return 503. | Keyset paging: pass the last row's sort value and id instead of a page number. |
| Zone overrides borough | A zone outside the chosen borough returns that zone's trips; the ignored borough is not reported in `ignored_filters`. | Return 400 for a conflicting pair, or report it in `meta`. |
| Out-of-range paging is adjusted silently | `page=0` or `page_size=500` succeed with adjusted values, which can hide client bugs. | Document it (as here), or return 400. |

## Examples

**Slowest-looking routes in the morning rush**

```
GET /api/routes/top?by=detour_index&hour_from=7&hour_to=9&k=1
```

```json
{
  "data": [
    { "pu_id": 209, "do_id": 87, "trips": 61, "avg_fare": 6.77, "avg_distance": 0.96,
      "avg_duration": 7.5, "avg_speed": 7.68, "detour_index": 3.773,
      "pu_zone": "Seaport", "pu_borough": "Manhattan",
      "do_zone": "Financial District North", "do_borough": "Manhattan" }
  ],
  "meta": { "by": "detour_index", "candidates": 2252, "algorithm": "top_k_heap",
            "partial_days": false, "ignored_filters": [] }
}
```

**Late-night trips (22:00–04:59), most expensive first, 10 per page**

```powershell
curl.exe "http://127.0.0.1:5000/api/trips?hour_from=22&hour_to=4&sort=fare&page_size=10"
```

```json
{
  "data": [ { "trip_id": "...", "pickup_datetime": "...", "pu_zone": "...",
              "fare_amount": "...", "payment": "..." } ],
  "meta": { "page": 1, "page_size": 10, "total": "...", "pages": "...",
            "sort": "fare", "order": "desc", "ignored_filters": [] }
}
```

## Mock data

`frontend/mock/sample_responses.json` holds one recorded, unfiltered response per endpoint. Open the dashboard with `?mock=1` to use it, or let `api.js` fall back to it automatically when the API is unreachable. To regenerate it, start the API and run `python frontend/mock/record_mock.py`.
