import { RecordsPage } from "@/components/shared/records-page";
export default function Maintenance() {
  return (
    <RecordsPage
      kind="serviceRecords"
      eyebrow="A LITTLE CARE GOES A LONG WAY"
      title="Maintenance"
      description="A complete service story for every vehicle in your garage."
      action="Log service"
    />
  );
}
