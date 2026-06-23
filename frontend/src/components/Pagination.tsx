import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/Button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-neutral-100 pt-6">
      
      {/* Previous Button */}
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="flex items-center gap-1.5"
      >
        <ChevronLeft className="w-4 h-4" />
        Previous
      </Button>

      {/* Page Info */}
      <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
        Page {currentPage} of {totalPages}
      </span>

      {/* Next Button */}
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="flex items-center gap-1.5"
      >
        Next
        <ChevronRight className="w-4 h-4" />
      </Button>
      
    </div>
  );
};
export default Pagination;
