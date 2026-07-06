import os
import requests
from datetime import datetime
from google.cloud import bigquery
import argparse

EIA_API_KEY = os.environ.get("EIA_API_KEY")
PROJECT_ID = "spatial-cat-489006-a4"
DATASET_ID = "ro_raw"
STATE_ID = "CA"  # For OCWD

def fetch_electricity_prices():
    """Fetch monthly electricity prices for California (Commercial sector)"""
    if not EIA_API_KEY:
        print("Warning: EIA_API_KEY not set. Cannot fetch from EIA API.")
        return []

    url = "https://api.eia.gov/v2/electricity/retail-sales/data/"
    params = {
        "api_key": EIA_API_KEY,
        "frequency": "monthly",
        "data[0]": "price",
        "facets[stateid][]": STATE_ID,
        "facets[sectorid][]": "COM", # Commercial sector
        "sort[0][column]": "period",
        "sort[0][direction]": "desc",
        "length": 100 # get last 100 months
    }
    
    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()
    
    rows_to_insert = []
    ingest_time = datetime.utcnow().isoformat()
    
    for row in data.get("response", {}).get("data", []):
        # Period format is YYYY-MM
        period = row.get("period")
        try:
            date_obj = datetime.strptime(period, "%Y-%m").date()
            date_str = date_obj.isoformat()
        except Exception:
            continue
            
        price = row.get("price")
        if price is not None:
            rows_to_insert.append({
                "date": date_str,
                "state_id": STATE_ID,
                "price_cents_per_kwh": float(price),
                "ingest_timestamp": ingest_time
            })
            
    return rows_to_insert

def fetch_generation_mix():
    """Fetch electricity generation mix to calculate Carbon Emission Factor."""
    if not EIA_API_KEY:
        print("Warning: EIA_API_KEY not set. Cannot fetch generation mix.")
        return []

    url = "https://api.eia.gov/v2/electricity/electric-power-operational-data/data/"
    params = {
        "api_key": EIA_API_KEY,
        "frequency": "monthly",
        "data[0]": "generation",
        "facets[location][]": STATE_ID,
        "sort[0][column]": "period",
        "sort[0][direction]": "desc",
        "length": 500
    }
    
    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()
    
    rows_to_insert = []
    ingest_time = datetime.utcnow().isoformat()
    
    for row in data.get("response", {}).get("data", []):
        period = row.get("period")
        try:
            date_obj = datetime.strptime(period, "%Y-%m").date()
            date_str = date_obj.isoformat()
        except Exception:
            continue
            
        fuel_type = row.get("fueltypeid")
        generation = row.get("generation")
        
        if generation is not None and fuel_type is not None:
            rows_to_insert.append({
                "date": date_str,
                "state_id": STATE_ID,
                "fuel_type": fuel_type,
                "generation_mwh": float(generation),
                "ingest_timestamp": ingest_time
            })
            
    return rows_to_insert

def write_to_bq(client, table_name, rows, schema):
    if not rows:
        print(f"No rows to insert for {table_name}")
        return

    table_id = f"{PROJECT_ID}.{DATASET_ID}.{table_name}"
    
    # Create or replace table schema if it doesn't exist perfectly, but for simplicity we rely on BigQuery
    # We will ensure the table exists or create it.
    table = bigquery.Table(table_id, schema=schema)
    table = client.create_table(table, exists_ok=True)
    
    errors = client.insert_rows_json(table_id, rows)
    if errors:
        print(f"Errors inserting into {table_name}: {errors}")
    else:
        print(f"Successfully inserted {len(rows)} rows into {table_name}.")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--type", choices=["prices", "carbon", "all"], default="all")
    args = parser.parse_args()
    
    client = bigquery.Client(project=PROJECT_ID)
    
    if args.type in ["prices", "all"]:
        prices_schema = [
            bigquery.SchemaField("date", "DATE"),
            bigquery.SchemaField("state_id", "STRING"),
            bigquery.SchemaField("price_cents_per_kwh", "FLOAT"),
            bigquery.SchemaField("ingest_timestamp", "TIMESTAMP"),
        ]
        print("Fetching EIA prices...")
        price_rows = fetch_electricity_prices()
        write_to_bq(client, "eia_prices_raw", price_rows, prices_schema)
        
    if args.type in ["carbon", "all"]:
        carbon_schema = [
            bigquery.SchemaField("date", "DATE"),
            bigquery.SchemaField("state_id", "STRING"),
            bigquery.SchemaField("fuel_type", "STRING"),
            bigquery.SchemaField("generation_mwh", "FLOAT"),
            bigquery.SchemaField("ingest_timestamp", "TIMESTAMP"),
        ]
        print("Fetching EIA generation mix...")
        carbon_rows = fetch_generation_mix()
        write_to_bq(client, "eia_generation_mix_raw", carbon_rows, carbon_schema)

if __name__ == "__main__":
    main()
