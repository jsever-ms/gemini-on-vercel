// 文件路径: /api/chat.js
const axios = require('axios');

// 从Vercel的环境变量中读取API Key
const API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = `https://generativelan.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`;

// Vercel函数的入口
// req = request (请求), res = response (响应)
module.exports = async (req, res) => {
  // 1. 检查请求方法是否为 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 2. 从请求体中获取聊天记录
    const { messages } = req.body;
    if (!messages) {
      return res.status(400).json({ error: 'Missing "messages" in request body' });
    }

    // 3. 调用 Gemini API
    const response = await axios.post(GEMINI_API_URL, {
      contents: messages
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    // 4. 处理并返回Gemini的响应
    if (response.data.candidates && response.data.candidates.length > 0) {
      const aiMessage = {
        role: 'model',
        parts: response.data.candidates[0].content.parts
      };
      // 成功时，返回200状态码和AI消息
      res.status(200).json({ success: true, aiMessage: aiMessage });
    } else {
      const blockReason = response.data.promptFeedback?.blockReason || '未知原因';
      res.status(500).json({ success: false, error: `AI因内容安全策略拒绝回答: ${blockReason}` });
    }

  } catch (error) {
    console.error('Error calling Gemini API:', error.response ? error.response.data : error.message);
    const detail = error.response ? error.response.data?.error?.message : error.message;
    // 出错时，返回500状态码和错误详情
    res.status(500).json({ success: false, error: `请求AI失败: ${detail}` });
  }
};