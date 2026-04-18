import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { SERVER_URL } from '../config';

// 我们将 AI 请求发给自己的服务器，由服务器去调用 AI
const SERVER_API_URL = `${SERVER_URL}/ai-generate`; 

/**
 * 将图片 URI 转换为 Base64 字符串 (兼容 Web 和 Native)
 */
const imageToBase64 = async (uri) => {
  try {
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          // 移除 data:image/png;base64, 前缀，火山 API 通常只需要纯 base64
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    }
  } catch (error) {
    console.error("图片转换失败:", error);
    return null;
  }
};

export const generateImage = async (photoUri, style) => {
  try {
    console.log(`向本地服务器请求火山引擎 ${style} 风格生成...`);
    
    const payload = { style };

    // 判断是本地文件还是已经上传到服务器的 URL
    if (photoUri.startsWith('http')) {
      // 已经是服务器上的图片，只传路径
      payload.photoUri = photoUri;
    } else {
      // 本地图片，需要转成 base64 传给服务器
      console.log("检测到本地图片，正在转换 Base64...");
      const base64 = await imageToBase64(photoUri);
      if (!base64) throw new Error("图片转换失败");
      payload.base64Image = base64;
    }

    // 发送请求给本地服务器
    const response = await axios.post(SERVER_API_URL, payload);

    if (response.data && response.data.success) {
      return response.data.url;
    } else {
      throw new Error(response.data.message || "服务器生成失败");
    }
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    console.error("AI 生成失败:", errorMsg);
    throw new Error(errorMsg);
  }
};
