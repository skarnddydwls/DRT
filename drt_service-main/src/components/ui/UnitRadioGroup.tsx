"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export type Unit = "억 원" | "백만 원" | "천 원" | "원";

export const unitFactors: Record<Unit, number> = {
  "억 원": 100_000_000,
  "백만 원": 1_000_000,
  "천 원": 1_000,
  원: 1,
};

interface UnitRadioGroupProps {
  value: Unit;
  onChange: (u: Unit) => void;
}

export function UnitRadioGroup({ value, onChange }: UnitRadioGroupProps) {
  const options: Unit[] = ["억 원", "백만 원", "천 원", "원"];

  return (
    <RadioGroup
      value={value}
      onValueChange={onChange}
      className="flex space-x-4">
      {options.map((u) => (
        <div key={u} className="flex items-center space-x-1">
          <RadioGroupItem id={`unit-${u}`} value={u} />
          <Label htmlFor={`unit-${u}`} className="text-sm">
            {u}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}
