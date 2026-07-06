import requests
from datetime import datetime
from google.cloud import bigquery
import argparse

PROJECT_ID = "spatial-cat-489006-a4"
DATASET_ID = "ro_raw"
LATITUDE = 33.69
LONGITUDE = -117.95

def fetch_open_meteo():
    """Fetch 14-day temperature forecast from Open-Meteo API"""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": LATITUDE,
        "longitude": LONGITUDE,
        "daily": "temperature_2m_mean",
        "forecast_days": 14,
        "timezone": "America/Los_Angeles"
    }
    
    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()
    
    rows_to_insert = []
    ingest_time = datetime.utcnow().isoformat()
    
    daily = data.get("daily", {})
    times = daily.get("time", [])
    temps = daily.get("temperature_2m_mean", [])
    
    for t, temp in zip(times, temps):
        if temp is not None:
            rows_to_insert.append({
                "forecast_date": t,
                "latitude": float(LATITUDE),
                "longitude": float(LONGITUDE),
                "temperature_2m_mean": float(temp),
                "ingest_timestamp": ingest_time
            })
            
    return rows_to_insert

def write_to_bq(client, table_name, rows, schema):
    if not rows:
        print(f"No rows to insert for {table_name}")
        return

    table_id = f"{PROJECT_ID}.{DATASET_ID}.{table_name}"
    
    table = bigquery.Table(table_id, schema=schema)
    table = client.create_table(table, exists_ok=True)
    
    errors = client.insert_rows_json(table_id, rows)
    if errors:
        print(f"Errors inserting into {table_name}: {errors}")
    else:
        print(f"Successfully inserted {len(rows)} rows into {table_name}.")

def main():
    parser = argparse.ArgumentParser()
    args = parser.parse_args()
    
    client = bigquery.Client(project=PROJECT_ID)
    
    schema = [
        bigquery.SchemaField("forecast_date", "DATE"),
        bigquery.SchemaField("latitude", "FLOAT"),
        bigquery.SchemaField("longitude", "FLOAT"),
        bigquery.SchemaField("temperature_2m_mean", "FLOAT"),
        bigquery.SchemaField("ingest_timestamp", "TIMESTAMP"),
    ]
    
    print("Fetching Open-Meteo forecast...")
    rows = fetch_open_meteo()
    write_to_bq(client, "open_meteo_forecast_raw", rows, schema)

if __name__ == "__main__":
    main()
