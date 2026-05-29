import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAvailableServices } from "../../hooks/staff.hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepServiceSelectionProps {
  initialSelectedIds?: string[];
  onBack: () => void;
  onNext: (selectedServiceIds: string[]) => void;
  isSubmitting?: boolean;
}

export const StepServiceSelection: React.FC<StepServiceSelectionProps> = ({ 
  initialSelectedIds,
  onBack, 
  onNext, 
  isSubmitting 
}) => {
  const { data: services, isLoading } = useAvailableServices();
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds || []);

  React.useEffect(() => {
    if (initialSelectedIds && initialSelectedIds.length > 0) {
      setSelectedIds(initialSelectedIds);
    }
  }, [initialSelectedIds]);



  const toggleService = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 rounded-[2.5rem]" />)}
      </div>
    );
  }

  return (
    <Card className="border-none shadow-none bg-transparent md:shadow-xl md:bg-card/50 md:backdrop-blur-md rounded-none md:rounded-[2.5rem] overflow-hidden">
      <CardHeader className="pt-6 px-4 md:pt-10 md:px-10">
        <CardTitle className="text-2xl md:text-3xl font-bold font-serif text-primary">Dịch vụ bạn có thể làm</CardTitle>
        <CardDescription className="text-base md:text-lg">Chọn những dịch vụ mà bạn tự tin nhất. Bạn có thể chọn nhiều mục.</CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-10">
          {services?.data?.map((service: any) => (
            <div
              key={String(service.id)}
              onClick={() => toggleService(String(service.id))}
              className={cn(
                "group relative p-4 md:p-6 rounded-2xl md:rounded-[2rem] border-2 cursor-pointer transition-all duration-300 overflow-hidden",
                selectedIds.includes(String(service.id))
                  ? "border-primary bg-primary/10 shadow-lg"
                  : "border-border/50 bg-background/50 hover:border-primary/50"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <span className="text-[10px] md:text-xs font-bold text-primary uppercase tracking-widest mb-1.5 md:mb-2 block">
                    {typeof service.category === 'string' ? service.category : "Dịch vụ"}
                  </span>
                  <h3 className="text-lg md:text-xl font-bold mb-1.5 md:mb-2">
                    {typeof service.name === 'string' ? service.name : "Tên dịch vụ"}
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground line-clamp-2">
                    {typeof service.description === 'string' ? service.description : ""}
                  </p>
                </div>
                <div className={cn(
                  "w-5 h-5 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ml-2",
                  selectedIds.includes(String(service.id)) ? "bg-primary border-primary text-primary-foreground" : "border-muted"
                )}>
                  {selectedIds.includes(String(service.id)) && <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                </div>
              </div>
              
              {/* Decorative background element */}
              <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all" />
            </div>
          ))}
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
            onClick={() => onNext(selectedIds)} 
            disabled={selectedIds.length === 0 || isSubmitting}
            className="h-12 md:h-14 px-8 md:px-10 rounded-full text-base md:text-lg font-bold shadow-lg shadow-primary/20"
          >
            {isSubmitting ? "Đang xử lý..." : "Tiếp tục"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
