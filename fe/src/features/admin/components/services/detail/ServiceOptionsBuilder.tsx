"use client";

import React, { useState } from "react";
import { Plus, Trash2, Edit2, Loader2, Save, X, PlusCircle, AlignJustify } from "lucide-react";
import { BaseButton } from "@/components/ui/base/base_button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AdminServiceEntity } from "@/features/admin/services/admin-services.service";
import { ServiceOptionEntity, ServiceOptionChoiceEntity, PriceType } from "@/features/admin/services/admin-options.service";
import {
  useCreateServiceOption,
  useUpdateServiceOption,
  useDeleteServiceOption,
  useCreateServiceOptionChoice,
  useUpdateServiceOptionChoice,
  useDeleteServiceOptionChoice,
} from "@/features/admin/hooks/useAdminOptions";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  service: AdminServiceEntity & { options?: ServiceOptionEntity[] };
}

export function ServiceOptionsBuilder({ service }: Props) {
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [editingChoiceId, setEditingChoiceId] = useState<string | null>(null);

  const createOption = useCreateServiceOption();
  const updateOption = useUpdateServiceOption();
  const deleteOption = useDeleteServiceOption();

  const createChoice = useCreateServiceOptionChoice();
  const updateChoice = useUpdateServiceOptionChoice();
  const deleteChoice = useDeleteServiceOptionChoice();

  // Option Form State
  const [optionName, setOptionName] = useState("");
  const [optionDesc, setOptionDesc] = useState("");
  const [isOptionRequired, setIsOptionRequired] = useState(false);
  const [isOptionMultiple, setIsOptionMultiple] = useState(false);

  // Choice Form State
  const [choiceName, setChoiceName] = useState("");
  const [choicePriceType, setChoicePriceType] = useState<PriceType>(PriceType.FIXED_ADD);
  const [choicePriceValue, setChoicePriceValue] = useState<number>(0);
  const [choiceDurationValue, setChoiceDurationValue] = useState<number>(0);

  const options = service.options || [];

  const handleCreateOption = () => {
    if (!optionName.trim()) return;
    createOption.mutate(
      {
        serviceId: service.id,
        payload: {
          name: optionName,
          description: optionDesc,
          isRequired: isOptionRequired,
          isMultiple: isOptionMultiple,
        },
      },
      {
        onSuccess: () => {
          setOptionName("");
          setOptionDesc("");
          setIsOptionRequired(false);
          setIsOptionMultiple(false);
        },
      }
    );
  };

  const handleCreateChoice = (optionId: string) => {
    if (!choiceName.trim()) return;
    createChoice.mutate(
      {
        optionId,
        payload: {
          name: choiceName,
          priceType: choicePriceType,
          priceValue: choicePriceValue,
          durationValue: choiceDurationValue,
        },
      },
      {
        onSuccess: () => {
          setChoiceName("");
          setChoicePriceValue(0);
          setChoiceDurationValue(0);
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-bold">Quản lý Lựa chọn (Option Động)</h3>
        <p className="text-sm text-muted-foreground">
          Thêm các câu hỏi hoặc tùy chọn để khách hàng chọn khi đặt dịch vụ (Ví dụ: Bạn có thú cưng không?).
        </p>
      </div>

      <div className="bg-muted/30 p-6 rounded-2xl border border-border/50">
        <div className="grid gap-4 mb-4">
          <div>
            <Label className="font-bold">Tên câu hỏi (Option)</Label>
            <Input 
              placeholder="VD: Bạn cần dọn thêm phòng nào không?" 
              value={optionName}
              onChange={(e) => setOptionName(e.target.value)}
            />
          </div>
          <div>
            <Label className="font-bold">Mô tả thêm</Label>
            <Input 
              placeholder="Giải thích cho khách hàng hiểu rõ hơn" 
              value={optionDesc}
              onChange={(e) => setOptionDesc(e.target.value)}
            />
          </div>
          <div className="flex gap-8">
            <div className="flex items-center gap-2">
              <Switch checked={isOptionRequired} onCheckedChange={setIsOptionRequired} />
              <Label>Bắt buộc trả lời</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isOptionMultiple} onCheckedChange={setIsOptionMultiple} />
              <Label>Cho phép chọn nhiều</Label>
            </div>
          </div>
        </div>
        <BaseButton onClick={handleCreateOption} disabled={createOption.isPending}>
          {createOption.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Thêm Option mới
        </BaseButton>
      </div>

      {options.length > 0 && (
        <Accordion type="multiple" className="w-full space-y-4">
          {options.map((option) => (
            <AccordionItem key={option.id} value={option.id} className="border bg-card rounded-2xl overflow-hidden shadow-sm px-2">
              <AccordionTrigger className="hover:no-underline px-4 py-4">
                <div className="flex items-center gap-4 text-left">
                  <AlignJustify className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <h4 className="font-bold text-lg">{option.name}</h4>
                    {option.description && <p className="text-sm text-muted-foreground">{option.description}</p>}
                  </div>
                  <div className="ml-4 flex gap-2">
                    {option.isRequired && <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-md font-bold">Bắt buộc</span>}
                    {option.isMultiple && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-md font-bold">Nhiều lựa chọn</span>}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-2">
                <div className="space-y-4">
                  {/* List Choices */}
                  {option.choices && option.choices.length > 0 && (
                    <div className="space-y-3 mt-4">
                      {option.choices.map((choice) => (
                        <div key={choice.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-muted/10">
                          <div className="flex flex-col">
                            <span className="font-bold">{choice.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {choice.priceType === PriceType.FIXED_ADD ? `Cộng thêm: ${choice.priceValue} VNĐ` :
                               choice.priceType === PriceType.MULTIPLY ? `Nhân hệ số: x${choice.priceValue}` :
                               `Giá trị: ${choice.priceValue}`} 
                              {choice.durationValue > 0 && ` | +${choice.durationValue} phút`}
                            </span>
                          </div>
                          <BaseButton variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => deleteChoice.mutate(choice.id)}>
                            <Trash2 className="w-4 h-4" />
                          </BaseButton>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Choice Form */}
                  <div className="mt-6 border-t pt-4">
                    <h5 className="font-bold text-sm mb-3 text-primary flex items-center gap-2">
                      <PlusCircle className="w-4 h-4" />
                      Thêm Câu trả lời (Lựa chọn)
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="space-y-2 md:col-span-1">
                        <Label>Tên lựa chọn</Label>
                        <Input 
                          placeholder="VD: Có chó mèo" 
                          value={choiceName}
                          onChange={(e) => setChoiceName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-1">
                        <Label>Kiểu tính phí</Label>
                        <Select value={choicePriceType} onValueChange={(val) => setChoicePriceType(val as PriceType)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={PriceType.FIXED_ADD}>Cộng thêm (VNĐ)</SelectItem>
                            <SelectItem value={PriceType.MULTIPLY}>Nhân hệ số (x)</SelectItem>
                            <SelectItem value={PriceType.NONE}>Không tính phí</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2 md:col-span-1">
                        <Label>Mức giá / Hệ số</Label>
                        <Input 
                          type="number" 
                          placeholder="0"
                          value={choicePriceValue}
                          onChange={(e) => setChoicePriceValue(Number(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-1">
                        <Label>Cộng thời gian (phút)</Label>
                        <Input 
                          type="number" 
                          placeholder="0"
                          value={choiceDurationValue}
                          onChange={(e) => setChoiceDurationValue(Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <BaseButton 
                        variant="outline" 
                        onClick={() => deleteOption.mutate(option.id)}
                        className="text-destructive border-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Xóa Option này
                      </BaseButton>
                      <BaseButton 
                        onClick={() => handleCreateChoice(option.id)} 
                        disabled={createChoice.isPending || !choiceName}
                      >
                        {createChoice.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Lưu Lựa chọn
                      </BaseButton>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
