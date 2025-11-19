import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Image,
} from 'react-native';
import {
  ChevronRightIcon,
  CashIcon,
  HistoryIcon,
  WithdrawIcon,
  CertificateIcon,
  QuestionMarkCircleIcon,
  TicketIcon,
  BookOpenIcon,
} from 'react-native-heroicons/outline';
import FacebookIcon from '../assets/images/Icons/facebook.png';
import InstagramIcon from '../assets/images/Icons/Insta.png';
import TelegramIcon from '../assets/images/Icons/telegram.png';
import YoutubeIcon from '../assets/images/Icons/youtube.png';

import CustomText from '../components/CustomText';
import {FontFamily} from '../constants/Fonts';
import {logoutCall} from '../api/auth';
import {useDispatch} from 'react-redux';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const SettingsSupportScreen = ({navigation}) => {
  const dispatch = useDispatch();
  const [logoutScale] = useState(new Animated.Value(1));

  const animatePress = scale => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleLogout = async () => {
    animatePress(logoutScale);
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Logout', onPress: () => dispatch(logoutCall())},
    ]);
  };

  const renderOption = (title, IconComponent, onPress, isSocial = false) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [scale] = useState(new Animated.Value(1));

    return (
      <AnimatedTouchable
        style={[styles.option, {transform: [{scale}]}]}
        onPress={() => {
          animatePress(scale);
          onPress();
        }}>
        <View style={styles.optionContent}>
          {IconComponent && <IconComponent size={20} color="#fff" />}
          <CustomText size={16} css={styles.optionText}>
            {title}
          </CustomText>
        </View>
        <ChevronRightIcon size={20} color="#fff" />
      </AnimatedTouchable>
    );
  };

  const renderSocialIcons = () => {
    return (
      <View style={styles.socialIcons}>
        <TouchableOpacity>
          <Image source={FacebookIcon} size={24} />
        </TouchableOpacity>
        <TouchableOpacity>
          <Image source={InstagramIcon} size={24} />
        </TouchableOpacity>
        <TouchableOpacity>
          <Image source={TelegramIcon} size={24} />
        </TouchableOpacity>
        <TouchableOpacity>
          <Image source={YoutubeIcon} size={24} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <CustomText
          size={18}
          fontFamily={FontFamily.Bold}
          css={styles.sectionTitle}>
          Settings
        </CustomText>
        {renderOption('Add Cash', CashIcon, () =>
          navigation.navigate('AddMoney'),
        )}
        {renderOption('Transaction History', HistoryIcon, () =>
          navigation.navigate('AllTransactions'),
        )}
        {renderOption('Withdrawals', WithdrawIcon, () =>
          navigation.navigate('Withdrawals'),
        )}
        {renderOption('TDS Certificate', CertificateIcon, () =>
          navigation.navigate('TDSCertificate'),
        )}
      </View>

      <View style={{...styles.section, marginBottom: 0}}>
        <CustomText
          size={18}
          fontFamily={FontFamily.Bold}
          css={styles.sectionTitle}>
          Support
        </CustomText>
        {renderOption('FAQ', QuestionMarkCircleIcon, () =>
          navigation.navigate('FAQ'),
        )}
        {renderOption('Ticket Status', TicketIcon, () =>
          navigation.navigate('TicketStatus'),
        )}

        {renderOption('Documentation', BookOpenIcon, () =>
          navigation.navigate('Documentation'),
        )}
        <View style={styles.joinUs}>
          <CustomText css={styles.joinUsText} size={16}>
            Join Us on
          </CustomText>
        </View>
        {renderSocialIcons()}
      </View>

      <AnimatedTouchable
        style={[styles.logoutButton, {transform: [{scale: logoutScale}]}]}
        onPress={handleLogout}>
        <CustomText
          size={16}
          fontFamily={FontFamily.Bold}
          css={styles.logoutText}>
          Logout
        </CustomText>
      </AnimatedTouchable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1b3c',
    padding: 20,
  },
  section: {
    backgroundColor: '#252850',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#fff',
    marginBottom: 10,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  optionText: {
    color: '#fff',
    fontSize: 14,
  },
  socialIcons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  logoutButton: {
    backgroundColor: '#ff0000b4',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutText: {
    color: '#fff',
  },
  icon: {
    textAlign: 'center',
    width: 20,
  },
  joinUs: {
    alignItems: 'center',
    width: '100%',
    marginVertical: 15,
  },
  joinUsText: {
    alignItems: 'center',
    width: '100%',
    textAlign: 'center',
    justifyContent: 'center',
  },
});

export default SettingsSupportScreen;
