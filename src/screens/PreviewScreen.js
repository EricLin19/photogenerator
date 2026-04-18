import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Printer } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_WIDTH = SCREEN_WIDTH * 0.85;
const CANVAS_HEIGHT = CANVAS_WIDTH * 1.414; // A4 比例

export default function PreviewScreen({ route, navigation }) {
  const { generatedUri, photoId } = route.params;

  // 缩放和平移状态
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // 缩放手势
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  // 平移手势
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const handlePrint = () => {
    navigation.navigate('Print', { photoId });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>预览与调整</Text>
      <Text style={styles.subtitle}>可在 A4 画布上缩放和移动图像</Text>

      {/* A4 画布 */}
      <View style={styles.a4Canvas}>
        <GestureDetector gesture={composedGesture}>
          <Animated.Image
            source={{ uri: generatedUri }}
            style={[styles.image, animatedStyle]}
            resizeMode="contain"
          />
        </GestureDetector>
      </View>

      <View style={styles.footer}>
        <Text style={styles.idText}>图像编号: {photoId}</Text>
        <TouchableOpacity style={styles.printBtn} onPress={handlePrint}>
          <Printer color="white" size={24} />
          <Text style={styles.printBtnText}>打印</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#333',
    alignItems: 'center',
    paddingTop: 20,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 20,
  },
  a4Canvas: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: '#fff',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  idText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  printBtn: {
    flexDirection: 'row',
    backgroundColor: '#27ae60',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 30,
    alignItems: 'center',
  },
  printBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});
