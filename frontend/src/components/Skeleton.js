import React from 'react';

export default function Skeleton({ width = '100%', height = 18, radius = 6, style = {} }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: radius,
        background: 'var(--border)',
        opacity: 0.5,
        animation: 'pg-shimmer 1.4s ease infinite',
        ...style,
      }}
    />
  );
}
