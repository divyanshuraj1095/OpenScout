import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = "", hoverEffect = false, ...props }) => {
  return (
    <div
      className={`bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm transition-all duration-200 ${
        hoverEffect ? "hover:border-neutral-400 hover:shadow-md" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = "", ...props }) => {
  return (
    <div className={`px-6 py-4 border-b border-neutral-100 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = "", ...props }) => {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = "", ...props }) => {
  return (
    <div className={`px-6 py-4 border-t border-neutral-100 bg-neutral-50/50 ${className}`} {...props}>
      {children}
    </div>
  );
};
