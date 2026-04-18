import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import UploadScreen from './src/screens/UploadScreen';
import StyleScreen from './src/screens/StyleScreen';
import PreviewScreen from './src/screens/PreviewScreen';
import PrintScreen from './src/screens/PrintScreen';

const Stack = createStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator 
          initialRouteName="Upload"
          screenOptions={{
            headerStyle: { backgroundColor: '#f4511e' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: 'bold' },
          }}
        >
          <Stack.Screen 
            name="Upload" 
            component={UploadScreen} 
            options={{ title: '第一步：上传照片' }} 
          />
          <Stack.Screen 
            name="Style" 
            component={StyleScreen} 
            options={{ title: '第二步：选择风格' }} 
          />
          <Stack.Screen 
            name="Preview" 
            component={PreviewScreen} 
            options={{ title: '第三步：预览与调整' }} 
          />
          <Stack.Screen 
            name="Print" 
            component={PrintScreen} 
            options={{ title: '完成打印' }} 
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
