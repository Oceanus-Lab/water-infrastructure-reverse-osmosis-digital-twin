import os
import json
import datetime
from google.cloud import pubsub_v1
from typing import Dict, Any

from .logger import get_logger

logger = get_logger(__name__)

class PubSubConnector:
    def __init__(self):
        self.project_id = os.getenv("PUBSUB_PROJECT", "spatial-cat-489006-a4")
        self.topic_id = os.getenv("PUBSUB_TOPIC", "ro-readings")
        self.publisher = pubsub_v1.PublisherClient()
        self.topic_path = self.publisher.topic_path(self.project_id, self.topic_id)
        
    def _serialize(self, obj: Any) -> Any:
        if isinstance(obj, (datetime.datetime, datetime.date)):
            return obj.isoformat()
        raise TypeError(f"Type {type(obj)} not serializable")

    def publish_reading(self, payload: Dict[str, Any], simulation_clock: datetime.date) -> None:
        """
        Publishes a reading event.
        Injects the honest replay label and the simulation clock.
        """
        # Feature 002 (US3): Honest Replay Label
        payload["is_historical_replay"] = True
        payload["simulation_clock_date"] = simulation_clock.isoformat()
        
        data_str = json.dumps(payload, default=self._serialize)
        data_bytes = data_str.encode("utf-8")
        
        # We publish synchronously for simplicity in the prototype,
        # but could yield to asyncio if performance dictates.
        try:
            future = self.publisher.publish(self.topic_path, data=data_bytes)
            future.result(timeout=5.0)
            logger.debug(f"Published reading for {payload.get('unit_id')} at {payload.get('reading_date')}")
        except Exception as e:
            logger.error(f"Failed to publish to Pub/Sub: {e}")
