import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LookupCombobox } from "./LookupCombobox";

function renderBox(over: Partial<Parameters<typeof LookupCombobox>[0]> = {}) {
  const onClear = vi.fn();
  render(
    <LookupCombobox
      placeholder="Lọc khách hàng..."
      items={[]}
      isLoading={false}
      onQueryChange={vi.fn()}
      selectedLabel="Nguyễn A"
      onSelect={vi.fn()}
      onClear={onClear}
      {...over}
    />,
  );
  return { onClear };
}

describe("LookupCombobox — nút xoá bộ lọc", () => {
  it("là nút thật có nhãn cho trình đọc màn hình", () => {
    renderBox();
    expect(
      screen.getByRole("button", { name: "Xoá bộ lọc: Lọc khách hàng..." }),
    ).toBeInTheDocument();
  });

  it("chỉ hiện khi đang có lựa chọn", () => {
    renderBox({ selectedLabel: null });
    expect(
      screen.queryByRole("button", { name: /Xoá bộ lọc/ }),
    ).not.toBeInTheDocument();
  });

  it("bấm xoá thì gọi onClear mà KHÔNG mở popover", () => {
    const { onClear } = renderBox();

    fireEvent.click(screen.getByRole("button", { name: /Xoá bộ lọc/ }));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.queryByPlaceholderText("Nhập để tìm...")).not.toBeInTheDocument();
  });

  it("là <button> thật và nhận được focus, không phải icon gắn onClick", () => {
    // Trước đây đây là một <svg> có onClick: chuột bấm được, bàn phím thì
    // không tới nổi. jsdom không mô phỏng việc trình duyệt tự kích hoạt button
    // bằng Enter/Space, nên chốt ở đúng thứ quyết định điều đó — đúng thẻ và
    // focus được.
    renderBox();
    const clear = screen.getByRole("button", { name: /Xoá bộ lọc/ });

    expect(clear.tagName).toBe("BUTTON");
    clear.focus();
    expect(clear).toHaveFocus();
  });
});
