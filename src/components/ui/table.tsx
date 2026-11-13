import React from "react";

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  children,
  className = "",
  ...props
}) => {
  return (
    <div className="w-full overflow-x-auto border border-slate-200 rounded-md">
      <table className={`w-full text-left text-sm border-collapse ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
};

export const Thead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <thead className={`bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase tracking-wider ${className}`} {...props}>
    {children}
  </thead>
);

export const Tbody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <tbody className={`divide-y divide-slate-200 bg-white ${className}`} {...props}>
    {children}
  </tbody>
);

export const Tr: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <tr className={`hover:bg-slate-50/75 transition-colors ${className}`} {...props}>
    {children}
  </tr>
);

export const Th: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <th className={`px-3 py-2 text-xs font-semibold text-slate-700 ${className}`} {...props}>
    {children}
  </th>
);

export const Td: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className = "",
  ...props
}) => (
  <td className={`px-3 py-2 text-slate-800 ${className}`} {...props}>
    {children}
  </td>
);
