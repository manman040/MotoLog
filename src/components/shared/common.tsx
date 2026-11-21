"use client";
import type { ReactNode } from "react";
import { FolderOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useData } from "@/features/vehicles/data-provider";
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}
export function VehicleSelect() {
  const { vehicles, selectedId, select } = useData();
  return (
    <select
      aria-label="Active vehicle"
      value={selectedId}
      onChange={(e) => select(e.target.value)}
      style={{ maxWidth: 220, fontSize: 11 }}
    >
      <option value="" disabled>
        Select a vehicle
      </option>
      {vehicles
        .filter((v) => !v.archived)
        .map((v) => (
          <option key={v.id} value={v.id}>
            {v.brand} {v.model}
          </option>
        ))}
    </select>
  );
}
export function EmptyState({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      <FolderOpen size={32} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <Button onClick={onAction}>
          <Plus size={15} />
          {action}
        </Button>
      )}
    </div>
  );
}
export function Stat({
  title,
  value,
  foot,
  icon,
}: {
  title: string;
  value: ReactNode;
  foot: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        {title}
        <span className="stat-icon">{icon}</span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-foot">{foot}</div>
    </div>
  );
}
