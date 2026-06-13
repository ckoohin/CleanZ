export interface BookingPayload {
  serviceId: string;
  locationType: "home" | "office" | "other" | string;
  address: string;
  bookingDate: string;
  bookingTime: string;
  notes?: string;
  contactName?: string;
  contactPhone?: string;
}

export const createBooking = async (data: BookingPayload) => {
  // Simulate API delay for demo purposes
  await new Promise((resolve) => setTimeout(resolve, 1500));
  
  // Return a mock response
  return {
    success: true,
    bookingId: "BK-" + Math.floor(Math.random() * 100000).toString().padStart(5, '0'),
    message: "Booking created successfully",
    data,
  };
};
