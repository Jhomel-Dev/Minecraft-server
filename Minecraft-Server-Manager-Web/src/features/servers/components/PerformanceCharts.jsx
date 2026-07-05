import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { useServerMetrics } from "../hooks/useServerMetrics";
import { Cpu, MemoryStick } from "lucide-react";

export function PerformanceCharts({ serverId, maxMemoryMB = 4096, status }) {
  const { metrics, isConnected } = useServerMetrics(serverId);
  const [data, setData] = useState([]);

  const isOnline = status === "ONLINE" || status === "STARTING";

  
  useEffect(() => {
    let interval;
    if (!isOnline) {
      interval = setInterval(() => {
        setData((current) => {
          const now = new Date();
          const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const newData = [...current, { time: timeString, cpu: 0, ram: 0 }];
          if (newData.length > 20) newData.shift();
          return newData;
        });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isOnline]);

  
  useEffect(() => {
    if (!isOnline) return;
    setData((current) => {
      const now = new Date();
      const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const newPoint = {
        time: timeString,
        cpu: Math.min(100, Number(metrics.cpu.toFixed(1))),
        ram: Math.min(maxMemoryMB, Math.round(metrics.memory / 1024 / 1024))
      };

      const newData = [...current, newPoint];
      if (newData.length > 20) newData.shift();
      return newData;
    });
  }, [metrics, isOnline]);

  const currentCpu = data.length > 0 ? data[data.length - 1].cpu : 0;
  const currentRam = data.length > 0 ? data[data.length - 1].ram : 0;
  const ramPercentage = Math.round((currentRam / maxMemoryMB) * 100) || 0;

  const isCpuHigh = currentCpu > 90;
  const isRamHigh = ramPercentage > 90;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 mb-6">
      
      {}
      <div className={`bg-surface border-2 ${isCpuHigh ? 'border-red-500 animate-pulse-slow' : 'border-surface-border'} p-6 rounded-blocky shadow-sm flex flex-col gap-4 relative overflow-hidden`}>
        <div className="flex justify-between items-start z-10">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${isCpuHigh ? 'bg-red-500/20 text-red-500' : 'bg-primary/20 text-primary'}`}>
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-foreground uppercase tracking-wider text-sm">Uso de CPU</h3>
              <div className="flex items-end gap-2">
                <span className={`text-3xl font-black ${isCpuHigh ? 'text-red-500' : 'text-primary'}`}>
                  {currentCpu}%
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${isConnected ? 'bg-green-500/20 text-green-500' : 'bg-foreground/10 text-foreground/50'}`}>
              {isConnected ? 'EN VIVO' : 'DESCONECTADO'}
            </span>
          </div>
        </div>
        
        <div className="h-32 mt-4 -mx-6 -mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isCpuHigh ? '#ef4444' : '#8b5cf6'} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={isCpuHigh ? '#ef4444' : '#8b5cf6'} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #313244', borderRadius: '8px' }}
                itemStyle={{ color: '#cdd6f4' }}
              />
              <Area 
                type="monotone" 
                dataKey="cpu" 
                stroke={isCpuHigh ? '#ef4444' : '#8b5cf6'} 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#cpuGradient)" 
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {}
      <div className={`bg-surface border-2 ${isRamHigh ? 'border-red-500 animate-pulse-slow' : 'border-surface-border'} p-6 rounded-blocky shadow-sm flex flex-col gap-4 relative overflow-hidden`}>
        <div className="flex justify-between items-start z-10">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-lg ${isRamHigh ? 'bg-red-500/20 text-red-500' : 'bg-secondary/20 text-secondary'}`}>
              <MemoryStick className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-foreground uppercase tracking-wider text-sm">Uso de RAM</h3>
              <div className="flex items-end gap-2">
                <span className={`text-3xl font-black ${isRamHigh ? 'text-red-500' : 'text-secondary'}`}>
                  {currentRam} <span className="text-lg font-bold text-foreground/50">MB</span>
                </span>
                <span className="text-sm font-bold text-foreground/50 mb-1">/ {maxMemoryMB} MB</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="h-32 mt-4 -mx-6 -mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="ramGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isRamHigh ? '#ef4444' : '#10b981'} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={isRamHigh ? '#ef4444' : '#10b981'} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #313244', borderRadius: '8px' }}
                itemStyle={{ color: '#cdd6f4' }}
              />
              <Area 
                type="monotone" 
                dataKey="ram" 
                stroke={isRamHigh ? '#ef4444' : '#10b981'} 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#ramGradient)" 
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
