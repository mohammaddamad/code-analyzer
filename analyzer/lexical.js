//این فایل مسول است کد را به اجزای کوچک‌تری به نام توکن تبدیل کند و خطاهای مربوط به توکن‌سازی را شناسایی کند
//برای ارور های لغوی
import { tokenizer } from "acorn";

// بررسی خطاهای لغوی
export function checkLexical(code) {
  try {
    const tokens = tokenizer(code, {
      ecmaVersion: "latest",
      sourceType: "module",
      locations: true,
    });

    // تبدیل کد به توکن
    while (true) {
      const token = tokens.getToken();

      if (token.type.label === "eof") {
        break;
      }
    }

    return {
      valid: true,
      error: null,
    };
  } catch (error) {
    return {
      valid: false,
      error: {
        message: error.message,
        line: error.loc?.line ?? null,
        column: error.loc ? error.loc.column + 1 : null,
      },
    };
  }
}
