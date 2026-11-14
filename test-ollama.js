
const OLLAMA_URL = "http://127.0.0.1:11434";

async function testOllama() {
    try {
        console.log("Connecting to Ollama...");

        const response = await fetch(
            `${OLLAMA_URL}/api/chat`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "qwen2.5-coder:3b",
                    messages: [
                        {
                            role: "user",
                            content: "Reply exactly: QWEN_CONNECTION_OK"
                        }
                    ],
                    stream: false
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `HTTP ${response.status}`);
        }

        console.log("Connection successful!");
        console.log(data.message.content);

    } catch (error) {
        console.error("Ollama Error:", error.message);
    }
}

testOllama();
