"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { slideInVariants } from "@/constants/motion";
import { MapPin, Plus, Home, Briefcase, Star, Trash2, X, Loader2, ChevronRight, User, Phone, CheckCircle2, ArrowLeft } from "lucide-react";
import { GoongMap } from "@/components/maps/GoongMap";
import { GoongAutocomplete } from "@/components/maps/GoongAutocomplete";
import { useRouter } from "next/navigation";
import { useMyAddresses, useCreateAddress, useSetDefaultAddress } from "@/features/customer/hooks/useCustomerAddress";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/hooks/auth.hooks";

type ViewState = "list" | "form" | "map";

export const AddressManager = () => {
  const router = useRouter();
  const { data: user } = useAuth();
  const { data: addresses, isLoading } = useMyAddresses();
  const createAddressMutation = useCreateAddress();
  const setDefaultAddressMutation = useSetDefaultAddress();

  const [view, setView] = useState<ViewState>("list");

  // Form state
  const [label, setLabel] = useState<"Nhà" | "Công ty" | "Khác">("Nhà");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [buildingFloor, setBuildingFloor] = useState("");
  const [gate, setGate] = useState("");
  const [driverNote, setDriverNote] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [hasPet, setHasPet] = useState(false);
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState("");

  const handleOpenForm = (defaultLabel: "Nhà" | "Công ty" | "Khác" = "Khác") => {
    setLabel(defaultLabel);
    setContactName(user?.fullName || "");
    setContactPhone(user?.phone || "");
    setFullAddress("");
    setBuildingFloor("");
    setGate("");
    setDriverNote("");
    setLatitude(null);
    setLongitude(null);
    setHasPet(false);
    setIsDefault(addresses?.length === 0);
    setError("");
    setView("form");
  };

  const handleMapSelect = (lat: number, lng: number, address: string) => {
    setLatitude(lat);
    setLongitude(lng);
    setFullAddress(address);
    setError("");
  };

  const handleAutoSelect = (placeId: string, description: string) => {
    const apiKey = process.env.NEXT_PUBLIC_GOONG_API_KEY ?? "";
    fetch(`https://rsapi.goong.io/Place/Detail?place_id=${placeId}&api_key=${apiKey}`)
      .then((r) => r.json())
      .then((data) => {
        const loc = data?.result?.geometry?.location;
        if (loc) {
          setFullAddress(description);
          setLatitude(loc.lat);
          setLongitude(loc.lng);
          setError("");
        } else {
          setFullAddress(description);
        }
      })
      .catch(() => setFullAddress(description));
  };

  const handleSaveAddress = async () => {
    if (!contactName.trim() || !contactPhone.trim()) {
      toast.error("Vui lòng nhập tên và số điện thoại liên hệ");
      return;
    }
    if (!fullAddress.trim() || !latitude || !longitude) {
      toast.error("Vui lòng chọn địa chỉ trên bản đồ");
      return;
    }

    try {
      await createAddressMutation.mutateAsync({
        label,
        fullAddress,
        buildingFloor,
        gate,
        driverNote,
        contactName,
        contactPhone,
        latitude,
        longitude,
        hasPet,
        isDefault,
      });
      setView("list");
    } catch {
      // Handled in hook
    }
  };

  const renderList = () => (
    <motion.div variants={slideInVariants} initial="hidden" animate="visible" className="pb-24">
      {/* Header */}
      <div className="bg-card px-4 py-4 sticky top-0 z-20 shadow-sm flex items-center border-b border-border/50">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground ml-2">Địa chỉ giao hàng</h1>
      </div>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground font-medium animate-pulse">Đang tải danh sách địa chỉ...</p>
          </div>
        ) : (
          <>
            {/* Quick Add Buttons */}
            <div className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
              <button 
                onClick={() => handleOpenForm("Nhà")}
                className="w-full flex items-center gap-3 p-4 border-b border-border/50 hover:bg-muted/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <Home className="w-5 h-5 text-blue-500" />
                </div>
                <span className="font-semibold text-sm flex-1 text-left">Thêm địa chỉ Nhà</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
              <button 
                onClick={() => handleOpenForm("Công ty")}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-orange-500" />
                </div>
                <span className="font-semibold text-sm flex-1 text-left">Thêm địa chỉ Công ty</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Address List */}
            {addresses && addresses.length > 0 && (
              <div className="space-y-3 mt-6">
                <h2 className="text-sm font-bold text-muted-foreground px-1 uppercase tracking-wider">Đã lưu</h2>
                {addresses.map((addr) => (
                  <div key={addr.id} className="bg-card p-4 rounded-2xl border border-border/50 shadow-sm relative">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-2 items-center mb-1">
                        <span className="font-bold text-sm">{addr.contactName || user?.fullName}</span>
                        <span className="text-muted-foreground text-sm">|</span>
                        <span className="text-muted-foreground text-sm">{addr.contactPhone || user?.phone}</span>
                      </div>
                      <button className="text-sm font-bold text-primary hover:underline">Sửa</button>
                    </div>
                    
                    <div className="mt-2 space-y-1">
                      {addr.buildingFloor && <p className="text-sm text-foreground">{addr.buildingFloor}</p>}
                      <p className="text-sm text-foreground">{addr.fullAddress}</p>
                      {addr.gate && <p className="text-sm text-foreground">Cổng: {addr.gate}</p>}
                    </div>

                    <div className="flex gap-2 mt-3">
                      {addr.label && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-primary/30 text-primary text-[10px] font-bold bg-primary/5">
                          {addr.label === "Nhà" ? <Home className="w-3 h-3" /> : addr.label === "Công ty" ? <Briefcase className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                          {addr.label}
                        </span>
                      )}
                      {addr.isDefault && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded border border-red-500/30 text-red-600 text-[10px] font-bold bg-red-50">
                          Mặc định
                        </span>
                      )}
                      {addr.hasPet && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded border border-amber-500/30 text-amber-600 text-[10px] font-bold bg-amber-50">
                          Có thú cưng
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-10 max-w-md mx-auto">
        <button 
          onClick={() => handleOpenForm("Khác")}
          className="w-full py-3.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors"
        >
          Thêm địa chỉ mới
        </button>
      </div>
    </motion.div>
  );

  const renderForm = () => (
    <motion.div variants={slideInVariants} initial="hidden" animate="visible" className="min-h-screen bg-muted/30 pb-24">
      {/* Header */}
      <div className="bg-card px-4 py-4 sticky top-0 z-20 shadow-sm flex items-center border-b border-border/50">
        <button onClick={() => setView("list")} className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground ml-2">Thêm địa chỉ mới</h1>
      </div>

      <div className="space-y-2 mt-2">
        {/* Contact Info */}
        <div className="bg-card px-4 py-2 border-y border-border/50">
          <div className="flex items-center border-b border-border/50 py-2">
            <span className="w-24 text-sm font-semibold text-muted-foreground">Liên hệ</span>
            <input 
              type="text" 
              placeholder="Họ và tên" 
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="flex-1 text-sm bg-transparent outline-none py-2 font-medium"
            />
          </div>
          <div className="flex items-center py-2">
            <span className="w-24 text-sm font-semibold text-muted-foreground">Số ĐT</span>
            <input 
              type="tel" 
              placeholder="Số điện thoại" 
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="flex-1 text-sm bg-transparent outline-none py-2 font-medium"
            />
          </div>
        </div>

        {/* Address Selection */}
        <div className="bg-card px-4 py-2 border-y border-border/50">
          <button 
            onClick={() => setView("map")}
            className="w-full flex items-center justify-between py-3 border-b border-border/50 text-left"
          >
            <div className="flex-1 pr-4">
              <span className="text-sm font-semibold text-muted-foreground block mb-1">Địa chỉ</span>
              <span className={`text-sm font-medium ${fullAddress ? "text-foreground line-clamp-2" : "text-muted-foreground"}`}>
                {fullAddress || "Chọn địa chỉ"}
              </span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
          </button>
          
          <input 
            type="text" 
            placeholder="Tòa nhà, Số tầng (Không bắt buộc)" 
            value={buildingFloor}
            onChange={(e) => setBuildingFloor(e.target.value)}
            className="w-full text-sm bg-transparent outline-none py-3 border-b border-border/50 font-medium placeholder:text-muted-foreground"
          />
          <input 
            type="text" 
            placeholder="Cổng (không bắt buộc)" 
            value={gate}
            onChange={(e) => setGate(e.target.value)}
            className="w-full text-sm bg-transparent outline-none py-3 font-medium placeholder:text-muted-foreground"
          />
        </div>

        {/* Labels */}
        <div className="bg-card px-4 py-4 border-y border-border/50">
          <span className="text-sm font-semibold text-muted-foreground block mb-3">Loại địa chỉ</span>
          <div className="flex gap-3">
            {(["Nhà", "Công ty", "Khác"] as const).map((lbl) => (
              <button 
                key={lbl}
                onClick={() => setLabel(lbl)}
                className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-all ${
                  label === lbl 
                    ? "border-primary text-primary bg-primary/5" 
                    : "border-border text-muted-foreground bg-background"
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="bg-card px-4 py-2 border-y border-border/50">
          <textarea 
            placeholder="Ghi chú cho Tài xế (không bắt buộc)" 
            value={driverNote}
            onChange={(e) => setDriverNote(e.target.value)}
            rows={3}
            className="w-full text-sm bg-transparent outline-none py-2 font-medium placeholder:text-muted-foreground resize-none"
          />
        </div>

        {/* Toggles */}
        <div className="bg-card px-4 py-2 border-y border-border/50">
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <span className="text-sm font-semibold text-foreground">Đặt làm địa chỉ mặc định</span>
            <input 
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="toggle toggle-primary toggle-sm"
              style={{ accentColor: "var(--primary)" }}
            />
          </div>
          <div className="flex items-center justify-between py-3">
            <span className="text-sm font-semibold text-foreground flex items-center gap-1">
              Nhà có vật nuôi (Chó, mèo...) <span className="text-xs text-muted-foreground font-normal">(Có phụ phí)</span>
            </span>
            <input 
              type="checkbox"
              checked={hasPet}
              onChange={(e) => setHasPet(e.target.checked)}
              className="toggle toggle-primary toggle-sm"
              style={{ accentColor: "var(--primary)" }}
            />
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-10 max-w-md mx-auto">
        <button 
          onClick={handleSaveAddress}
          disabled={createAddressMutation.isPending}
          className="w-full py-3.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors flex justify-center items-center gap-2"
        >
          {createAddressMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Lưu"}
        </button>
      </div>
    </motion.div>
  );

  const renderMap = () => (
    <motion.div variants={slideInVariants} initial="hidden" animate="visible" className="fixed inset-0 z-50 bg-background flex flex-col max-w-md mx-auto">
      {/* Map Header */}
      <div className="bg-card px-4 py-3 shadow-sm flex items-center gap-3 z-20 absolute top-0 left-0 right-0">
        <button onClick={() => setView("form")} className="p-1.5 rounded-full hover:bg-muted bg-background shadow-sm border border-border">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1">
          <GoongAutocomplete onSelect={handleAutoSelect} placeholder="Tìm kiếm địa chỉ..." className="w-full text-sm" />
        </div>
      </div>

      {/* Map View */}
      <div className="flex-1 relative">
        <GoongMap 
          initialLat={latitude ?? 21.028511}
          initialLng={longitude ?? 105.804817}
          onLocationSelect={handleMapSelect}
        />
        {/* Center Marker Overlay for visual confirmation */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none mb-10">
          <MapPin className="w-10 h-10 text-primary drop-shadow-md" />
        </div>
      </div>

      {/* Map Footer */}
      <div className="bg-card p-4 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20 absolute bottom-0 left-0 right-0 pb-8">
        <h3 className="font-bold text-sm text-foreground mb-1">Địa chỉ đã chọn</h3>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
          {fullAddress || "Di chuyển bản đồ để chọn vị trí"}
        </p>
        <button 
          onClick={() => {
            if (fullAddress) setView("form");
            else toast.error("Vui lòng chọn địa chỉ hợp lệ");
          }}
          className="w-full py-3.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors"
        >
          Xác nhận
        </button>
      </div>
    </motion.div>
  );

  return (
    <AnimatePresence mode="wait">
      {view === "list" && renderList()}
      {view === "form" && renderForm()}
      {view === "map" && renderMap()}
    </AnimatePresence>
  );
};
