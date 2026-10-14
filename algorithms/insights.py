from __future__ import annotations
from backend.db import query
from backend.queries.filters import Filters
from algorithms.top_k_heap import top_k

def rush_hour_slowdown(f: Filters) -> dict:
    where, params = f.where("agg")
    rows = query(f"""
        SELECT pickup_hour As hour,
               SUM(trips) As trips,
               ROUND(SUM(sum_distance) / (SUM(sum_duration) / 60.0), 2) As speed
        FROM agg_zone_hour {where}
        GROUP BY pickup_hour""", params)
    rows = [r for r in rows if r["trips"] >= 200]
    if len(rows) < 2:
        return _empty("rush_hour_slowdown", "When does the city slow down?")
    slowest = top_k(rows, 1, lambda r: r["speed"], largest=False)[0]
    fastest = top_k(rows, 1, lambda r: r["speed"])[0]
    drop = round(100 * (1 - slowest["speed"] / fastest["speed"]), 0)
    return {
        "id": "rush_hour_slowdown",
        "title": "When does the city slow down?",
        "headline": f"Traffic is {drop:.0f}% slower at {_hour(slowest['hour'])} than at {_hour(fastest['hour'])}",
        "detail": (f"Taxis average {slowest['speed']:.1f} mph at their slowest hour versus "
                    f" {fastest['speed']:.1f} mph at their fastest, for the same street network. "
                    "Because the meter charges for waiting time, congestion directly raises the "
                    "price of a mile."),
        "value": f"{drop:.0f}%",
        "value_label": "speed lost at the worst hour",
        "series": [{"x": r["hour"], "y": r["speed"]} for r in _by(rows, "hour")],
        "unit": "mph",
    }

def short_trip_premium(f: Filters) -> dict:
    where, params = f.where("agg", alias="a")
    rows = query(f"""
        SELECT d.distance_band_id AS band, d.label, s.trips, s.fare_per_mile
        FROM (SELECT a.distance_band_id As bid, SUM(a.trips) As trips,
                     ROUND(SUM(a.sum_fare) / SUM(a.sum_distance), 2) As fare_per_mile
              FROM agg_zone_hour a {where}
              GROUP BY a.distance_band_id) s
        JOIN distance_bands d ON d.distance_band_id = s.bid""", params)
    rows = [r for r in rows if r["trips"] >= 100]
    if len(rows) < 2:
        return _empty("short_trip_premium", "Who pays most per mile?")
    rows = _by(rows, "band")
    short, long_ = rows[0], rows[-1]
    ratio = short["fare_per_mile"] / long_["fare_per_mile"]
    total = 0
    for r in rows:
        total += r["trips"]
    return {
        "id": "short_trip_premium",
        "title": "Who pays most per mile?",
        "headline": f"{short['label']} trips cost {ratio:.1f}x more per mile than {long_['label']} trips",
        "detail": (f"${short['fare_per_mile']:.2f}/mi versus ${long_['fare_per_mile']:.2f}/mi. "
                    f"The flag-drop and time-based charges dominate short rides, and "
                    f"{100 * short['trips'] / total:.0f}% of trips fall in the shortest band - "
                    "most riders pay the premium price."),
        "value": f"{ratio:.1f}x",
        "value_label": "price-per-mile premium on short trips",
        "series": [{"x": r["label"], "y": r["fare_per_mile"]} for r in rows],
        "unit": "$/mi",
    }

def airport_economics(f: Filters) -> dict:
    where, params = f.where("agg")
    r = query(f"""
        SELECT SUM(trips) As trips, SUM(airport_trips) As airport_trips, SUM(sum_total) AS revenue
        FROM agg_zone_hour {where}""", params)[0]
    where_a, params_a = f.where("agg")
    joiner = "AND" if where_a else "WHERE"
    ap = query(f"""
         SELECT SUM(trips) As trips, SUM(sum_total) As revenue,
                SUM(sum_tip_pct) / NULLIF(SUM(card_trips), 0) As tip_pct
        FROM agg_zone_hour {where_a} {joiner} pu_location_id IN (1, 132, 138)""", params_a)[0]
    rest = query(f"""
        SELECT SUM(sum_tip_pct) / NULLIF(SUM(card_trips), 0) As tip_pct
        FROM agg_zone_hour {where_a} {joiner} pu_location_id NOT IN (1, 132, 138)""", params_a)[0]
    if not r["trips"]:
        return _empty("airport_economics", "How much do airports matter?")
    if not ap["trips"]:
        out = _empty("airport_economics", "How much do airports matter?")
        out["headline"] = "No airport pickups in this selection"
        out["detail"] = (f"{100 * r['airport_trips'] / r['trips']:.1f}% of these trips are headed to "
                          "JFK, LaGuardia or Newark. Clear the area filter to compare airport pickups "
                          "with the rest of the city.")
        out["value"] = f"{100 * r['airport_trips'] / r['trips']:.1f}%"
        out["value_label"] = "of trips go to an airport"
        return out
    trip_share = 100 * ap["trips"] / r["trips"]
    rev_share = 100 * ap["revenue"] / r["revenue"]
    any_share = 100 * r["airport_trips"] / r["trips"]
    return {
        "id": "airport_economics",
        "title": "How much do airports matter?",
        "headline": (f"Airport pickups are {trip_share:.1f}% of trips but "
                      f"{rev_share:.1f}% of revenue"),
        "detail": (f"Each JFK, LaGuardia or Newark pickup earns about "
                    f"{rev_share / trip_share:.1f}x an average ride. Counting drop-offs too, "
                    f"{any_share:.1f}% of trips touch an airport. Card tips at airports "
                    f"average {(ap['tip_pct'] or 0):.1f}% versus {(rest['tip_pct'] or 0):.1f}% elsewhere."),
        "value": f"{rev_share / trip_share:.1f}x",
        "value_label": "revenue per airport pickup vs. average",
        "series": [{"x": f"{trip_share:.1f}% of trips", "y": round(trip_share, 2)},
                   {"x": f"{rev_share:.1f}% of revenue", "y": round(rev_share, 2)}],
        "unit": "%",      
    }

def all_insights(f: Filters) -> list[dict]:
    return [rush_hour_slowdown(f), short_trip_premium(f), airport_economics(f)]

def _hour(h: int) -> str:
    return "12 am" if h == 0 else "12 pm" if h == 12 else f"{h % 12} {'am' if h < 12 else 'pm'}"

def _by(rows: list[dict], key: str) -> list[dict]:
    from algorithms.top_k_heap import merge_sort_desc
    entries = [(-r[key], i, r) for i, r in enumerate(rows)]
    return [e[2] for e in merge_sort_desc(entries)]

def _empty(id_: str, title: str) -> dict:
    return {"id": id_, "title": title, "headline": "Not enough trips match these filters",
            "detail": "Widen the filters to see this insight.", "value": "-",
            "value_label": "", "series": [], "unit": ""}