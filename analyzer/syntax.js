// 
import { parse } from "acorn";

// بررسی خطاهای نحوی
export function checkSyntax(code) {

    try {

        // تبدیل کد به ساختار AST
        parse(code, {
            ecmaVersion: "latest",
            sourceType: "module"
        });

        return {
            valid: true,
            error: null
        };

    } catch (error) {

        return {
            valid: false,
            error: {
                message: error.message,
                line: error.loc?.line ?? null,
                column: error.loc
                    ? error.loc.column + 1
                    : null
            }
        };
    }
}
