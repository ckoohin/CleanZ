import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Upload, X, FileCheck, Building2, CreditCard, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const paymentSchema = z.object({
  bankName: z.string().min(2, "Vui lòng nhập tên ngân hàng"),
  bankAccountNumber: z.string().min(5, "Số tài khoản không hợp lệ"),
  bankAccountName: z.string().min(2, "Vui lòng nhập tên chủ tài khoản"),
});

export type PaymentValues = z.infer<typeof paymentSchema>;

interface StepLegalAndPaymentProps {
  initialValues?: Partial<PaymentValues>;
  initialDocuments?: Array<{ id: string; type: string; fileUrl: string }>;
  initialCriminalRecord?: File[];
  initialHealthCert?: File[];
  initialCertificate?: File[];
  onBack: () => void;
  onNext: (data: PaymentValues & { 
    criminalRecord: File[];
    healthCertificate: File[];
    certificate: File[];
  }) => void;
  isSubmitting: boolean;
}

export const StepLegalAndPayment: React.FC<StepLegalAndPaymentProps> = ({ 
  initialValues, 
  initialDocuments = [],
  initialCriminalRecord = [],
  initialHealthCert = [],
  initialCertificate = [],
  onBack, 
  onNext, 
  isSubmitting 
}) => {
  const [criminalRecord, setCriminalRecord] = useState<File[]>(initialCriminalRecord);
  const [healthCert, setHealthCert] = useState<File[]>(initialHealthCert);
  const [certificate, setCertificate] = useState<File[]>(initialCertificate);
  
  const [existingCriminalRecord, setExistingCriminalRecord] = useState<string[]>([]);
  const [existingHealthCert, setExistingHealthCert] = useState<string[]>([]);
  const [existingCertificate, setExistingCertificate] = useState<string[]>([]);

  // Đồng bộ ảnh cũ từ server
  React.useEffect(() => {
    if (initialDocuments && initialDocuments.length > 0) {
      const crDocs = initialDocuments.filter(d => d.type === 'criminalRecord').map(d => d.fileUrl);
      const hcDocs = initialDocuments.filter(d => d.type === 'healthCertificate').map(d => d.fileUrl);
      const certDocs = initialDocuments.filter(d => d.type === 'certificate').map(d => d.fileUrl);
      setExistingCriminalRecord(crDocs);
      setExistingHealthCert(hcDocs);
      setExistingCertificate(certDocs);
    }
  }, [initialDocuments]);

  const criminalRef = useRef<HTMLInputElement>(null);
  const healthRef = useRef<HTMLInputElement>(null);
  const certRef = useRef<HTMLInputElement>(null);

  const form = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      bankName: initialValues?.bankName || "",
      bankAccountNumber: initialValues?.bankAccountNumber || "",
      bankAccountName: initialValues?.bankAccountName || "",
    },
  });

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>, 
    setter: React.Dispatch<React.SetStateAction<File[]>>,
    currentFiles: File[],
    existingCount: number,
    maxFiles: number,
    docName: string
  ) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (currentFiles.length + existingCount + newFiles.length > maxFiles) {
        toast.error(`Chỉ được upload tối đa ${maxFiles} ảnh cho ${docName}. Hãy xóa bớt ảnh cũ hoặc ảnh mới để tải lại.`);
        e.target.value = ''; // Reset input để có thể chọn lại
        return;
      }
      setter(prev => [...prev, ...newFiles]);
      e.target.value = ''; // Reset input để có thể chọn lại
    }
  };

  const removeFile = (
    index: number,
    setter: React.Dispatch<React.SetStateAction<File[]>>
  ) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingFile = (url: string, type: 'criminalRecord' | 'healthCertificate' | 'certificate') => {
    if (type === 'criminalRecord') {
      setExistingCriminalRecord(prev => prev.filter(u => u !== url));
    } else if (type === 'healthCertificate') {
      setExistingHealthCert(prev => prev.filter(u => u !== url));
    } else {
      setExistingCertificate(prev => prev.filter(u => u !== url));
    }
  };

  const onSubmit = (values: PaymentValues) => {
    const totalCriminal = criminalRecord.length + existingCriminalRecord.length;
    if (totalCriminal === 0) {
      toast.error("Vui lòng tải lên Lý lịch tư pháp hoặc Giấy xác nhận hạnh kiểm");
      return;
    }
    
    onNext({
      ...values,
      criminalRecord,
      healthCertificate: healthCert,
      certificate
    });
  };

  const renderUploadBox = (
    title: string, 
    desc: string, 
    files: File[], 
    setter: React.Dispatch<React.SetStateAction<File[]>>, 
    existingUrls: string[],
    removeExisting: (url: string) => void,
    fileRef: React.RefObject<HTMLInputElement | null>,
    maxFiles: number,
    isRequired: boolean,
    iconColor: string
  ) => {
    const totalFiles = files.length + existingUrls.length;
    return (
      <div className="p-4 md:p-5 bg-card border border-border/50 shadow-sm rounded-2xl md:rounded-[1.5rem] transition-all hover:border-primary/30 hover:shadow-md">
        {/* Title & Desc */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-2.5">
            <div className={cn("p-1.5 md:p-2 rounded-lg bg-opacity-10 mt-0.5 shrink-0", 
              iconColor.includes("blue") ? "bg-blue-500/10 text-blue-500" :
              iconColor.includes("emerald") ? "bg-emerald-500/10 text-emerald-500" :
              iconColor.includes("orange") ? "bg-orange-500/10 text-orange-500" : "bg-primary/10 text-primary"
            )}>
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm md:text-base flex items-center gap-1.5">
                {title} {isRequired && <span className="text-destructive">*</span>}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
          </div>
          <div className="bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap shrink-0">
            {totalFiles}/{maxFiles} ảnh
          </div>
        </div>

        {/* Upload Dropzone */}
        <div 
          onClick={() => totalFiles < maxFiles && fileRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-[1rem] p-3 md:p-4 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3 cursor-pointer transition-all duration-300",
            totalFiles < maxFiles ? "border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary" : "border-muted bg-muted/10 opacity-50 cursor-not-allowed"
          )}
        >
          <Upload className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-primary">Nhấn để chọn ảnh tải lên</span>
          <input 
            type="file" 
            ref={fileRef} 
            className="hidden" 
            multiple 
            accept="image/*"
            onChange={(e) => handleFileChange(e, setter, files, existingUrls.length, maxFiles, title)}
            disabled={totalFiles >= maxFiles}
          />
        </div>

        {/* Previews Row */}
        {(existingUrls.length > 0 || files.length > 0) && (
          <div className="mt-3 pt-3 border-t border-border/40 flex flex-wrap gap-2">
            {existingUrls.map((url, index) => (
               <div key={`existing-${index}`} className="relative group w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border border-border shadow-sm">
                 <img src={url} alt="preview" className="w-full h-full object-cover" />
                 <div className="absolute inset-x-0 bottom-0 bg-emerald-500/90 text-[8px] text-white text-center py-0.5 font-bold">
                   Đã tải
                 </div>
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                   <Button type="button" variant="destructive" size="icon" className="w-6 h-6 rounded-full scale-75 md:scale-100" onClick={(e) => { e.stopPropagation(); removeExisting(url); }}>
                     <X className="w-3 h-3 md:w-4 md:h-4" />
                   </Button>
                 </div>
               </div>
            ))}
            {files.map((file, index) => (
               <div key={`new-${index}`} className="relative group w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border border-primary/30 shadow-sm">
                 <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                   <Button type="button" variant="destructive" size="icon" className="w-6 h-6 rounded-full scale-75 md:scale-100" onClick={(e) => { e.stopPropagation(); removeFile(index, setter); }}>
                     <X className="w-3 h-3 md:w-4 md:h-4" />
                   </Button>
                 </div>
               </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="border-none shadow-none bg-transparent md:shadow-xl md:bg-card/50 md:backdrop-blur-md rounded-none md:rounded-[2.5rem] overflow-hidden">
      <CardHeader className="pt-6 px-4 md:pt-10 md:px-10">
        <CardTitle className="text-2xl md:text-3xl font-bold font-serif text-primary">Pháp lý & Thanh toán</CardTitle>
        <CardDescription className="text-base md:text-lg">Hoàn thiện hồ sơ pháp lý và tài khoản nhận lương để bắt đầu công việc.</CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-10">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-10">
            
            {/* Payment Info Section */}
            <div className="bg-primary/5 p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-primary/20 space-y-4 md:space-y-6">
              <h3 className="text-lg md:text-xl font-bold font-serif flex items-center gap-2">
                <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-primary" /> Thông tin thanh toán (Nhận lương)
              </h3>
              <p className="text-xs md:text-sm text-muted-foreground mb-2 md:mb-4">Lưu ý: Tên chủ tài khoản bắt buộc phải khớp với tên trên CCCD.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <FormField
                  control={form.control}
                  name="bankName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm md:text-base flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" /> Tên Ngân Hàng
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="VD: Vietcombank, Techcombank..." className="h-11 md:h-12 rounded-xl bg-background text-sm md:text-base" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bankAccountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm md:text-base flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-primary" /> Số Tài Khoản
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Nhập chính xác số tài khoản" className="h-11 md:h-12 rounded-xl bg-background text-sm md:text-base" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bankAccountName"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel className="text-sm md:text-base flex items-center gap-2">
                        <UserCircle className="w-4 h-4 text-primary" /> Tên Chủ Tài Khoản
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="TÊN KHÔNG DẤU (VD: NGUYEN VAN A)" className="h-11 md:h-12 rounded-xl bg-background uppercase text-sm md:text-base" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Legal Documents Section */}
            <div>
              <h3 className="text-lg md:text-xl font-bold font-serif mb-4 md:mb-6">Hồ sơ năng lực & Pháp lý</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {renderUploadBox(
                  "Lý lịch tư pháp", 
                  "Giấy xác nhận LLTP (mẫu số 1/2) hoặc Giấy xác nhận hạnh kiểm", 
                  criminalRecord, 
                  setCriminalRecord, 
                  existingCriminalRecord,
                  (url) => removeExistingFile(url, 'criminalRecord'),
                  criminalRef, 
                  1, 
                  true, 
                  "text-blue-500"
                )}
                {renderUploadBox(
                  "Giấy khám sức khỏe", 
                  "Bản gốc, cấp cấp quận/huyện trở lên (trong vòng 6 tháng)", 
                  healthCert, 
                  setHealthCert, 
                  existingHealthCert,
                  (url) => removeExistingFile(url, 'healthCertificate'),
                  healthRef, 
                  1, 
                  false, 
                  "text-emerald-500"
                )}
                {renderUploadBox(
                  "Chứng chỉ nghề", 
                  "Các loại bằng cấp, chứng chỉ liên quan (Nếu có)", 
                  certificate, 
                  setCertificate, 
                  existingCertificate,
                  (url) => removeExistingFile(url, 'certificate'),
                  certRef, 
                  1, 
                  false, 
                  "text-orange-500"
                )}
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-border/50 mt-8 md:mt-10">
              <Button type="button" variant="outline" size="lg" onClick={onBack} disabled={isSubmitting} className="h-12 md:h-14 px-6 md:px-10 rounded-full text-base md:text-lg font-bold">
                Quay lại
              </Button>
              <Button 
                type="submit" 
                size="lg" 
                disabled={isSubmitting}
                className="h-12 md:h-14 px-6 md:px-10 rounded-full text-base md:text-lg font-bold shadow-lg shadow-primary/20"
              >
                {isSubmitting ? "Đang xử lý..." : "Tiếp tục & Hoàn tất"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
