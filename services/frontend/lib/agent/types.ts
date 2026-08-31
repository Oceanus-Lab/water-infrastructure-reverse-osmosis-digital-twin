/**
 * Typed domain interfaces for the Next-Gen Multi-Agent Visual Assistant (Feature 013).
 */

export type SpecialistId = 'dataAnalyst' | 'simulation' | 'economics' | 'document';

export interface SpecialistConsultation {
  id: SpecialistId;
  status: 'pending' | 'running' | 'completed' | 'error';
  durationMs: number;
  findingsPreview?: string;
}

export interface ThinkingState {
  summary: string;
  specialistsConsulted: SpecialistConsultation[];
  reflexionCritique?: string;
  isReflected?: boolean;
}

export interface SparklineArtifact {
  type: 'sparkline';
  unitId: string;
  metric: string;
  measuredData: Array<{ date: string; value: number }>;
  baselineData?: Array<{ date: string; value: number }>;
}

export interface WhatIfDeltaArtifact {
  type: 'what_if_delta';
  unitId: string;
  baseInputs: { recovery: number; feedSalinity: number; temperature: number };
  modeledOutputs: { pressure: number; sec: number; permeateSalinity: number };
  deltas: { pressureDelta: number; secDelta: number };
}

export interface ProposalArtifact {
  type: 'proposal';
  proposalId: string;
  unitId: string;
  action: 'CLEAN_NOW' | 'DEFER_CLEANING' | 'ADJUST_RECOVERY';
  economicImpact: {
    netBenefit: number;
    assumedElectricity: number;
    assumedCipCost: number;
  };
  status: 'pending' | 'approved' | 'dismissed';
}

export interface CitationArtifact {
  type: 'citation';
  documentName: string;
  section: string;
  relevanceScore: number;
  snippet: string;
}

export type ChatArtifact =
  | SparklineArtifact
  | WhatIfDeltaArtifact
  | ProposalArtifact
  | CitationArtifact;

export interface MessageFeedback {
  rating: 'thumbs_up' | 'thumbs_down';
  reasonTag?: string;
  comment?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: string;
  status: 'streaming' | 'completed' | 'error';
  thinking?: ThinkingState;
  artifacts?: ChatArtifact[];
  suggestedFollowUps?: string[];
  feedback?: MessageFeedback;
}

export interface AgentTraceRecord {
  traceId: string;
  sessionId: string;
  createdAt: string;
  userQuery: string;
  routerDecision?: Record<string, unknown>;
  retrievedContext?: Record<string, unknown>;
  draftResponse?: string;
  reflexionCritique?: string;
  finalResponse: string;
  latencyMs: number;
  userFeedbackRating?: 'thumbs_up' | 'thumbs_down';
  userFeedbackReason?: string;
  groundingScore?: number;
}
