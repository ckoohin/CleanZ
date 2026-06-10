"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FolderOpen, Upload, CheckCircle2, AlertCircle,
  ImageIcon, X, FileText, Camera, HeartPulse, GraduationCap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTaskerProfile, useUpdateTaskerDocuments } from "@/features/tasker/hooks/tasker.hooks";
import { toast } from "sonner";

interface DocUploadItem {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  required: boolean;
  accept: string;
  fieldName: string;
  multiple?: boolean;
  hint?: string;
}

const DOC_ITEMS: DocUploadItem[] = [
  {
    key: "citizenCard",
    label: "CCCD / CMND (2 mặt)",
    description: "Chụp rõ 2 mặt CCCD, không che khuất thông tin",
    icon: FileText,
    required: true,
    accept: "image/*",
    fieldName: "citizenCard",
    multiple: true,
    hint: "Chấp nhận: JPG, PNG, HEIC (tối đa 10MB/ảnh)"
  },
  {
    key: "idWithSelfie",
    label: "Ảnh Selfie cầm CCCD",
    description: "Chụp ảnh bạn đang cầm CCCD sát khuôn mặt — dùng để xác minh danh tính",
    icon: Camera,
    required: true,
    accept: "image/*",
    fieldName: "idWithSelfie",
    hint: "Khuôn mặt và CCCD phải rõ ràng, đủ sáng"
  },
  {
    key: "criminalRecord",
    label: "Lý lịch tư pháp",
    description: "Phiếu Lý lịch tư pháp số 1 hoặc số 2 (còn hiệu lực trong 6 tháng)",
    icon: FileText,
    required: true,
    accept: "image/*,application/pdf",
    fieldName: "criminalRecord",
    hint: "Chấp nhận: JPG, PNG, PDF"
  },
  {
    key: "healthCertificate",
    label: "Giấy khám sức khỏe",
    description: "Do cơ sở y tế cấp quận/huyện trở lên cấp, trong vòng 6 tháng",
    icon: HeartPulse,
    required: false,
    accept: "image/*,application/pdf",
    fieldName: "healthCertificate",
    hint: "Khuyến nghị nộp để tăng tỷ lệ duyệt hồ sơ"
  },
  {
    key: "certificate",
    label: "Chứng chỉ nghề / Bằng cấp",
    description: "Chứng nhận đào tạo nghề hoặc các khóa học liên quan (nếu có)",
    icon: GraduationCap,
    required: false,
    accept: "image/*,application/pdf",
    fieldName: "certificate",
    hint: "Không bắt buộc nhưng giúp hồ sơ nổi bật hơn"
  },
];

type UploadState = Record<string, File[]>;

interface FilePreviewProps {
  files: File[];
  onRemove: (index: number) => void;
}

