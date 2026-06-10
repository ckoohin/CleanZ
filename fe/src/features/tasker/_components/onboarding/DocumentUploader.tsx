"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from "@/components/ui/dialog";
import { 
  Upload, X, CheckCircle2, AlertCircle, Trash2, Camera, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface GuidelineProps {
  title: string;
  sampleImages: string[];
  dos: string[];
  donts: string[];
}

interface DocumentUploaderProps {
  title: string;
  description?: string;
  guideline: GuidelineProps;
  value?: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  isAvatar?: boolean;
}

export function DocumentUploader({ 
  title, description, guideline, value, onChange, accept = "image/*", isAvatar 
}: DocumentUploaderProps) {
  const [showGuideline, setShowGuideline] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange(file);
      setShowGuideline(false); // Đóng modal sau khi chọn file
    }
    // Reset input để có thể chọn lại cùng 1 file
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenGuideline = () => {
    setShowGuideline(true);
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const previewUrl = value ? URL.createObjectURL(value) : null;

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-end mb-1">
          <div>
            <h3 className="font-bold text-foreground text-base flex items-center gap-2">
              {title}
              <span className="text-destructive">*</span>
            </h3>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>

        {/* Khung Dropzone/Preview */}
        <div 
          onClick={!value ? handleOpenGuideline : undefined}
          className={cn(
            "relative w-full border-2 border-dashed rounded-2xl transition-all overflow-hidden flex flex-col items-center justify-center gap-3",
            value 
              ? "border-primary bg-primary/5 cursor-default p-2" 
              : "border-border/60 bg-muted/30 hover:border-primary/50 hover:bg-muted/50 cursor-pointer p-8",
            isAvatar ? (value ? "aspect-square max-w-[200px] mx-auto rounded-full" : "min-h-[200px]") : "min-h-[200px]"
          )}
        >
          {value && previewUrl ? (
            <>
              {/* Preview Mode */}
              <img 
                src={previewUrl} 
                alt="Preview" 
                className={cn(
                  "w-full h-full object-cover",
                  isAvatar ? "rounded-full" : "rounded-xl"
                )} 
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm" 
                  className="rounded-full h-10 px-4 shadow-xl"
                  onClick={handleOpenGuideline}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Chụp lại
                </Button>
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="icon" 
                  className="rounded-full h-10 w-10 shadow-xl"
                  onClick={handleRemove}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Empty Mode */}
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                <Upload className="w-6 h-6" />
              </div>
              <span className="font-semibold text-foreground">Nhấn để tải ảnh lên</span>
              <span className="text-xs text-muted-foreground text-center max-w-[250px]">
                Hỗ trợ định dạng JPG, PNG. Tối đa 10MB.
              </span>
            </>
          )}
        </div>
      </div>

      {/* Input Ẩn */}
      <input
        type="file"
        ref={fileInputRef}
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Modal Hướng Dẫn - Grab Style */}
      <Dialog open={showGuideline} onOpenChange={setShowGuideline}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2rem] gap-0 bg-background">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-2xl font-bold">Hướng dẫn tải lên tài liệu</DialogTitle>
            <DialogDescription className="hidden">Hướng dẫn chi tiết cách chụp ảnh giấy tờ hợp lệ.</DialogDescription>
          </DialogHeader>
          
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-8">
            {/* Ảnh mẫu */}
            <div className="space-y-3">
              <div className="flex gap-4 justify-center">
                {guideline.sampleImages.map((img, idx) => (
                  <div key={idx} className={cn(
                    "bg-muted rounded-xl overflow-hidden shadow-sm border border-border/50",
                    isAvatar ? "w-32 h-32" : "w-40 h-28"
                  )}>
                    <img src={img} alt="Sample" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground font-medium">Ảnh minh họa hợp lệ</p>
            </div>

            {/* Yêu cầu (DOs) */}
            <div className="space-y-3">
              <h4 className="font-bold flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" /> Yêu cầu:
              </h4>
              <ul className="space-y-2">
                {guideline.dos.map((item, idx) => (
                  <li key={idx} className="flex gap-2 text-sm text-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Không nên (DON'Ts) */}
            <div className="space-y-3">
              <h4 className="font-bold flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" /> Hãy đảm bảo tài liệu KHÔNG:
              </h4>
              <ul className="space-y-2">
                {guideline.donts.map((item, idx) => (
                  <li key={idx} className="flex gap-2 text-sm text-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <DialogFooter className="p-6 pt-4 border-t border-border/40 bg-card/50">
            <Button 
              type="button" 
              className="w-full h-14 rounded-full text-lg font-bold shadow-xl shadow-primary/20"
              onClick={handleTriggerUpload}
            >
              Tải hồ sơ lên
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
