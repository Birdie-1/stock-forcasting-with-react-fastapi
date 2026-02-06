import React from 'react';

export const Skeleton = ({ className, ...props }) => {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200/80 ${className}`}
      {...props}
    />
  );
};

export const TableSkeleton = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="w-full animate-pulse">
      <div className="flex space-x-4 mb-4">
        {Array(cols).fill(0).map((_, i) => (
          <div key={`head-${i}`} className="h-8 bg-gray-200 rounded w-full" />
        ))}
      </div>
      <div className="space-y-3">
        {Array(rows).fill(0).map((_, i) => (
          <div key={`row-${i}`} className="flex space-x-4">
            {Array(cols).fill(0).map((_, j) => (
              <div key={`cell-${i}-${j}`} className="h-12 bg-gray-100 rounded w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
