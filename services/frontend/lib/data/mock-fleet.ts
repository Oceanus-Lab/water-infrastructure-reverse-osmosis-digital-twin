import { UnitHealth } from "../types";
import { scoreToStatus } from "../utils/health";

// The OCWD dataset contains 21 units: Banks A-G, Stages 01-03
// Banks A-E use modeled energy, F-G use measured energy.
export const generateMockFleet = (date: string): UnitHealth[] => {
  const banks = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const stages = ['01', '02', '03'];
  
  const fleet: UnitHealth[] = [];
  
  for (const bank of banks) {
    for (const stage of stages) {
      const id = `${bank}${stage}`;
      
      // Deterministic mock scoring based on ID to show variety
      let score: number | null = 85; 
      
      if (id === 'G03') score = null; // offline/unknown
      else if (id === 'A01') score = 25; // alert
      else if (id === 'C02') score = 55; // watch
      else if (id === 'F01') score = 95; // healthy
      
      fleet.push({
        id,
        score,
        status: scoreToStatus(score),
        scoreSource: (bank === 'F' || bank === 'G') ? 'measured' : 'modeled',
        timestamp: date,
      });
    }
  }
  
  return fleet;
};
