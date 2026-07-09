import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

function parseRobustJson(str: string): any {
  let cleaned = str.trim();
  
  if (cleaned.startsWith("```")) {
    const firstNewline = cleaned.indexOf("\n");
    if (firstNewline !== -1) {
      cleaned = cleaned.substring(firstNewline).trim();
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.substring(0, cleaned.length - 3).trim();
    }
  }
  
  try {
    return JSON.parse(cleaned);
  } catch (err: any) {
    console.warn("Standard JSON parse failed, trying custom fixes:", err.message);
    try {
      let inString = false;
      let escaped = false;
      let fixed = "";
      for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];
        if (char === '"' && !escaped) {
          inString = !inString;
        }
        if (inString) {
          if (char === '\n') {
            fixed += '\\n';
          } else if (char === '\r') {
            fixed += '\\r';
          } else {
            fixed += char;
          }
        } else {
          fixed += char;
        }
        if (char === '\\' && !escaped) {
          escaped = true;
        } else {
          escaped = false;
        }
      }
      return JSON.parse(fixed);
    } catch (innerErr) {
      throw err;
    }
  }
}

function extractHtmlBlock(text: string): string | null {
  if (!text) return null;
  
  // Helper to clean nested markdown formatting blocks
  const cleanFences = (code: string): string => {
    let cleaned = code.trim();
    while (true) {
      let changed = false;
      const startMatch = cleaned.match(/^\s*```[a-zA-Z0-9+#-]*[\r\n]*/i);
      if (startMatch) {
        cleaned = cleaned.substring(startMatch[0].length).trim();
        changed = true;
      }
      const endMatch = cleaned.match(/[\r\n]*```\s*$/);
      if (endMatch) {
        cleaned = cleaned.substring(0, cleaned.length - endMatch[0].length).trim();
        changed = true;
      }
      if (!changed) break;
    }
    return cleaned;
  };

  // 1. Try to find the start of ```html
  const htmlStartIdx = text.toLowerCase().indexOf("```html");
  if (htmlStartIdx !== -1) {
    // Find the newline after ```html
    const afterTag = text.substring(htmlStartIdx + 7);
    const firstNewline = afterTag.search(/[\r\n]/);
    let startContentIdx = htmlStartIdx + 7;
    if (firstNewline !== -1) {
      startContentIdx = htmlStartIdx + 7 + firstNewline + 1;
    }
    
    // Find closing ``` after the start of content
    const contentSub = text.substring(startContentIdx);
    let closingIdx = contentSub.indexOf("```");
    if (closingIdx === 0 || (closingIdx !== -1 && /^\s*```[a-zA-Z0-9+#-]/i.test(contentSub.substring(closingIdx)))) {
      closingIdx = contentSub.lastIndexOf("```");
    }
    let code = closingIdx !== -1 ? contentSub.substring(0, closingIdx).trim() : contentSub.trim();
    
    // Handle unclosed tags for truncated output
    const lowerCode = code.toLowerCase();
    if (lowerCode.includes("<script") && !lowerCode.includes("</script>")) {
      code += "\n</script>\n</body>\n</html>";
    } else if (lowerCode.includes("<html") && !lowerCode.includes("</html>")) {
      code += "\n</body>\n</html>";
    }
    return cleanFences(code);
  }
  
  // 2. Try generic ``` start if there is no ```html, but there is ```
  const genericStartIdx = text.indexOf("```");
  if (genericStartIdx !== -1) {
    const afterTag = text.substring(genericStartIdx + 3);
    const firstNewline = afterTag.search(/[\r\n]/);
    let startContentIdx = genericStartIdx + 3;
    if (firstNewline !== -1) {
      startContentIdx = genericStartIdx + 3 + firstNewline + 1;
    }
    const contentSub = text.substring(startContentIdx);
    const closingIdx = contentSub.indexOf("```");
    let codeContent = closingIdx !== -1 ? contentSub.substring(0, closingIdx).trim() : contentSub.trim();
    
    if (codeContent.toLowerCase().includes("<html") || codeContent.toLowerCase().includes("<!doctype") || codeContent.toLowerCase().includes("<body") || codeContent.toLowerCase().includes("<script")) {
      const lowerCode = codeContent.toLowerCase();
      if (lowerCode.includes("<script") && !lowerCode.includes("</script>")) {
        codeContent += "\n</script>\n</body>\n</html>";
      } else if (lowerCode.includes("<html") && !lowerCode.includes("</html>")) {
        codeContent += "\n</body>\n</html>";
      }
      return cleanFences(codeContent);
    }
  }
  
  // 3. Fallback: if no markdown backticks, but contains html-like markers
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("<!doctype") || lower.includes("<html") || lower.includes("<body") || lower.includes("<script") || lower.includes("css") || lower.includes("canvas")) {
    let code = trimmed;
    if (lower.includes("<script") && !lower.includes("</script>")) {
      code += "\n</script>\n</body>\n</html>";
    } else if (lower.includes("<html") && !lower.includes("</html>")) {
      code += "\n</body>\n</html>";
    }
    return cleanFences(code);
  }
  
  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API endpoint to generate themes
  app.post("/api/generate_themes", async (req, res) => {
    try {
      const { prompt, systemInstruction, apiKeyPrimary, apiKeySecondary, secondaryModel, secondaryProviderUrl, secondaryProviderKey, existingGames, aiParams } = req.body;

      const gamesListStr = existingGames && existingGames.length > 0 ? existingGames.join(', ') : 'my game studio';

      // We expand the themePrompt to request metadata (including idea, file structure, file logic, file purposes) and readme markdown
      const themePrompt = `You are a professional game designer.
For the requested game idea: "${prompt}", design 4 visually unique layout styles:
- Neon (Cyberpunk, neon glowing colors, high energy)
- Clean (Minimalist, flat colors, modern fonts, ample spacing)
- Light (Bright airy colors, friendly gradients, elegant visual details)
- Dark (Atmospheric, deep dark hues, sleek panels)

Each style must be a fully playable, functional single-file HTML/CSS/JS game that can run standalone.

In addition, propose a full multi-file project architecture for this game if it were to be built as a complete professional application.
Output a JSON object matching the requested schema with:
- "Neon": Standalone HTML code
- "Clean": Standalone HTML code
- "Light": Standalone HTML code
- "Dark": Standalone HTML code
- "metadata": An object containing:
    - "name": A beautiful English name for the game
    - "description": Short, catchy summary of the game
    - "idea": Detailed explanation of game mechanics, ideas, scoring, rules, and levels
    - "fileStructure": Array of proposed file paths (e.g. ["index.html", "metadata.json", "readme.md", "js/game.js", "css/style.css"])
    - "filesLogic": Array of objects mapping each proposed file path to its detailed logic and purpose
- "readme": A beautiful README.md content detailing files, development instructions, idea, and changelog`;

      const secParams = aiParams?.secondary || {};
      const temperature = secParams.temperature !== undefined ? secParams.temperature : 0.7;
      const max_completion_tokens = secParams.maxCompletionTokens !== undefined ? secParams.maxCompletionTokens : 8192;
      const top_p = secParams.topP !== undefined ? secParams.topP : 1.0;
      const reasoning_effort = secParams.reasoningEffort || "medium";
      const stop = secParams.stop || null;

      if (secondaryProviderUrl && secondaryProviderKey && secondaryModel) {
        console.log(`Using custom secondary provider: ${secondaryProviderUrl} with model: ${secondaryModel}`);
        const url = secondaryProviderUrl.endsWith('/') ? `${secondaryProviderUrl}chat/completions` : `${secondaryProviderUrl}/chat/completions`;

        const responseFetch = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${secondaryProviderKey}`
          },
          body: JSON.stringify({
            model: secondaryModel,
            messages: [
              { role: 'system', content: 'You are a helpful UI generator. You must output valid raw JSON.' },
              { role: 'user', content: themePrompt }
            ],
            temperature: temperature,
            max_completion_tokens: max_completion_tokens,
            top_p: top_p,
            ...(secondaryModel?.toLowerCase().includes('o1') || secondaryModel?.toLowerCase().includes('o3') || secondaryModel?.toLowerCase().includes('reasoning') || secondaryModel?.toLowerCase().includes('r1') ? { reasoning_effort } : {}),
            stop: stop
          })
        });

        if (!responseFetch.ok) {
          const errText = await responseFetch.text();
          throw new Error(`Secondary provider returned error: ${responseFetch.status} - ${errText}`);
        }

        const resultJson = (await responseFetch.json()) as any;
        const text = resultJson.choices?.[0]?.message?.content || '{}';

        let rawResponse = text.trim();
        const parsedValue = parseRobustJson(rawResponse);
        return res.json(parsedValue);
      }

      const apiKeyValue = apiKeySecondary || apiKeyPrimary || process.env.GEMINI_API_KEY;
      if (!apiKeyValue) {
        return res.status(400).json({ error: "Missing Gemini API Key." });
      }

      const tempAi = new GoogleGenAI({
        apiKey: apiKeyValue,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });

      const modelToUse = secondaryModel || "gemini-2.5-flash";
      console.log(`Using theme model: ${modelToUse}`);
      
      const result = await tempAi.models.generateContent({
        model: modelToUse,
        contents: themePrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              Neon: { type: Type.STRING },
              Clean: { type: Type.STRING },
              Light: { type: Type.STRING },
              Dark: { type: Type.STRING },
              metadata: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  idea: { type: Type.STRING },
                  fileStructure: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  filesLogic: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        path: { type: Type.STRING },
                        logic: { type: Type.STRING },
                        purpose: { type: Type.STRING }
                      },
                      required: ["path", "logic", "purpose"]
                    }
                  }
                },
                required: ["name", "description", "idea", "fileStructure", "filesLogic"]
              },
              readme: { type: Type.STRING }
            },
            required: ["Neon", "Clean", "Light", "Dark", "metadata", "readme"]
          },
          temperature: temperature,
          maxOutputTokens: max_completion_tokens,
          topP: top_p,
          stopSequences: stop ? [stop] : undefined
        }
      });

      let rawResponse = (result.text || "{}").trim();
      const parsedValue = parseRobustJson(rawResponse);
      res.json(parsedValue);
    } catch (e: any) {
      console.error("Theme generation fail:", e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, code, systemInstruction, customModel, apiKeyPrimary, apiKeySecondary, providerBaseUrl, providerApiKey, aiParams, mode, files, availableModels } = req.body;

      // Get last user message text
      const userMessages = messages.filter((m: any) => m.role === 'user');
      const lastUserText = userMessages.length > 0 ? userMessages[userMessages.length - 1].text : "";

      const codeKeywords = [
        'tạo', 'làm', 'made', 'create', 'code', 'mã', 'script', 'lỗi', 'error', 'warning', 'invaild', 'sửa', 'fix', 'game', 'build', 'run', 'chạy', 'gameplay', 'failed', 'uncaught', 'theme', 'design', 'giao diện', 'apply',
        'xấu', 'hãy', 'đẹp', 'tốt', 'ok', 'ổn', 'ổm', 'ấy', 'lại', 'ko', 'không', 'đc', 'được', 'thấy', 'hiện', 'có', 'thêm', 'add', 'kết', 'nối', 'cao', 'to', 'bé', 'thấp', 'hạ', 'tăng', 'giảm', 'màu', 'còn', 'hơn', 'chút', 'nữa',
        'make', 'bad', 'ugly', 'beautiful', 'nice', 'good', 'fine', 'okay', 'well', 'redo', 'again', 'no', 'not', 'can', 'cant', 'see', 'show', 'have', 'has', 'high', 'tall', 'big', 'small', 'low', 'short', 'lower', 'increase', 'decrease', 'color', 'still', 'more', 'further', 'little', 'bit', 'add', 'connect', 'new', 'button', 'text', 'style', 'background'
      ];
      const isCodingRequest = codeKeywords.some(kw => lastUserText.toLowerCase().includes(kw));

      // Detect media keywords in prompt
      const lowerPrompt = lastUserText.toLowerCase();
      const hasImageGroup1 = lowerPrompt.includes('tạo') || lowerPrompt.includes('làm') || lowerPrompt.includes('create') || lowerPrompt.includes('make');
      const hasImageGroup2 = lowerPrompt.includes('ảnh') || lowerPrompt.includes('tranh') || lowerPrompt.includes('picture') || lowerPrompt.includes('image');
      const isImageRequest = hasImageGroup1 && hasImageGroup2;

      const isMusicRequest = lowerPrompt.includes('nhạc') || lowerPrompt.includes('sound') || lowerPrompt.includes('music');

      const primParams = aiParams?.primary || {};
      const enableThinking = primParams.CanThink === true;

      let baseInstruction = systemInstruction || "";
      if (enableThinking) {
        let thinkingDirective = `[USER REQUESTED MANDATE FOR EMULATING THINKING PROCESS]:
Bạn PHẢI tuân thủ tuyệt đối cấu trúc phản hồi dưới đây:

PHẦN 1: BẮT BUỘC XUẤT TRONG THẺ <think>...</think>
Ngay khi nhận được tin nhắn, hành động ĐẦU TIÊN của bạn là mở thẻ <think> và thực hiện phân tích:
- TRƯỜNG HỢP 1 (User yêu cầu viết CODE/DỰ ÁN):
  + Phân tích chi tiết ý tưởng thiết kế, logic thuật toán.
  + Định hình cấu trúc cây thư mục, cấu trúc toàn bộ các file liên quan.
  + Đọc hiểu sâu sắc nội dung readme.md được cấp (nếu có) để lên kế hoạch triển khai.
- TRƯỜNG HỢP 2 (User chỉ trò chuyện/hỏi đáp KHÔNG CÓ CODE):
  + Phân tích tâm lý: "Người dùng đang có <thái độ gì> đối với câu hỏi này."
  + Lên kế hoạch phản hồi nháp: "Mình nên đáp lại câu này bằng nội dung: '...' với <thái độ gì>."
  + Tự phản biện (Self-Correction): "Để mình xem lại mình đáp thế đã ổn chưa? Nếu chưa ổn, mình nên sửa lại câu đáp là: '...'"

PHẦN 2: KẾT THÚC THÌNK VÀ ĐÁP CHÍNH THỨC
Ngay sau dấu đóng thẻ </think>, bạn lập tức chuyển sang chế độ xuất câu trả lời chính thức cho người dùng. 
- Nếu là code: Xuất full mã nguồn chi tiết, không cắt xén, không rút gọn (bao gồm đầy đủ các thẻ lệnh như [!createnew file:path] hay [!editfile:path] nếu ở chế độ VFS).
- Nếu là trò chuyện: Xuất câu nói đã được tinh chỉnh hoàn hảo sau bước tự phản biện.

[STRICT ENFORCEMENT RULE]
- Mọi suy nghĩ, phân tích, nháp, sửa sai PHẢI nằm gọn bên trong <think> và </think>.
- Không được xuất bất kỳ từ ngữ suy nghĩ nào ra ngoài phạm vi thẻ này.
- Khi xuất xong </think>, xem như lệnh [stop:think] đã được kích hoạt ngầm, chuyển thẳng sang phản hồi chính thức.`;

        if (lastUserText.length > 200) {
          thinkingDirective += `\n- [QUAN TRỌNG]: Khi đang bật think và đã ngắt bằng [stop:think], vì prompt của người dùng dài hơn 200 ký tự (${lastUserText.length} ký tự), bạn PHẢI tự động kích hoạt lại [enble:think] để nghĩ tiếp (phân tích sâu thêm) ngay trong thẻ <think>, sau đó mới tắt bằng [stop:think] và đóng thẻ </think> để xuất câu trả lời chính thức.`;
        }

        thinkingDirective += `\n\n`;
        baseInstruction = thinkingDirective + baseInstruction;
      }

      if (mode === "full") {
        // Prepend multi-file splitting command for VFS mode to ensure clean, modular projects
        const multiFileMandate = `[PROJECT VFS MANDATE: You are developing a professional application in Full Mode (VFS). Splitting your code into multiple separate, modular files (e.g. separate CSS styles, separate Javascript files for logic, configs, utils, assets, or components) is an absolute requirement. CREATE AS MANY FILES AS POSSIBLE TO ORGANIZE THE PROJECT. NEVER bundle everything into a single index.html file! Càng tạo nhiều file riêng biệt để phân chia cấu trúc dự án càng tốt! (Hãy luôn luôn ưu tiên chia nhỏ dự án thành nhiều file riêng biệt nhất có thể)]\n\n`;
        baseInstruction = multiFileMandate + baseInstruction;

        const filePaths = files ? Object.keys(files) : [];
        const readmeContent = files && files["readme.md"] ? files["readme.md"] : "(Empty readme.md)";
        const metadataContent = files && files["metadata.json"] ? files["metadata.json"] : "";

        let structureStr = `Cấu trúc thư mục hiện tại của dự án (Chỉ gồm danh sách đường dẫn file, nội dung các file bị ẩn để tiết kiệm token):\n`;
        filePaths.forEach(path => {
          structureStr += `- ${path}\n`;
        });

        structureStr += `\nNội dung file readme.md:\n--- FILE: readme.md ---\n${readmeContent}\n--- END FILE: readme.md ---\n`;
        if (metadataContent && metadataContent.trim() !== "" && metadataContent.trim() !== "{}") {
          structureStr += `\nNội dung file metadata.json:\n--- FILE: metadata.json ---\n${metadataContent}\n--- END FILE: metadata.json ---\n`;
        }

        structureStr += `\nLƯU Ý QUAN TRỌNG (Cơ chế tiết kiệm Token - Read-On-Demand):\n`;
        structureStr += `Để tiết kiệm token tối đa, nội dung của các file khác trong danh sách trên hiện đang được ẩn. Bạn KHÔNG ĐƯỢC đoán mò code bên trong.\n`;
        structureStr += `Nếu bạn cần đọc nội dung của một hoặc nhiều file cụ thể để hiểu hoặc chỉnh sửa, hãy viết lệnh sau tại câu trả lời của bạn:\n`;
        structureStr += `[!readfile:đường_dẫn_file]\n`;
        structureStr += `Ví dụ: [!readfile:js/game.js]\n`;
        structureStr += `Hệ thống sẽ tự động phát hiện lệnh này, đọc file đó và gửi lại nội dung cho bạn trong lượt kế tiếp. Sau khi nhận được nội dung, bạn mới thực hiện chỉnh sửa bằng các cú pháp [!editfile:đường_dẫn_file] hoặc [!createnew file:đường_dẫn_file].\n`;

        baseInstruction += `\n\n${structureStr}`;
      } else {
        baseInstruction += `\n\nCurrent game code:\n${code ? `\`\`\`html\n${code}\n\`\`\`` : "None"}`;
      }

      const temperature = primParams.temperature !== undefined ? primParams.temperature : 1.0;
      const max_completion_tokens = primParams.maxCompletionTokens !== undefined ? primParams.maxCompletionTokens : 8192;
      const top_p = primParams.topP !== undefined ? primParams.topP : 1.0;
      const reasoning_effort = primParams.reasoningEffort || "medium";
      const stop = primParams.stop || null;

      // 1. Check if we need to call a custom provider
      if (providerBaseUrl && providerApiKey) {
        console.log(`Using custom provider: ${providerBaseUrl} with model: ${customModel}`);
        
        const historyMessages = messages.map((m: any) => {
          let hasImage = false;
          const contentArray: any[] = [];
          
          if (m.text) {
            contentArray.push({ type: "text", text: m.text });
          }
          
          let plainTextContent = m.text || '';
          
          if (m.attachments && m.attachments.length > 0) {
            m.attachments.forEach((a: any) => {
              const match = a.dataUrl && a.dataUrl.match(/^data:([^;]+);base64,(.*)$/);
              if (match) {
                const mimeType = match[1];
                if (mimeType.startsWith('image/')) {
                  hasImage = true;
                  contentArray.push({
                    type: "image_url",
                    image_url: {
                      url: a.dataUrl
                    }
                  });
                } else {
                  plainTextContent += `\n[Attached File: ${a.name}]\n${a.dataUrl}`;
                }
              } else {
                plainTextContent += `\n[Attached File: ${a.name}]`;
              }
            });
          }
          
          return {
            role: m.role === 'model' ? 'assistant' : 'user',
            content: hasImage ? contentArray : plainTextContent
          };
        });

        const formattedMessages = [
          { role: 'system', content: baseInstruction },
          ...historyMessages
        ];



        let url = providerBaseUrl;
        if (isImageRequest || isMusicRequest) {
          // "bỏ /chat/completions khi tạo ảnh, nhạc"
          url = url.replace(/\/chat\/completions\/?$/, '');
          url = url.replace(/\/$/, '');
        } else {
          url = providerBaseUrl.endsWith('/') ? `${providerBaseUrl}chat/completions` : `${providerBaseUrl}/chat/completions`;
        }

        const responseFetch = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${providerApiKey}`
          },
          body: JSON.stringify({
            model: customModel,
            messages: formattedMessages,
            temperature: temperature,
            max_completion_tokens: max_completion_tokens,
            top_p: top_p,
            ...(customModel?.toLowerCase().includes('o1') || customModel?.toLowerCase().includes('o3') || customModel?.toLowerCase().includes('reasoning') || customModel?.toLowerCase().includes('r1') ? { reasoning_effort } : {}),
            stop: stop
          })
        });

        if (!responseFetch.ok) {
          const errText = await responseFetch.text();
          throw new Error(`Custom provider returned error: ${responseFetch.status} - ${errText}`);
        }

        const resultJson = (await responseFetch.json()) as any;
        const text = resultJson.choices?.[0]?.message?.content || '';

        const extractedCode = extractHtmlBlock(text);

        return res.json({ text, code: extractedCode, usedModel: customModel, isCodingRequest });
      }

      // 2. Fall back to standard Gemini provider
      const apiKeyValue = apiKeyPrimary || process.env.GEMINI_API_KEY;
      if (!apiKeyValue) {
        return res.status(401).json({ error: "Missing Gemini API Key. Please provide one in the Settings panel." });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKeyValue,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });

      const modelToUse = customModel || "gemini-2.5-flash";
      console.log(`Using primary model: ${modelToUse}`);
      
      const matchedModelObj = Array.isArray(availableModels) 
        ? availableModels.find((m: any) => m.name === modelToUse || `${m.providerId}:${m.name}` === modelToUse)
        : null;

      let isImageModel = false;
      let isMusicModel = false;

      if (matchedModelObj) {
        const taskType = matchedModelObj.taskType || "";
        if (taskType.toLowerCase() === "text generation") {
          isImageModel = false;
          isMusicModel = false;
        } else {
          isImageModel = taskType.toLowerCase().includes('image') || modelToUse.toLowerCase().includes('imagen') || (isImageRequest && !taskType.toLowerCase().includes('text'));
          isMusicModel = taskType.toLowerCase().includes('audio') || taskType.toLowerCase().includes('speech') || modelToUse.toLowerCase().includes('lyria') || isMusicRequest;
        }
      } else {
        isImageModel = modelToUse.toLowerCase().includes('imagen') || modelToUse.toLowerCase().includes('image-generation') || (isImageRequest && !modelToUse.toLowerCase().includes('flash') && !modelToUse.toLowerCase().includes('pro'));
        isMusicModel = modelToUse.toLowerCase().includes('lyria') || modelToUse.toLowerCase().includes('music-generation') || isMusicRequest;
      }

      // format history properly with correct Part types for @google/genai (handling inlineData for attachments)
      const contents = messages.map((m: any) => {
        const parts: any[] = [];
        let text = m.text || '';
        
        if (m.attachments && m.attachments.length > 0) {
          m.attachments.forEach((a: any) => {
            const match = a.dataUrl && a.dataUrl.match(/^data:([^;]+);base64,(.*)$/);
            if (match) {
              const mimeType = match[1];
              const base64Data = match[2];
              
              if (mimeType.startsWith('image/') || mimeType.startsWith('audio/')) {
                parts.push({
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                  }
                });
              } else {
                text += `\n[Attached File: ${a.name}]\n${a.dataUrl}`;
              }
            } else {
              text += `\n[Attached File: ${a.name}]`;
            }
          });
        }

        if (text) {
          parts.unshift({ text: text });
        }

        if (parts.length === 0) {
          parts.push({ text: '' });
        }

        return {
          role: m.role === 'model' ? 'model' : 'user',
          parts: parts
        };
      });

      const result = await ai.models.generateContent({
        model: modelToUse,
        contents: contents,
        config: {
          systemInstruction: baseInstruction,
          temperature: temperature,
          maxOutputTokens: max_completion_tokens,
          topP: top_p,
          stopSequences: stop ? [stop] : undefined,
          responseModalities: isMusicModel ? ['AUDIO'] : undefined,
          imageConfig: isImageModel ? { aspectRatio: "1:1" } : undefined
        }
      });
      
      let responseText = result.text || '';
      let finalAttachments: { name: string; dataUrl: string }[] = [];
      
      // Try to extract image or audio attachments from inlineData
      const parts = result.candidates?.[0]?.content?.parts;
      if (parts) {
        let imgCount = 1;
        let audioCount = 1;
        for (const part of parts) {
          if (part.inlineData) {
            const mimeType = part.inlineData.mimeType;
            const base64Data = part.inlineData.data;
            const dataUrl = `data:${mimeType};base64,${base64Data}`;
            
            if (mimeType.startsWith('image/')) {
              finalAttachments.push({
                name: `generated_image_${imgCount++}.png`,
                dataUrl: dataUrl
              });
              responseText += `\n\n![Generated Image](${dataUrl})`;
            } else if (mimeType.startsWith('audio/')) {
              finalAttachments.push({
                name: `generated_music_${audioCount++}.wav`,
                dataUrl: dataUrl
              });
            }
          }
        }
      }

      const extractedCode = extractHtmlBlock(responseText);

      res.json({ text: responseText, code: extractedCode, usedModel: modelToUse, isCodingRequest, attachments: finalAttachments.length > 0 ? finalAttachments : undefined });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
