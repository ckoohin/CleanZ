import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Upload, X, ShieldCheck, Camera, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StepIdentityVerificationProps {
  initialDocuments?: Array<{ id: string; type: string; fileUrl: string }>;
  initialDocIdNumber?: string;
  initialCitizenCardFiles?: File[];
  initialSelfieFiles?: File[];
  onBack: () => void;
  onNext: (data: {
    citizenCard: File[];
    idWithSelfie: File[];
    docIdNumber: string;
  }) => void;
  isSubmitting?: boolean;
}

export const StepIdentityVerification: React.FC<
  StepIdentityVerificationProps
> = ({
  initialDocuments = [],
  initialDocIdNumber = "",
  initialCitizenCardFiles = [],
  initialSelfieFiles = [],
  onBack,
  onNext,
  isSubmitting,
}) => {
  const [docIdNumber, setDocIdNumber] = useState(initialDocIdNumber);
  const [citizenCardFiles, setCitizenCardFiles] = useState<File[]>(
    initialCitizenCardFiles,
  );
  const [selfieFiles, setSelfieFiles] = useState<File[]>(initialSelfieFiles);

  const [existingCitizenCards, setExistingCitizenCards] = useState<string[]>(
    [],
  );
  const [existingSelfies, setExistingSelfies] = useState<string[]>([]);

  // Đồng bộ ảnh cũ từ server
  React.useEffect(() => {
    if (initialDocuments && initialDocuments.length > 0) {
      const cccdDocs = initialDocuments
        .filter((d) => d.type === "citizenCard")
        .map((d) => d.fileUrl);
      const selfieDocs = initialDocuments
        .filter((d) => d.type === "idWithSelfie")
        .map((d) => d.fileUrl);
      setExistingCitizenCards(cccdDocs);
      setExistingSelfies(selfieDocs);
    }
  }, [initialDocuments]);

  const citizenCardInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const totalCCCD = citizenCardFiles.length + existingCitizenCards.length;
  const totalSelfie = selfieFiles.length + existingSelfies.length;

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "cccd" | "selfie",
  ) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);

      if (type === "cccd") {
        if (totalCCCD + newFiles.length > 2) {
          toast.error(
            "Chỉ được upload tối đa 2 ảnh mặt trước/sau CCCD. Hãy xóa bớt ảnh cũ hoặc ảnh mới để tải lại.",
          );
          e.target.value = "";
          return;
        }
        setCitizenCardFiles((prev) => [...prev, ...newFiles]);
      } else {
        if (totalSelfie + newFiles.length > 1) {
          toast.error(
            "Chỉ được upload 1 ảnh chụp chân dung. Hãy xóa ảnh cũ hoặc ảnh mới để tải lại.",
          );
          e.target.value = "";
          return;
        }
        setSelfieFiles((prev) => [...prev, ...newFiles]);
      }
      e.target.value = "";
    }
  };

  const removeFile = (index: number, type: "cccd" | "selfie") => {
    if (type === "cccd") {
      setCitizenCardFiles((prev) => prev.filter((_, i) => i !== index));
    } else {
      setSelfieFiles((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const removeExistingFile = (url: string, type: "cccd" | "selfie") => {
    if (type === "cccd") {
      setExistingCitizenCards((prev) => prev.filter((u) => u !== url));
    } else {
      setExistingSelfies((prev) => prev.filter((u) => u !== url));
    }
  };

  const handleNext = () => {
    if (
      !docIdNumber ||
      docIdNumber.length !== 12 ||
      !/^\d+$/.test(docIdNumber)
    ) {
      toast.error("Vui lòng nhập đúng 12 số CCCD");
      return;
    }
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
      idWithSelfie: selfieFiles,
      docIdNumber,
    });
  };

  return (
    <Card className="border-none shadow-none bg-transparent md:shadow-xl md:bg-card/50 md:backdrop-blur-md rounded-none md:rounded-[2.5rem] overflow-hidden">
      <CardHeader className="pt-6 px-4 md:pt-10 md:px-10">
        <CardTitle className="text-2xl font-bold text-primary md:text-3xl">
          Xác minh định danh
        </CardTitle>
        <CardDescription className="text-base md:text-lg">
          Để đảm bảo an toàn cho khách hàng, chúng tôi cần xác minh danh tính
          của bạn.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-10">
        <div className="mb-8 space-y-4 max-w-md">
          <Label
            htmlFor="docIdNumber"
            className="text-base md:text-lg font-bold"
          >
            Số CCCD (12 số) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="docIdNumber"
            type="text"
            placeholder="Ví dụ: 001203000123"
            value={docIdNumber}
            onChange={(e) =>
              setDocIdNumber(e.target.value.replace(/\D/g, "").slice(0, 12))
            }
            className="h-12 text-base md:text-lg rounded-xl"
            disabled={isSubmitting}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:gap-8 mb-6 md:mb-10">
          <div className="p-4 md:p-5 bg-card border border-border/50 shadow-sm rounded-2xl md:rounded-[1.5rem] transition-all hover:border-primary/30 hover:shadow-md">
            {/* Title & Desc */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 md:p-2 rounded-lg bg-primary/10 text-primary mt-0.5 shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm md:text-base flex items-center gap-1.5">
                    1. CCCD / CMND <span className="text-destructive">*</span>
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 pr-2">
                    Tải lên rõ nét 2 mặt trước và sau.
                  </p>
                </div>
              </div>
              <div className="bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap shrink-0">
                {totalCCCD}/2 ảnh
              </div>
            </div>

            {/* Upload Dropzone */}
            <div
              onClick={() =>
                totalCCCD < 2 && citizenCardInputRef.current?.click()
              }
              className={cn(
                "border-2 border-dashed rounded-[1rem] p-3 md:p-4 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 cursor-pointer transition-all duration-300",
                totalCCCD < 2
                  ? "border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary"
                  : "border-muted bg-muted/10 opacity-50 cursor-not-allowed",
              )}
            >
              <Upload className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-primary">
                Nhấn để chọn ảnh tải lên
              </span>
              <input
                type="file"
                ref={citizenCardInputRef}
                className="hidden"
                multiple
                accept="image/*"
                onChange={(e) => handleFileChange(e, "cccd")}
                disabled={totalCCCD >= 2}
              />
            </div>

            {/* Grid preview cả ảnh cũ và ảnh mới */}
            {(existingCitizenCards.length > 0 ||
              citizenCardFiles.length > 0) && (
              <div className="mt-3 pt-3 border-t border-border/40 flex flex-wrap gap-2">
                {/* Ảnh cũ từ server */}
                {existingCitizenCards.map((url, index) => (
                  <div
                    key={`existing-${index}`}
                    className="relative group w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border border-border shadow-sm"
                  >
                    <img
                      src={url}
                      alt={`CCCD cũ ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-emerald-500/90 text-[8px] text-white text-center py-0.5 font-bold">
                      Đã tải
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeExistingFile(url, "cccd");
                        }}
                        className="h-6 w-6 rounded-full scale-75 md:scale-100"
                      >
                        <X className="w-3 h-3 md:w-4 md:h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Ảnh mới chuẩn bị tải lên */}
                {citizenCardFiles.map((file, index) => (
                  <div
                    key={`new-${index}`}
                    className="relative group w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border border-primary/30 shadow-sm"
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`CCCD mới ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-primary/90 text-[8px] text-white text-center py-0.5 font-bold">
                      Mới chọn
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index, "cccd");
                        }}
                        className="h-6 w-6 rounded-full scale-75 md:scale-100"
                      >
                        <X className="w-3 h-3 md:w-4 md:h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SELFIE UPLOAD */}
          <div className="p-4 md:p-5 bg-card border border-border/50 shadow-sm rounded-2xl md:rounded-[1.5rem] transition-all hover:border-primary/30 hover:shadow-md">
            {/* Title & Desc */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 md:p-2 rounded-lg bg-primary/10 text-primary mt-0.5 shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm md:text-base flex items-center gap-1.5">
                    2. Ảnh Selfie cầm CCCD{" "}
                    <span className="text-destructive">*</span>
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5 pr-2">
                    Chụp rõ khuôn mặt bạn và mặt trước CCCD.
                  </p>
                </div>
              </div>
              <div className="bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap shrink-0">
                {totalSelfie}/1 ảnh
              </div>
            </div>

            {/* Upload Dropzone */}
            <div
              onClick={() => totalSelfie < 1 && selfieInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-[1rem] p-3 md:p-4 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 cursor-pointer transition-all duration-300",
                totalSelfie < 1
                  ? "border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary"
                  : "border-muted bg-muted/10 opacity-50 cursor-not-allowed",
              )}
            >
              <Upload className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-primary">
                Nhấn để chọn ảnh tải lên
              </span>
              <input
                type="file"
                ref={selfieInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileChange(e, "selfie")}
                disabled={totalSelfie >= 1}
              />
            </div>

            {/* Preview ảnh selfie */}
            {(existingSelfies.length > 0 || selfieFiles.length > 0) && (
              <div className="mt-3 pt-3 border-t border-border/40 flex flex-wrap gap-2">
                {/* Ảnh cũ từ server */}
                {existingSelfies.map((url, index) => (
                  <div
                    key={`existing-selfie-${index}`}
                    className="relative group w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border border-border shadow-sm"
                  >
                    <img
                      src={url}
                      alt="Selfie cũ"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-emerald-500/90 text-[8px] text-white text-center py-0.5 font-bold">
                      Đã tải
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeExistingFile(url, "selfie");
                        }}
                        className="h-6 w-6 rounded-full scale-75 md:scale-100"
                      >
                        <X className="w-3 h-3 md:w-4 md:h-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Ảnh mới chuẩn bị tải lên */}
                {selfieFiles.map((file, index) => (
                  <div
                    key={`new-selfie-${index}`}
                    className="relative group w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border border-primary/30 shadow-sm"
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Selfie mới"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-primary/90 text-[8px] text-white text-center py-0.5 font-bold">
                      Mới chọn
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index, "selfie");
                        }}
                        className="h-6 w-6 rounded-full scale-75 md:scale-100"
                      >
                        <X className="w-3 h-3 md:w-4 md:h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-orange-500/10 text-orange-500 p-4 md:p-5 rounded-[1.5rem] md:rounded-2xl flex items-start gap-4">
          <ShieldCheck className="w-6 h-6 shrink-0 mt-0.5" />
          <div className="text-xs md:text-sm">
            <p className="font-bold mb-1">Bảo mật thông tin tuyệt đối</p>
            <p>
              Hồ sơ định danh của bạn được mã hóa an toàn và chỉ sử dụng cho mục
              đích xác minh tư cách đối tác theo chính sách bảo mật của CleanZ.
              Khách hàng sẽ không nhìn thấy giấy tờ này.
            </p>
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t border-border/50 mt-8 md:mt-10">
          <Button
            variant="outline"
            size="lg"
            onClick={onBack}
            disabled={isSubmitting}
            className="h-12 md:h-14 px-6 md:px-10 rounded-full text-base md:text-lg font-bold"
          >
            Quay lại
          </Button>
          <Button
            size="lg"
            onClick={handleNext}
            disabled={isSubmitting}
            className="h-12 md:h-14 px-6 md:px-10 rounded-full text-base md:text-lg font-bold shadow-lg shadow-primary/20"
          >
            {isSubmitting ? "Đang xử lý..." : "Tiếp tục"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
