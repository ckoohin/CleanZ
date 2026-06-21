"use client";

import * as React from "react";
import {
  Plus,
  DollarSign,
  Flame,
  TrendingUp,
  RefreshCw,
  Percent,
  Zap,
  CircleCheck,
  CircleX,
} from "lucide-react";
import { toast } from "sonner";

import { BaseTableList, Column, RowAction } from "@/components/ui/base/base_table_list";
import { BaseButton } from "@/components/ui/base/base_button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

import type {
  PricingConfig,
  PeakDayConfig,
} from "@/features/admin/types/pricing.types";
import { pricingApi } from "@/features/admin/services/pricing.service";
import { PricingConfigDialog } from "@/features/admin/components/pricing/PricingConfigDialog";
import type { PricingConfigFormValues } from "@/features/admin/components/pricing/PricingConfigDialog";
import { PeakDayConfigDialog } from "@/features/admin/components/pricing/PeakDayConfigDialog";
import type { PeakDayFormValues } from "@/features/admin/components/pricing/PeakDayConfigDialog";

const vnd = (val: number | null | undefined) => {
  if (val === null || val === undefined) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(val));
};

const fmtDate = (v?: string | Date | null) => {
  if (!v) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(v));
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <Card className="border border-border/40 rounded-2xl shadow-sm bg-card">
      <CardContent className="p-5 flex items-center gap-4">
        <div
          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${color}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
            {label}
          </p>
          <p className="text-xl font-bold text-foreground leading-tight">
            {value}
          </p>
          {sub && (
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
              {sub}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminPricingPage() {
  const [configs, setConfigs] = React.useState<PricingConfig[]>([]);
  const [peakDays, setPeakDays] = React.useState<PeakDayConfig[]>([]);
  const [isLoadingConfigs, setIsLoadingConfigs] = React.useState(true);
  const [isLoadingPeakDays, setIsLoadingPeakDays] = React.useState(true);

  const [configPage, setConfigPage] = React.useState(1);
  const [configLimit, setConfigLimit] = React.useState(10);
  const [configTotal, setConfigTotal] = React.useState(0);
  const [configKeyword, setConfigKeyword] = React.useState("");

  const [configDialog, setConfigDialog] = React.useState<{
    open: boolean;
    mode: "create" | "edit";
    data: PricingConfig | null;
  }>({ open: false, mode: "create", data: null });
  const [isSubmittingConfig, setIsSubmittingConfig] = React.useState(false);

  const [peakDialog, setPeakDialog] = React.useState<{
    open: boolean;
    mode: "create" | "edit";
    data: PeakDayConfig | null;
  }>({ open: false, mode: "create", data: null });
  const [isSubmittingPeak, setIsSubmittingPeak] = React.useState(false);

  const [peakKeyword, setPeakKeyword] = React.useState("");

  const fetchConfigs = React.useCallback(async () => {
    setIsLoadingConfigs(true);
    try {
      const result = await pricingApi.listConfigs({
        page: configPage,
        limit: configLimit,
      });
      setConfigs(Array.isArray(result.data) ? result.data : []);
      setConfigTotal(result.meta?.total || 0);
    } catch {
      setConfigs([]);
      setConfigTotal(0);
    } finally {
      setIsLoadingConfigs(false);
    }
  }, [configPage, configLimit]);

  const fetchPeakDays = React.useCallback(async () => {
    setIsLoadingPeakDays(true);
    try {
      const data = await pricingApi.listPeakDays();
      setPeakDays(Array.isArray(data) ? data : []);
    } catch {
      setPeakDays([]);
    } finally {
      setIsLoadingPeakDays(false);
    }
  }, []);

  React.useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  React.useEffect(() => {
    fetchPeakDays();
  }, [fetchPeakDays]);

  const activeConfigs = configs.filter((c) => c.isActive).length;
  const activePeakDays = peakDays.filter((p) => p.isActive).length;
  const avgCommission =
    configs.length > 0
      ? (
          configs.reduce((sum, c) => sum + Number(c.platformCommissionRate), 0) /
          configs.length
        ).toFixed(1)
      : "—";

  const filteredConfigs = React.useMemo(() => {
    if (!configKeyword) return configs;
    const kw = configKeyword.toLowerCase();
    return configs.filter(
      (c) =>
        c.serviceName?.toLowerCase().includes(kw) ||
        c.serviceId.toLowerCase().includes(kw),
    );
  }, [configs, configKeyword]);

  const filteredPeakDays = React.useMemo(() => {
    if (!peakKeyword) return peakDays;
    const kw = peakKeyword.toLowerCase();
    return peakDays.filter((p) => p.name.toLowerCase().includes(kw));
  }, [peakDays, peakKeyword]);

  const handleCreateConfig = async (data: PricingConfigFormValues) => {
    setIsSubmittingConfig(true);
    try {
      await pricingApi.createConfig({
        serviceId: data.serviceId,
        basePrice: Number(data.basePrice),
        peakPrice: data.peakPrice !== "" ? Number(data.peakPrice) : undefined,
        petFee: Number(data.petFee),
        waitingFee: Number(data.waitingFee),
        platformCommissionRate: Number(data.platformCommissionRate),
        isActive: data.isActive,
      });
      toast.success("Đã tạo cấu hình giá thành công!");
      setConfigDialog({ open: false, mode: "create", data: null });
      fetchConfigs();
    } finally {
      setIsSubmittingConfig(false);
    }
  };

  const handleUpdateConfig = async (data: PricingConfigFormValues) => {
    if (!configDialog.data) return;
    setIsSubmittingConfig(true);
    try {
      await pricingApi.updateConfig(configDialog.data.id, {
        basePrice: Number(data.basePrice),
        peakPrice: data.peakPrice !== "" ? Number(data.peakPrice) : null,
        petFee: Number(data.petFee),
        waitingFee: Number(data.waitingFee),
        platformCommissionRate: Number(data.platformCommissionRate),
        isActive: data.isActive,
      });
      toast.success("Đã cập nhật cấu hình giá!");
      setConfigDialog({ open: false, mode: "create", data: null });
      fetchConfigs();
    } finally {
      setIsSubmittingConfig(false);
    }
  };

  const handleDeleteConfig = async (row: PricingConfig) => {
    if (!confirm(`Xoá cấu hình giá cho dịch vụ "${row.serviceName ?? row.serviceId}"?`))
      return;
    try {
      await pricingApi.deleteConfig(row.id);
      toast.success("Đã xoá cấu hình giá.");
      fetchConfigs();
    } catch {
      // handled by interceptor
    }
  };

  const handleToggleConfigActive = async (row: PricingConfig) => {
    try {
      await pricingApi.updateConfig(row.id, { isActive: !row.isActive });
      toast.success(
        row.isActive
          ? "Đã tắt bảng giá."
          : "Đã kích hoạt bảng giá.",
      );
      fetchConfigs();
    } catch {
      // handled
    }
  };

  const handleCreatePeakDay = async (data: PeakDayFormValues) => {
    setIsSubmittingPeak(true);
    try {
      const toISO = (v: string) =>
        v ? new Date(v).toISOString() : null;
      await pricingApi.createPeakDay({
        name: data.name,
        peakRate: Number(data.peakRate),
        startAt: toISO(data.startAt),
        endAt: toISO(data.endAt),
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        isActive: data.isActive,
      });
      toast.success("Đã tạo cấu hình ngày cao điểm!");
      setPeakDialog({ open: false, mode: "create", data: null });
      fetchPeakDays();
    } finally {
      setIsSubmittingPeak(false);
    }
  };

  const handleUpdatePeakDay = async (data: PeakDayFormValues) => {
    if (!peakDialog.data) return;
    setIsSubmittingPeak(true);
    try {
      const toISO = (v: string) =>
        v ? new Date(v).toISOString() : null;
      await pricingApi.updatePeakDay(peakDialog.data.id, {
        name: data.name,
        peakRate: Number(data.peakRate),
        startAt: toISO(data.startAt),
        endAt: toISO(data.endAt),
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        isActive: data.isActive,
      });
      toast.success("Đã cập nhật ngày cao điểm!");
      setPeakDialog({ open: false, mode: "create", data: null });
      fetchPeakDays();
    } finally {
      setIsSubmittingPeak(false);
    }
  };

  const handleDeletePeakDay = async (row: PeakDayConfig) => {
    if (!confirm(`Xoá cấu hình ngày cao điểm "${row.name}"?`)) return;
    try {
      await pricingApi.deletePeakDay(row.id);
      toast.success("Đã xoá cấu hình ngày cao điểm.");
      fetchPeakDays();
    } catch {
      // handled
    }
  };

  const configColumns: Column<PricingConfig>[] = [
    {
      key: "serviceName",
      title: "Dịch vụ",
      render: (row) => (
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate max-w-[180px]">
            {row.serviceName ?? "—"}
          </p>
          <p className="font-mono text-[10px] text-muted-foreground truncate max-w-[180px] mt-0.5">
            {row.serviceId}
          </p>
        </div>
      ),
    },
    {
      key: "basePrice",
      title: "Giá cơ bản",
      render: (row) => (
        <span className="font-bold text-foreground">{vnd(row.basePrice)}</span>
      ),
    },
    {
      key: "peakPrice",
      title: "Giá cao điểm",
      hideOnMobile: true,
      render: (row) => (
        <span className="font-semibold text-amber-500">
          {vnd(row.peakPrice)}
        </span>
      ),
    },
    {
      key: "petFee",
      title: "Phí thú cưng",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-muted-foreground">{vnd(row.petFee)}</span>
      ),
    },
    {
      key: "platformCommissionRate",
      title: "Hoa hồng",
      render: (row) => (
        <Badge
          variant="outline"
          className="bg-primary/5 text-primary border-primary/20 font-bold text-[11px]"
        >
          {Number(row.platformCommissionRate).toFixed(1)}%
        </Badge>
      ),
    },
    {
      key: "isActive",
      title: "Trạng thái",
      render: (row) =>
        row.isActive ? (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-semibold text-[11px] gap-1">
            <CircleCheck className="w-3 h-3" />
            Hoạt động
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="bg-muted text-muted-foreground border-none font-semibold text-[11px] gap-1"
          >
            <CircleX className="w-3 h-3" />
            Tạm ngưng
          </Badge>
        ),
    },
    {
      key: "createdAt",
      title: "Ngày tạo",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {fmtDate(row.createdAt)}
        </span>
      ),
    },
  ];

  const configRowActions: RowAction<PricingConfig>[] = [
    {
      type: "edit",
      label: "Chỉnh sửa",
      onClick: (row) =>
        setConfigDialog({ open: true, mode: "edit", data: row }),
    },
    {
      label: "Bật / Tắt",
      icon: Zap,
      onClick: handleToggleConfigActive,
      variant: "warning",
    } as RowAction<PricingConfig>,
    {
      type: "delete",
      label: "Xoá",
      onClick: handleDeleteConfig,
    },
  ];

  const peakDayColumns: Column<PeakDayConfig>[] = [
    {
      key: "name",
      title: "Tên cấu hình",
      render: (row) => (
        <span className="font-semibold text-foreground">{row.name}</span>
      ),
    },
    {
      key: "peakRate",
      title: "Phụ thu",
      render: (row) => (
        <Badge className="bg-amber-500/10 text-amber-600 border-none font-bold text-[11px]">
          +{(Number(row.peakRate) * 100).toFixed(0)}%
        </Badge>
      ),
    },
    {
      key: "startAt",
      title: "Từ ngày",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {fmtDate(row.startAt)}
        </span>
      ),
    },
    {
      key: "endAt",
      title: "Đến ngày",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {fmtDate(row.endAt)}
        </span>
      ),
    },
    {
      key: "startTime",
      title: "Khung giờ",
      hideOnMobile: true,
      render: (row) =>
        row.startTime && row.endTime ? (
          <span className="font-mono text-xs bg-muted/60 px-2 py-1 rounded-md text-foreground">
            {row.startTime} – {row.endTime}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">Cả ngày</span>
        ),
    },
    {
      key: "isActive",
      title: "Trạng thái",
      render: (row) =>
        row.isActive ? (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-semibold text-[11px] gap-1">
            <CircleCheck className="w-3 h-3" />
            Hoạt động
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="bg-muted text-muted-foreground border-none font-semibold text-[11px] gap-1"
          >
            <CircleX className="w-3 h-3" />
            Tạm ngưng
          </Badge>
        ),
    },
    {
      key: "createdAt",
      title: "Ngày tạo",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {fmtDate(row.createdAt)}
        </span>
      ),
    },
  ];

  const peakDayRowActions: RowAction<PeakDayConfig>[] = [
    {
      type: "edit",
      label: "Chỉnh sửa",
      onClick: (row) =>
        setPeakDialog({ open: true, mode: "edit", data: row }),
    },
    {
      type: "delete",
      label: "Xoá",
      onClick: handleDeletePeakDay,
    },
  ];

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Quản lý Bảng giá
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cấu hình giá dịch vụ và thiết lập phụ thu ngày cao điểm.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchConfigs();
              fetchPeakDays();
            }}
            className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-border/50 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all shadow-sm"
            title="Tải lại"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Cấu hình giá"
          value={configTotal}
          sub="Tổng dịch vụ có giá"
          icon={DollarSign}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          label="Đang hoạt động"
          value={activeConfigs}
          sub="Bảng giá live"
          icon={TrendingUp}
          color="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard
          label="Ngày cao điểm"
          value={activePeakDays}
          sub={`Trong ${peakDays.length} cấu hình`}
          icon={Flame}
          color="bg-amber-500/10 text-amber-500"
        />
        <StatCard
          label="Hoa hồng TB"
          value={`${avgCommission}%`}
          sub="Trung bình toàn sàn"
          icon={Percent}
          color="bg-indigo-500/10 text-indigo-500"
        />
      </div>

      <Tabs defaultValue="configs" className="space-y-4">
        <TabsList className="h-11 rounded-xl bg-muted/50 p-1 gap-1">
          <TabsTrigger
            value="configs"
            id="tab-pricing-configs"
            className="rounded-lg px-5 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
          >
            <DollarSign className="w-4 h-4 mr-2 opacity-70" />
            Cấu hình giá dịch vụ
            <Badge
              variant="secondary"
              className="ml-2 text-[10px] font-bold bg-primary/10 text-primary border-none"
            >
              {configTotal}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="peakdays"
            id="tab-peak-days"
            className="rounded-lg px-5 text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all"
          >
            <Flame className="w-4 h-4 mr-2 opacity-70" />
            Ngày cao điểm
            <Badge
              variant="secondary"
              className="ml-2 text-[10px] font-bold bg-amber-500/10 text-amber-600 border-none"
            >
              {peakDays.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configs" className="mt-0">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-primary/5 border border-primary/15 rounded-2xl px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Bảng giá dịch vụ
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Mỗi dịch vụ chỉ có một cấu hình giá. Gồm giá cơ bản, giá
                    cao điểm, phí thú cưng, phí chờ và hoa hồng nền tảng.
                  </p>
                </div>
              </div>
              <BaseButton
                id="btn-create-pricing-config"
                variant="primary"
                className="rounded-xl shadow-lg shadow-primary/20 gap-2 h-10 px-5 shrink-0"
                onClick={() =>
                  setConfigDialog({ open: true, mode: "create", data: null })
                }
              >
                <Plus className="w-4 h-4" />
                <span className="font-bold uppercase tracking-widest text-[10px]">
                  Thêm bảng giá
                </span>
              </BaseButton>
            </div>

            <BaseTableList
              columns={configColumns}
              data={filteredConfigs}
              rowKey="id"
              isLoading={isLoadingConfigs}
              totalItems={configTotal}
              page={configPage}
              limit={configLimit}
              onPageChange={setConfigPage}
              onLimitChange={(l) => {
                setConfigLimit(l);
                setConfigPage(1);
              }}
              keyword={configKeyword}
              onKeywordChange={(kw) => {
                setConfigKeyword(kw);
                setConfigPage(1);
              }}
              placeholderSearch="Tìm theo tên dịch vụ..."
              rowActions={configRowActions}
              emptyTitle="Chưa có cấu hình giá nào"
              emptyDescription="Nhấn 'Thêm bảng giá' để tạo cấu hình đầu tiên."
              emptyIcon={DollarSign}
            />
          </div>
        </TabsContent>

        <TabsContent value="peakdays" className="mt-0">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-amber-500/5 border border-amber-500/15 rounded-2xl px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Flame className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Cấu hình ngày cao điểm
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Phụ thu tự động áp dụng khi booking rơi vào khoảng ngày /
                    khung giờ cao điểm. Tỷ lệ 0.1 = +10%.
                  </p>
                </div>
              </div>
              <BaseButton
                id="btn-create-peak-day"
                variant="primary"
                className="rounded-xl shadow-lg shadow-amber-500/20 gap-2 h-10 px-5 shrink-0 bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() =>
                  setPeakDialog({ open: true, mode: "create", data: null })
                }
              >
                <Plus className="w-4 h-4" />
                <span className="font-bold uppercase tracking-widest text-[10px]">
                  Thêm cao điểm
                </span>
              </BaseButton>
            </div>

            <BaseTableList
              columns={peakDayColumns}
              data={filteredPeakDays}
              rowKey="id"
              isLoading={isLoadingPeakDays}
              totalItems={filteredPeakDays.length}
              keyword={peakKeyword}
              onKeywordChange={setPeakKeyword}
              placeholderSearch="Tìm theo tên cấu hình..."
              rowActions={peakDayRowActions}
              emptyTitle="Chưa có cấu hình ngày cao điểm nào"
              emptyDescription="Nhấn 'Thêm cao điểm' để tạo cấu hình mới."
              emptyIcon={Flame}
            />
          </div>
        </TabsContent>
      </Tabs>

      <PricingConfigDialog
        open={configDialog.open}
        onOpenChange={(open) =>
          setConfigDialog((s) => ({ ...s, open }))
        }
        mode={configDialog.mode}
        initialData={configDialog.data}
        onSubmit={configDialog.mode === "create" ? handleCreateConfig : handleUpdateConfig}
        isSubmitting={isSubmittingConfig}
      />

      <PeakDayConfigDialog
        open={peakDialog.open}
        onOpenChange={(open) =>
          setPeakDialog((s) => ({ ...s, open }))
        }
        mode={peakDialog.mode}
        initialData={peakDialog.data}
        onSubmit={peakDialog.mode === "create" ? handleCreatePeakDay : handleUpdatePeakDay}
        isSubmitting={isSubmittingPeak}
      />
    </div>
  );
}
