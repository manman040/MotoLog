"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Bike, Plus } from "lucide-react";
import { useData } from "@/features/vehicles/data-provider";
import { EmptyState, PageHeading } from "@/components/shared/common";
import { Button } from "@/components/ui/button";
import { RecordForm } from "@/components/shared/record-form";
import { VehicleVisual } from "@/components/shared/vehicle-visual";
import { km } from "@/lib/formatting";
export default function Garage() {
  const { vehicles, loading, error } = useData();
  const [add, setAdd] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [archived, setArchived] = useState(false);
  const list = vehicles.filter(
    (v) =>
      v.archived === archived &&
      `${v.brand} ${v.model} ${v.nickname} ${v.registrationNumber}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title="My Garage"
        description="View vehicle details, manage photos and keep track of mileage."
      >
        <Button onClick={() => setAdd(true)}>
          <Plus size={16} />
          Add vehicle
        </Button>
      </PageHeading>
      {saved && (
        <p role="status" className="notice">Vehicle added to your garage.</p>
      )}
      <div className="filter-bar">
        <input
          aria-label="Search vehicles"
          placeholder="Search your garage…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Vehicle status"
          value={String(archived)}
          onChange={(e) => setArchived(e.target.value === "true")}
        >
          <option value="false">Active vehicles</option>
          <option value="true">Archived vehicles</option>
        </select>
        <span className="badge">{list.length} vehicles</span>
      </div>
      {loading ? (
        <div className="skeleton" />
      ) : error ? null : (
        <div className="garage-grid">
          {list.length === 0 && (
            <div className="card garage-empty">
              <EmptyState
                title={search.trim() ? "No matching vehicles" : archived ? "No archived vehicles" : "No active vehicles"}
                description={
                  search.trim()
                    ? "Try a different name or registration number."
                    : archived
                      ? "Vehicles you archive will appear here."
                      : "Add a vehicle to start tracking mileage, maintenance and expenses."
                }
                action={search.trim() ? "Clear search" : archived ? undefined : "Add Vehicle"}
                onAction={() => search.trim() ? setSearch("") : setAdd(true)}
              />
            </div>
          )}
          {list.map((v) => (
            <article className="card garage-card" key={v.id}>
              <VehicleVisual vehicle={v} />
              <div className="garage-card-content">
                <span className="eyebrow">
                  {v.type}{v.nickname ? ` · ${v.nickname}` : ""}
                </span>
                <h2 style={{ marginTop: 10 }}>
                  {v.brand} {v.model} {v.variant}
                </h2>
                <p>
                  {v.year} <span style={{ padding: "0 8px" }}>·</span>
                  {v.registrationNumber}
                </p>
                <div className="vehicle-facts">
                  <div>
                    <span>ODOMETER</span>
                    <strong>{km(v.currentOdometerKm)} km</strong>
                  </div>
                  <div>
                    <span>TRANSMISSION</span>
                    <strong>{v.transmission}</strong>
                  </div>
                </div>
                <Button asChild variant="outline">
                  <Link href={`/garage/${v.id}`}>
                    View vehicle
                    <ArrowRight size={14} />
                  </Link>
                </Button>
              </div>
            </article>
          ))}
          {!archived && list.length > 0 && (
            <button className="add-vehicle-card" onClick={() => setAdd(true)}>
              <Bike size={30} />
              <strong>Your next ride belongs here.</strong>
              <span>Add a motorcycle or car</span>
              <Plus size={20} />
            </button>
          )}
        </div>
      )}
      {add && (
        <RecordForm
          target={{ kind: "vehicle" }}
          onClose={() => setAdd(false)}
          onSaved={() => {
            setSaved(true);
            setSearch("");
            setArchived(false);
          }}
        />
      )}
    </>
  );
}
