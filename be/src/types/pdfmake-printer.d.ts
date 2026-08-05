/**
 * `@types/pdfmake` chỉ mô tả API chạy trên trình duyệt (`createPdf`, `addFonts`)
 * của nhánh 0.3; nó KHÔNG khai báo lớp `PdfPrinter` server-side mà bản 0.2 dùng.
 * Khai báo tối thiểu đúng phần đang dùng, thay vì ép kiểu `any` ở chỗ gọi.
 *
 * Nhập trực tiếp từ `pdfmake/src/printer` (chính là `main` của package) để không
 * đụng vào khai báo module `pdfmake` sẵn có của @types.
 */
declare module 'pdfmake/src/printer' {
  import type { Readable } from 'stream';
  import type {
    BufferOptions,
    TDocumentDefinitions,
    TFontDictionary,
  } from 'pdfmake/interfaces';

  /** Stream PDF do pdfkit tạo — chỉ cần phần đọc dữ liệu và kết thúc tài liệu. */
  interface PdfKitDocument extends Readable {
    end(): void;
  }

  class PdfPrinter {
    constructor(fontDescriptors: TFontDictionary);
    createPdfKitDocument(
      docDefinition: TDocumentDefinitions,
      options?: BufferOptions,
    ): PdfKitDocument;
  }

  export = PdfPrinter;
}
