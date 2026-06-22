"use client";

import { useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { GoongAutocomplete } from "@/components/maps/GoongAutocomplete";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { GOONG_API_KEY } from "@/lib/maps/goong-config";
import { isHanoiAddress } from "@/lib/maps/hanoi-address";
import { toast } from "sonner";
import { useCreateCustomerAddress } from "../hooks/useCustomerAddresses";

interface CustomerAddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SelectedPlace {
  fullAddress: string;
  latitude: number | null;
  longitude: number | null;
}

export function CustomerAddressDialog({
  open,
  onOpenChange,
}: CustomerAddressDialogProps) {
  const createAddress = useCreateCustomerAddress();
  const [label, setLabel] = useState("Nhà");
  const [wardDetail, setWardDetail] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<SelectedPlace | null>(null);
  const [hasPet, setHasPet] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [isResolvingPlace, setIsResolvingPlace] = useState(false);

  const resetForm = () => {
    setLabel("Nhà");
    setWardDetail("");
    setSelectedPlace(null);
    setHasPet(false);
    setIsDefault(false);
    setIsResolvingPlace(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !createAddress.isPending) resetForm();
    onOpenChange(nextOpen);
  };

  const handlePlaceSelect = async (
    placeId: string,
    description: string,
  ) => {
    setSelectedPlace({
      fullAddress: description,
      latitude: null,
      longitude: null,
    });

    if (!GOONG_API_KEY) return;

    setIsResolvingPlace(true);
    try {
      const response = await fetch(
        `https://rsapi.goong.io/Place/Detail?place_id=${encodeURIComponent(placeId)}&api_key=${GOONG_API_KEY}`,
      );
      const body = (await response.json()) as {
        result?: { geometry?: { location?: { lat?: number; lng?: number } } };
      };
      const location = body.result?.geometry?.location;

      setSelectedPlace({
        fullAddress: description,
        latitude: location?.lat ?? null,
        longitude: location?.lng ?? null,
      });
    } catch {
      // Tọa độ là tùy chọn ở BE; vẫn cho phép lưu địa chỉ đã chọn.
    } finally {
      setIsResolvingPlace(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPlace) return;
    if (!isHanoiAddress(selectedPlace.fullAddress, wardDetail)) {
      toast.error("Hiện hệ thống chỉ hỗ trợ địa chỉ tại Hà Nội");
      return;
    }

    try {
      await createAddress.mutateAsync({
        label: label.trim() || null,
        fullAddress: selectedPlace.fullAddress,
        wardDetail: wardDetail.trim() || null,
        latitude: selectedPlace.latitude,
        longitude: selectedPlace.longitude,
        hasPet,
        isDefault,
      });

      resetForm();
      onOpenChange(false);
    } catch {
      // Interceptor HTTP đã hiển thị thông báo lỗi từ BE.
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Thêm địa chỉ mới</DialogTitle>
          <DialogDescription>
            Nhập địa chỉ của bạn để bắt đầu sử dụng dịch vụ
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>Tìm địa chỉ</Label>
            <GoongAutocomplete
              onSelect={handlePlaceSelect}
              placeholder="Nhập số nhà, tên đường, phường/xã..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full-address">Địa chỉ đầy đủ</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 size-4 text-primary" />
              <Input
                id="full-address"
                className="h-auto min-h-10 pl-9"
                value={selectedPlace?.fullAddress ?? ""}
                onChange={(event) =>
                  setSelectedPlace({
                    fullAddress: event.target.value,
                    latitude: null,
                    longitude: null,
                  })
                }
                placeholder="Nhập địa chỉ đầy đủ tại Hà Nội"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="address-label">Tên gợi nhớ</Label>
              <Input
                id="address-label"
                maxLength={100}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Nhà, Công ty..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ward-detail">Phường/quận/tỉnh</Label>
              <Input
                id="ward-detail"
                maxLength={255}
                value={wardDetail}
                onChange={(event) => setWardDetail(event.target.value)}
                placeholder="Không bắt buộc"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-4">
              <Label
                htmlFor="default-address"
                className="cursor-pointer font-normal"
              >
                Đặt làm địa chỉ mặc định
              </Label>
              <Switch
                id="default-address"
                checked={isDefault}
                onCheckedChange={setIsDefault}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label
                htmlFor="address-has-pet"
                className="cursor-pointer font-normal"
              >
                Địa chỉ này có thú cưng
              </Label>
              <Switch
                id="address-has-pet"
                checked={hasPet}
                onCheckedChange={setHasPet}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={createAddress.isPending}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !selectedPlace?.fullAddress.trim() ||
              isResolvingPlace ||
              createAddress.isPending
            }
          >
            {(isResolvingPlace || createAddress.isPending) && (
              <Loader2 className="size-4 animate-spin" />
            )}
            {createAddress.isPending ? "Đang lưu..." : "Lưu địa chỉ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
