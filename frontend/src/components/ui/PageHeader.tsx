import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export default function PageHeader({ title, subtitle, children }: Props) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {children && <div className="head-actions">{children}</div>}
    </div>
  );
}
