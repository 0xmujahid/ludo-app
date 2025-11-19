import React, {useEffect, useMemo} from 'react';
import {View, TouchableOpacity, Animated, StyleSheet, Text} from 'react-native';
import CustomText from './CustomText';
import {FontFamily} from '../constants/Fonts';

const Checkbox = ({checked, onPress, style, label, disabled = false}) => {
  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'start',
      gap: 12,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      marginTop: 2,
      borderColor: checked ? '#ffffff' : '#6B7280',
      backgroundColor: 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkmark: {
      width: 12,
      height: 12,
      borderRadius: 3,
      backgroundColor: checked ? '#ffffff' : '#6B7280',
    },
    disabled: {
      borderColor: '#D1D5DB',
      opacity: 0.5,
    },
    label: {
      fontSize: 16,
      color: '#6B7280',
    },
  });

  // Animation value for scaling
  const scaleValue = useMemo(
    () => new Animated.Value(checked ? 1 : 0),
    [checked],
  );

  // Animation value for opacity
  const opacityValue = useMemo(
    () => new Animated.Value(checked ? 1 : 0),
    [checked],
  );

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleValue, {
        toValue: checked ? 1 : 0,
        useNativeDriver: true,
        tension: 50,
        friction: 4,
      }),
      Animated.timing(opacityValue, {
        toValue: checked ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [checked, opacityValue, scaleValue]);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.container, style]}
      activeOpacity={0.7}>
      <View style={[styles.checkbox, disabled && styles.disabled]}>
        <Animated.View
          style={[
            styles.checkmark,
            {
              opacity: opacityValue,
              transform: [{scale: scaleValue}],
            },
          ]}
        />
      </View>
      {label && (
        <CustomText fontFamily={FontFamily.Light} style={styles.label}>
          {label}
        </CustomText>
      )}
    </TouchableOpacity>
  );
};

export default Checkbox;
