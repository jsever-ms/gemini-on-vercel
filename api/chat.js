// 文件路径: /api/chat.js (改造为调用Kimi API)
const axios = require('axios');

// 从Vercel的环境变量中读取 Kimi API Key
const API_KEY = process.env.KIMI_API_KEY; 
const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

module.exports = async (req, res) => {
  // CORS 许可头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  try {
    const { messages } = req.body;
    if (!messages) {
      return res.status(400).json({ error: 'Missing "messages" in request body' });
    }

    // --- 【核心改动】适配 Kimi API 格式 ---

    // 1. Kimi 的 messages 格式为 { role: "...", content: "..." }
    //    我们需要将小程序传来的 { role: "...", parts: [{ text: "..." }] } 格式转换一下
    const kimiMessages = messages.map(msg => ({
      role: msg.role === 'model' ? 'assistant' : 'user', // Gemini用'model', Kimi用'assistant'
      content: msg.parts[0].text
    }));

    // 2. 调用 Kimi API
    const response = await axios.post(KIMI_API_URL, {
      model: "moonshot-v1-8k", // Kimi 需要指定模型
      messages: kimiMessages,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}` // Kimi 使用 Bearer Token 认证
      }
    });

    // 3. 解析 Kimi 的返回结果
    if (response.data.choices && response.data.choices.length > 0) {
      // 4. 将 Kimi 返回的格式，再转换回我们小程序需要的格式
      const aiMessage = {
        role: 'model', // 返回给小程序的 role 还是用 'model'
        parts: [{ text: response.data.choices[0].message.content }]
      };
      res.status(200).json({ success: true, aiMessage: aiMessage });
    } else {
      res.status(500).json({ success: false, error: 'Kimi未能生成有效回复' });
    }

  } catch (error) {
    console.error('Error calling Kimi API:', error.response ? error.response.data : error.message);
    const detail = error.response ? error.response.data?.error?.message : error.message;
    res.status(500).json({ success: false, error: `请求AI失败: ${detail}` });
  }
};
