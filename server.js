import "dotenv/config";

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { checkLexical } from "./analyzer/lexical.js";//تشخیص خطاهای لغوی
import { checkSyntax } from "./analyzer/syntax.js";//	تشخیص خطاهای نحوی

import { autoFixSemantic, checkSemantic } from "./analyzer/semantic.js"; //تحلیل معنایی و اصلاح خودکار با ESLint

import { repairCodeWithOllama } from "./ai/repair.js";//	اصلاح کد با Qwen

import { explainCode } from "./ai/ollama.js";//	توضیح خطاها با Qwen

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// تنظیمات سرور
app.use(express.json({ limit: "1mb" }));

app.use(express.static(path.join(__dirname, "public")));

// مسیر اصلی تحلیل کد
app.post("/analyze", async (req, res) => { //وقتی کاربر در صفحه روی دکمه Analyze Code کلیک می‌کند، Frontend کد را به این مسیر ارسال می‌کند
  const code = req.body?.code;

  if (typeof code !== "string") { //ممکن است کاربر به‌جای کد، اطلاعات نامعتبر ارسال کند
    return res.status(400).json({
      error: "Invalid code input",
    });
  }

  try {
    // مرحله اول: بررسی لغوی
    const lexical = checkLexical(code);

    if (!lexical.valid) {
      return res.json({
        lexical,

        syntax: {
          checked: false,
        },

        semantic: {
          checked: false,
          diagnostics: [],
        },

        ai: {
          checked: false,
          message: "به دلیل خطای لغوی، تحلیل AI انجام نشد.",
        },
      });
    }

    // مرحله دوم: بررسی نحوی
    const syntax = checkSyntax(code);

    if (!syntax.valid) {
      return res.json({
        lexical,

        syntax: {
          checked: true,
          ...syntax,
        },

        semantic: {
          checked: false,
          diagnostics: [],
        },

        ai: {
          checked: false,
          message: "به دلیل خطای نحوی، تحلیل AI انجام نشد.",
        },
      });
    }

    // مرحله سوم: تحلیل معنایی با ESLint
    const semantic = await checkSemantic(code);

    // مرحله چهارم: تحلیل هوش مصنوعی با Qwen
    let ai;

    try {
      ai = await explainCode(code, semantic.diagnostics);
    } catch (error) {
      console.error("Ollama Error:", error.message);

      ai = {
        checked: false,
        message: error.message,
      };
    }

    // ارسال گزارش نهایی به Frontend
    return res.json({
      lexical,

      syntax: {
        checked: true,
        ...syntax,
      },

      semantic,

      ai,
    });
  } catch (error) {
    console.error("Analysis Error:", error);

    return res.status(500).json({
      error: "خطا در تحلیل کد",

      details: error.message,
    });
  }
});

