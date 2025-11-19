import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import {avatars} from '../constants/Avatar';
import {useSelector} from 'react-redux';
import {selectUserInfo} from '../redux/reducers/app/appSelectors';

const {width, height} = Dimensions.get('window');

export default function VipLoadingScreen({callBack}) {
  const userInfo = useSelector(selectUserInfo);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const loadingBarAnim = useRef(new Animated.Value(0)).current;
  const spotlightAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Spotlight rotation
    Animated.loop(
      Animated.timing(spotlightAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    // Fade, scale, and rotate animations in parallel
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start(), // Ensure the rotateAnim starts properly
      Animated.timing(loadingBarAnim, {
        toValue: 1,
        duration: 5000,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      callBack();
    }, 5000);
  }, [
    fadeAnim,
    scaleAnim,
    rotateAnim,
    loadingBarAnim,
    spotlightAnim,
    floatAnim,
    pulseAnim,
    callBack,
  ]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const spotlightSpin = spotlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    // <View style={styles.container}>
    <Animated.View
      style={[
        styles.content,
        {
          opacity: fadeAnim,
          transform: [{scale: scaleAnim}, {translateY}],
        },
      ]}>
      <View style={styles.avatarContainer}>
        <Animated.View
          style={[
            styles.spotlight,
            {
              transform: [{rotate: spotlightSpin}],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.pulsingGlow,
            {
              transform: [{scale: pulseAnim}],
              opacity: 0.5,
            },
          ]}
        />

        <Image source={avatars[userInfo.avatarUrl]} style={styles.avatar} />
        <Animated.View
          style={[styles.glowRing, {transform: [{rotate: spin}]}]}
        />
      </View>
      <Text style={styles.vipName}>{userInfo.username}</Text>
      <Text style={styles.welcomeText}>Welcome, VIP!</Text>
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Preparing your VIP experience</Text>
        <View style={styles.loadingBarContainer}>
          <Animated.View
            style={[
              styles.loadingBar,
              {
                transform: [{scaleX: loadingBarAnim}],
              },
            ]}
          />
        </View>
      </View>
    </Animated.View>
    // </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1b3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    display: 'flex',
    marginTop: 200,
  },
  avatarContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#ff3b7f',
  },
  glowRing: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 2,
    borderColor: '#ff3b7f',
    borderStyle: 'dashed',
  },
  spotlight: {
    position: 'absolute',
    width: 200,
    height: 200,
    backgroundColor: 'rgba(255, 59, 127, 0.1)',
    borderRadius: 100,
    transform: [{scale: 1.2}],
  },
  pulsingGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 59, 127, 0.2)',
  },
  vipName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 20,
    color: '#ff3b7f',
    marginBottom: 30,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    color: '#9a9cb8',
    marginBottom: 10,
  },
  loadingBarContainer: {
    width: width - 80,
    height: 4,
    backgroundColor: 'rgba(255, 59, 127, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingBar: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ff3b7f',
    borderRadius: 2,
  },
});
