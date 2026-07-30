// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      "prettier/prettier": ["error", { endOfLine: "auto" }],

      // Tham số/biến bắt đầu bằng "_" là quy ước "cố tình không dùng" đã áp
      // dụng sẵn trong repo (fileFilter của multer, down() của migration...).
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // ── Họ quy tắc "unsafe" của typescript-eslint ────────────────────────────
      // Hạ xuống 'warn' thay vì 'error', đồng nhất với no-unsafe-argument và
      // no-explicit-any đã nới ở trên.
      //
      // Lý do: gần như toàn bộ vi phạm đến từ raw query của TypeORM
      // (`query()`, `getRawMany()`, `getRawOne()`) — chúng trả `any` theo thiết
      // kế. Cách "sửa" duy nhất là tự khai generic cho từng câu SQL, mà đó là
      // KHẲNG ĐỊNH KHÔNG ĐƯỢC KIỂM TRA: khai sai kiểu (vd. numeric của Postgres
      // trả string chứ không phải number) sẽ khiến TypeScript xác nhận một kiểu
      // sai — nguy hiểm hơn để `any`. Giữ ở mức 'warn' để vẫn thấy được điểm
      // nóng mà không biến CI thành đèn đỏ vĩnh viễn.
      //
      // Khi viết query mới, hãy khai generic đúng ngay từ đầu:
      //   dataSource.query<{ id: string; total: string }[]>(...)
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
    },
  },
);
