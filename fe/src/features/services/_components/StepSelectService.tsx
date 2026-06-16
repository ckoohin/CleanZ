// src/features/services/_components/StepSelectService.tsx

import React from "react";
import { ServiceItem } from "@/features/services/types/service.type";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface StepSelectServiceProps {
  service: ServiceItem;
  onNext: () => void;
  onClose: () => void;
}

export const StepSelectService: React.FC<StepSelectServiceProps> = ({ service, onNext, onClose }) => {
  return (
    <div className="flex flex-col items-center gap-6">
      <Card className="w-full max-w-md overflow-hidden border border-border/30 bg-background/80 backdrop-blur-sm">
        <CardContent className="p-4 flex flex-col gap-3">
          <h3 className="text-xl font-semibold text-foreground">{service.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{service.desc}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-primary font-bold">{service.price}</span>
            <span className="text-xs text-muted-foreground">{service.unit}</span>
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-4 w-full max-w-md justify-between">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Hủy
        </Button>
        <Button onClick={onNext} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
          Tiếp tục
        </Button>
      </div>
    </div>
  );
};
