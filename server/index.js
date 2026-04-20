const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  pingInterval: 25000,
  pingTimeout: 60000
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 使用绝对路径，确保无论从哪里启动服务器都能找到静态文件
const publicPath = path.join(__dirname, 'public');
const uploadsPath = path.join(__dirname, 'uploads');

app.use(express.static(publicPath));
app.use('/uploads', express.static(uploadsPath));

// 火山引擎 (即梦AI 4.6) 配置
const VOLC_API_HOST = 'https://visual.volcengineapi.com';
const JIMENG_REQ_KEY = 'jimeng_seedream46_cvtob';

// 注意：CV 接口通常需要 AK/SK 签名，如果您有 Access Key 和 Secret Key，请在这里填写
const VOLC_AK = process.env.VOLC_AK || '';
const VOLC_SK = process.env.VOLC_SK || '';

// 火山引擎 V4 签名实现 (CV 专用)
function sign(options) {
  const { method, path, query, headers, bodyString, ak, sk, region, service } = options;
  const datetime = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
  const date = datetime.substring(0, 8);
  
  headers['x-date'] = datetime;
  headers['host'] = 'visual.volcengineapi.com';
  headers['x-content-sha256'] = crypto.createHash('sha256').update(bodyString).digest('hex');

  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map(key => `${key.toLowerCase()}:${headers[key].trim()}`)
    .join('\n') + '\n';
  
  const signedHeaders = Object.keys(headers)
    .sort()
    .map(key => key.toLowerCase())
    .join(';');

  const canonicalQueryString = Object.keys(query)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`)
    .join('&');

  const canonicalRequest = [
    method.toUpperCase(),
    path,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    headers['x-content-sha256']
  ].join('\n');

  const stringToSign = [
    'HMAC-SHA256',
    datetime,
    `${date}/${region}/${service}/request`,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n');

  const kDate = crypto.createHmac('sha256', sk).update(date).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
  const kSigning = crypto.createHmac('sha256', kService).update('request').digest();
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  headers['Authorization'] = `HMAC-SHA256 Credential=${ak}/${date}/${region}/${service}/request, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function promptByStyle(style) {
  if (style === 'ink') {
    return '中国水墨风格，保留人物五官、姿态和场景构图，整体弱风格化，尽量保持背景一致。';
  }
  // 默认网红日漫风格
  return '网红日漫写真风格，保留人物五官、姿态和场景构图，整体弱风格化，尽量保持背景一致。';
}

async function requestVolcCv(action, payload, timeout = 45000) {
  const query = {
    Action: action,
    Version: '2022-08-31'
  };
  const headers = {
    'Content-Type': 'application/json'
  };
  const bodyString = JSON.stringify(payload);

  sign({
    method: 'POST',
    path: '/',
    query,
    headers,
    bodyString,
    ak: VOLC_AK,
    sk: VOLC_SK,
    region: 'cn-north-1',
    service: 'cv'
  });

  const resp = await axios.post(
    `${VOLC_API_HOST}?Action=${action}&Version=2022-08-31`,
    bodyString,
    { headers, timeout }
  );
  return resp.data;
}

// AI 生成接口 (即梦AI4.6: 提交任务 + 轮询结果)
app.post('/ai-generate', async (req, res) => {
  const { style, photoUri, base64Image: clientBase64 } = req.body;
  try {
    if (!VOLC_AK || !VOLC_SK) {
      return res.status(500).json({
        success: false,
        message: "服务端未配置火山引擎 AK/SK（请设置环境变量 VOLC_AK / VOLC_SK）"
      });
    }

    let imageUrl = '';

    // 优先使用已经是公网可访问的 URL（扫码上传后的常见场景）
    if (photoUri && photoUri.startsWith('http')) {
      imageUrl = photoUri;
    }

    // 如果客户端传的是 base64（本地相册选择），临时保存到 uploads 再转成 URL
    if (!imageUrl && clientBase64) {
      const fileName = `${Date.now()}_input.jpg`;
      const filePath = path.join(__dirname, 'uploads', fileName);
      fs.writeFileSync(filePath, Buffer.from(clientBase64, 'base64'));

      const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
      imageUrl = `${proto}://${req.headers.host}/uploads/${fileName}`;
    }

    if (!imageUrl) {
      return res.status(400).json({ success: false, message: "未找到上传的照片" });
    }

    const prompt = promptByStyle(style);
    console.log(`提交即梦4.6任务: style=${style || 'default'}, imageUrl=${imageUrl}`);

    // 1) 提交任务
    const submitPayload = {
      req_key: JIMENG_REQ_KEY,
      image_urls: [imageUrl],
      prompt,
      force_single: true
    };
    const submitData = await requestVolcCv('CVSync2AsyncSubmitTask', submitPayload, 45000);
    const taskId = submitData?.data?.task_id;
    if (submitData?.code !== 10000 || !taskId) {
      console.error("即梦提交任务失败:", JSON.stringify(submitData));
      return res.status(500).json({
        success: false,
        message: submitData?.message || "即梦任务提交失败",
        raw: submitData
      });
    }

    // 2) 轮询结果
    const maxPollCount = 30; // 约 60 秒
    for (let i = 0; i < maxPollCount; i++) {
      const pollPayload = {
        req_key: JIMENG_REQ_KEY,
        task_id: taskId,
        req_json: JSON.stringify({ return_url: true })
      };
      const pollData = await requestVolcCv('CVSync2AsyncGetResult', pollPayload, 30000);
      const status = pollData?.data?.status;
      const imageUrlResult = pollData?.data?.image_urls?.[0];

      if (status === 'done') {
        if (pollData?.code === 10000 && imageUrlResult) {
          console.log("即梦4.6生成成功！");
          return res.json({ success: true, url: imageUrlResult });
        }
        console.error("即梦任务完成但失败:", JSON.stringify(pollData));
        return res.status(500).json({
          success: false,
          message: pollData?.message || "即梦任务处理失败",
          raw: pollData
        });
      }

      if (status === 'expired' || status === 'not_found') {
        console.error("即梦任务状态异常:", JSON.stringify(pollData));
        return res.status(500).json({
          success: false,
          message: `即梦任务状态异常: ${status}`,
          raw: pollData
        });
      }

      await sleep(2000);
    }

    return res.status(504).json({
      success: false,
      message: "即梦任务超时，请重试"
    });
  } catch (error) {
    const errorData = error.response?.data;
    console.error("风格化失败详情:", JSON.stringify(errorData) || error.message);
    
    // 如果是 401/403，说明签名或 AK/SK 还是有问题
    if (error.response?.status === 401 || error.response?.status === 403) {
      return res.status(error.response.status).json({ 
        success: false, 
        message: `鉴权失败 (${error.response.status})：请检查 AK/SK 是否正确，并确保在控制台开通了“智能绘图”服务。`,
        detail: errorData
      });
    }

    res.status(500).json({ 
      success: false, 
      message: errorData?.message || "风格化请求发送失败: " + error.message,
      detail: errorData
    });
  }
});

const storage = multer.diskStorage({
  destination: 'server/uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.post('/upload', upload.single('photo'), (req, res) => {
  if (req.file) {
    const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    const photoUrl = `${proto}://${req.headers.host}/uploads/${req.file.filename}`;
    const deviceId = req.body.deviceId;
    console.log(`收到图片: ${photoUrl}, 发送给设备: ${deviceId}`);
    io.emit(`upload_success_${deviceId}`, { photoUrl, photoId: Math.floor(Math.random() * 10000).toString().padStart(4, '0') });
    res.json({ success: true, url: photoUrl });
  } else {
    res.status(400).json({ success: false });
  }
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
