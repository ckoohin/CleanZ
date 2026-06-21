import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepServiceSelectionProps {
  initialSelectedIds?: string[];
  onBack: () => void;
  onNext: (selectedServiceIds: string[]) => void;
  isSubmitting?: boolean;
}

export const StepServiceSelection: React.FC<StepServiceSelectionProps> = ({ 
  onBack, 
  onNext, 
  isSubmitting 
}) => {
  // Hardcode dịch vụ Dọn dẹp làm mặc định theo yêu cầu
  const defaultService = {
    id: "default-cleaning",
    name: "Dọn dẹp nhà cửa",
    category: "Dịch vụ",
    description: "Vệ sinh, dọn dẹp nhà cửa cơ bản theo giờ."
  };

  return (
    <Card className="border-none shadow-none bg-transparent md:shadow-xl md:bg-card/50 md:backdrop-blur-md rounded-none md:rounded-[2.5rem] overflow-hidden">
      <CardHeader className="pt-6 px-4 md:pt-10 md:px-10">
        <CardTitle className="text-2xl md:text-3xl font-bold font-serif text-primary">Dịch vụ của bạn</CardTitle>
        <CardDescription className="text-base md:text-lg">
          Hiện tại CleanZ mặc định đối tác mới sẽ bắt đầu với dịch vụ Dọn dẹp.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-10">
          <div
            className={cn(
              "group relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] border-2 cursor-default transition-all duration-300 overflow-hidden",
              "border-primary bg-primary/10 shadow-lg"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <span className="text-[10px] md:text-xs font-bold text-primary uppercase tracking-widest mb-1.5 md:mb-2 block">
                  {defaultService.category}
                </span>
                <h3 className="text-lg md:text-xl font-bold mb-1.5 md:mb-2">
                  {defaultService.name}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
                  {defaultService.description}
                </p>
              </div>
              <div className="w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ml-2 bg-primary border-primary text-primary-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </div>
            </div>
            
            {/* Decorative background element */}
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all" />
          </div>
        </div>

        <div className="bg-accent/50 p-4 md:p-6 rounded-xl md:rounded-2xl flex gap-3 md:gap-4 items-center mb-6 md:mb-10">
          <Info className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0" />
          <p className="text-xs md:text-sm text-accent-foreground">
            Bạn có thể bổ sung hoặc thay đổi danh sách dịch vụ này sau khi hồ sơ được duyệt.
          </p>
        </div>

        <div className="flex justify-between pt-4 border-t border-border/50 mt-6">
          <Button variant="outline" size="lg" onClick={onBack} disabled={isSubmitting} className="h-12 md:h-14 px-8 md:px-10 rounded-full text-base md:text-lg font-bold">
            Quay lại
          </Button>
          <Button 
            size="lg" 
            onClick={() => onNext([defaultService.id])} 
            disabled={isSubmitting}
            className="h-12 md:h-14 px-8 md:px-10 rounded-full text-base md:text-lg font-bold shadow-lg shadow-primary/20"
          >
            {isSubmitting ? "Đang xử lý..." : "Tiếp tục"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
