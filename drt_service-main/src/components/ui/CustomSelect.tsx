"use client";

import React, {
  useState,
  useRef,
  useEffect,
  createContext,
  useContext,
} from "react";

// 자식 Option들에게 값과 체인지 함수를 전달해줄 Context
interface SelectContextType {
  selectedValue: string;
  onSelect: (val: string, label: string) => void;
}

const SelectContext = createContext<SelectContextType | null>(null);

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}

export function CustomSelect({ value, onChange, children }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayLabel, setDisplayLabel] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // children을 훑어서 현재 선택된 value의 label 텍스트 추출
  useEffect(() => {
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.props.value === value) {
        setDisplayLabel(child.props.children as string);
      }
    });
  }, [value, children]);

  const handleSelect = (val: string, label: string) => {
    onChange(val);
    setDisplayLabel(label);
    setIsOpen(false);
  };

  return (
    <SelectContext.Provider
      value={{ selectedValue: value, onSelect: handleSelect }}
    >
      <div ref={containerRef} className="relative w-full">
        {/* 버튼 본체 */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex h-[50px] w-full items-center justify-between rounded-[12px] border bg-white px-4 text-sm font-medium text-[#222222] transition-all ${
            isOpen
              ? "border-black shadow-sm ring-1 ring-black"
              : "border-[#CCCCCC] hover:border-gray-400"
          }`}
        >
          <span>{displayLabel || "선택하세요"}</span>
          <svg
            className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* 펼쳐지는 드롭다운 리스트 */}
        {isOpen && (
          <ul className="absolute left-0 top-[56px] z-50 w-full overflow-hidden rounded-[12px] border border-[#CCCCCC] bg-white p-1.5 shadow-lg">
            {children}
          </ul>
        )}
      </div>
    </SelectContext.Provider>
  );
}

// 자식 컴포넌트: CustomOption
interface CustomOptionProps {
  value: string;
  children: React.ReactNode;
}

export function CustomOption({ value, children }: CustomOptionProps) {
  const context = useContext(SelectContext);
  if (!context) return null;

  const isSelected = context.selectedValue === value;

  return (
    <li>
      <button
        type="button"
        onClick={() => context.onSelect(value, String(children))}
        className={`flex w-full items-center rounded-[8px] px-3 py-2.5 text-left text-sm transition-colors ${
          isSelected
            ? "bg-[#222222] font-semibold text-white"
            : "text-[#222222] hover:bg-gray-100"
        }`}
      >
        {children}
      </button>
    </li>
  );
}