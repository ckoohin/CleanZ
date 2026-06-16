import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ServiceItem } from '@/features/home/types/service.type';

interface BookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceItem | null;
}

export const BookingModal: React.FC<BookingModalProps> = ({ open, onOpenChange, service }) => {
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!service) return;
    setSubmitting(true);
    setMessage(null);
    const payload = {
      serviceId: service.id,
      date,
      timeSlot,
      customer: {
        name,
        phone,
        address,
      },
    };
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setMessage('✅ Đặt lịch thành công! Mã đặt: ' + data.bookingId);
      } else {
        setMessage('❌ Đặt lịch thất bại');
      }
    } catch (e) {
      console.error(e);
      setMessage('❌ Lỗi khi gửi yêu cầu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900">
        <DialogHeader>
          <DialogTitle>Đặt lịch dịch vụ</DialogTitle>
          <DialogDescription>{service?.title}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} placeholder="Ngày" />
          <Select onValueChange={setTimeSlot}>
            <SelectTrigger>
              <SelectValue placeholder="Chọn khung giờ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="09:00-10:00">09:00 - 10:00</SelectItem>
              <SelectItem value="10:00-11:00">10:00 - 11:00</SelectItem>
              <SelectItem value="11:00-12:00">11:00 - 12:00</SelectItem>
              <SelectItem value="13:00-14:00">13:00 - 14:00</SelectItem>
              <SelectItem value="14:00-15:00">14:00 - 15:00</SelectItem>
            </SelectContent>
          </Select>
          <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Họ và tên" />
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Số điện thoại" />
          <Input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Địa chỉ (tùy chọn)" />
        </div>
        {message && <p className="text-center text-sm text-primary">{message}</p>}
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Đóng</Button>
          <Button onClick={handleSubmit} disabled={submitting || !date || !timeSlot || !name || !phone}>
            {submitting ? 'Đang gửi...' : 'Xác nhận đặt lịch'}
          </Button>
        </DialogFooter>
        <DialogClose />
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;
