"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { VehicleArt } from "@/features/vehicles/art";
import { useData } from "@/features/vehicles/data-provider";
import type { Vehicle } from "@/types/domain";
export function VehicleVisual({ vehicle }: { vehicle: Vehicle }) {
  const { repo } = useData();
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    if (vehicle.photoPath)
      repo
        .fileURL(vehicle.photoPath)
        .then((url) => {
          if (active) {
            setUrl(url);
            setFailed(false);
          }
        })
        .catch(() => {
          if (active) setFailed(true);
        });
    return () => {
      active = false;
    };
  }, [repo, vehicle.photoPath]);
  if (!url || failed)
    return (
      <>
        <VehicleArt type={vehicle.type} />
        {failed && (
          <p className="form-help" role="status">
            Photo unavailable. Your vehicle details are still available.
          </p>
        )}
      </>
    );
  return (
    <div className="vehicle-art">
      <Image
        src={url}
        alt={`${vehicle.brand} ${vehicle.model}`}
        fill
        sizes="(max-width: 640px) 90vw, 600px"
        style={{ objectFit: "cover" }}
        unoptimized
        onError={() => setFailed(true)}
      />
    </div>
  );
}