app.post("/fix", async (req, res) => {
  const code = req.body?.code;

  if (typeof code !== "string") {
    return res.status(400).json({
      error: "Invalid code input",
    });
  }

  if (!code.trim()) {
    return res.status(400).json({
      error: "کدی برای اصلاح ارسال نشده است.",
    });
  }

  try {
    // 1. بررسی اولیه کد
    const initialLexical = checkLexical(code);

    const initialSyntax = initialLexical.valid ? checkSyntax(code) : null; //اگر خطای لغوی داشته باشد، بررسی نحوی انجام نمی‌شود و مقدار initialSyntax برابر null خواهد بود

    // 2. اصلاح خودکار با ESLint
    let baseCode = code;

    let eslintChanged = false;

    if (initialLexical.valid && initialSyntax.valid) {
      const eslintResult = await autoFixSemantic(code);

      baseCode = eslintResult.code;

      eslintChanged = eslintResult.changed; //اگر کد خطای لغوی یا نحوی داشته باشد، ESLint در این مرحله اجرا نمی‌شود؛ چون هنوز ساختار کد معتبر نیست
    }

    // 3. بررسی مجدد بعد از ESLint
    const currentLexical = checkLexical(baseCode);
    //می‌خواهیم مطمئن شویم نسخه‌ای که برای Qwen ارسال می‌کنیم از نظر ساختاری قابل بررسی است
    const currentSyntax = currentLexical.valid ? checkSyntax(baseCode) : null;

    // 4. جمع آوری خطاها برای Qwen
    const diagnostics = [];

    if (!currentLexical.valid) {
      diagnostics.push({
        category: "lexical",
        ...currentLexical.error,
      });
    } else if (!currentSyntax.valid) {
      diagnostics.push({
        category: "syntax",
        ...currentSyntax.error,
      });
    } else {
      const semantic = await checkSemantic(baseCode);

      diagnostics.push(
        ...semantic.diagnostics.map((item) => ({
          category: "eslint",
          ...item,
        })),
      );
    }

    // 5. ارسال کد برای اصلاح با Qwen
    const aiResult = await repairCodeWithOllama(baseCode, diagnostics);

    // 6. بررسی کد تولیدشده توسط هوش مصنوعی
    const candidate = aiResult.fixedCode;

    const candidateLexical = checkLexical(candidate); // دوباره چک میکنیم که کد اصلاح شده ارور جدیدی دارد ؟

    const candidateSyntax = candidateLexical.valid
      ? checkSyntax(candidate)
      : null;

    // کد اولیه ESLint، گزینه جایگزین امن است
    let finalCode = baseCode;

    let candidateAccepted = false;

    // فقط اگر کاندید از لحاظ ساختاری معتبر باشد
    // آن را برای مراحل بعدی قبول می کنیم
    if (
      //این کار مانع پذیرفته‌شدن یک پاسخ خالی به‌عنوان کد اصلاح‌شده می‌شود
      typeof candidate === "string" &&
      candidate.trim().length > 0 &&
      candidateLexical.valid &&
      candidateSyntax.valid
    ) {
      // 7. یک دور Autofix نهایی با ESLint
      const finalESLint = await autoFixSemantic(candidate);

      const finalCandidate = finalESLint.code;

      // اعتبارسنجی پس از آخرین اصلاح
      const finalLexical = checkLexical(finalCandidate);

      const finalSyntax = finalLexical.valid
        ? checkSyntax(finalCandidate)
        : null;

      if (finalLexical.valid && finalSyntax.valid) {
        finalCode = finalCandidate;

        candidateAccepted = true;
      }
    }

    // 8. بررسی نهایی نسخه انتخاب شده
    const finalLexical = checkLexical(finalCode);

    const finalSyntax = finalLexical.valid ? checkSyntax(finalCode) : null;

    let finalSemantic = {
      checked: false,
      valid: null,
      diagnostics: [],
    };

    if (finalLexical.valid && finalSyntax.valid) {
      finalSemantic = await checkSemantic(finalCode);
    }

    // 9. پاسخ نهایی
    return res.json({
      originalCode: code,

      fixedCode: finalCode, //کد پیشنهادی اصلاح‌شده

      changed: finalCode !== code, //	آیا کد تغییر کرده است

      eslintChanged, // آیا ESLint تغییری ایجاد کرده است

      ai: {
        summary: aiResult.summary, //خلاصه اصلاحات Qwen

        changes: aiResult.changes,

        needsReview: aiResult.needsReview, //	آیا بازبینی دستی لازم است
      },

      validation: {
        lexical: finalLexical.valid,

        syntax: finalLexical.valid ? finalSyntax.valid : false,

        semantic: finalSemantic.valid,

        remainingDiagnostics: finalSemantic.diagnostics,
      },

      candidateAccepted, //آیا نسخه پیشنهادی Qwen پذیرفته شده است
    });
  } catch (error) {
    console.error("Code Fix Error:", error);

    return res.status(503).json({
      error: "Code fixing failed.",

      details: error.message,
    });
  }
});

// اجرای سرور
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
