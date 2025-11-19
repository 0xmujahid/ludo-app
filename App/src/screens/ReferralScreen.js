import React, {use} from 'react';
import {
  View,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Pressable,
} from 'react-native';
import {ShareIcon} from 'react-native-heroicons/outline';
import {ClipboardDocumentIcon} from 'react-native-heroicons/outline';
import CustomText from '../components/CustomText';
import {FontFamily} from '../constants/Fonts';
import {deviceWidth} from '../constants/Scaling';
import Wrapper from '../layout/Wrapper';
import HeaderMainTab from './subViews/headerMainTab';
import Button from '../components/Button';
import {useSelector} from 'react-redux';
import {selectUserInfo} from '../redux/reducers/app/appSelectors';
import Clipboard from '@react-native-clipboard/clipboard';

export default function ReferralScreen() {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const userInfo = useSelector(selectUserInfo);
  console.log(userInfo);
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const renderStep = (number, title, subtitle, highlight) => (
    <View style={styles.step}>
      <View style={styles.stepNumber}>
        <CustomText
          size={18}
          fontFamily={FontFamily.Bold}
          css={styles.stepNumberText}>
          {number}
        </CustomText>
      </View>
      <View style={styles.stepContent}>
        <CustomText
          size={16}
          fontFamily={FontFamily.Bold}
          css={styles.stepTitle}>
          {title}
          {highlight && (
            <CustomText
              size={16}
              fontFamily={FontFamily.Bold}
              css={styles.highlightText}>
              {' '}
              {highlight}
            </CustomText>
          )}
        </CustomText>
        <CustomText size={12} css={styles.stepSubtitle}>
          {subtitle}
        </CustomText>
      </View>
    </View>
  );

  return (
    <Wrapper>
      <View style={styles.container}>
        <HeaderMainTab />
        <CustomText size={24} fontFamily={FontFamily.Bold} css={styles.header}>
          REFER & EARN
        </CustomText>

        <View style={styles.illustrationContainer}>
          <Image
            source={require('../assets/images/referral-illustration.png')}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        <View style={styles.stepsContainer}>
          {renderStep(
            '1',
            'Share the App with friends',
            'Use the buttons below to Share',
          )}
          {renderStep(
            '2',
            'Friend sign up - You get',
            'When a friend register for the game',
            '50rs',
          )}
        </View>

        <CustomText size={14} css={styles.bottomText}>
          Tap the button below to share the application with your friends and
          earn rewards.
        </CustomText>

        <Button
          title={userInfo?.referralCode}
          textStyle={{
            size: 16,
            fontFamily: FontFamily.Bold,
            css: styles.buttonText,
          }}
          style={{marginBottom: 16}}
          iconPosition="right"
          size="small"
          icon={ClipboardDocumentIcon}
          iconSize={20}
          iconColor="#fff"
          onPress={() => {
            Clipboard.setString(userInfo?.referralCode);
          }}
        />

        <Button
          title="Share via"
          textStyle={{
            size: 16,
            fontFamily: FontFamily.Bold,
            css: styles.buttonText,
          }}
          iconPosition="right"
          icon={ShareIcon}
          iconSize={20}
          iconColor="#fff"
        />
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  header: {
    color: '#fff',
    marginVertical: 10,
  },
  illustrationContainer: {
    width: deviceWidth - 80,
    height: 200,
    backgroundColor: '#252850',
    borderRadius: 16,
    marginBottom: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  stepsContainer: {
    width: '100%',
    gap: 20,
    marginBottom: 30,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#fff',
  },
  stepContent: {
    // flex: 1,
  },
  stepTitle: {
    color: '#fff',
    marginBottom: 4,
  },
  highlightText: {
    color: '#ff3b7f',
  },
  stepSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  bottomText: {
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
  },
  shareButton: {
    backgroundColor: '#ff3b7f',
    borderRadius: 30,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
  },
});
