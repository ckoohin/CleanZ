"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { UploadCloud, X, AlertTriangle, Send } from "lucide-react";
import { useRouter } from "next/navigation";

export const IncidentReportForm = ({ bookingId = "BKG-88921" }: { bookingId?: string }) => {
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const router = useRouter();

  const handleUploadFake = () => {
    // Fake Cloudinary direct upload
    if (images.length >= 3) return;
    const mockUrl = `https://images.unsplash.com/photo-1596265371388-43edbaadab94?q=80&w=200&auto=format&fit=crop&random=${Math.random()}`;
    setImages([...images, mockUrl]);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 py-4 sticky top-0 bg-card z-10 border-b border-border/50 flex items-center shadow-sm">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
          <X className="w-6 h-6 text-foreground/90" />
        </button>
        <h1 className="text-lg font-bold text-foreground ml-4">Báo cáo sự cố</h1>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-6 mt-2">
        <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-red-700">Lưu ý quan trọng</h3>
            <p className="text-xs text-red-600/80 mt-1">Sự cố chỉ được tiếp nhận trong vòng 24h kể từ khi ca làm việc hoàn thành. Bạn hãy đính kèm ảnh chụp hiện trạng để được bồi thường nhanh nhất.</p>
          </div>
        </div>

        <div className="bg-card p-6 rounded-2xl shadow-sm border border-border/50 space-y-6">
          <div>
            <label className="block text-sm font-bold text-foreground/90 mb-2">Mã đơn hàng liên quan</label>
            <input 
              type="text" 
              readOnly 
              value={bookingId} 
              className="w-full bg-muted border border-border rounded-xl p-3 text-sm font-bold text-muted-foreground outline-none cursor-not-allowed" 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-foreground/90 mb-2">Mô tả sự cố</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ví dụ: Tasker làm vỡ bình hoa, dọn chưa sạch khu vực bếp..."
              className="w-full bg-card border border-border rounded-xl p-4 text-sm text-foreground/90 placeholder:text-muted-foreground/80 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all outline-none min-h-[120px]"
            />
          </div>

          {/* Cloudinary Upload Mock */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-foreground/90">Hình ảnh minh chứng</label>
              <span className="text-xs font-medium text-muted-foreground/80 bg-muted px-2 py-0.5 rounded-full">{images.length}/3 ảnh</span>
            </div>
            <div className="flex gap-3 flex-wrap">
              {images.map((img, i) => (
                <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-border shadow-sm">
                  <img src={img} alt="Evidence" className="w-full h-full object-cover" />
                  <button onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-black/60 p-1.5 rounded-full text-white hover:bg-black/80 transition-colors backdrop-blur-sm">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {images.length < 3 && (
                <button onClick={handleUploadFake} className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground/80 hover:border-red-500 hover:bg-red-50 hover:text-red-500 transition-all">
                  <UploadCloud className="w-6 h-6" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Tải ảnh</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          disabled={!description || images.length === 0}
          onClick={() => router.push("/customer/history")}
          className="w-full py-4 bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 hover:bg-red-600 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
        >
          <Send className="w-5 h-5" /> Gửi báo cáo
        </button>
      </div>
    </div>
  );
};
