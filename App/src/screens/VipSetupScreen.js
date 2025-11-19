import React from 'react';

import {useState, useRef} from 'react';
import {
  TouchableOpacity,
  ScrollView,
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Wrapper from '../layout/Wrapper';
import InputField from '../components/InputField';
import {ChevronLeftIcon, CheckIcon} from 'react-native-heroicons/outline';
import Button from '../components/Button';
import CustomText from '../components/CustomText';
import {FontFamily} from '../constants/Fonts';
import {RFValue} from 'react-native-responsive-fontsize';
import {goBack, navigate} from '../utils/navigationUtils';
import {useDispatch} from 'react-redux';
import {registerUserCall} from '../api/auth';
import {avatars} from '../constants/Avatar';
import Snackbar from 'react-native-snackbar';
import {deviceHeight} from '../constants/Scaling';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

const genders = [
  {id: 'Male', label: 'Male', icon: '👨'},
  {id: 'Female', label: 'Female', icon: '👩'},
  {id: 'Other', label: 'Other', icon: '🧑'},
];

const phoneValidation = value => {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(value);
};

export default function VipSetupScreen() {
  const dispatch = useDispatch();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState({
    name: 'India',
    dial_code: '+91',
    code: 'IN',
  });
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [selectedGender, setSelectedGender] = useState(null);
  const [referralCode, setReferralCode] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, scaleAnim]);

  const isNextEnabled =
    username && selectedAvatar !== null && selectedGender && phoneNumber;

  const handleRegistration = async () => {
    const payload = {
      phoneNumber: `${countryCode.dial_code.split('+')[1]}${phoneNumber}`,
      username,
      avatarUrl: selectedAvatar,
      gender: selectedGender,
      referralCode,
    };

    dispatch(
      registerUserCall(
        payload,
        data => {
          if (data.userId) {
            Snackbar.show({
              text: 'Registered Successfully!',
              duration: 3000,
              marginBottom: deviceHeight - 100,
              backgroundColor: 'black',
              fontFamily: FontFamily.Bold,
            });
            navigate('SignIn', {
              number: phoneNumber,
              numberCode: countryCode,
              optScreen: true,
            });
          }
        },
        error => {
          Snackbar.show({
            text: 'Registration Failed. Try again later!',
            duration: 3000,
            marginBottom: deviceHeight - 100,
            backgroundColor: 'black',
            fontFamily: FontFamily.Bold,
          });
        },
      ),
    );
  };

  return (
    <Wrapper style={styles.wrapper}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradientBackground}>
        <Animated.View style={[styles.content, {opacity: fadeAnim}]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={goBack} style={styles.backButton}>
              <LinearGradient
                colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                style={styles.backButtonGradient}>
                <ChevronLeftIcon size={24} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <CustomText
                fontFamily={FontFamily.Bold}
                size={RFValue(22)}
                color="#FFFFFF">
                Create VIP Profile
              </CustomText>
              <CustomText
                fontFamily={FontFamily.Light}
                size={RFValue(12)}
                color="rgba(255,255,255,0.7)">
                Complete your profile to get started
              </CustomText>
            </View>
            <View style={{width: 48}} />
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}>
              {/* Phone Number Section */}
              <Animated.View
                style={[
                  styles.inputSection,
                  {transform: [{translateX: slideAnim}, {scale: scaleAnim}]},
                ]}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconContainer}>
                    <LinearGradient
                      colors={['#4facfe', '#00f2fe']}
                      style={styles.sectionIcon}>
                      <Text style={styles.sectionEmoji}>📱</Text>
                    </LinearGradient>
                  </View>
                  <CustomText
                    size={RFValue(16)}
                    fontFamily={FontFamily.Bold}
                    color="#FFFFFF"
                    style={styles.sectionTitle}>
                    Phone Number
                  </CustomText>
                </View>
                <View style={styles.inputWrapper}>
                  <InputField
                    type="phone"
                    onChangeText={setPhoneNumber}
                    value={phoneNumber}
                    placeholder="Enter Phone Number"
                    autoComplete={
                      Platform.OS === 'android' ? 'tel-device' : 'tel'
                    }
                    setCountryCode={setCountryCode}
                    showErrorIcon
                    showErrorMessage={false}
                    id="phoneNumber"
                    maxLength={10}
                    validate={phoneValidation}
                  />
                </View>
              </Animated.View>

              {/* Username Section */}
              <Animated.View
                style={[
                  styles.inputSection,
                  {transform: [{translateX: slideAnim}, {scale: scaleAnim}]},
                ]}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconContainer}>
                    <LinearGradient
                      colors={['#ff9a9e', '#fecfef']}
                      style={styles.sectionIcon}>
                      <Text style={styles.sectionEmoji}>👤</Text>
                    </LinearGradient>
                  </View>
                  <CustomText
                    size={RFValue(16)}
                    fontFamily={FontFamily.Bold}
                    color="#FFFFFF"
                    style={styles.sectionTitle}>
                    VIP Name
                  </CustomText>
                </View>
                <View style={styles.inputWrapper}>
                  <InputField
                    value={username}
                    onChangeText={value => {
                      if (value.length <= 10) {
                        setUsername(value);
                      }
                    }}
                    maxLength={10}
                    placeholder="Enter your VIP name"
                  />
                </View>
              </Animated.View>

              {/* Avatar Selection */}
              <Animated.View
                style={[
                  styles.section,
                  {transform: [{translateX: slideAnim}, {scale: scaleAnim}]},
                ]}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconContainer}>
                    <LinearGradient
                      colors={['#a8edea', '#fed6e3']}
                      style={styles.sectionIcon}>
                      <Text style={styles.sectionEmoji}>🎭</Text>
                    </LinearGradient>
                  </View>
                  <CustomText
                    size={RFValue(16)}
                    fontFamily={FontFamily.Bold}
                    color="#FFFFFF"
                    style={styles.sectionTitle}>
                    Choose Your Avatar
                  </CustomText>
                </View>
                <View style={styles.avatarGrid}>
                  {avatars.map((avatar, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => setSelectedAvatar(index)}
                      style={[
                        styles.avatarButton,
                        selectedAvatar === index && styles.selectedAvatar,
                      ]}
                      activeOpacity={0.8}>
                      <LinearGradient
                        colors={
                          selectedAvatar === index
                            ? ['#ff6b6b', '#ee5a52']
                            : [
                                'rgba(255,255,255,0.1)',
                                'rgba(255,255,255,0.05)',
                              ]
                        }
                        style={styles.avatarGradient}>
                        <Image source={avatar} style={styles.avatar} />
                        {selectedAvatar === index && (
                          <View style={styles.checkmarkContainer}>
                            <LinearGradient
                              colors={['#4facfe', '#00f2fe']}
                              style={styles.checkmark}>
                              <CheckIcon size={16} color="#FFFFFF" />
                            </LinearGradient>
                          </View>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>

              {/* Gender Selection */}
              <Animated.View
                style={[
                  styles.section,
                  {transform: [{translateX: slideAnim}, {scale: scaleAnim}]},
                ]}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconContainer}>
                    <LinearGradient
                      colors={['#ffecd2', '#fcb69f']}
                      style={styles.sectionIcon}>
                      <Text style={styles.sectionEmoji}>⚧️</Text>
                    </LinearGradient>
                  </View>
                  <CustomText
                    size={RFValue(16)}
                    fontFamily={FontFamily.Bold}
                    color="#FFFFFF"
                    style={styles.sectionTitle}>
                    Select Gender
                  </CustomText>
                </View>
                <View style={styles.genderContainer}>
                  {genders.map(gender => (
                    <TouchableOpacity
                      key={gender.id}
                      onPress={() => setSelectedGender(gender.id)}
                      style={[
                        styles.genderButton,
                        selectedGender === gender.id && styles.selectedGender,
                      ]}
                      activeOpacity={0.8}>
                      <LinearGradient
                        colors={
                          selectedGender === gender.id
                            ? ['#667eea', '#764ba2']
                            : [
                                'rgba(255,255,255,0.1)',
                                'rgba(255,255,255,0.05)',
                              ]
                        }
                        style={styles.genderGradient}>
                        <Text style={styles.genderIcon}>{gender.icon}</Text>
                        <Text
                          style={[
                            styles.genderText,
                            selectedGender === gender.id &&
                              styles.selectedGenderText,
                          ]}>
                          {gender.label}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>

              {/* Referral Code Section */}
              <Animated.View
                style={[
                  styles.inputSection,
                  {transform: [{translateX: slideAnim}, {scale: scaleAnim}]},
                ]}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconContainer}>
                    <LinearGradient
                      colors={['#fad0c4', '#ffd1ff']}
                      style={styles.sectionIcon}>
                      <Text style={styles.sectionEmoji}>🎁</Text>
                    </LinearGradient>
                  </View>
                  <View>
                    <CustomText
                      size={RFValue(16)}
                      fontFamily={FontFamily.Bold}
                      color="#FFFFFF"
                      style={styles.sectionTitle}>
                      Referral Code
                    </CustomText>
                    <CustomText
                      size={RFValue(11)}
                      fontFamily={FontFamily.Light}
                      color="rgba(255,255,255,0.6)">
                      Optional - Get bonus rewards
                    </CustomText>
                  </View>
                </View>
                <View style={styles.inputWrapper}>
                  <InputField
                    value={referralCode}
                    onChangeText={setReferralCode}
                    placeholder="Enter referral code"
                  />
                </View>
              </Animated.View>

              {/* Bottom Spacing */}
              <View style={styles.bottomSpacing} />
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Fixed Bottom Button */}
          <Animated.View style={[styles.bottomNav, {opacity: fadeAnim}]}>
            <Button
              disabled={!isNextEnabled}
              title="Complete Registration"
              onPress={handleRegistration}
            />
          </Animated.View>
        </Animated.View>
      </LinearGradient>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SCREEN_WIDTH * 0.05,
    paddingVertical: RFValue(15),
    marginBottom: RFValue(10),
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  backButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SCREEN_WIDTH * 0.05,
    paddingBottom: 120,
  },
  inputSection: {
    marginBottom: RFValue(24),
  },
  section: {
    marginBottom: RFValue(24),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: RFValue(16),
  },
  sectionIconContainer: {
    marginRight: RFValue(12),
  },
  sectionIcon: {
    width: RFValue(40),
    height: RFValue(40),
    borderRadius: RFValue(20),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionEmoji: {
    fontSize: RFValue(18),
  },
  sectionTitle: {
    flex: 1,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: RFValue(5),
  },
  avatarButton: {
    width: (SCREEN_WIDTH - SCREEN_WIDTH * 0.1 - RFValue(40)) / 3,
    aspectRatio: 1,
    marginBottom: RFValue(16),
    borderRadius: RFValue(20),
    overflow: 'hidden',
  },
  selectedAvatar: {
    transform: [{scale: 1.05}],
  },
  avatarGradient: {
    width: '100%',
    height: '100%',
    padding: RFValue(4),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: '85%',
    height: '85%',
    borderRadius: RFValue(15),
  },
  checkmarkContainer: {
    position: 'absolute',
    top: RFValue(8),
    right: RFValue(8),
    width: RFValue(24),
    height: RFValue(24),
    borderRadius: RFValue(12),
    overflow: 'hidden',
  },
  checkmark: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: RFValue(5),
  },
  genderButton: {
    flex: 1,
    marginHorizontal: RFValue(4),
    borderRadius: RFValue(12),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  selectedGender: {
    transform: [{scale: 1.02}],
  },
  genderGradient: {
    paddingVertical: RFValue(16),
    paddingHorizontal: RFValue(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderIcon: {
    fontSize: RFValue(20),
    marginBottom: RFValue(4),
  },
  genderText: {
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontSize: RFValue(13),
    fontFamily: FontFamily.Medium,
  },
  selectedGenderText: {
    color: '#FFFFFF',
    fontFamily: FontFamily.Bold,
  },
  bottomSpacing: {
    height: RFValue(20),
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SCREEN_WIDTH * 0.05,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: RFValue(15),
  },
  bottomNavGradient: {
    borderRadius: RFValue(12),
    padding: RFValue(4),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
