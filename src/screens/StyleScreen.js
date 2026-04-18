import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { generateImage } from '../services/api';
import { Palette, Sparkles } from 'lucide-react-native';

export default function StyleScreen({ route, navigation }) {
  // 增加默认值防止报错
  const { photoUri = null, photoId = '0000' } = route.params || {};

  if (!photoUri) {
    return (
      <View style={styles.container}>
        <Text>未检测到图片，请返回重新上传</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text>返回</Text></TouchableOpacity>
      </View>
    );
  }
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!selectedStyle) {
      Alert.alert("请选择一个风格");
      return;
    }

    setLoading(true);
    try {
      const resultUri = await generateImage(photoUri, selectedStyle);
      const generatedId = `G${photoId}`; // 生成后的编号
      navigation.navigate('Preview', { 
        originalUri: photoUri, 
        generatedUri: resultUri, 
        photoId: generatedId 
      });
    } catch (error) {
      Alert.alert("生成失败", "请检查网络或 API 配置");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>选择您喜欢的风格</Text>
      
      <View style={styles.previewContainer}>
        <Image source={{ uri: photoUri }} style={styles.originalImage} />
        <Text style={styles.label}>原始照片 (编号: {photoId})</Text>
      </View>

      <View style={styles.optionsContainer}>
        <TouchableOpacity 
          style={[styles.optionCard, selectedStyle === 'ghibli' && styles.selectedCard]}
          onPress={() => setSelectedStyle('ghibli')}
        >
          <View style={[styles.styleThumb, { backgroundColor: '#e1f5fe', justifyContent: 'center' }]}>
            <Palette color="#0288d1" size={40} />
          </View>
          <Text style={styles.styleName}>网红日漫风格</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.optionCard, selectedStyle === 'ink' && styles.selectedCard]}
          onPress={() => setSelectedStyle('ink')}
        >
          <View style={[styles.styleThumb, { backgroundColor: '#fff3e0', justifyContent: 'center' }]}>
            <Palette color="#f57c00" size={40} />
          </View>
          <Text style={styles.styleName}>水墨风</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e67e22" />
          <Text style={styles.loadingText}>豆包 AI 正在创作中...</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate}>
          <Sparkles color="white" size={20} />
          <Text style={styles.btnText}>立即生成</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  originalImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#eee',
  },
  label: {
    marginTop: 10,
    color: '#666',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 40,
  },
  optionCard: {
    width: '45%',
    padding: 10,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#eee',
    alignItems: 'center',
    backgroundColor: '#fdfdfd',
  },
  selectedCard: {
    borderColor: '#e67e22',
    backgroundColor: '#fff7f0',
  },
  styleThumb: {
    width: '100%',
    height: 100,
    borderRadius: 10,
    backgroundColor: '#ddd',
  },
  styleName: {
    marginTop: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#e67e22',
    fontWeight: '500',
  },
  generateBtn: {
    flexDirection: 'row',
    backgroundColor: '#e67e22',
    padding: 18,
    borderRadius: 12,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  btnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
