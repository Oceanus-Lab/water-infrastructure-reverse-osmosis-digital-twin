import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { streamAgentResponse } from '../api/agent';
import type { ThinkingState, ChatArtifact } from '../agent/types';

export interface SourceTrace {
  figure_text: string;
  capability: string;
  unit_id: string;
  evidence_summary: string;
  evidence_payload?: any;
}

export interface RecordWritingProposal {
  proposal_id: string;
  record_type: "recommendation_log" | "decision" | "cip_plan";
  payload: any;
  status: "pending" | "approved" | "dismissed";
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  sourcedFigures?: SourceTrace[];
  proposal?: RecordWritingProposal;
  isStreaming?: boolean;
  thinking?: ThinkingState;
  artifacts?: ChatArtifact[];
  suggestedFollowUps?: string[];
}

interface AssistantState {
  isOpen: boolean;
  sessionId: string | null;
  messages: Message[];
  isThinking: boolean;
  
  toggle: () => void;
  open: () => void;
  close: () => void;
  clearSession: () => void;
  
  sendMessage: (text: string) => Promise<void>;
  updateMessageProposalStatus: (messageId: string, status: 'approved' | 'dismissed') => void;
}

export const useAssistantStore = create<AssistantState>((set, get) => ({
  isOpen: false,
  sessionId: null,
  messages: [],
  isThinking: false,
  
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  clearSession: () => set({ messages: [], sessionId: null }),
  
  sendMessage: async (text: string) => {
    if (!text.trim()) return;
    
    // Add user message
    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      content: text,
    };
    
    // Add empty model message placeholder with no thinking state by default
    const modelMsgId = uuidv4();
    const modelMsg: Message = {
      id: modelMsgId,
      role: 'model',
      content: '',
      isStreaming: true,
      thinking: undefined,
      artifacts: [],
    };
    
    set((state) => ({ 
      messages: [...state.messages, userMsg, modelMsg],
      isThinking: true,
      isOpen: true
    }));
    
    const { sessionId } = get();
    
    try {
      const { interactionId } = await streamAgentResponse(
        text,
        sessionId,
        (newText, rawChunk) => {
          set((state) => {
            const updatedMessages = [...state.messages];
            const msgIndex = updatedMessages.findIndex(m => m.id === modelMsgId);
            if (msgIndex === -1) return { messages: updatedMessages };

            const current = updatedMessages[msgIndex];
            let nextThinking = current.thinking ? { ...current.thinking } : undefined;
            let nextArtifacts = current.artifacts ? [...current.artifacts] : [];

            if (rawChunk) {
              if (rawChunk.type === 'thinking') {
                nextThinking = nextThinking || { summary: 'Multi-Agent Reasoning & Execution', specialistsConsulted: [] };
                nextThinking.summary = rawChunk.payload?.summary || nextThinking.summary;
                if (Array.isArray(rawChunk.payload?.specialists)) {
                  nextThinking.specialistsConsulted = rawChunk.payload.specialists.map((id: string) => ({
                    id,
                    status: 'running',
                    durationMs: 0,
                  }));
                }
              } else if (rawChunk.type === 'specialist') {
                nextThinking = nextThinking || { summary: 'Consulting specialists...', specialistsConsulted: [] };
                const specs = [...(nextThinking.specialistsConsulted || [])];
                const specIndex = specs.findIndex(s => s.id === rawChunk.payload.id);
                if (specIndex !== -1) {
                  specs[specIndex] = { ...specs[specIndex], ...rawChunk.payload };
                } else {
                  specs.push(rawChunk.payload);
                }
                nextThinking.specialistsConsulted = specs;
              } else if (rawChunk.type === 'reflexion') {
                if (nextThinking) {
                  nextThinking.reflexionCritique = rawChunk.payload?.critique;
                }
              } else if (rawChunk.type === 'artifact') {
                nextArtifacts.push(rawChunk.payload);
              }
            }

            updatedMessages[msgIndex] = {
              ...current,
              content: current.content + (newText || ''),
              thinking: nextThinking,
              artifacts: nextArtifacts,
            };

            return { messages: updatedMessages };
          });
        }
      );
      
      // Update session ID if we got a new one, and mark streaming complete
      set((state) => {
        const updatedMessages = [...state.messages];
        const msgIndex = updatedMessages.findIndex(m => m.id === modelMsgId);
        
        if (msgIndex !== -1) {
          const current = updatedMessages[msgIndex];
          // Ensure all specialists are marked completed when stream ends
          const completedSpecs = current.thinking?.specialistsConsulted?.map(s => ({
            ...s,
            status: 'completed' as const,
            durationMs: s.durationMs || 350,
          })) || [];

          updatedMessages[msgIndex] = {
            ...current,
            isStreaming: false,
            thinking: current.thinking ? {
              ...current.thinking,
              specialistsConsulted: completedSpecs,
            } : undefined,
          };
        }
        
        return { 
          sessionId: interactionId, 
          isThinking: false,
          messages: updatedMessages
        };
      });
      
    } catch (err) {
      console.error("Failed to get agent response:", err);
      // Replace placeholder with error
      set((state) => {
        const updatedMessages = [...state.messages];
        const msgIndex = updatedMessages.findIndex(m => m.id === modelMsgId);
        if (msgIndex !== -1) {
          updatedMessages[msgIndex] = {
            ...updatedMessages[msgIndex],
            content: "Sorry, I encountered an error communicating with the backend agent.",
            isStreaming: false
          };
        }
        return { isThinking: false, messages: updatedMessages };
      });
    }
  },
  
  updateMessageProposalStatus: (messageId: string, status: 'approved' | 'dismissed') => {
    set((state) => {
      const updatedMessages = [...state.messages];
      const msgIndex = updatedMessages.findIndex(m => m.id === messageId);
      if (msgIndex !== -1 && updatedMessages[msgIndex].proposal) {
        updatedMessages[msgIndex] = {
          ...updatedMessages[msgIndex],
          proposal: {
            ...updatedMessages[msgIndex].proposal!,
            status
          }
        };
      }
      return { messages: updatedMessages };
    });
  }
}));
