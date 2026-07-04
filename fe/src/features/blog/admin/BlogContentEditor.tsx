"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Bold, Eye, Heading2, ImagePlus, Italic, Link, List, Loader2, Quote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { uploadApi } from "@/lib/api/upload.service";
import { renderBlogContent } from "../utils/blog-content";

const BLOG_UPLOAD_FOLDER = "CleanZ/blog";

type BlogContentEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function BlogContentEditor({ value, onChange, disabled }: BlogContentEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertText = (prefix: string, suffix = "") => {
    onChange(`${value}${value ? "\n" : ""}${prefix}${suffix}`);
  };

  const handleInlineImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const uploaded = await uploadApi.uploadImageResult(file, { folder: BLOG_UPLOAD_FOLDER });
      insertText(`![Mô tả ảnh](${uploaded.url})`);
      toast.success("Đã chèn ảnh vào nội dung");
    } catch {
      toast.error("Không thể tải ảnh nội dung. Vui lòng thử lại.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--c-line)] bg-[var(--c-card-2)] p-2">
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => insertText("## Tiêu đề")}>
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => insertText("**Chữ đậm**")}>
          <Bold className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => insertText("*Chữ nghiêng*")}>
          <Italic className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => insertText("- Ý chính")}>
          <List className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => insertText("> Trích dẫn")}>
          <Quote className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => insertText("[Tên liên kết](https://example.com)")}>
          <Link className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={disabled || isUploading} onClick={() => fileInputRef.current?.click()}>
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        </Button>
        <Button type="button" variant={showPreview ? "default" : "outline"} size="sm" className="ml-auto" onClick={() => setShowPreview((current) => !current)}>
          <Eye className="h-4 w-4" />
          Xem trước
        </Button>
        <input ref={fileInputRef} type="file" className="hidden" accept="image/png,image/jpeg,image/jpg" onChange={handleInlineImageUpload} />
      </div>

      {showPreview ? (
        <div
          className="blog-content min-h-[260px] rounded-lg border border-[var(--c-line)] bg-[var(--c-card)] p-4 text-sm leading-7 text-[var(--c-ink)]"
          dangerouslySetInnerHTML={{ __html: renderBlogContent(value || "Chưa có nội dung.") }}
        />
      ) : (
        <Textarea value={value} onChange={(event) => onChange(event.target.value)} rows={12} required disabled={disabled || isUploading} />
      )}
    </div>
  );
}
