import pathlib
import pandas as pd
from typing import Dict, List, Any

from .logger import get_logger

logger = get_logger(__name__)

# Re-use the dataset from source-tracing for prototype
HERE = pathlib.Path(__file__).parent
DATA_DIR = HERE.parent.parent / "source-tracing" / "data"
CSV_PATH = DATA_DIR / "readings.csv"

def load_historical_data() -> pd.DataFrame:
    """
    Loads and prepares the harmonized history for replay.
    """
    if not CSV_PATH.exists():
        logger.error(f"Data file not found at {CSV_PATH}")
        raise FileNotFoundError(f"Missing {CSV_PATH}")
        
    df = pd.read_csv(CSV_PATH, parse_dates=["reading_date"])
    df = df.sort_values(["reading_date", "unit_id"]).reset_index(drop=True)
    logger.info(f"Loaded {len(df)} historical readings")
    return df

def get_readings_by_date(df: pd.DataFrame) -> Dict[str, List[Dict[str, Any]]]:
    """
    Groups the dataframe by reading_date for efficient O(1) retrieval during playback.
    Keys are date strings (YYYY-MM-DD), values are lists of reading dictionaries.
    """
    # Convert dates to strings for easy dictionary lookup
    df["date_str"] = df["reading_date"].dt.strftime("%Y-%m-%d")
    grouped = df.groupby("date_str")
    
    date_map = {}
    for date_str, group in grouped:
        # We need to serialize timestamps nicely, so drop date_str
        records = group.drop(columns=["date_str"]).to_dict(orient="records")
        date_map[date_str] = records
        
    logger.info(f"Indexed history into {len(date_map)} simulated days")
    return date_map
