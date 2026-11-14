
import "dotenv/config";

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { checkLexical } from "./analyzer/lexical.js";
import { checkSyntax } from "./analyzer/syntax.js";
import { checkSemantic } from "./analyzer/semantic.js";

import { explainCode } from "./ai/ollama.js";


const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// تنظیمات سرور
app.use(express.json({ limit: "1mb" }));

app.use(express.static(path.join(__dirname, "public")));


// مسیر اصلی تحلیل کد
app.post("/analyze", async (req, res) => {

    const code = req.body?.code;

    if (typeof code !== "string") {

        return res.status(400).json({
            error: "Invalid code input"
        });
    }

    try {

        // مرحله اول: بررسی لغوی
        const lexical = checkLexical(code);

        if (!lexical.valid) {

            return res.json({

                lexical,

                syntax: {
                    checked: false
                },

                semantic: {
                    checked: false,
                    diagnostics: []
                },

                ai: {
                    checked: false,
                    message: "به دلیل خطای لغوی، تحلیل AI انجام نشد."
                }
            });
        }


        // مرحله دوم: بررسی نحوی
        const syntax = checkSyntax(code);

        if (!syntax.valid) {

            return res.json({

                lexical,

                syntax: {
                    checked: true,
                    ...syntax
                },

                semantic: {
                    checked: false,
                    diagnostics: []
                },

                ai: {
                    checked: false,
                    message: "به دلیل خطای نحوی، تحلیل AI انجام نشد."
                }
            });
        }


        // مرحله سوم: تحلیل معنایی با ESLint
        const semantic = await checkSemantic(code);


        // مرحله چهارم: تحلیل هوش مصنوعی با Qwen
        let ai;

        try {

            ai = await explainCode(
                code,
                semantic.diagnostics
            );

        } catch (error) {

            console.error("Ollama Error:", error.message);

            ai = {
                checked: false,
                message: error.message
            };
        }


        // ارسال گزارش نهایی به Frontend
        return res.json({

            lexical,

            syntax: {
                checked: true,
                ...syntax
            },

            semantic,

            ai
        });

    } catch (error) {

        console.error("Analysis Error:", error);

        return res.status(500).json({

            error: "خطا در تحلیل کد",

            details: error.message
        });
    }
});


// اجرای سرور
app.listen(PORT, () => {

    console.log(
        `Server running at http://localhost:${PORT}`
    );

});
