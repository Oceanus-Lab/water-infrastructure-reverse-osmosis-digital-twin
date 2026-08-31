# Data Model: 013-agent-intelligence-chat

## 1. Frontend & In-Harness Data Structures

```typescript
// 1. Chat Message Entity
export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: string;
  status: 'streaming' | 'completed' | 'error';
  thinking?: {
    summary: string;
    specialistsConsulted: Array<{
      id: 'dataAnalyst' | 'simulation' | 'economics' | 'document';
      status: 'pending' | 'running' | 'completed' | 'error';
      durationMs: number;
      findingsPreview?: string;
    }>;
    reflexionCritique?: string;
    isReflected?: boolean;
  };
  artifacts?: ChatArtifact[];
  suggestedFollowUps?: string[];
  feedback?: {
    rating: 'thumbs_up' | 'thumbs_down';
    reasonTag?: string;
    comment?: string;
  };
}

// 2. Embedded Interactive Chat Artifacts
export type ChatArtifact =
  | {
      type: 'sparkline';
      unitId: string;
      metric: string;
      measuredData: Array<{ date: string; value: number }>;
      baselineData: Array<{ date: string; value: number }>;
    }
  | {
      type: 'what_if_delta';
      unitId: string;
      baseInputs: { recovery: number; feedSalinity: number; temperature: number };
      modeledOutputs: { pressure: number; sec: number; permeateSalinity: number };
      deltas: { pressureDelta: number; secDelta: number };
    }
  | {
      type: 'proposal';
      proposalId: string;
      unitId: string;
      action: 'CLEAN_NOW' | 'DEFER_CLEANING' | 'ADJUST_RECOVERY';
      economicImpact: { netBenefit: number; assumedElectricity: number; assumedCipCost: number };
      status: 'pending' | 'approved' | 'dismissed';
    }
  | {
      type: 'citation';
      documentName: string;
      section: string;
      relevanceScore: number;
      snippet: string;
    };
```

---

## 2. BigQuery Persistence Schemas

### Table: `ro_serving.agent_traces`
Logs full interaction traces for the Eval Quality Flywheel and error clustering.

```sql
CREATE TABLE IF NOT EXISTS `ro_serving.agent_traces` (
  trace_id STRING NOT NULL,
  session_id STRING NOT NULL,
  created_at TIMESTAMP NOT NULL,
  user_query STRING NOT NULL,
  router_decision JSON,
  retrieved_context JSON,
  draft_response STRING,
  reflexion_critique STRING,
  final_response STRING,
  latency_ms INT64,
  user_feedback_rating STRING, -- 'thumbs_up' | 'thumbs_down' | NULL
  user_feedback_reason STRING,
  grounding_score FLOAT64
)
PARTITION BY DATE(created_at)
CLUSTER BY user_feedback_rating, session_id;
```

### Table: `ro_embeddings.qa_cache` (Enhanced)
Extended schema for semantic caching and verified golden precedents.

```sql
CREATE TABLE IF NOT EXISTS `ro_embeddings.qa_cache` (
  cache_id STRING NOT NULL,
  query_text STRING NOT NULL,
  query_embedding ARRAY<FLOAT64>,
  response_payload JSON NOT NULL,
  is_human_verified BOOLEAN DEFAULT FALSE,
  hit_count INT64 DEFAULT 1,
  last_accessed TIMESTAMP NOT NULL
);
```
