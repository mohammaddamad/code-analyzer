
import { ESLint } from "eslint";
import globals from "globals";

// تنظیمات تحلیل کد
const eslint = new ESLint({
    overrideConfigFile: true,

    overrideConfig: {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",

            // متغیرهای سراسری مرورگر و Node.js
            globals: {
                ...globals.browser,
                ...globals.node
            }
        },

        // قوانین تشخیص خطا
        rules: {
            "no-undef": "error",
            "no-unused-vars": "warn",
            "no-unreachable": "error",
            "valid-typeof": "error",
            "no-constant-condition": "warn"
        }
    }
});

// تحلیل معنایی کد
export async function checkSemantic(code) {

    const results = await eslint.lintText(code, {
        filePath: "user-code.js"
    });

    const result = results[0];

    // استخراج خطاها و هشدارها
    const diagnostics = result.messages.map(item => ({
        ruleId: item.ruleId,
        severity: item.severity === 2 ? "error" : "warning",
        message: item.message,
        line: item.line ?? null,
        column: item.column ?? null
    }));

    return {
        checked: true,

        valid: result.errorCount === 0,

        errorCount: result.errorCount,

        warningCount: result.warningCount,

        diagnostics
    };
}
