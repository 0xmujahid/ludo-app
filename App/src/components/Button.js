import {useEffect, useRef} from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Animated,
  View,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {RFValue} from 'react-native-responsive-fontsize';
import CustomText from './CustomText';
import {FontFamily} from '../constants/Fonts';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const Button = ({
  title,
  onPress,
  disabled = false,
  style,
  textStyle,
  colors = ['#4facfe', '#00f2fe'],
  startPosition = {x: 0, y: 0},
  endPosition = {x: 1, y: 1},
  icon: IconComponent,
  iconPosition = 'left',
  iconSize = 20,
  iconColor = 'white',
  variant = 'primary', // primary, secondary, outline, ghost
  size = 'medium', // small, medium, large
  fullWidth = false,
  loading = false,
  ...props
}) => {
  const animatedScale = useRef(new Animated.Value(1)).current;
  const animatedOpacity = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(-1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Button size configurations
  const sizeConfig = {
    small: {
      padding: RFValue(10),
      minWidth: RFValue(120),
      fontSize: RFValue(14),
      borderRadius: RFValue(12),
    },
    medium: {
      padding: RFValue(14),
      minWidth: RFValue(160),
      fontSize: RFValue(16),
      borderRadius: RFValue(16),
    },
    large: {
      padding: RFValue(18),
      minWidth: RFValue(200),
      fontSize: RFValue(18),
      borderRadius: RFValue(20),
    },
  };

  // Variant configurations
  const variantConfig = {
    primary: {
      colors: colors,
      textColor: '#FFFFFF',
      shadowColor: colors[0],
      borderWidth: 0,
    },
    secondary: {
      colors: ['#6c757d', '#495057'],
      textColor: '#FFFFFF',
      shadowColor: '#6c757d',
      borderWidth: 0,
    },
    outline: {
      colors: ['transparent', 'transparent'],
      textColor: colors[0],
      shadowColor: 'transparent',
      borderWidth: 2,
      borderColor: colors[0],
    },
    ghost: {
      colors: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'],
      textColor: '#FFFFFF',
      shadowColor: 'transparent',
      borderWidth: 0,
    },
  };

  const currentSize = sizeConfig[size];
  const currentVariant = variantConfig[variant];

  const styles = StyleSheet.create({
    btnContainer: {
      width: fullWidth ? '100%' : 'auto',
      alignItems: 'center',
      justifyContent: 'center',
    },
    button: {
      padding: currentSize.padding,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: fullWidth ? '100%' : currentSize.minWidth,
      borderRadius: currentSize.borderRadius,
      borderWidth: currentVariant.borderWidth,
      borderColor: currentVariant.borderColor,
      shadowColor: currentVariant.shadowColor,
      shadowOffset: {
        width: 0,
        height: disabled ? 2 : 8,
      },
      shadowOpacity: disabled ? 0.1 : 0.3,
      shadowRadius: disabled ? 2 : 12,
      elevation: disabled ? 2 : 8,
      overflow: 'hidden',
    },
    buttonText: {
      color: currentVariant.textColor,
      fontSize: currentSize.fontSize,
      textAlign: 'center',
      fontFamily: FontFamily.Bold,
      letterSpacing: 0.5,
    },
    iconContainer: {
      marginRight: iconPosition === 'left' ? RFValue(8) : 0,
      marginLeft: iconPosition === 'right' ? RFValue(8) : 0,
    },
    shimmerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255,255,255,0.2)',
      transform: [{skewX: '-20deg'}],
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    loadingDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: currentVariant.textColor,
      marginHorizontal: 2,
    },
    rippleEffect: {
      position: 'absolute',
      borderRadius: currentSize.borderRadius,
      backgroundColor: 'rgba(255,255,255,0.3)',
    },
  });

  // Disabled state animation
  useEffect(() => {
    if (disabled) {
      Animated.timing(animatedOpacity, {
        toValue: 0.5,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(animatedOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [disabled, animatedOpacity]);

  // Loading animation
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      rotateAnim.setValue(0);
    }
  }, [loading, rotateAnim]);

  // Shimmer effect for primary buttons
  useEffect(() => {
    if (variant === 'primary' && !disabled && !loading) {
      const shimmerAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.delay(3000),
        ]),
      );
      shimmerAnimation.start();

      return () => shimmerAnimation.stop();
    }
  }, [variant, disabled, loading, shimmerAnim]);

  // Pulse effect for loading state
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [loading, pulseAnim]);

  const handlePressIn = () => {
    if (!disabled && !loading) {
      Animated.spring(animatedScale, {
        toValue: 0.96,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      Animated.spring(animatedScale, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePress = () => {
    if (!disabled && !loading && onPress) {
      onPress();
    }
  };

  const renderIcon = () => {
    if (IconComponent && !loading) {
      return (
        <View style={styles.iconContainer}>
          <IconComponent
            size={iconSize}
            color={iconColor || currentVariant.textColor}
          />
        </View>
      );
    }
    return null;
  };

  const renderLoadingDots = () => {
    const dots = [0, 1, 2];
    return (
      <View style={styles.loadingContainer}>
        {dots.map(index => (
          <Animated.View
            key={index}
            style={[
              styles.loadingDot,
              {
                transform: [
                  {
                    scale: rotateAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [1, 1.5, 1],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
                opacity: rotateAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.5, 1, 0.5],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          />
        ))}
      </View>
    );
  };

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      disabled={disabled || loading}
      style={[styles.btnContainer, style]}
      {...props}>
      <LinearGradient
        colors={currentVariant.colors}
        style={styles.button}
        start={startPosition}
        end={endPosition}
        locations={[0, 1]}>
        {/* Shimmer Effect */}
        {variant === 'primary' && !disabled && !loading && (
          <Animated.View
            style={[
              styles.shimmerOverlay,
              {
                transform: [{translateX: shimmerTranslateX}, {skewX: '-20deg'}],
                width: 50,
              },
            ]}
          />
        )}

        {/* Content */}
        {loading ? (
          renderLoadingDots()
        ) : (
          <>
            {iconPosition === 'left' && renderIcon()}
            <CustomText
              size={textStyle && textStyle.size ? textStyle?.size : ''}
              fontFamily={textStyle && textStyle.fontFamily ? textStyle?.fontFamily : ''}
              color={textStyle && textStyle.color ? textStyle?.color : ''}
              css={[styles.buttonText, textStyle]}>
              {title}
            </CustomText>
            {iconPosition === 'right' && renderIcon()}
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default Button;
