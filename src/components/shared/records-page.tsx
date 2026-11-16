"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeading, VehicleSelect } from "./common";
import { Button } from "@/components/ui/button";
import { RecordForm, type FormTarget } from "./record-form";
import { RecordList } from "./record-list";
import { useData } from "@/features/vehicles/data-provider";
import type { RecordKind } from "@/types/domain";
export function RecordsPage({
  kind,
  title,
  description,
  action,
  eyebrow,
}: {
  kind: RecordKind;
  title: string;
  description: string;
  action: string;
  eyebrow: string;
}) {
  const { selectedId } = useData();
  const [target, setTarget] = useState<FormTarget | null>(null);
  return (
    <>
      <PageHeading eyebrow={eyebrow} title={title} description={description}>
        <VehicleSelect />
        <Button
          disabled={!selectedId}
          onClick={() => setTarget({ kind, vehicleId: selectedId })}
        >
          <Plus size={16} />
          {action}
        </Button>
      </PageHeading>
      <RecordList
        key={`${kind}-${selectedId}`}
        kind={kind}
        vehicleId={selectedId}
        onEdit={(initial) =>
          setTarget({ kind, vehicleId: selectedId, initial })
        }
      />
      {target && <RecordForm target={target} onClose={() => setTarget(null)} />}
    </>
  );
}
