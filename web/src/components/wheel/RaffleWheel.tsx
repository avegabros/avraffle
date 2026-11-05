'use client';

import React, { useEffect, useState, useImperativeHandle, forwardRef, useRef, useCallback } from 'react';
import gsap from 'gsap';
import { soundManager } from '@/lib/sound';

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

interface RaffleWheelProps {
  segments: WheelSegment[];
  onSpinEnd?: (winner: WheelSegment) => void;
  onSpinStateChange?: (isSpinning: boolean) => void;
  power?: 'low' | 'medium' | 'high';
  duration?: number;
  fontSize?: number;
  wheelSize?: number;
}

const PALETTE = [
  '#2563EB', '#D97706', '#059669', '#DC2626', '#7C3AED',
  '#DB2777', '#0891B2', '#4F46E5', '#CA8A04', '#16A34A',
  '#9333EA', '#E11D48', '#0284C7', '#EA580C', '#475569',
];

export const RaffleWheel = forwardRef<RaffleWheelHandle, RaffleWheelProps>(({
  segments,
  onSpinEnd,
  onSpinStateChange,
  power = 'high',
  duration = 8,
  fontSize = 13,
  wheelSize = 900,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentAngleRef = useRef<number>(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);

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

    // Top Pointer Indicator
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(centerX - 24, centerY - radius - 8);
    ctx.lineTo(centerX + 24, centerY - radius - 8);
    ctx.lineTo(centerX, centerY - radius + 32);
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();
  }, []);

  useEffect(() => {
    renderOffscreenWheel();
    drawRotatedWheel(currentAngleRef.current);
  }, [renderOffscreenWheel, drawRotatedWheel]);

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
    const stopOffset = (3 * Math.PI / 2) - targetCenter;
    const totalRotation = (revolutions * 2 * Math.PI) + stopOffset;

    const anim = { angle: currentAngleRef.current };

    if (tweenRef.current) tweenRef.current.kill();

    tweenRef.current = gsap.to(anim, {
      angle: currentAngleRef.current + totalRotation,
      duration: duration,
      ease: 'power4.out',
      onUpdate: () => {
        currentAngleRef.current = anim.angle;
        drawRotatedWheel(anim.angle);
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
    setIsSpinning(false);
    onSpinStateChange?.(false);
    drawRotatedWheel(0);
  }, [drawRotatedWheel, onSpinStateChange]);

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
        className="drop-shadow-[0_0_40px_rgba(0,0,0,0.8)] cursor-pointer max-w-[92vw] max-h-[82vh]"
        onClick={() => !isSpinning && spinToWinner()}
      />

      {/* Floating Center Spin Trigger Button */}
      {!isSpinning && (
        <button
          onClick={() => spinToWinner()}
          className="absolute z-10 bottom-6 px-12 py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 hover:scale-105 active:scale-95 text-white font-black text-2xl tracking-widest rounded-full shadow-[0_0_30px_rgba(245,158,11,0.5)] border-2 border-white/30 transition-all duration-200"
        >
          SPIN WHEEL
        </button>
      )}
    </div>
  );
});

RaffleWheel.displayName = 'RaffleWheel';
