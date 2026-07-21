import type { MedicineLineItem } from "@/lib/medicine-line-format";
import { splitMedicineLineSegments } from "@/lib/medicine-line-format";

export function MedicineLineText({ item }: { item: MedicineLineItem }) {
  const { latin, arabic } = splitMedicineLineSegments(item);

  return (
    <span dir="ltr" className="inline-block text-left">
      {latin.length > 0 && (
        <span className="font-medium">{latin.join(" ")}</span>
      )}
      {latin.length > 0 && arabic.length > 0 && <span> </span>}
      {arabic.length > 0 && (
        <span className="[unicode-bidi:plaintext]">{arabic.join(" ")}</span>
      )}
    </span>
  );
}

export function MedicineLineList({
  items,
  className,
}: {
  items: MedicineLineItem[];
  className?: string;
}) {
  return (
    <ol
      className={className ?? "list-none space-y-0.5 p-0 text-left"}
      dir="ltr"
    >
      {items.map((item, index) => (
        <li key={item.name + String(index)} className="text-left">
          <span className="me-1.5 font-mono tabular-nums text-[0.95em]">
            {index + 1}.
          </span>
          <MedicineLineText item={item} />
        </li>
      ))}
    </ol>
  );
}
