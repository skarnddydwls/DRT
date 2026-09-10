import { useState } from "react";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export interface ComboBoxOption {
  label: string;
  value: string | number;
}

interface ComboBoxProps {
  options: ComboBoxOption[];
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function ComboBox({
  options,
  value,
  onChange,
  placeholder = "선택",
  disabled,
  className,
}: ComboBoxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // 검색어에 따른 필터링된 옵션들
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`min-w-[200px] justify-between ${className || ""}`}
          disabled={disabled}>
          {value ? options.find((o) => o.value === value)?.label : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-54 p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="검색..."
            className="h-9"
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>결과 없음</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={(v) => {
                    // 선택된 label에 해당하는 option의 value를 찾아서 전달
                    const selectedOption = options.find(
                      (option) => option.label === v
                    );
                    if (selectedOption) {
                      onChange(String(selectedOption.value));
                    }
                    setSearchValue(""); // 검색어 초기화
                    setOpen(false);
                  }}>
                  {opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
