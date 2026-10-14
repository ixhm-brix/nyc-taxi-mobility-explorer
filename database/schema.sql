-- NYC Taxi Mobility Database Schema Definition
-- Verified and reviewed by team
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS boroughs(
    borough_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS service_zones(
    service_zone_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS zones(
    location_id INTEGER PRIMARY KEY,
    zone_name TEXT NOT NULL,
    borough_id INTEGER NOT NULL REFERENCES boroughs(borough_id),
    service_zone_id INTEGER NOT NULL REFERENCES service_zones(service_zone_id),
    centroid_lon REAL CHECK(centroid_lon IS NULL OR centroid_lon BETWEEN -75.0 AND -73),
    centroid_lat REAL CHECK(centroid_lat IS NULL OR centroid_lat BETWEEN 40 AND 41.5),
    area_km2 REAL CHECK (area_km2 IS NULL OR area_km2 > 0)
);
CREATE TABLE IF NOT EXISTS zone_geometry(
    location_id INTEGER PRIMARY KEY REFERENCES zones(location_id),
    geojson TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS vendors(
    vendor_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rate_codes (
    rate_code_id INTEGER PRIMARY KEY,
    description TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS payment_types(
    payment_type_id INTEGER PRIMARY KEY,
    description TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS distance_bands(
    distance_band_id INTEGER PRIMARY KEY,
    label TEXT NOT NULL,
    min_mi REAL NOT NULL,
    max_mi REAL NOT NULL,
    CHECK (max_mi > min_mi)
);
CREATE TABLE IF NOT EXISTS fare_bands (
    fare_band_id INTEGER PRIMARY KEY,
    label TEXT NOT NULL,
    min_usd REAL NOT NULL,
    max_usd REAL NOT NULL,
    CHECK (max_usd > min_usd)
);
CREATE TABLE IF NOT EXISTS time_bands(
    hour INTEGER PRIMARY KEY CHECK (hour BETWEEN 0 AND 23),
    band TEXT NOT NULL,
    band_order INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS trips(
    trip_id INTEGER PRIMARY KEY,
    vendor_id INTEGER NOT NULL REFERENCES vendors(vendor_id),
    pickup_datetime TEXT NOT NULL,
    dropoff_datetime TEXT NOT NULL,
    pickup_date TEXT NOT NULL,
    pickup_hour INTEGER NOT NULL REFERENCES time_bands(hour),
    pickup_dow INTEGER NOT NULL CHECK (pickup_dow BETWEEN 0 AND 6),
    is_weekend INTEGER NOT NULL CHECK (is_weekend IN (0, 1)),
    passenger_count INTEGER CHECK (passenger_count IS NULL OR passenger_count BETWEEN 1 AND 6),
    trip_distance REAL NOT NULL CHECK (trip_distance > 0 AND trip_distance <= 100),
    rate_code_id INTEGER NOT NULL REFERENCES rate_codes(rate_code_id),
    store_and_fwd_flag INTEGER NOT NULL CHECK (store_and_fwd_flag IN (0, 1)),
    pu_location_id INTEGER NOT NULL REFERENCES zones(location_id),
    do_location_id INTEGER NOT NULL REFERENCES zones(location_id),
    payment_type_id INTEGER NOT NULL REFERENCES payment_types(payment_type_id),
    fare_amount REAL NOT NULL CHECK (fare_amount >= 2.5),
    extra REAL NOT NULL CHECK (extra >= 0),
    mta_tax REAL NOT NULL CHECK (mta_tax >= 0),
    tip_amount REAL NOT NULL CHECK (tip_amount >= 0),
    tolls_amount REAL NOT NULL CHECK (tolls_amount >= 0),
    improvement_surcharge REAL NOT NULL CHECK (improvement_surcharge >= 0),
    congestion_surcharge REAL NOT NULL CHECK (congestion_surcharge >= 0),
    total_amount REAL NOT NULL,
    trip_duration_min REAL NOT NULL CHECK (trip_duration_min BETWEEN 0 AND 240),
    avg_speed_mph REAL NOT NULL CHECK (avg_speed_mph BETWEEN 0 AND 70),
    fare_per_mile REAL NOT NULL,
    tip_pct REAL,
    straight_line_mi REAL,
    detour_index REAL,
    is_cross_borough INTEGER NOT NULL CHECK (is_cross_borough IN (0, 1)),
    is_airport_trip INTEGER NOT NULL CHECK (is_airport_trip IN (0, 1)),
    distance_band_id INTEGER NOT NULL REFERENCES distance_bands(distance_band_id),
    fare_band_id INTEGER NOT NULL REFERENCES fare_bands(fare_band_id),
    CHECK (dropoff_datetime > pickup_datetime)
);
CREATE TABLE IF NOT EXISTS agg_zone_hour (
    pickup_date TEXT NOT NULL,
    pickup_hour INTEGER NOT NULL,
    pickup_dow INTEGER NOT NULL,
    pu_location_id INTEGER NOT NULL REFERENCES zones(location_id),
    payment_type_id INTEGER NOT NULL REFERENCES payment_types(payment_type_id),
    distance_band_id INTEGER NOT NULL REFERENCES distance_bands(distance_band_id),
    fare_band_id INTEGER NOT NULL REFERENCES fare_bands(fare_band_id),
    trips INTEGER NOT NULL,
    passengers INTEGER NOT NULL,
    sum_distance REAL NOT NULL,
    sum_duration REAL NOT NULL,
    sum_fare REAL NOT NULL,
    sum_tip REAL NOT NULL,
    sum_total REAL NOT NULL,
    sum_tip_pct REAL NOT NULL,
    card_trips INTEGER NOT NULL,
    airport_trips INTEGER NOT NULL,
    cross_boro_trips INTEGER NOT NULL,
    sum_speed REAL NOT NULL,
    PRIMARY KEY (pickup_date, pickup_hour, pu_location_id, payment_type_id, distance_band_id, fare_band_id)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS agg_od (
    pu_location_id INTEGER NOT NULL REFERENCES zones(location_id),
    do_location_id INTEGER NOT NULL REFERENCES zones(location_id),
    pickup_hour INTEGER NOT NULL,
    is_weekend INTEGER NOT NULL,
    trips INTEGER NOT NULL,
    sum_distance REAL NOT NULL,
    sum_duration REAL NOT NULL,
    sum_fare REAL NOT NULL,
    sum_detour REAL NOT NULL,
    detour_trips INTEGER NOT NULL,
    PRIMARY KEY (pu_location_id, do_location_id, pickup_hour, is_weekend)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS data_quality_rules (
    rule_code TEXT PRIMARY KEY,
    action TEXT NOT NULL CHECK (action IN ('excluded', 'flagged', 'repaired')),
    description TEXT NOT NULL,
    record_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS data_quality_run (
    run_id INTEGER PRIMARY KEY,
    raw_rows INTEGER NOT NULL,
    clean_rows INTEGER NOT NULL,
    excluded_rows INTEGER NOT NULL
);

-- @indexes

CREATE INDEX IF NOT EXISTS ix_trips_pickup_dt ON trips(pickup_datetime);
CREATE INDEX IF NOT EXISTS ix_trips_pu_time ON trips(pu_location_id, pickup_datetime);
CREATE INDEX IF NOT EXISTS ix_trips_do_time ON trips(do_location_id, pickup_datetime);
CREATE INDEX IF NOT EXISTS ix_trips_route ON trips(pu_location_id, do_location_id);
CREATE INDEX IF NOT EXISTS ix_trips_distance ON trips(trip_distance);
CREATE INDEX IF NOT EXISTS ix_trips_duration ON trips(trip_duration_min);
CREATE INDEX IF NOT EXISTS ix_trips_fare ON trips(fare_amount);
CREATE INDEX IF NOT EXISTS ix_trips_speed ON trips(avg_speed_mph);
CREATE INDEX IF NOT EXISTS ix_agg_zone ON agg_zone_hour(pu_location_id, pickup_date, pickup_hour);
CREATE INDEX IF NOT EXISTS ix_agg_od_dest ON agg_od(do_location_id);
CREATE INDEX IF NOT EXISTS ix_zones_borough ON zones(borough_id);
