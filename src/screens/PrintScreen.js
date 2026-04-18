import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Print from 'expo-print';
import { CheckCircle2, Home } from 'lucide-react-native';

export default function PrintScreen({ route, navigation }) {
  const { photoId } = route.params;
  const [printing, setPrinting] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    executePrint();
  }, []);

  const executePrint = async () => {
    try {
      // 在实际应用中，这里会调用 expo-print 打印 A4 画布内容
      // 这里模拟打印过程
      setPrinting(true);
      
      // 模拟打印 API 调用
      /*
      await Print.printAsync({
        html: `<html><body><img src="${photoUri}" style="width:100%" /></body></html>`
      });
      */
      
      await new Promise(resolve => setTimeout(resolve, 3000)); // 模拟 3 秒打印时间
      setSuccess(true);
    } catch (error) {
      console.error(error);
    } finally {
      setPrinting(false);
    }
  };

  if (printing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#27ae60" />
        <Text style={styles.statusText}>正在连接打印机并打印...</Text>
        <Text style={styles.idText}>客户编号: {photoId}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CheckCircle2 color="#27ae60" size={100} />
      <Text style={styles.successTitle}>打印成功！</Text>
      <View style={styles.infoBox}>
        <Text style={styles.infoLabel}>您的客户编号</Text>
        <Text style={styles.idDisplay}>{photoId}</Text>
      </View>
      <Text style={styles.thanks}>感谢您的使用，请在取件处领取您的照片。</Text>

      <TouchableOpacity 
        style={styles.homeBtn} 
        onPress={() => navigation.popToTop()}
      >
        <Home color="white" size={20} />
        <Text style={styles.homeBtnText}>回到首页</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
  },
  statusText: {
    marginTop: 20,
    fontSize: 18,
    color: '#666',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#27ae60',
    marginTop: 20,
  },
  infoBox: {
    backgroundColor: '#f9f9f9',
    padding: 30,
    borderRadius: 20,
    marginTop: 40,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  infoLabel: {
    fontSize: 16,
    color: '#999',
    marginBottom: 10,
  },
  idDisplay: {
    fontSize: 48,
    fontWeight: '900',
    color: '#333',
    letterSpacing: 2,
  },
  idText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
  },
  thanks: {
    marginTop: 30,
    textAlign: 'center',
    color: '#666',
    lineHeight: 24,
  },
  homeBtn: {
    flexDirection: 'row',
    backgroundColor: '#333',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginTop: 50,
    alignItems: 'center',
  },
  homeBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
