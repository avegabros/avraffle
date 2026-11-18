'use client';

import React, { useEffect, useState, useImperativeHandle, forwardRef, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { soundManager } from '@/lib/sound';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(CustomEase);
}

export interface WheelSegment {
  id: number;
  employeeId: string;
  name: string;
  department?: string | null;
  imagePath?: string | null;
}

export interface RaffleWheelHandle {
  spinToWinner: (targetIndex?: number) => void;
  resetWheel: () => void;
}

export interface RaffleWheelProps {
  segments: WheelSegment[];
  onSpinEnd?: (winner: WheelSegment) => void;
  onSpinStart?: () => void;
  onSpinStateChange?: (isSpinning: boolean) => void;
  onPointingSegmentChange?: (segment: WheelSegment | null) => void;
  power?: 'low' | 'medium' | 'high';
  duration?: number;
  fontSize?: number;
  wheelSize?: number;
  isViewer?: boolean;
}

const PALETTE = [
  '#2563EB', '#D97706', '#059669', '#DC2626', '#7C3AED',
  '#DB2777', '#0891B2', '#4F46E5', '#CA8A04', '#16A34A',
  '#9333EA', '#E11D48', '#0284C7', '#EA580C', '#475569',
];

export const RaffleWheel = forwardRef<RaffleWheelHandle, RaffleWheelProps>(({
  segments,
  onSpinEnd,
  onSpinStart,
  onSpinStateChange,
  onPointingSegmentChange,
  power = 'high',
  duration = 8,
  fontSize = 13,
  wheelSize = 900,
  isViewer = false,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentAngleRef = useRef<number>(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const lastReportedIdxRef = useRef<number>(-1);

  // Preload AV center logo
  useEffect(() => {
    const img = new Image();
    img.src = '/logo/av-logo.jpg';
    img.onload = () => {
      logoImageRef.current = img;
      drawRotatedWheel(currentAngleRef.current);
    };
  }, []);

  // 1. Offscreen Bitmap Pre-rendering (prevents lag)
  const renderOffscreenWheel = useCallback(() => {
    if (segments.length === 0) return;

    const size = wheelSize;
    let offscreen = offscreenCanvasRef.current;
    if (!offscreen) {
      offscreen = document.createElement('canvas');
      offscreenCanvasRef.current = offscreen;
    }

    offscreen.width = size;
    offscreen.height = size;

    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 20;
    const numSegments = segments.length;
    const arc = (2 * Math.PI) / numSegments;

    ctx.clearRect(0, 0, size, size);

    // Draw Segments
    for (let i = 0; i < numSegments; i++) {
      const segAngle = i * arc;
      const segColor = PALETTE[i % PALETTE.length];

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, segAngle, segAngle + arc);
      ctx.closePath();
      ctx.fillStyle = segColor;
      ctx.fill();
      ctx.lineWidth = numSegments > 100 ? 0.8 : 1.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Text drawing
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(segAngle + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 3;

      const label = segments[i].name;
      const maxLen = numSegments > 120 ? 16 : 24;
      const displayLabel = label.length > maxLen ? label.substring(0, maxLen - 2) + '..' : label;

      ctx.fillText(displayLabel, radius - 24, fontSize / 3);
      ctx.restore();
      ctx.restore();
    }

    // Draw Realistic Metallic Pegs (Pins) at every segment junction on the outer edge
    const pegRadius = numSegments > 80 ? 2.5 : numSegments > 40 ? 3.5 : 4.5;
    const pegDistanceFromCenter = radius - 4;

    for (let i = 0; i < numSegments; i++) {
      const pegAngle = i * arc;
      const pegX = centerX + Math.cos(pegAngle) * pegDistanceFromCenter;
      const pegY = centerY + Math.sin(pegAngle) * pegDistanceFromCenter;

      ctx.save();
      // Peg drop shadow
      ctx.beginPath();
      ctx.arc(pegX, pegY + 1.5, pegRadius, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fill();

      // Peg metallic gradient
      ctx.beginPath();
      ctx.arc(pegX, pegY, pegRadius, 0, 2 * Math.PI);
      const pegGrad = ctx.createRadialGradient(
        pegX - pegRadius * 0.3,
        pegY - pegRadius * 0.3,
        pegRadius * 0.1,
        pegX,
        pegY,
        pegRadius
      );
      pegGrad.addColorStop(0, '#ffffff'); // Glint highlight
      pegGrad.addColorStop(0.3, '#fef08a'); // Gold metallic shine
      pegGrad.addColorStop(0.7, '#eab308'); // Brass/gold body
      pegGrad.addColorStop(1, '#854d0e'); // Outer rim shadow
      ctx.fillStyle = pegGrad;
      ctx.fill();

      // Crisp outer stroke
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = '#451a03';
      ctx.stroke();
      ctx.restore();
    }
  }, [segments, wheelSize, fontSize]);

  // 2. High-speed render loop
  const drawRotatedWheel = useCallback((angle: number) => {
    const canvas = canvasRef.current;
    const offscreen = offscreenCanvasRef.current;
    if (!canvas || !offscreen) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 20;

    ctx.clearRect(0, 0, size, size);

    // Outer Rim
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 12, 0, 2 * Math.PI);
    const rimGrad = ctx.createRadialGradient(centerX, centerY, radius - 10, centerX, centerY, radius + 15);
    rimGrad.addColorStop(0, '#1e293b');
    rimGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = rimGrad;
    ctx.shadowBlur = 25;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.fill();
    ctx.restore();

    // Rotate pre-rendered bitmap
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    ctx.drawImage(offscreen, -centerX, -centerY);
    ctx.restore();

    // Center Red Background Circle
    const centerRadius = 60;
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, centerRadius + 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, centerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = '#FF0000';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();

    // Center AV Logo
    if (logoImageRef.current && logoImageRef.current.complete) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, centerRadius - 2, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.clip();

      const drawDiameter = centerRadius * 2;
      ctx.drawImage(
        logoImageRef.current,
        centerX - centerRadius,
        centerY - centerRadius,
        drawDiameter,
        drawDiameter
      );
      ctx.restore();
    }

    // Fancy Wheel of Fortune (WOF) Mechanical Stopper/Flipper
    const numSegments = segments.length;
    const arc = numSegments > 0 ? (2 * Math.PI) / numSegments : 0;
    
    // Physics-based flapper deflection calculation:
    // As wheel spins clockwise (increasing angle), pegs hit the flapper from right to left,
    // pushing the flapper back, and then releasing it to snap forward with damped recoil.
    let flapperAngle = 0;
    if (numSegments > 0) {
      const pointerAngle = (3 * Math.PI) / 2; // 270 deg (top center)
      // Modulo within current arc segment
      const pegPhase = (((angle - pointerAngle) % arc) + arc) % arc;
      const collisionWidth = Math.min(arc * 0.45, 0.12); // Collision strike window

      if (pegPhase < collisionWidth) {
        // Linear deflection as peg pushes against the flexible flapper
        const strikeProgress = pegPhase / collisionWidth;
        flapperAngle = -0.38 * (1 - strikeProgress); // Deflects back up to ~22 degrees
      } else {
        // Quick elastic snap-back oscillation
        const snapProgress = (pegPhase - collisionWidth) / (arc - collisionWidth);
        if (snapProgress < 0.25) {
          const recoil = (snapProgress / 0.25);
          flapperAngle = Math.sin(recoil * Math.PI * 2) * 0.12 * (1 - recoil);
        }
      }
    }

    ctx.save();
    // Pivot mount raised higher above the outer rim (radius + 28px) so only the bottom 1/4 of the tip touches the pegs
    const pivotX = centerX;
    const pivotY = centerY - radius - 28;
    ctx.translate(pivotX, pivotY);

    // 1. Sleek Heavy-duty Chrome/Gold Mounting Bracket
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-20, -16, 40, 24, 6);
    const bracketGrad = ctx.createLinearGradient(-20, -16, 20, 8);
    bracketGrad.addColorStop(0, '#f8fafc');
    bracketGrad.addColorStop(0.3, '#cbd5e1');
    bracketGrad.addColorStop(0.7, '#64748b');
    bracketGrad.addColorStop(1, '#334155');
    ctx.fillStyle = bracketGrad;
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.fill();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Twin mounting screws on bracket
    [-11, 11].forEach((sx) => {
      ctx.beginPath();
      ctx.arc(sx, -4, 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#0f172a';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sx, -4, 1, 0, 2 * Math.PI);
      ctx.fillStyle = '#94a3b8';
      ctx.fill();
    });
    ctx.restore();

    // 2. The Dynamic Flexible WOF Flapper Blade (rotates around pivot)
    ctx.save();
    ctx.rotate(flapperAngle);

    // Drop shadow under flapper
    ctx.shadowBlur = 12;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';

    // Needle Blade Contour: Total length 46px (tip reaches exactly 18px below rim, perfectly striking pegs with just the bottom 6-8px tip!)
    ctx.beginPath();
    ctx.moveTo(-8, 0); // Left shoulder
    ctx.bezierCurveTo(-11, 16, -5, 33, 0, 46); // Left curved edge down to pointer tip
    ctx.bezierCurveTo(5, 33, 11, 16, 8, 0); // Right curved edge up to right shoulder
    ctx.bezierCurveTo(6, -8, -6, -8, -8, 0); // Rounded top heel
    ctx.closePath();

    // Rich dual-tone ruby/crimson metallic gradient
    const bladeGrad = ctx.createLinearGradient(-11, 0, 11, 46);
    bladeGrad.addColorStop(0, '#ff4d4d');
    bladeGrad.addColorStop(0.4, '#dc2626');
    bladeGrad.addColorStop(0.8, '#991b1b');
    bladeGrad.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = bladeGrad;
    ctx.fill();

    // Gleaming white-gold outline
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Inner Spine Crease Highlight for 3D metallic feel
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.lineTo(0, 40);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 3. Brass / Gold Center Pivot Cap
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, 2 * Math.PI);
    const pivotGrad = ctx.createRadialGradient(-1.5, -1.5, 1, 0, 0, 6);
    pivotGrad.addColorStop(0, '#ffffff');
    pivotGrad.addColorStop(0.4, '#fbbf24');
    pivotGrad.addColorStop(0.8, '#d97706');
    pivotGrad.addColorStop(1, '#78350f');
    ctx.fillStyle = pivotGrad;
    ctx.fill();
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore(); // restore flapper rotation
    ctx.restore(); // restore bracket translate
  }, [segments]);

  // Calculate currently pointed segment
  const updatePointingSegment = useCallback((angle: number) => {
    if (!onPointingSegmentChange || segments.length === 0) return;
    const numSegments = segments.length;
    const arc = (2 * Math.PI) / numSegments;
    const pointerAngle = (3 * Math.PI) / 2; // top indicator
    
    // (angle + index * arc + arc/2) = pointerAngle
    // index * arc = pointerAngle - angle - arc/2
    const normalizedAngle = angle % (2 * Math.PI);
    let relative = (pointerAngle - normalizedAngle) % (2 * Math.PI);
    if (relative < 0) relative += 2 * Math.PI;

    const idx = Math.floor(relative / arc) % numSegments;
    if (idx !== lastReportedIdxRef.current) {
      lastReportedIdxRef.current = idx;
      onPointingSegmentChange(segments[idx]);
    }
  }, [segments, onPointingSegmentChange]);

  useEffect(() => {
    renderOffscreenWheel();
    drawRotatedWheel(currentAngleRef.current);
    updatePointingSegment(currentAngleRef.current);
  }, [renderOffscreenWheel, drawRotatedWheel, updatePointingSegment]);

  // Spin Execution with GSAP
  const spinToWinner = useCallback((targetIndex?: number) => {
    if (isSpinning || segments.length === 0) return;

    setIsSpinning(true);
    onSpinStateChange?.(true);
    soundManager.playTickForDuration(duration);

    const numSegments = segments.length;
    const arc = (2 * Math.PI) / numSegments;

    const winnerIdx = targetIndex !== undefined
      ? targetIndex
      : Math.floor(Math.random() * numSegments);

    const revolutions = power === 'low' ? 5 : power === 'medium' ? 10 : 16;
    const targetCenter = winnerIdx * arc + arc / 2;
    const pointerAngle = 3 * Math.PI / 2; // Top indicator is at 270 degrees (3*pi/2)
    const currentAngle = currentAngleRef.current;
    
    // We want the wheel to stop such that: (finalAngle + targetCenter) % (2*PI) == pointerAngle % (2*PI)
    // Therefore: finalAngle = pointerAngle - targetCenter (modulo 2*PI)
    // To spin smoothly forward by `revolutions` full turns from currentAngle:
    const baseTargetAngle = pointerAngle - targetCenter;
    const currentMod = currentAngle % (2 * Math.PI);
    let diff = (baseTargetAngle - currentMod) % (2 * Math.PI);
    if (diff < 0) {
      diff += 2 * Math.PI;
    }
    const finalAngle = currentAngle + (revolutions * 2 * Math.PI) + diff;

    const anim = { angle: currentAngleRef.current };

    if (tweenRef.current) tweenRef.current.kill();

    // Realistic physical carnival wheel drag curve:
    // Fast initial velocity, smooth middle deceleration, and an extended suspenseful final crawl across the last segments.
    const wheelEase = CustomEase.create(
      'realisticWheelDrag',
      'M0,0 C0.06,0.38 0.16,0.82 0.52,0.94 0.72,0.978 0.88,0.993 1,1'
    );

    tweenRef.current = gsap.to(anim, {
      angle: finalAngle,
      duration: duration,
      ease: wheelEase,
      onUpdate: () => {
        currentAngleRef.current = anim.angle;
        drawRotatedWheel(anim.angle);
        updatePointingSegment(anim.angle);
      },
      onComplete: () => {
        setIsSpinning(false);
        onSpinStateChange?.(false);
        soundManager.playWinnerFanfare();
        if (onSpinEnd) {
          onSpinEnd(segments[winnerIdx]);
        }
      },
    });
  }, [isSpinning, segments, duration, power, drawRotatedWheel, onSpinEnd, onSpinStateChange]);

  const resetWheel = useCallback(() => {
    if (tweenRef.current) tweenRef.current.kill();
    soundManager.stopAllTicks();
    currentAngleRef.current = 0;
    lastReportedIdxRef.current = -1;
    setIsSpinning(false);
    onSpinStateChange?.(false);
    drawRotatedWheel(0);
    updatePointingSegment(0);
  }, [drawRotatedWheel, onSpinStateChange, updatePointingSegment]);

  useImperativeHandle(ref, () => ({
    spinToWinner,
    resetWheel,
  }));

  return (
    <div className="relative flex flex-col items-center justify-center">
      <canvas
        ref={canvasRef}
        width={wheelSize}
        height={wheelSize}
        style={{ width: `${Math.min(wheelSize, 850)}px`, height: `${Math.min(wheelSize, 850)}px` }}
        className={`drop-shadow-[0_0_40px_rgba(0,0,0,0.8)] max-w-[92vw] max-h-[82vh] ${isViewer ? 'cursor-default pointer-events-none' : 'cursor-pointer'}`}
        onClick={() => {
          if (!isViewer && !isSpinning) {
            if (onSpinStart) onSpinStart();
            else spinToWinner();
          }
        }}
      />

      {/* Floating Center Spin Trigger Button (Only for Master / Non-Viewer Stage) */}
      {!isViewer && !isSpinning && (
        <button
          onClick={() => {
            if (onSpinStart) onSpinStart();
            else spinToWinner();
          }}
          className="absolute z-10 bottom-6 px-12 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:scale-105 active:scale-95 text-white font-black text-2xl tracking-widest rounded-full shadow-[0_0_30px_rgba(245,158,11,0.5)] border-2 border-white/30 transition-all duration-200"
        >
          SPIN WHEEL
        </button>
      )}
    </div>
  );
});

RaffleWheel.displayName = 'RaffleWheel';
