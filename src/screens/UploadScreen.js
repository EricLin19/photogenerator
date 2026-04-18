import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, AppState } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'lucide-react-native';
import io from 'socket.io-client';
import { SERVER_URL } from '../config';

const DEVICE_ID = 'device_' + Math.random().toString(36).substr(2, 9);

export default function UploadScreen({ navigation }) {
  const [photo, setPhoto] = useState(null);
  const [photoId, setPhotoId] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // 连接服务器
    const socket = io(SERVER_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
    socketRef.current = socket;

    // 监听当前设备的上传成功事件
    socket.on(`upload_success_${DEVICE_ID}`, (data) => {
      console.log('收到服务器推送的图片:', data);
      setPhoto(data.photoUrl);
      setPhotoId(data.photoId);
      Alert.alert("收到新照片", `照片已通过扫码成功上传！编号: ${data.photoId}`);
    });

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        const s = socketRef.current;
        if (s && !s.connected) {
          s.connect();
        }
      }
    });

    return () => {
      appStateSub.remove();
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  // 生成扫码上传的 URL
  const uploadUrl = `${SERVER_URL}/index.html?deviceId=${DEVICE_ID}`;

  // 模拟本地选择照片
  const handleUploadSimulate = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      const newId = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      setPhoto(result.assets[0].uri);
      setPhotoId(newId);
    }
  };

  const nextStep = () => {
    if (!photo) {
      Alert.alert("请先上传照片");
      return;
    }
    navigation.navigate('Style', { photoUri: photo, photoId: photoId });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>扫描二维码上传照片</Text>
      
      <View style={styles.qrContainer}>
        <QRCode
          value={uploadUrl}
          size={200}
        />
      </View>

      <Text style={styles.info}>
        使用手机扫描上方二维码，选择照片并上传。
      </Text>

      {photo && (
        <View style={styles.previewContainer}>
          <Text style={styles.previewText}>已接收照片 (编号: {photoId})</Text>
          <Image source={{ uri: photo }} style={styles.previewImage} />
        </View>
      )}

      <TouchableOpacity 
        style={styles.simulateBtn} 
        onPress={handleUploadSimulate}
      >
        <Camera color="white" size={20} />
        <Text style={styles.btnText}>模拟扫码上传 (选择本地图片)</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.nextBtn, !photo && styles.disabledBtn]} 
        onPress={nextStep}
        disabled={!photo}
      >
        <Text style={styles.btnText}>下一步：选择风格</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 30,
    marginTop: 20,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  info: {
    marginTop: 20,
    color: '#666',
    textAlign: 'center',
    fontSize: 16,
  },
  previewContainer: {
    marginTop: 30,
    alignItems: 'center',
  },
  previewText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#2ecc71',
  },
  previewImage: {
    width: 150,
    height: 150,
    borderRadius: 10,
  },
  simulateBtn: {
    flexDirection: 'row',
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 10,
    marginTop: 'auto',
    marginBottom: 10,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextBtn: {
    backgroundColor: '#e67e22',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  disabledBtn: {
    backgroundColor: '#ccc',
  },
  btnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
