import { cn } from './utils';

import type { HTMLAttributes, ReactNode, TableHTMLAttributes, TdHTMLAttributes } from 'react';

export function TableScroll({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={className ?? 'overflow-x-auto'} {...props} />;
}

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={className} {...props} />;
}

export function DataTable({
  children,
  className,
  columns,
  scrollClassName,
}: {
  children: ReactNode;
  className?: string;
  columns: ReactNode[];
  scrollClassName?: string;
}) {
  return (
    <TableScroll className={scrollClassName}>
      <Table className={className}>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={index}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </Table>
    </TableScroll>
  );
}

export function TableEmptyRow({
  children,
  className,
  colSpan,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & {
  children: ReactNode;
  colSpan: number;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className={cn('empty', className)} {...props}>
        {children}
      </td>
    </tr>
  );
}
