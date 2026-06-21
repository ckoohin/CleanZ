"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { slideInVariants } from "@/constants/motion";
import { MapPin, Plus, Home, Briefcase, Star, Trash2, X } from "lucide-react";
import { GoongMap } from "@/components/maps/GoongMap";
import { GoongAutocomplete } from "@/components/maps/GoongAutocomplete";
import { useRouter } from "next/navigation";

interface Address {
  id: string;
  label: "Nhà" | "Công ty" | "Khác";
  address: string;
  isDefault: boolean;
  hasPet: boolean;
}

export const AddressManager = () => {
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([
    { id: "1", label: "Nhà", address: "Vinhome Central Park, 208 Nguyễn Hữu Cảnh, P.22, Bình Thạnh", isDefault: true, hasPet: true },
    { id: "2", label: "Công ty", address: "Tòa nhà Bitexco, 2 Hải Triều, Q.1", isDefault: false, hasPet: false }
  ]);
  const [showAddForm, setShowAddForm] = useState(false);

  const handleDelete = (id: string) => {
    setAddresses(addresses.filter(a => a.id !== id));
  };

  const handleSetDefault = (id: string) => {
    setAddresses(addresses.map(a => ({ ...a, isDefault: a.id === id })));
  };

  return (
    <div className="min-h-screen bg-background relative pb-20">
      {/* Header */}
      <div className="bg-card px-4 py-4 sticky top-0 z-20 shadow-sm flex items-center">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-muted">
          <X className="w-6 h-6 text-foreground/90" />
        </button>
        <h1 className="text-lg font-bold text-foreground ml-2">Sổ địa chỉ</h1>
      </div>

      <div className="p-4 space-y-4">
        {!showAddForm ? (
          <motion.div variants={slideInVariants} initial="hidden" animate="visible" className="space-y-4">
            <button 
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-primary/30 text-primary font-bold rounded-2xl hover:bg-primary/5 transition-colors"
            >
              <Plus className="w-5 h-5" /> Thêm địa chỉ mới
            </button>

            {addresses.map((addr) => (
              <div key={addr.id} className="bg-card p-5 rounded-2xl shadow-sm border border-border/50 flex gap-4 relative overflow-hidden">
                {addr.isDefault && <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-3 py-1 rounded-bl-xl">MẶC ĐỊNH</div>}
                
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 mt-1">
                  {addr.label === "Nhà" ? <Home className="w-5 h-5" /> : addr.label === "Công ty" ? <Briefcase className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
                </div>
                
                <div className="flex-1">
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    {addr.label}
                    {addr.hasPet && <span className="bg-orange-100 text-orange-600 text-[10px] px-2 py-0.5 rounded">Có thú cưng</span>}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1 pr-6">{addr.address}</p>
                  
                  <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/50">
                    {!addr.isDefault && (
                      <button onClick={() => handleSetDefault(addr.id)} className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                        <Star className="w-3.5 h-3.5" /> Chọn mặc định
                      </button>
                    )}
                    <button onClick={() => handleDelete(addr.id)} className="text-xs font-bold text-red-500 flex items-center gap-1 hover:underline ml-auto">
                      <Trash2 className="w-3.5 h-3.5" /> Xóa
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div variants={slideInVariants} initial="hidden" animate="visible" className="space-y-6">
            <GoongAutocomplete onSelect={(id, address) => console.log(id, address)} className="z-30" />
            
            <div className="bg-card p-2 rounded-3xl shadow-sm border border-border/50 relative">
              <GoongMap />
              <div className="absolute bottom-4 left-4 right-4 bg-primary/10 text-primary text-xs font-medium p-3 rounded-xl border border-primary/20 flex items-start gap-2">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Di chuyển bản đồ để ghim chính xác vị trí</p>
              </div>
            </div>

            <div className="bg-card p-6 rounded-2xl shadow-sm border border-border/50 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-2">Lưu địa chỉ thành</label>
                <div className="flex gap-3">
                  {["Nhà", "Công ty", "Khác"].map((lbl) => (
                    <button key={lbl} className="px-4 py-2 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors focus:ring-2 focus:ring-primary/20">
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/90 mb-2">Số nhà, Tên tòa nhà</label>
                <input type="text" placeholder="Nhập chi tiết số nhà..." className="w-full bg-background border border-border rounded-xl p-3 text-sm text-foreground/90 focus:ring-2 focus:ring-primary/20 outline-none" />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input type="checkbox" id="hasPet" className="w-5 h-5 rounded border-border text-primary focus:ring-primary" />
                <label htmlFor="hasPet" className="text-sm font-medium text-foreground/90">Nhà có vật nuôi (Chó, mèo...)</label>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowAddForm(false)} className="flex-1 py-4 bg-muted text-muted-foreground font-bold rounded-2xl hover:bg-muted/80 transition-colors">
                Hủy
              </button>
              <button onClick={() => setShowAddForm(false)} className="flex-[2] py-4 bg-primary text-white font-bold rounded-2xl hover:bg-orange-600 shadow-lg shadow-primary/30 transition-all">
                Lưu địa chỉ
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
