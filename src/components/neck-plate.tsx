import { Label } from "@/components/label";

export function NeckPlate({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[14px] border border-border bg-card px-[22px] pt-[18px] pb-0">
      <Label className="mb-2 block">{label}</Label>
      {children}
    </div>
  );
}
