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
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 使用绝对路径，确保无论从哪里启动服务器都能找到静态文件
const publicPath = path.join(__dirname, 'public');
const uploadsPath = path.join(__dirname, 'uploads');

app.use(express.static(publicPath));
app.use('/uploads', express.static(uploadsPath));

// 火山引擎 (CV 视觉智能) 配置 - 对应文档: https://www.volcengine.com/docs/86081/1660199
const CV_ENDPOINT = 'https://visual.volcengineapi.com?Action=CVProcess&Version=2022-08-31';

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

// AI 生成接口 (切换到图像风格化 CV 专用接口)
app.post('/ai-generate', async (req, res) => {
  const { style, photoUri, base64Image: clientBase64 } = req.body;
  try {
    if (!VOLC_AK || !VOLC_SK) {
      return res.status(500).json({
        success: false,
        message: "服务端未配置火山引擎 AK/SK（请设置环境变量 VOLC_AK / VOLC_SK）"
      });
    }

    let base64Image = clientBase64;

    if (!base64Image && photoUri) {
      const fileName = path.basename(decodeURIComponent(photoUri));
      const filePath = path.join(__dirname, 'uploads', fileName);
      if (fs.existsSync(filePath)) {
        const imageBuffer = fs.readFileSync(filePath);
        base64Image = imageBuffer.toString('base64');
      }
    }

    if (!base64Image) {
      return res.status(400).json({ success: false, message: "未找到上传的照片" });
    }

    // 依照您的要求，重新命名风格并配置 req_key 和 sub_req_key
    let reqKey = "";
    let subReqKey = "";

    if (style === 'ghibli') {
      // 网红日漫风格
      reqKey = "img2img_ghibli_style_usage";
    } else if (style === 'ink') {
      // 水墨风
      reqKey = "img2img_water_ink_style_usage";
    }

    console.log(`正在请求火山弱滤镜风格化 (CVProcess): 风格: ${style}, reqKey: ${reqKey}${subReqKey ? ', subReqKey: ' + subReqKey : ''}`);
    
    // 弱滤镜模式 Payload
    const payload = {
      req_key: reqKey,
      binary_data_base64: [base64Image], 
      denoising_strength: 0.1, 
      return_url: true,
      logo_info: { add_logo: false }
    };

    // 如果有 sub_req_key，则加入 payload
    if (subReqKey) {
      payload.sub_req_key = subReqKey;
    }

    const bodyString = JSON.stringify(payload);

    const query = {
      Action: 'CVProcess',
      Version: '2022-08-31'
    };

    const headers = {
      'Content-Type': 'application/json'
    };

    // 执行 V4 签名
    sign({
      method: 'POST',
      path: '/',
      query: query,
      headers: headers,
      bodyString: bodyString,
      ak: VOLC_AK,
      sk: VOLC_SK,
      region: 'cn-north-1',
      service: 'cv'
    });

    const response = await axios.post(
      `https://visual.volcengineapi.com?Action=CVProcess&Version=2022-08-31`,
      bodyString, // 必须使用签名时完全一致的字符串
      {
        headers: headers,
        timeout: 45000 
      }
    );
    
    // CV 接口返回结构适配
    if (response.data && response.data.data && response.data.data.image_urls && response.data.data.image_urls[0]) {
      console.log("AI 风格化成功！");
      res.json({ success: true, url: response.data.data.image_urls[0] });
    } else {
      console.error("火山返回原始数据:", JSON.stringify(response.data));
      res.status(500).json({ 
        success: false, 
        message: response.data.message || "火山引擎未返回有效的图片链接",
        raw: response.data 
      });
    }
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
    const photoUrl = `http://${req.headers.host}/uploads/${req.file.filename}`;
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
