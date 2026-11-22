import { ESLint } from "eslint";
import globals from "globals";

// ساخت تحلیل گر ESLint
function createESLint(fix = false) {
  return new ESLint({
    overrideConfigFile: true,

    // فعال یا غیرفعال کردن اصلاح خودکار
    fix: fix,

    overrideConfig: {
      languageOptions: {
        ecmaVersion: "latest",
        sourceType: "module",

        globals: {
          ...globals.browser,
          ...globals.node,
        },
      },

      rules: {
        "no-undef": "error",
        "no-unused-vars": "warn",
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
    ruleId: item.ruleId,

    severity: item.severity === 2 ? "error" : "warning",

    message: item.message,

    line: item.line ?? null,

    column: item.column ?? null,
  }));
}

// تحلیل معنایی بدون اصلاح کد
export async function checkSemantic(code) {
  const eslint = createESLint(false);

  const results = await eslint.lintText(code, {
    filePath: "user-code.js",
  });

  const result = results[0];

  return {
    checked: true,

    valid: result.errorCount === 0,

    errorCount: result.errorCount,

    warningCount: result.warningCount,

    diagnostics: formatDiagnostics(result.messages),
  };
}

// اصلاح خودکار با ESLint
export async function autoFixSemantic(code) {
  const eslint = createESLint(true);

  const results = await eslint.lintText(code, {
    filePath: "user-code.js",
  });

  const result = results[0];

  const fixedCode = result.output ?? code;

  return {
    code: fixedCode,

    changed: fixedCode !== code,

    diagnostics: formatDiagnostics(result.messages),

    fixedErrorCount: result.fixableErrorCount,

    fixedWarningCount: result.fixableWarningCount,
  };
}
