import React from 'react';
import {Animated, StyleSheet, View, Pressable} from 'react-native';
import {deviceWidth} from '../../../constants/Scaling';
import {RFValue} from 'react-native-responsive-fontsize';
import CustomText from '../../../components/CustomText';
import {FontFamily} from '../../../constants/Fonts';
import LottieView from 'lottie-react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedLottieView = Animated.createAnimatedComponent(LottieView);

const HomeButton = ({title, onPress, color, lottieSource}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const rotateAnim = React.useRef(new Animated.Value(0)).current;
  const bounceAnim = React.useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(bounceAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(bounceAnim, {
        toValue: 0,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '2deg'],
  });

  const buttonScale = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[
        styles.gameButton,
        {
          backgroundColor: color,
          transform: [
            {scale: Animated.multiply(scaleAnim, buttonScale)},
            {rotate: rotation},
          ],
        },
      ]}>
      <View style={styles.buttonContent}>
        <CustomText
          size={16}
          fontFamily={FontFamily.Bold}
          css={styles.buttonText}>
          {title}
        </CustomText>
      </View>
      <AnimatedLottieView
        source={lottieSource}
        hardwareAccelerationAndroid
        style={styles.lottieAnimation}
        autoPlay={true}
        loop={true}
      />
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  gameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: RFValue(16),
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.35,
    shadowRadius: 6.65,
    elevation: 11,
    overflow: 'hidden',
    height: RFValue(70),
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1, // Ensure text is above the animation
  },
  buttonText: {
    color: '#FFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 2,
    // textAlign: 'right',
    width: '100%',
    fontWeight: '900',
  },
  lottieAnimation: {
    position: 'absolute',
    width: '125%',
    height: '125%',
    left: RFValue(55),
  },
});

export default HomeButton;
