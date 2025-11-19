import React, {useEffect, useRef} from 'react';
import {View, StyleSheet, Animated, Easing} from 'react-native';
import LottieView from 'lottie-react-native';
import {RFValue} from 'react-native-responsive-fontsize';
import CustomText from '../components/CustomText';
import {FontFamily} from '../constants/Fonts';
import {deviceWidth, deviceHeight} from '../constants/Scaling';
import Wrapper from '../layout/Wrapper';
import HeaderMainTab from './subViews/headerMainTab';
import Trophy from '../assets/animation/tournament-trophy.json';

const TournamentScreen = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        easing: Easing.out(Easing.back(1.7)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <Wrapper>
      <HeaderMainTab />
      <View style={styles.container}>
        <View style={styles.main}>
          <LottieView
            autoPlay
            loop
            hardwareAccelerationAndroid
            style={styles.lottieAnimation}
            source={Trophy}
          />

          <Animated.View
            style={[
              styles.textContainer,
              {
                opacity: fadeAnim,
                transform: [{translateY: slideAnim}],
              },
            ]}>
            <CustomText
              size={32}
              fontFamily={FontFamily.Bold}
              css={styles.title}>
              Tournaments
            </CustomText>
            <CustomText
              size={24}
              fontFamily={FontFamily.SemiBold}
              css={styles.comingSoon}>
              Coming Soon!
            </CustomText>
            <CustomText size={16} css={styles.description}>
              Get ready for epic battles and amazing prizes. Our tournament
              feature is under development and will be available soon!
            </CustomText>
          </Animated.View>
          <LottieView
            source={require('../assets/animation/confetti-2.json')}
            autoPlay
            loop
            hardwareAccelerationAndroid
            style={styles.confettiAnimation}
          />
        </View>
      </View>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    flex: 1,
  },
  main: {marginTop: 40, alignItems: 'center', justifyContent: 'center'},
  lottieAnimation: {
    width: deviceWidth * 0.8,
    height: deviceWidth * 0.8,
    marginBottom: RFValue(20),
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: RFValue(20),
  },
  title: {
    color: '#ffffff',
    marginBottom: RFValue(10),
    textAlign: 'center',
  },
  comingSoon: {
    color: '#ff3b7f',
    marginBottom: RFValue(20),
    textAlign: 'center',
  },
  description: {
    color: '#ffffff',
    textAlign: 'center',
    opacity: 0.8,
  },
  confettiAnimation: {
    position: 'absolute',
    width: deviceWidth,
    height: deviceHeight,
    zIndex: -1,
  },
});

export default TournamentScreen;
