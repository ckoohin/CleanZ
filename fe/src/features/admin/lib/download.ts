/** Kích hoạt tải file blob trực tiếp trên trình duyệt (dùng chung cho mọi nút Xuất Excel). */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
