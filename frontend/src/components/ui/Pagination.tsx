import { Button } from './button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100 bg-white">
      <span className="text-sm text-neutral-500">
        Halaman <span className="font-semibold text-neutral-700">{currentPage}</span> dari <span className="font-semibold text-neutral-700">{totalPages}</span>
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg h-8 text-xs"
          disabled={currentPage === 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        >
          Sebelumnya
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg h-8 text-xs"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        >
          Selanjutnya
        </Button>
      </div>
    </div>
  );
}
