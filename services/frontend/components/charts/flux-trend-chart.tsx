'use client';

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { EvidenceFigure } from "../evidence-figure";

const mockData = [
  { day: 1, flux: 18.5, baseline: 18.2 },
  { day: 5, flux: 17.9, baseline: 18.2 },
  { day: 10, flux: 17.2, baseline: 18.2 },
  { day: 15, flux: 16.5, baseline: 18.2 },
  { day: 20, flux: 15.8, baseline: 18.2 },
  { day: 25, flux: 15.0, baseline: 18.2 },
  { day: 30, flux: 14.5, baseline: 18.2 }, // Alert threshold
];

export function FluxTrendChart() {
  return (
    <div className="flex flex-col h-full p-5 bg-white border border-border/40 rounded-[20px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xs uppercase tracking-[0.2em] font-extrabold text-foreground mb-1">Stage-3 Flux Trend</h3>
          <EvidenceFigure value={-20.3} unit="%" source="measured" label="vs Clean Baseline" className="!gap-0" />
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mockData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EAEAEA" />
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#787774' }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#787774' }} />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              labelStyle={{ fontSize: '10px', color: '#787774', marginBottom: '4px', textTransform: 'uppercase' }}
            />
            <Line type="monotone" dataKey="flux" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="baseline" stroke="#1465C4" strokeDasharray="5 5" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
