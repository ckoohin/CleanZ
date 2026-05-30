import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, X, ShieldCheck, Camera, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StepIdentityVerificationProps {
  initialDocuments?: Array<{ id: string; type: string; fileUrl: string }>;
  onBack: () => void;
  onNext: (data: { citizenCard: File[]; idWithSelfie: File[] }) => void;
  isSubmitting?: boolean;
}

export const StepIdentityVerification: React.FC<StepIdentityVerificationProps> = ({ 
  initialDocuments = [],
  onBack, 
  onNext,
  isSubmitting 
}) => {
  const [citizenCardFiles, setCitizenCardFiles] = useState<File[]>([]);
  const [selfieFiles, setSelfieFiles] = useState<File[]>([]);

  const [existingCitizenCards, setExistingCitizenCards] = useState<string[]>([]);
  const [existingSelfies, setExistingSelfies] = useState<string[]>([]);

  // Đồng bộ ảnh cũ từ server
  React.useEffect(() => {
    if (initialDocuments && initialDocuments.length > 0) {
      const cccdDocs = initialDocuments.filter(d => d.type === 'citizenCard').map(d => d.fileUrl);
      const selfieDocs = initialDocuments.filter(d => d.type === 'idWithSelfie').map(d => d.fileUrl);
      setExistingCitizenCards(cccdDocs);
      setExistingSelfies(selfieDocs);
    }
  }, [initialDocuments]);

  const citizenCardInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const totalCCCD = citizenCardFiles.length + existingCitizenCards.length;
  const totalSelfie = selfieFiles.length + existingSelfies.length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cccd' | 'selfie') => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      if (type === 'cccd') {
        if (totalCCCD + newFiles.length > 2) {
          toast.error("Chỉ được upload tối đa 2 ảnh mặt trước/sau CCCD. Hãy xóa bớt ảnh cũ hoặc ảnh mới để tải lại.");
          return;
        }
        setCitizenCardFiles(prev => [...prev, ...newFiles]);
      } else {
        if (totalSelfie + newFiles.length > 1) {
          toast.error("Chỉ được upload 1 ảnh chụp chân dung. Hãy xóa ảnh cũ hoặc ảnh mới để tải lại.");
          return;
        }
        setSelfieFiles(prev => [...prev, ...newFiles]);
      }
    }
  };

  const removeFile = (index: number, type: 'cccd' | 'selfie') => {
    if (type === 'cccd') {
      setCitizenCardFiles(prev => prev.filter((_, i) => i !== index));
    } else {
      setSelfieFiles(prev => prev.filter((_, i) => i !== index));
    }
  };

  const removeExistingFile = (url: string, type: 'cccd' | 'selfie') => {
    if (type === 'cccd') {
      setExistingCitizenCards(prev => prev.filter(u => u !== url));
    } else {
      setExistingSelfies(prev => prev.filter(u => u !== url));
    }
  };

  const handleNext = () => {
    if (totalCCCD < 2) {
      toast.error("Vui lòng tải lên đủ 2 mặt của CCCD/CMND");
      return;
    }
    if (totalSelfie < 1) {
      toast.error("Vui lòng tải lên ảnh chân dung cầm CCCD");
      return;
    }
    onNext({ 
      citizenCard: citizenCardFiles,
      idWithSelfie: selfieFiles
    });
  };

  return (
    <Card className="border-none shadow-none bg-transparent md:shadow-xl md:bg-card/50 md:backdrop-blur-md rounded-none md:rounded-[2.5rem] overflow-hidden">
      <CardHeader className="pt-6 px-4 md:pt-10 md:px-10">
        <CardTitle className="text-2xl md:text-3xl font-bold font-serif text-primary">Xác minh định danh</CardTitle>
        <CardDescription className="text-base md:text-lg">
          Để đảm bảo an toàn cho khách hàng, chúng tôi cần xác minh danh tính của bạn.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-10">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-10">
          
          {/* CCCD UPLOAD */}
          <div className="space-y-4">
            <h3 className="text-lg md:text-xl font-bold font-serif flex items-center gap-2">
              <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-primary" /> 1. CCCD / CMND <span className="text-destructive">*</span>
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground">Tải lên rõ nét 2 mặt trước và sau.</p>
            
            <div 
              onClick={() => totalCCCD < 2 && citizenCardInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300",
                totalCCCD < 2 ? "border-primary/50 bg-primary/5 hover:bg-primary/10" : "border-muted bg-muted/20 opacity-50 cursor-not-allowed"
              )}
            >
              <input 
                type="file" 
                ref={citizenCardInputRef} 
                className="hidden" 
                multiple 
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'cccd')}
                disabled={totalCCCD >= 2}
              />
              <Upload className="w-8 h-8 md:w-10 md:h-10 text-primary mb-3 md:mb-4" />
              <p className="font-bold text-base md:text-lg">Tải lên mặt trước và sau</p>
              <p className="text-xs md:text-sm text-muted-foreground mt-1 md:mt-2 text-center">Đã tải: {totalCCCD}/2 ảnh</p>
            </div>
            
            {/* Grid preview cả ảnh cũ và ảnh mới */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              {/* Ảnh cũ từ server */}
              {existingCitizenCards.map((url, index) => (
                <div key={`existing-${index}`} className="relative aspect-video rounded-xl overflow-hidden border border-emerald-500/50 group">
                  <img src={url} alt={`CCCD cũ ${index + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                    Đã tải lên
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); removeExistingFile(url, 'cccd'); }} className="h-8 w-8 rounded-full">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Ảnh mới chuẩn bị tải lên */}
              {citizenCardFiles.map((file, index) => (
                <div key={`new-${index}`} className="relative aspect-video rounded-xl overflow-hidden border border-primary/50 group">
                  <img src={URL.createObjectURL(file)} alt={`CCCD mới ${index + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                    Mới chọn
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); removeFile(index, 'cccd'); }} className="h-8 w-8 rounded-full">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SELFIE UPLOAD */}
          <div className="space-y-4">
            <h3 className="text-lg md:text-xl font-bold font-serif flex items-center gap-2">
              <Camera className="w-5 h-5 md:w-6 md:h-6 text-primary" /> 2. Ảnh Selfie cầm CCCD <span className="text-destructive">*</span>
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground">Chụp rõ khuôn mặt bạn và mặt trước CCCD.</p>
            
            <div 
              onClick={() => totalSelfie < 1 && selfieInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300",
                totalSelfie < 1 ? "border-primary/50 bg-primary/5 hover:bg-primary/10" : "border-muted bg-muted/20 opacity-50 cursor-not-allowed"
              )}
            >
              <input 
                type="file" 
                ref={selfieInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'selfie')}
                disabled={totalSelfie >= 1}
              />
              <Camera className="w-8 h-8 md:w-10 md:h-10 text-primary mb-3 md:mb-4" />
              <p className="font-bold text-base md:text-lg">Chụp ảnh chân dung</p>
              <p className="text-xs md:text-sm text-muted-foreground mt-1 md:mt-2 text-center">Đã tải: {totalSelfie}/1 ảnh</p>
            </div>
            
            {/* Preview ảnh selfie */}
            <div className="grid grid-cols-1 gap-4 mt-4">
              {/* Ảnh cũ từ server */}
              {existingSelfies.map((url, index) => (
                <div key={`existing-selfie-${index}`} className="relative aspect-video rounded-xl overflow-hidden border border-emerald-500/50 group w-full md:w-1/2">
                  <img src={url} alt="Selfie cũ" className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                    Đã tải lên
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); removeExistingFile(url, 'selfie'); }} className="h-8 w-8 rounded-full">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Ảnh mới chuẩn bị tải lên */}
              {selfieFiles.map((file, index) => (
                <div key={`new-selfie-${index}`} className="relative aspect-video rounded-xl overflow-hidden border border-primary/50 group w-full md:w-1/2">
                  <img src={URL.createObjectURL(file)} alt="Selfie mới" className="w-full h-full object-cover" />
                  <div className="absolute top-2 left-2 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                    Mới chọn
                  </div>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); removeFile(index, 'selfie'); }} className="h-8 w-8 rounded-full">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="bg-orange-500/10 text-orange-500 p-4 md:p-5 rounded-[1.5rem] md:rounded-2xl flex items-start gap-4">
          <ShieldCheck className="w-6 h-6 shrink-0 mt-0.5" />
          <div className="text-xs md:text-sm">
            <p className="font-bold mb-1">Bảo mật thông tin tuyệt đối</p>
            <p>Hồ sơ định danh của bạn được mã hóa an toàn và chỉ sử dụng cho mục đích xác minh tư cách đối tác theo chính sách bảo mật của CleanZ. Khách hàng sẽ không nhìn thấy giấy tờ này.</p>
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t border-border/50 mt-8 md:mt-10">
          <Button variant="outline" size="lg" onClick={onBack} disabled={isSubmitting} className="h-12 md:h-14 px-6 md:px-10 rounded-full text-base md:text-lg font-bold">
            Quay lại
          </Button>
          <Button size="lg" onClick={handleNext} disabled={isSubmitting} className="h-12 md:h-14 px-6 md:px-10 rounded-full text-base md:text-lg font-bold shadow-lg shadow-primary/20">
            {isSubmitting ? "Đang xử lý..." : "Tiếp tục"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
