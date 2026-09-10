"use client";

import { useEffect, useState } from "react";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { useForm, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ZodTypeAny } from "zod";

import { cn } from "@/lib/utils";
import type { FieldConfig, FieldOption } from "@/types/filterForm";

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ComboBox } from "@/components/ui/ComboBox";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface FilterFormProps<T extends FieldValues> {
  fields: FieldConfig[];
  defaultValues: T;
  schema?: ZodTypeAny;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSearch: (values: any) => void;
  className?: string;
  // 컨트롤드 패턴 지원
  values?: T;
  onChange?: (values: T) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function FilterForm<T extends FieldValues>({
  fields,
  defaultValues,
  schema,
  onSearch,
  className,
  values,
  onChange,
}: FilterFormProps<T>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<any>({
    defaultValues,
    resolver: schema ? zodResolver(schema as any) : undefined,
  });

  const [dynamicOptions, setDynamicOptions] = useState<
    Record<string, FieldOption[]>
  >({});

  // 컨트롤드 패턴: 외부 values가 바뀌면 내부 폼 값도 동기화
  useEffect(() => {
    if (values) {
      Object.entries(values).forEach(([key, value]) => {
        form.setValue(key, value);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values && JSON.stringify(values)]);

  // 컨트롤드 패턴: 내부 값이 바뀌면 onChange 호출
  useEffect(() => {
    if (onChange) {
      const subscription = form.watch((allValues) => {
        onChange(allValues as T);
      });
      return () => subscription.unsubscribe();
    }
  }, [form, onChange]);

  useEffect(() => {
    fields.forEach((f) => {
      if (f.optionsEndpoint) {
        fetch(f.optionsEndpoint)
          .then((res) => res.json())
          .then((data: { options: FieldOption[] }) => {
            setDynamicOptions((prev) => ({
              ...prev,
              [f.name]: data.options ?? [],
            }));
          });
      }
    });
  }, [fields]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSearch)}
        className={cn(
          "bg-[#E9E9E9] border border-[#D9D9D9] p-4 rounded-xl px-6",
          className
        )}>
        {/* 통합: 필드 갯수에 따라 1줄(<=4) 또는 2줄(>=5)로 렌더링하고, 조회 버튼은 항상 마지막 필드 우측에 위치 */}
        {(() => {
          const totalItems = fields.length + 1; // +1 = 조회 버튼
          const isTwoRows = fields.length >= 6; // 5개는 한 줄 유지
          const getPaddingClass = (count: number) => {
            if (count <= 2) return "px-[300px]";
            if (count === 3) return "px-[200px]";
            if (count === 4) return "px-[50px]";
            if (count === 5) return "px-[50px]";
            return "px-[50px]"; // 6개 이상(두 줄) 기본
          };
          const cols = isTwoRows ? Math.ceil(totalItems / 2) : totalItems;

          // 공통 필드 렌더 함수
          const renderField = (f: FieldConfig) => {
            let options = f.optionsEndpoint
              ? dynamicOptions[f.name] || []
              : f.options || [];
            if (f.filterOptions) options = f.filterOptions(options);

            return (
              <FormField
                key={f.name}
                control={form.control}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                name={f.name as any}
                render={({ field }) => (
                  <FormItem className="min-w-[200px] w-full">
                    <FormLabel>
                      {f.label}
                      {f.required && <span className="text-red-500">*</span>}
                    </FormLabel>

                    {f.type === "combobox" ? (
                      <FormControl>
                        <ComboBox
                          options={options}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={f.placeholder}
                          disabled={f.disabled}
                          className={cn("w-full", f.className)}
                        />
                      </FormControl>
                    ) : (
                      ["text", "date", "select"].includes(f.type) && (
                        <FormControl>
                          {f.type === "text" ? (
                            <Input
                              {...field}
                              placeholder={f.placeholder}
                              disabled={f.disabled}
                              className={cn("w-full", f.className)}
                            />
                          ) : f.type === "date" ? (
                            <Input
                              type="date"
                              {...field}
                              disabled={f.disabled}
                              className={cn("w-full", f.className)}
                            />
                          ) : (
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={f.disabled}>
                              <SelectTrigger
                                className={cn(
                                  "w-full bg-white border border-[#d9d9d9]",
                                  f.className
                                )}>
                                <SelectValue
                                  placeholder={f.placeholder || "선택"}
                                  className="truncate"
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {options.map((opt) => (
                                  <SelectItem
                                    key={opt.value}
                                    value={String(opt.value)}
                                    className="truncate">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </FormControl>
                      )
                    )}

                    {f.error && (
                      <p className="text-red-500 text-sm mt-1">{f.error}</p>
                    )}
                  </FormItem>
                )}
              />
            );
          };

          if (!isTwoRows) {
            // 1줄: 중앙 정렬
            if (fields.length === 1) {
              // 단일 필드: 필드가 크게 늘어나고 버튼은 바로 우측에 위치
              return (
                <div className="w-full overflow-x-auto">
                  <div
                    className={cn(
                      "flex justify-center",
                      getPaddingClass(fields.length)
                    )}>
                    <div
                      className="grid gap-4 items-end justify-center w-full"
                      style={{
                        gridTemplateColumns: `1fr auto`,
                        maxWidth: "100%",
                        minWidth: 0,
                      }}>
                      {fields.map(renderField)}
                      <div className="flex items-end justify-start">
                        <Button type="submit" className="rounded-lg">
                          조회
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // 2~4개: 고정 범위 트랙으로 균등 분할
            return (
              <div className="w-full overflow-x-auto">
                <div
                  className={cn(
                    "flex justify-center",
                    getPaddingClass(fields.length)
                  )}>
                  <div
                    className="grid gap-4 items-end justify-center"
                    style={{
                      gridTemplateColumns: `repeat(${cols}, minmax(200px, 1fr))`,
                      width: "100%",
                      maxWidth: "100%",
                      minWidth: 0,
                    }}>
                    {fields.map(renderField)}
                    <div className="flex items-end justify-start">
                      <Button type="submit" className="rounded-lg">
                        조회
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // 2줄: 각 줄이 동일한 컬럼 수를 갖도록 균등 분할, 버튼은 마지막 칸
          const firstRowCount = Math.min(cols, fields.length);
          const secondRowStart = firstRowCount;
          const firstRowFields = fields.slice(0, firstRowCount);
          const secondRowFields = fields.slice(secondRowStart);

          return (
            <div className="flex flex-col gap-4 w-full overflow-x-auto">
              <div
                className={cn(
                  "flex justify-center",
                  getPaddingClass(fields.length)
                )}>
                <div
                  className="grid gap-4 items-end justify-center"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, minmax(200px, 1fr))`,
                    width: "100%",
                    maxWidth: "100%",
                    minWidth: 0,
                  }}>
                  {firstRowFields.map(renderField)}
                </div>
              </div>
              <div
                className={cn(
                  "flex justify-center",
                  getPaddingClass(fields.length)
                )}>
                <div
                  className="grid gap-4 items-end justify-center w-full"
                  style={{
                    gridTemplateColumns:
                      secondRowFields.length === 1
                        ? `1fr auto`
                        : `repeat(${cols}, minmax(200px, 1fr))`,
                    maxWidth: "100%",
                    minWidth: 0,
                  }}>
                  {secondRowFields.map(renderField)}
                  <div className="flex items-end justify-start">
                    <Button type="submit" className="rounded-lg">
                      조회
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
        {/* <Button
          type="button"
          className="rounded-lg"
          variant="outline"
          onClick={() => form.reset()}>
          초기화
        </Button> */}
      </form>
    </Form>
  );
}
