import React, { useEffect, useRef } from 'react';
import { SceneLiveBridge } from './OceanScene3D';

interface TacticalRadarProps {
  liveBridgeRef: React.MutableRefObject<SceneLiveBridge>;
  portName: string;
  expanded: boolean;
  onToggleExpand: () => void;
}

export const TacticalRadar: React.FC<TacticalRadarProps> = ({
  liveBridgeRef,
  portName,
  expanded,
  onToggleExpand,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let sweepAngle = 0;

    const draw = () => {
      const size = expanded ? 290 : 210;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
        canvas.width = size * dpr;
        canvas.height = size * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const cx = size / 2;
      const cy = size / 2;
      const radius = size / 2 - 14;
      // Radar range = 135 NM from center (centered on midpoint between ship and cyclone or ship-centered? Let's center on world origin / operational basin so both port, cyclone, and ship are always clearly readable!)
      const maxRangeNM = 115;
      const scale = radius / maxRangeNM;

      const bridge = liveBridgeRef.current;
      const { ship, cyclone, portPos, hemisphere } = bridge;

      // Background circle
      ctx.clearRect(0, 0, size, size);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#06101C';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.stroke();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 1, 0, Math.PI * 2);
      ctx.clip();

      // Range rings
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
      ctx.lineWidth = 1;
      [0.33, 0.66].forEach((f) => {
        ctx.beginPath();
        ctx.arc(cx, cy, radius * f, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(cx - radius, cy);
      ctx.lineTo(cx + radius, cy);
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx, cy + radius);
      ctx.stroke();

      const toCanvas = (wx: number, wz: number) => ({
        x: cx + wx * scale,
        y: cy + wz * scale,
      });

      const cycPt = toCanvas(cyclone.x, cyclone.z);
      const cycR = cyclone.radiusNM * scale;
      const trackRad = ((cyclone.trackDeg - 90) * Math.PI) / 180;

      // Predicted cyclone track cone (1-2-3 rule visual)
      ctx.save();
      ctx.translate(cycPt.x, cycPt.y);
      ctx.rotate(trackRad);

      // Uncertainty cone forward
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(cycR * 1.45, -cycR * 0.55);
      ctx.lineTo(cycR * 1.45, cycR * 0.55);
      ctx.closePath();
      ctx.fillStyle = 'rgba(148, 163, 184, 0.12)';
      ctx.fill();

      // Dangerous Semicircle vs Navigable Semicircle shading
      // In canvas coords (+X = forward track):
      // North hemisphere: Right side of forward track is clockwise (+angle = 0 to +PI)
      // South hemisphere: Left side of forward track is counter-clockwise (-PI to 0)
      const dangerStart = hemisphere === 'north' ? 0 : -Math.PI;
      const dangerEnd = hemisphere === 'north' ? Math.PI : 0;
      const navStart = hemisphere === 'north' ? -Math.PI : 0;
      const navEnd = hemisphere === 'north' ? 0 : Math.PI;

      // Dangerous semicircle fill
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, cycR * 0.95, dangerStart, dangerEnd);
      ctx.closePath();
      ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
      ctx.fill();

      // Navigable semicircle fill
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, cycR * 0.95, navStart, navEnd);
      ctx.closePath();
      ctx.fillStyle = 'rgba(16, 185, 129, 0.14)';
      ctx.fill();

      // Track arrow
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(cycR * 1.35, 0);
      ctx.stroke();
      ctx.setLineDash([]);

      // Arrowhead
      ctx.beginPath();
      ctx.moveTo(cycR * 1.42, 0);
      ctx.lineTo(cycR * 1.25, -4);
      ctx.lineTo(cycR * 1.25, 4);
      ctx.closePath();
      ctx.fillStyle = 'rgba(248, 250, 252, 0.8)';
      ctx.fill();

      ctx.restore();

      // Wind radii rings (34kt outer, 50kt mid, 64kt eyewall)
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cycPt.x, cycPt.y, cycR * 1.15, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
      ctx.beginPath();
      ctx.arc(cycPt.x, cycPt.y, cycR * 0.65, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cycPt.x, cycPt.y, Math.max(5, cycR * 0.22), 0, Math.PI * 2);
      ctx.stroke();

      // Cyclone Eye icon
      ctx.beginPath();
      ctx.arc(cycPt.x, cycPt.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#EF4444';
      ctx.fill();

      // Destination Port Marker
      const portPt = toCanvas(portPos.x, portPos.z);
      ctx.fillStyle = '#10B981';
      ctx.beginPath();
      ctx.arc(portPt.x, portPt.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ECFDF5';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.font = '600 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#A7F3D0';
      ctx.fillText(portName.split(' ')[0], portPt.x + 7, portPt.y + 3);

      // Ship Position & Heading Vector
      const shipPt = toCanvas(ship.x, ship.z);
      const headRad = ((ship.headingDeg - 90) * Math.PI) / 180;

      // Projected heading line
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(shipPt.x, shipPt.y);
      ctx.lineTo(
        shipPt.x + Math.cos(headRad) * 26,
        shipPt.y + Math.sin(headRad) * 26,
      );
      ctx.stroke();

      // Ship directional chevron
      ctx.save();
      ctx.translate(shipPt.x, shipPt.y);
      ctx.rotate(headRad);
      ctx.beginPath();
      ctx.moveTo(6.5, 0);
      ctx.lineTo(-4.5, -4);
      ctx.lineTo(-2.5, 0);
      ctx.lineTo(-4.5, 4);
      ctx.closePath();
      ctx.fillStyle = '#38BDF8';
      ctx.fill();
      ctx.restore();

      // Radar sweep beam
      sweepAngle = (sweepAngle + 0.025) % (Math.PI * 2);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(sweepAngle);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, -0.35, 0);
      ctx.closePath();
      ctx.fillStyle = 'rgba(6, 182, 212, 0.09)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(radius, 0);
      ctx.stroke();
      ctx.restore();

      ctx.restore(); // unclip

      // Cardinal compass letters
      ctx.font = '600 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#94A3B8';
      ctx.textAlign = 'center';
      ctx.fillText('Şm', cx, 10);
      ctx.fillText('C', cx, size - 3);
      ctx.fillText('Q', 7, cy + 3);
      ctx.fillText('Ş', size - 7, cy + 3);

      ctx.restore();
      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [expanded, liveBridgeRef, portName]);

  return (
    <div className="bg-[#0B1626]/90 border border-slate-700/60 rounded-xl p-3 shadow-xl select-none">
      <div className="flex items-center justify-between gap-4 mb-2">
        <span className="text-xs font-medium text-slate-200 whitespace-nowrap">
          Taktiki Radar
        </span>
        <button
          type="button"
          onClick={onToggleExpand}
          className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer whitespace-nowrap"
        >
          {expanded ? 'Kiçilt' : 'Böyüt'}
        </button>
      </div>

      <canvas
        ref={canvasRef}
        style={{
          width: expanded ? 290 : 210,
          height: expanded ? 290 : 210,
        }}
        className="block rounded-full"
      />

      <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] text-slate-300">
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="inline-block w-2.5 h-2.5 rounded-xs bg-red-500/70 border border-red-400" />
          Təhlükəli
        </span>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="inline-block w-2.5 h-2.5 rounded-xs bg-emerald-500/50 border border-emerald-400" />
          Keçilən
        </span>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400" />
          Liman
        </span>
      </div>
    </div>
  );
};