function FilePreview({ files, onRemove }: FilePreviewProps) {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {files.map((file, idx) => (
        <div key={idx} className="relative group">
          {file.type.startsWith("image/") ? (
            <img
              src={URL.createObjectURL(file)}
              alt={file.name}
              className="w-20 h-20 object-cover rounded-xl border-2 border-primary/20"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl border-2 border-primary/20 bg-muted flex flex-col items-center justify-center gap-1">
              <FileText className="w-6 h-6 text-primary" aria-hidden="true" />
              <span className="text-[10px] text-muted-foreground text-center px-1 truncate w-full">{file.name}</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => onRemove(idx)}
            className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
          >
            <X className="w-3 h-3" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}

interface TabDocumentsProps {
  onBack: () => void;
  onNext: () => void;
}

export function TabDocuments({ onBack, onNext }: TabDocumentsProps) {
  const { data: profile } = useTaskerProfile();
  const updateDocsMutation = useUpdateTaskerDocuments();
  const [uploads, setUploads] = useState<UploadState>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileSelect = (key: string, multiple: boolean, files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    setUploads(prev => ({
      ...prev,
      [key]: multiple ? [...(prev[key] ?? []), ...fileArray] : fileArray,
    }));
  };

  const removeFile = (key: string, index: number) => {
    setUploads(prev => ({
      ...prev,
      [key]: (prev[key] ?? []).filter((_, i) => i !== index),
    }));
  };

  const requiredDone = DOC_ITEMS
    .filter(d => d.required)
    .every(d => (uploads[d.key]?.length ?? 0) > 0);

  const handleSubmit = async () => {
    if (!requiredDone) {
      toast.error("Vui lòng tải lên đủ giấy tờ bắt buộc (dấu *)");
      return;
    }
    if (!profile?.id) {
      toast.error("Không tìm thấy hồ sơ, vui lòng quay lại bước trước");
      return;
    }
    try {
      const payload = new FormData();
      DOC_ITEMS.forEach(item => {
        (uploads[item.key] ?? []).forEach(file => {
          payload.append(item.fieldName, file);
        });
      });
      await updateDocsMutation.mutateAsync({ id: profile.id, formData: payload });
      toast.success("Tải tài liệu thành công!");
      onNext();
    } catch {
      toast.error("Lỗi khi tải tài liệu, vui lòng thử lại");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
        <CardHeader className="pt-10 px-10 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-primary" aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold font-serif text-primary">Hồ sơ pháp lý</CardTitle>
              <p className="text-muted-foreground text-sm mt-1">
                Tải lên các giấy tờ cần thiết. Dấu <span className="text-destructive font-bold">*</span> là bắt buộc.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-10 pb-10 space-y-6">
          {DOC_ITEMS.map((item) => {
            const hasFiles = (uploads[item.key]?.length ?? 0) > 0;
            return (
              <div
                key={item.key}
                className={cn(
                  "rounded-2xl border-2 p-6 transition-all",
                  hasFiles ? "border-emerald-500/40 bg-emerald-500/5" : "border-border/50 bg-background/50"
                )}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      hasFiles ? "bg-emerald-500/15 text-emerald-600" : "bg-primary/10 text-primary"
                    )}>
                      {hasFiles ? <CheckCircle2 className="w-5 h-5" aria-hidden="true" /> : <item.icon className="w-5 h-5" aria-hidden="true" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-base">
                        {item.label}
                        {item.required && <span className="text-destructive ml-1">*</span>}
                        {!item.required && <span className="text-muted-foreground ml-1 text-xs font-normal">(Không bắt buộc)</span>}
                      </h3>
                      <p className="text-sm text-muted-foreground text-pretty">{item.description}</p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileRefs.current[item.key]?.click()}
                    className="rounded-xl shrink-0 gap-2"
                  >
                    <Upload className="w-4 h-4" aria-hidden="true" />
                    {hasFiles ? "Thêm" : "Tải lên"}
                  </Button>
                  <input
                    ref={el => { fileRefs.current[item.key] = el; }}
                    type="file"
                    accept={item.accept}
                    multiple={item.multiple}
                    className="hidden"
                    onChange={(e) => handleFileSelect(item.key, item.multiple ?? false, e.target.files)}
                  />
                </div>

                {item.hint && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-3">
                    <ImageIcon className="w-3 h-3" aria-hidden="true" /> {item.hint}
                  </p>
                )}

                {hasFiles ? (
                  <FilePreview files={uploads[item.key]} onRemove={(idx) => removeFile(item.key, idx)} />
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRefs.current[item.key]?.click()}
                    className="w-full mt-2 border-2 border-dashed border-border/40 rounded-xl p-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-all"
                  >
                    <Upload className="w-8 h-8" aria-hidden="true" />
                    <span className="text-sm font-medium">Nhấn hoặc kéo thả tệp vào đây</span>
                  </button>
                )}
              </div>
            );
          })}

          {!requiredDone && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-500/10 rounded-2xl px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Còn thiếu giấy tờ bắt buộc: {DOC_ITEMS.filter(d => d.required && !(uploads[d.key]?.length)).map(d => d.label).join(", ")}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-2">
        <Button type="button" variant="outline" size="lg" onClick={onBack} className="h-14 px-8 rounded-full text-base font-bold">
          Quay lại
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={handleSubmit}
          disabled={updateDocsMutation.isPending}
          className="h-14 px-10 rounded-full text-lg font-bold shadow-lg shadow-primary/20"
        >
          {updateDocsMutation.isPending ? "Đang tải lên..." : "Lưu tài liệu & Tiếp tục"}
        </Button>
      </div>
    </div>
  );
}
