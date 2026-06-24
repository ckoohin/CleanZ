"use client";

import React, { useState, useRef, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, CheckCircle2 } from "lucide-react";
import { SwipeToAccept } from "./SwipeToAccept";
import { cn } from "@/lib/utils";

interface ProofOfWorkDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ProofOfWorkDrawer({ isOpen, onClose, onConfirm, isLoading }: ProofOfWorkDrawerProps) {
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up ObjectURLs
  useEffect(() => {
    return () => {
      images.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const objectUrl = URL.createObjectURL(file);
      setImages((prev) => [...prev, objectUrl]);
      // Reset input value so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index]);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleComplete = () => {
    // In a real app, we would upload these images to a storage service first.
    onConfirm();
  };

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            Nghiệm thu công việc
          </DrawerTitle>
          <DrawerDescription>
            Vui lòng chụp ảnh hoặc tải lên hình ảnh kết quả công việc để hoàn thành đơn hàng.
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Image Grid */}
          <div className="grid grid-cols-3 gap-3">
            {images.map((img, idx) => (
              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-border group">
                <img src={img} alt="Proof" className="w-full h-full object-cover" />
                <button
                  onClick={() => handleRemoveImage(idx)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {/* Add Image Buttons */}
            {images.length < 3 && (
              <>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-colors text-muted-foreground"
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-[10px] font-medium">Chụp ảnh</span>
                </button>
              </>
            )}
          </div>

          {images.length === 0 && (
            <div className="text-center py-4 text-xs text-muted-foreground bg-muted/30 rounded-xl">
              Cần ít nhất 1 ảnh để hoàn thành
            </div>
          )}
        </div>

        <DrawerFooter className="pt-2">
          {images.length > 0 ? (
            <SwipeToAccept
              onConfirm={handleComplete}
              isLoading={isLoading}
              label="Vuốt để hoàn thành đơn ✅"
              successLabel="Hoàn tất!"
            />
          ) : (
            <Button disabled className="w-full h-14 rounded-2xl bg-muted text-muted-foreground">
              Vui lòng tải ảnh lên
            </Button>
          )}
          <DrawerClose asChild>
            <Button variant="outline" className="w-full h-12 rounded-2xl mt-2">
              Hủy
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
