import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  User, Phone, MapPin, Home, Briefcase, Sparkles, 
  CreditCard, Building2, UserCircle, FileText, CheckCircle2,
  FileCheck, ShieldAlert, ArrowLeft, Send, Loader2, Circle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressStep {
  label: string;
  status: "idle" | "loading" | "success" | "error";
}

interface StepReviewProps {
  personalInfo: {
    phone?: string;
    bio?: string;
    experience?: string;
    skills?: string;
    addressResident?: string;
    addressCurrent?: string;
  };
  serviceIds: string[];
  availableServices: Array<{ id: string; name: string; category?: string }>;
  bankInfo: {
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
  };
  files: {
    citizenCard: File[];
    idWithSelfie: File[];
    criminalRecord: File[];
    healthCertificate: File[];
    certificate: File[];
  };
  existingDocs: Array<{ id: string; type: string; fileUrl: string }>;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submitProgress: ProgressStep[];
}

export const StepReview: React.FC<StepReviewProps> = ({
  personalInfo,
  serviceIds,
  availableServices = [],
  bankInfo,
  files,
  existingDocs = [],
  onBack,
  onSubmit,
  isSubmitting,
  submitProgress
}) => {
  // Map dịch vụ đã chọn
  const selectedServices = serviceIds.map(id => {
    return availableServices.find(s => String(s.id) === String(id));
  }).filter(Boolean);

  // Nhóm file để đếm tổng số lượng
  const countFiles = (type: string, newFiles: File[]) => {
    const existingCount = existingDocs.filter(d => d.type === type).length;
    return existingCount + newFiles.length;
  };

  return (
    <Card className="border-none shadow-none bg-transparent md:shadow-xl md:bg-card/50 md:backdrop-blur-md rounded-none md:rounded-[2.5rem] overflow-hidden relative">
      
      {/* OVERLAY LOADING TIẾN TRÌNH KHI ĐANG GỬI HỒ SƠ */}
      {isSubmitting && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 md:p-8 text-white">
          <div className="max-w-md w-full space-y-6 md:space-y-8 bg-slate-900/90 border border-white/10 p-6 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary animate-pulse">
                <Loader2 className="w-10 h-10 animate-spin" />
              </div>
              <h3 className="text-xl md:text-2xl font-black font-serif">Đang nộp hồ sơ</h3>
              <p className="text-slate-400 text-xs md:text-sm">
                Vui lòng không đóng trình duyệt hoặc tải lại trang trong khi hệ thống đăng ký tài khoản của bạn.
              </p>
            </div>

            {/* Danh sách tiến trình */}
            <div className="space-y-4 pt-4 border-t border-white/5">
              {submitProgress.map((step, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs md:text-sm">
                  <div className="flex items-center gap-3">
                    {step.status === "loading" && (
                      <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
                    )}
                    {step.status === "success" && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    )}
                    {step.status === "error" && (
                      <ShieldAlert className="w-5 h-5 text-destructive shrink-0" />
                    )}
                    {step.status === "idle" && (
                      <Circle className="w-5 h-5 text-slate-600 shrink-0" />
                    )}
                    <span className={cn(
                      "font-bold transition-colors duration-300",
                      step.status === "loading" && "text-primary",
                      step.status === "success" && "text-emerald-400",
                      step.status === "error" && "text-destructive",
                      step.status === "idle" && "text-slate-400"
                    )}>
                      {step.label}
                    </span>
                  </div>
                  <span className="text-[10px] md:text-xs text-slate-500 font-medium">
                    {step.status === "loading" && "Đang xử lý..."}
                    {step.status === "success" && "Hoàn thành"}
                    {step.status === "error" && "Thất bại"}
                    {step.status === "idle" && "Đợi..."}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <CardHeader className="pt-6 px-4 md:pt-10 md:px-10">
        <CardTitle className="text-2xl md:text-3xl font-bold font-serif text-primary flex items-center gap-2">
          <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-primary shrink-0" /> Xác nhận thông tin đăng ký
        </CardTitle>
        <CardDescription className="text-base md:text-lg">
          Hãy kiểm tra kỹ toàn bộ thông tin dưới đây. Bạn có thể quay lại các bước trước để chỉnh sửa nếu phát hiện sai sót.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 md:p-10 space-y-6 md:space-y-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          
          {/* CỘT 1: THÔNG TIN CÁ NHÂN & DỊCH VỤ */}
          <div className="space-y-6">
            
            {/* THÔNG TIN CÁ NHÂN */}
            <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 dark:border-white/5 space-y-3 md:space-y-4">
              <h3 className="text-base md:text-lg font-black font-serif flex items-center gap-2 text-primary">
                <User className="w-5 h-5" /> Thông tin cá nhân
              </h3>
              
              <div className="space-y-3 text-xs md:text-sm">
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Số điện thoại liên hệ</p>
                    <p className="font-bold">{personalInfo.phone || "Chưa nhập"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Briefcase className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Kỹ năng chính</p>
                    <p className="font-bold">{personalInfo.skills || "Chưa nhập"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Địa chỉ thường trú (Theo CCCD)</p>
                    <p className="font-bold">{personalInfo.addressResident || "Chưa nhập"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Home className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Chỗ ở hiện tại</p>
                    <p className="font-bold">{personalInfo.addressCurrent || "Chưa nhập"}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/50 dark:border-white/5">
                  <p className="text-[10px] md:text-xs text-muted-foreground mb-1 font-bold">Kinh nghiệm dọn dẹp</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                    {personalInfo.experience || "Chưa nhập"}
                  </p>
                </div>
              </div>
            </div>

            {/* DỊCH VỤ HOẠT ĐỘNG */}
            <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 dark:border-white/5 space-y-3 md:space-y-4">
              <h3 className="text-base md:text-lg font-black font-serif flex items-center gap-2 text-primary">
                <Briefcase className="w-5 h-5" /> Dịch vụ đã đăng ký ({selectedServices.length})
              </h3>
              
              <div className="flex flex-wrap gap-2">
                {selectedServices.map((service, idx) => (
                  <div 
                    key={idx} 
                    className="bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 text-[10px] md:text-xs font-bold flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {service?.name}
                  </div>
                ))}
                {selectedServices.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Chưa chọn dịch vụ nào</p>
                )}
              </div>
            </div>

          </div>

          {/* CỘT 2: THANH TOÁN & GIẤY TỜ PHÁP LÝ */}
          <div className="space-y-6">
            
            {/* THÔNG TIN THANH TOÁN */}
            <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 dark:border-white/5 space-y-3 md:space-y-4">
              <h3 className="text-base md:text-lg font-black font-serif flex items-center gap-2 text-primary">
                <CreditCard className="w-5 h-5" /> Tài khoản nhận lương
              </h3>
              
              <div className="grid grid-cols-2 gap-4 text-xs md:text-sm">
                <div>
                  <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" /> Ngân hàng
                  </p>
                  <p className="font-bold mt-0.5">{bankInfo.bankName || "Chưa nhập"}</p>
                </div>
                <div>
                  <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-slate-400" /> Số tài khoản
                  </p>
                  <p className="font-bold mt-0.5">{bankInfo.bankAccountNumber || "Chưa nhập"}</p>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200/50 dark:border-white/5">
                  <p className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
                    <UserCircle className="w-3 h-3 text-slate-400" /> Chủ tài khoản
                  </p>
                  <p className="font-bold uppercase mt-0.5 text-primary">{bankInfo.bankAccountName || "Chưa nhập"}</p>
                </div>
              </div>
            </div>

            {/* GIẤY TỜ PHÁP LÝ & ĐỊNH DANH */}
            <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-slate-100 dark:border-white/5 space-y-3 md:space-y-4">
              <h3 className="text-base md:text-lg font-black font-serif flex items-center gap-2 text-primary">
                <FileText className="w-5 h-5" /> Hồ sơ xác minh tải lên
              </h3>
              
              <div className="space-y-3 text-xs md:text-sm">
                
                {/* Đếm CCCD */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-background/50 border border-slate-200/50 dark:border-white/5">
                  <span className="font-medium">1. Căn cước công dân (CCCD):</span>
                  <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full text-[10px] md:text-xs">
                    {countFiles('citizenCard', files.citizenCard)} / 2 ảnh
                  </span>
                </div>

                {/* Đếm Selfie */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-background/50 border border-slate-200/50 dark:border-white/5">
                  <span className="font-medium">2. Ảnh Selfie cầm CCCD:</span>
                  <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full text-[10px] md:text-xs">
                    {countFiles('idWithSelfie', files.idWithSelfie)} / 1 ảnh
                  </span>
                </div>

                {/* Đếm LLTP */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-background/50 border border-slate-200/50 dark:border-white/5">
                  <span className="font-medium">3. Lý lịch tư pháp / Hạnh kiểm:</span>
                  <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full text-[10px] md:text-xs">
                    {countFiles('criminalRecord', files.criminalRecord)} ảnh
                  </span>
                </div>

                {/* Đếm Giấy khám sức khỏe */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-background/50 border border-slate-200/50 dark:border-white/5">
                  <span className="font-medium">4. Giấy khám sức khỏe:</span>
                  <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full text-[10px] md:text-xs">
                    {countFiles('healthCertificate', files.healthCertificate)} ảnh
                  </span>
                </div>

                {/* Đếm Chứng chỉ */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-background/50 border border-slate-200/50 dark:border-white/5">
                  <span className="font-medium">5. Chứng chỉ nghề nghiệp (nếu có):</span>
                  <span className="font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full text-[10px] md:text-xs">
                    {countFiles('certificate', files.certificate)} ảnh
                  </span>
                </div>

              </div>
            </div>

          </div>

        </div>

        {/* THÔNG TIN BẢO MẬT & CHÍNH SÁCH */}
        <div className="bg-orange-500/10 text-orange-500 p-4 md:p-5 rounded-[1.25rem] md:rounded-[1.5rem] flex items-start gap-3 md:gap-4">
          <FileCheck className="w-5 h-5 md:w-6 md:h-6 shrink-0 mt-0.5" />
          <div className="text-[10px] md:text-xs space-y-1">
            <p className="font-bold">Cam kết chất lượng thông tin</p>
            <p>
              Bằng việc nhấn nút Gửi hồ sơ đăng ký, bạn cam đoan mọi thông tin cá nhân, tài khoản ngân hàng và tài liệu pháp lý cung cấp ở trên là hoàn toàn chính xác và trung thực. CleanZ có quyền chấm dứt tư cách đối tác nếu phát hiện thông tin giả mạo.
            </p>
          </div>
        </div>

        {/* NÚT ĐIỀU HƯỚNG */}
        <div className="flex justify-between pt-6 border-t border-border/50 mt-8 md:mt-10">
          <Button 
            type="button" 
            variant="outline" 
            size="lg" 
            onClick={onBack} 
            disabled={isSubmitting} 
            className="h-12 md:h-14 px-6 md:px-10 rounded-full text-base md:text-lg font-bold flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" /> Quay lại sửa
          </Button>
          <Button 
            type="button"
            size="lg" 
            onClick={onSubmit}
            disabled={isSubmitting}
            className="h-12 md:h-14 px-6 md:px-10 rounded-full text-base md:text-lg font-bold bg-linear-to-rrom-primary to-orange-600 hover:from-primary/90 hover:to-orange-600/90 text-white shadow-lg shadow-primary/20 flex items-center gap-2 transition-all duration-300 hover:scale-[1.02]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> Đang nộp hồ sơ...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 md:w-5 md:h-5" /> Xác nhận & Gửi hồ sơ
              </>
            )}
          </Button>
        </div>

      </CardContent>
    </Card>
  );
};
