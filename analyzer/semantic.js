import { ESLint } from "eslint"; //بدون اینکه کد را اجرا کند، آن را بررسی می‌کند و مشکلاتی مثل استفاده از متغیر تعریف‌نشده
import globals from "globals"; //فهرستی از متغیرهای سراسری JavaScript را در اختیار ESLint قرار می‌دهد

// ساخت تحلیل گر ESLint
function createESLint(fix = false) {
  //اینجا eslint فقط تشخیص خطا دارد
  return new ESLint({
    overrideConfigFile: true,

    // فعال یا غیرفعال کردن اصلاح خودکار
    fix: fix,

    overrideConfig: {
      languageOptions: {
        ecmaVersion: "latest",
        sourceType: "module",

        globals: {
          //در این قسمت متغیرهای سراسری مرورگر و Node.js را به ESLint معرفی می‌کنیم
          ...globals.browser, //عملگرد اسپرد
          ...globals.node,
        },
      },

      rules: {
        //ESLint چه مشکلاتی را بررسی می کند
        "no-undef": "error",
        "no-unused-vars": "warn", // متغیر اسنفاده نشده فقط خطا دارد
        "no-unreachable": "error",
        "valid-typeof": "error",
        "no-constant-condition": "warn",
      },
    },
  });
}

// تبدیل گزارش ESLint به خروجی استاندارد
function formatDiagnostics(messages) {
  return messages.map((item) => ({
    //فقط اطلاعات موردنیاز پروژه را استخراج می‌کنیم با کمک متت مپ
    ruleId: item.ruleId,

    severity: item.severity === 2 ? "error" : "warning", // مقدار 2 ارور و مقدار 1 خطا

    message: item.message,

    line: item.line ?? null,

    column: item.column ?? null,
  }));
  //مثلا
  //   {
  //     "ruleId": "no-undef",
  //     "severity": "error",
  //     "message": "'age' is not defined.",
  //     "line": 3,
  //     "column": 13
  // }
}

// تحلیل معنایی بدون اصلاح کد
export async function checkSemantic(code) {
  const eslint = createESLint(false);

  const results = await eslint.lintText(code, {
    filePath: "user-code.js", //به ESLint می‌گوید کد را ببرسی کند
  });

  const result = results[0];

  return {
    checked: true,

    valid: result.errorCount === 0,

    errorCount: result.errorCount,

    warningCount: result.warningCount,

    diagnostics: formatDiagnostics(result.messages), // 	جزئیات خطاها و هشدارها
  };
}

// اصلاح خودکار با ESLint
export async function autoFixSemantic(code) {
  const eslint = createESLint(true);

  const results = await eslint.lintText(code, {
    filePath: "user-code.js", //ارسال کد برای اصلاح
  });

  const result = results[0];

  const fixedCode = result.output ?? code; //اگر کدی اصلاح شده باشد، خروجی اصلاح‌شده در result.output قرار می‌گیر

  return {
    code: fixedCode,

    changed: fixedCode !== code,

    diagnostics: formatDiagnostics(result.messages),

    fixedErrorCount: result.fixableErrorCount,

    fixedWarningCount: result.fixableWarningCount, //تعداد خطاها و هشدارهای قابل اصلاح خودکار را در نتیجه ESLint نشان می‌دهند
  };
}
