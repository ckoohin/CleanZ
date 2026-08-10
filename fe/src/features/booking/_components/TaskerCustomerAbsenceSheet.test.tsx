import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskerCustomerAbsenceSheet } from "./TaskerCustomerAbsenceSheet";

const mocks = vi.hoisted(() => ({
  uploadImage: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/components/layouts/mobile/MobileViewportPortal", () => ({
  MobileViewportPortal: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("@/lib/api/upload.service", () => ({
  uploadApi: { uploadImage: mocks.uploadImage },
}));

vi.mock("@/lib/toast", () => ({
  toast: { error: mocks.toastError },
}));

describe("TaskerCustomerAbsenceSheet", () => {
  beforeEach(() => {
    mocks.uploadImage.mockImplementation((file: File) =>
      Promise.resolve(
        `https://res.cloudinary.com/cleanz/image/upload/CleanZ/uploads/${file.name}`,
      ),
    );
  });

  it("bắt buộc đủ ảnh địa chỉ và lịch sử cuộc gọi trước khi gửi", async () => {
    const onSubmit = vi.fn();
    render(
      <TaskerCustomerAbsenceSheet
        estimatedCompensation={50_000}
        reviewSlaHours={48}
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    const addressInput = screen.getByLabelText("Ảnh địa chỉ khách hàng");
    const callHistoryInput = screen.getByLabelText("Ảnh lịch sử cuộc gọi");
    const submitButton = screen.getByRole("button", {
      name: "Gửi báo cáo & hủy đơn",
    });

    expect(addressInput).toHaveAttribute("capture", "environment");
    expect(callHistoryInput).not.toHaveAttribute("capture");
    expect(submitButton).toBeDisabled();

    fireEvent.change(addressInput, {
      target: {
        files: [new File(["address"], "address.jpg", { type: "image/jpeg" })],
      },
    });
    await screen.findByAltText("Ảnh địa chỉ khách hàng");
    expect(submitButton).toBeDisabled();

    fireEvent.change(callHistoryInput, {
      target: {
        files: [new File(["calls"], "call-history.png", { type: "image/png" })],
      },
    });
    await screen.findByAltText("Ảnh lịch sử cuộc gọi");
    await waitFor(() => expect(submitButton).toBeEnabled());

    fireEvent.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith({
      proofPhotoUrl:
        "https://res.cloudinary.com/cleanz/image/upload/CleanZ/uploads/address.jpg",
      callHistoryPhotoUrl:
        "https://res.cloudinary.com/cleanz/image/upload/CleanZ/uploads/call-history.png",
      note: undefined,
    });
  });
});
