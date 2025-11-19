import React, {useState} from 'react';
import {Text, Pressable, StyleSheet, Animated, Linking} from 'react-native';
import {FontFamily} from '../constants/Fonts';
import {RFValue} from 'react-native-responsive-fontsize';

const PressableText = ({
  onPress,
  text,
  type = 'text',
  url,
  disabled = false,
}) => {
  const scale = useState(new Animated.Value(1))[0];

  const handlePressIn = () => {
    if (!disabled) {
      Animated.spring(scale, {
        toValue: 0.9,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePress = () => {
    if (disabled) return;

    if (type === 'link' && url) {
      Linking.openURL(url).catch(err =>
        console.error('Failed to open URL:', err),
      );
    } else if (onPress) {
      onPress();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}>
      <Animated.Text
        style={[
          styles.text,
          type === 'link' && styles.linkText,
          disabled && styles.disabledText,
          {transform: [{scale}]},
        ]}>
        {text}
      </Animated.Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  text: {
    fontFamily: FontFamily.Regular,
    color: '#FFFFFF',
    textDecorationLine: 'underline',
    textAlign: 'center',
    fontSize: RFValue(12),
    marginBottom: RFValue(-2),
  },
  linkText: {
    color: '#FFFFFF',
    textDecorationLine: 'underline',
    marginBottom: RFValue(-2),
  },
  disabledText: {
    fontFamily: FontFamily.Regular,
    color: '#A9A9A9',
    textDecorationLine: 'none',
  },
});

export default PressableText;
