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
  onBack, 
  onNext, 
  isSubmitting 
}) => {
  const [criminalRecord, setCriminalRecord] = useState<File[]>([]);
  const [healthCert, setHealthCert] = useState<File[]>([]);
  const [certificate, setCertificate] = useState<File[]>([]);
  
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
        return;
      }
      setter(prev => [...prev, ...newFiles]);
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
      <div className="space-y-4">
        <h4 className="font-bold flex items-center gap-2 text-sm md:text-base">
          <FileCheck className={cn("w-5 h-5", iconColor)} /> {title} {isRequired && <span className="text-destructive">*</span>}
        </h4>
        <div 
          onClick={() => totalFiles < maxFiles && fileRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-[1.5rem] md:rounded-[2rem] p-4 md:p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-300",
            totalFiles < maxFiles ? "border-primary/50 bg-primary/5 hover:bg-primary/10" : "border-muted bg-muted/20 opacity-50 cursor-not-allowed"
          )}
        >
          <input 
            type="file" 
            ref={fileRef} 
            className="hidden" 
            multiple 
            accept="image/*"
            onChange={(e) => handleFileChange(e, setter, files, existingUrls.length, maxFiles, title)}
            disabled={totalFiles >= maxFiles}
          />
          <Upload className={cn("w-6 h-6 md:w-8 md:h-8 mb-1 md:mb-2", iconColor)} />
          <p className="font-bold text-sm md:text-base">Tải lên ({totalFiles}/{maxFiles})</p>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-1 text-center">{desc}</p>
        </div>
        
        <div className="grid grid-cols-1 gap-2">
          {/* Render ảnh cũ từ server */}
          {existingUrls.map((url, index) => (
            <div key={`existing-${index}`} className="flex items-center gap-3 p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <img src={url} alt="preview" className="w-12 h-10 object-cover rounded-lg border border-emerald-500/30" />
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold truncate text-emerald-600">Đã tải lên ({index + 1})</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removeExisting(url); }} className="h-6 w-6 text-destructive">
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}

          {/* Render ảnh mới */}
          {files.map((file, index) => (
            <div key={`new-${index}`} className="flex items-center gap-3 p-2 rounded-xl bg-background/80 border border-border/50">
              <img src={URL.createObjectURL(file)} alt="preview" className="w-12 h-10 object-cover rounded-lg" />
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold truncate">{file.name}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); removeFile(index, setter); }} className="h-6 w-6 text-destructive">
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
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
                  3, 
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
                  3, 
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
                  10, 
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
