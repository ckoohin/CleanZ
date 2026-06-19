"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";

export const ReviewForm = ({ bookingId }: { bookingId: string }) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const router = useRouter();

  const handleUploadFake = () => {
    // Fake Cloudinary direct upload
    if (images.length >= 3) return;
    const mockUrl = `https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=200&auto=format&fit=crop&random=${Math.random()}`;
    setImages([...images, mockUrl]);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-card">
      <div className="px-4 py-4 sticky top-0 bg-card z-10 border-b border-border/50 flex items-center">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <X className="w-6 h-6 text-foreground/90" />
        </button>
        <h1 className="text-lg font-bold text-foreground ml-4">Đánh giá Dịch vụ</h1>
      </div>

      <div className="p-6 max-w-md mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-muted rounded-full mx-auto overflow-hidden">
            <img src="https://ui-avatars.com/api/?name=Lan+Anh&background=ffedd5&color=fd7e14" alt="Tasker" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Tasker: Lan Anh</h2>
          <p className="text-sm text-muted-foreground">Mã đơn: #{bookingId}</p>
        </div>

        {/* Rating Stars */}
        <div className="flex flex-col items-center gap-3">
          <p className="font-bold text-foreground/90">Chất lượng dịch vụ thế nào?</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                onClick={() => setRating(star)}
                className="p-1 transition-transform hover:scale-110 focus:outline-none"
              >
                <Star
                  className={`w-10 h-10 transition-colors ${
                    (hoveredRating || rating) >= star
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/200 fill-slate-50"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-sm font-medium text-primary h-5">
            {rating === 1 && "Rất tệ"}
            {rating === 2 && "Tệ"}
            {rating === 3 && "Bình thường"}
            {rating === 4 && "Tốt"}
            {rating === 5 && "Tuyệt vời!"}
          </p>
        </div>

        {/* Review Text */}
        <div>
          <label className="block text-sm font-bold text-foreground/90 mb-2">Nhận xét chi tiết (Không bắt buộc)</label>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Chia sẻ trải nghiệm của bạn về dịch vụ này..."
            className="w-full bg-background border border-border rounded-2xl p-4 text-sm text-foreground/90 placeholder:text-muted-foreground/80 focus:ring-2 focus:ring-primary/20 outline-none min-h-[120px]"
          />
        </div>

        {/* Cloudinary Upload Mock */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-bold text-foreground/90">Hình ảnh minh chứng</label>
            <span className="text-xs text-muted-foreground/80">{images.length}/3 ảnh</span>
          </div>
          <div className="flex gap-3 flex-wrap">
            {images.map((img, i) => (
              <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border">
                <img src={img} alt="Review" className="w-full h-full object-cover" />
                <button onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-black/50 p-1 rounded-full text-white hover:bg-black/70">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {images.length < 3 && (
              <button onClick={handleUploadFake} className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground/80 hover:border-primary hover:text-primary transition-colors bg-background">
                <UploadCloud className="w-6 h-6" />
                <span className="text-[10px] font-medium uppercase">Upload</span>
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground/80 mt-2">Ảnh được upload trực tiếp lên máy chủ Cloudinary.</p>
        </div>

        {/* Submit */}
        <button
          disabled={rating === 0}
          onClick={() => router.push("/customer/history")}
          className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/30 hover:bg-orange-600 transition-all disabled:opacity-50 disabled:shadow-none mt-8"
        >
          Gửi đánh giá
        </button>
      </div>
    </div>
  );
};
