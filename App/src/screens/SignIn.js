import {useMemo, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
  Dimensions,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Snackbar from 'react-native-snackbar';
import LinearGradient from 'react-native-linear-gradient';
import Wrapper from '../layout/Wrapper';
import InputField from '../components/InputField';
import {useDispatch} from 'react-redux';
import {navigate} from '../utils/navigationUtils';
import Button from '../components/Button';
import {RFValue} from 'react-native-responsive-fontsize';
import CustomText from '../components/CustomText';
import {FontFamily} from '../constants/Fonts';
import Logo from '../assets/images/logo.png';
import Checkbox from '../components/Checkbox';
import {OtpInput} from 'react-native-otp-entry';
import PressableText from '../components/PressableText';
import CountdownTimer from '../components/CountdownTimer';
import {loginByOtpCall, verifyOtpCall} from '../api/auth';
import {deviceHeight, deviceWidth} from '../constants/Scaling';
import {setUserInfo, updateAuthToken} from '../redux/reducers/app/appSlice';
import VipLoadingScreen from './VipLoadingScreen';
import {updateWallet} from '../redux/reducers/wallet/walletSlice';
import {getWalletBalance} from '../api/wallet';
import {getLeaderBoard} from '../api/game';
import {updateLeaderboard} from '../redux/reducers/leaderboard/leaderboardSlice';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

const SignIn = ({route}) => {
  const dispatch = useDispatch();
  const {number, optScreen, numberCode} = route.params;
  const [phoneNumber, setPhoneNumber] = useState(number ?? '');
  const [countryCode, setCountryCode] = useState(
    numberCode?.dial_code
      ? numberCode
      : {
          name: 'India',
          dial_code: '+91',
          code: 'IN',
        },
  );
  const [termsChecked, setTermsChecked] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(optScreen ? true : false);
  const [isloggedIn, setIsLoggedIn] = useState(false);
  const [resendOtp, setResendOtp] = useState(false);
  const [otp, setOtp] = useState('');

  // Loading states
  const [isGeneratingOtp, setIsGeneratingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);

  const handleGenerateOtp = async () => {
    setIsGeneratingOtp(true);
    const fullNumber = `${countryCode.dial_code.split('+')[1]}${phoneNumber}`;

    dispatch(
      loginByOtpCall(
        fullNumber,
        data => {
          setIsGeneratingOtp(false);
          if (data.status) {
            setIsOtpSent(true);
            Snackbar.show({
              text: 'OTP sent successfully!',
              duration: 3000,
              marginBottom: deviceHeight - 100,
              backgroundColor: '#4CAF50',
              fontFamily: FontFamily.Bold,
            });
          } else {
            Snackbar.show({
              text: 'Number not registered!',
              duration: 3000,
              marginBottom: deviceHeight - 100,
              backgroundColor: '#F44336',
              fontFamily: FontFamily.Bold,
            });
          }
        },
        error => {
          setIsGeneratingOtp(false);
          Snackbar.show({
            text: 'Failed to send OTP!',
            duration: 3000,
            marginBottom: deviceHeight - 100,
            backgroundColor: '#F44336',
            fontFamily: FontFamily.Bold,
          });
        },
      ),
    );
  };

  const handleOtpVerification = async (value = otp) => {
    setIsVerifyingOtp(true);
    const fullNumber = `${countryCode.dial_code.split('+')[1]}${phoneNumber}`;
    const payload = {
      phoneNumber: fullNumber,
      otp: value.toString(),
    };

    dispatch(
      verifyOtpCall(
        payload,
        data => {
          dispatch(setUserInfo({info: data?.user}));
          dispatch(updateAuthToken({token: data?.token}));
          fetchWalletBalance();
          fetchLeaderBoard();
          setIsVerifyingOtp(false);
          setIsLoggedIn(true);
        },
        () => {
          setIsVerifyingOtp(false);
          Snackbar.show({
            text: 'Invalid OTP!',
            duration: 3000,
            marginBottom: deviceHeight - 100,
            backgroundColor: '#F44336',
            fontFamily: FontFamily.Bold,
          });
        },
      ),
    );
  };

  const newRegistration = () => {
    navigate('Registration');
  };

  const onResendOtp = async () => {
    setIsResendingOtp(true);
    const fullNumber = `${countryCode.dial_code.split('+')[1]}${phoneNumber}`;

    loginByOtpCall(
      fullNumber,
      data => {
        setIsResendingOtp(false);
        if (data.status) {
          setResendOtp(false);
          Snackbar.show({
            text: 'OTP resent successfully!',
            duration: 3000,
            marginBottom: deviceHeight - 100,
            backgroundColor: '#4CAF50',
            fontFamily: FontFamily.Bold,
          });
        } else {
          Snackbar.show({
            text: 'Failed to re-send OTP!',
            duration: 3000,
            marginBottom: deviceHeight - 100,
            backgroundColor: '#F44336',
            fontFamily: FontFamily.Bold,
          });
        }
      },
      error => {
        setIsResendingOtp(false);
        Snackbar.show({
          text: 'Failed to send OTP!',
          duration: 3000,
          marginBottom: deviceHeight - 100,
          backgroundColor: '#F44336',
          fontFamily: FontFamily.Bold,
        });
      },
    );
  };

  const fetchWalletBalance = async () => {
    dispatch(
      getWalletBalance(
        data => {
          if (data.balance) {
            dispatch(updateWallet(data));
          }
        },
        error => {
          console.log(error);
        },
      ),
    );
  };

  const fetchLeaderBoard = async () => {
    await dispatch(
      getLeaderBoard(
        data => {
          if (data) {
            dispatch(updateLeaderboard(data));
          }
        },
        () => {},
      ),
    );
  };

  const phoneValidation = value => {
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(value);
  };

  const isActionDisabled = useMemo(() => {
    if (termsChecked && !!countryCode.dial_code) {
      return !phoneValidation(phoneNumber) || isGeneratingOtp;
    } else {
      return true;
    }
  }, [phoneNumber, countryCode.dial_code, termsChecked, isGeneratingOtp]);

  // Loading Overlay Component
  const LoadingOverlay = ({visible, message}) => {
    if (!visible) return null;

    return (
      <View style={styles.loadingOverlay}>
        <LinearGradient
          colors={['rgba(26, 26, 46, 0.95)', 'rgba(22, 33, 62, 0.95)']}
          style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color="#4facfe" />
            <CustomText
              fontFamily={FontFamily.Medium}
              size={RFValue(16)}
              color="#FFFFFF"
              style={styles.loadingText}>
              {message}
            </CustomText>
          </View>
        </LinearGradient>
      </View>
    );
  };

  // Phone Number Input Screen
  if (!isOtpSent && !isloggedIn) {
    return (
      <Wrapper style={styles.wrapper}>
        <LinearGradient
          colors={['#1a1a2e', '#16213e', '#0f3460']}
          style={styles.gradientBackground}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.container}>
              {/* Header Section */}
              <View style={styles.headerSection}>
                <View style={styles.iconContainer}>
                  <LinearGradient
                    colors={['#4facfe55', '#00f1fe44']}
                    style={styles.iconGradient}>
                    <Image
                      source={Logo}
                      size={RFValue(24)}
                      style={styles.img}
                    />
                  </LinearGradient>
                </View>
                <CustomText
                  fontFamily={FontFamily.Bold}
                  size={RFValue(24)}
                  color="#FFFFFF"
                  style={styles.title}>
                  Welcome Back
                </CustomText>
                <CustomText
                  fontFamily={FontFamily.Light}
                  size={RFValue(14)}
                  color="rgba(255, 255, 255, 0.7)"
                  style={styles.subtitle}>
                  Enter your phone number to continue
                </CustomText>
              </View>

              {/* Form Section */}
              <View style={styles.formSection}>
                <View style={styles.inputContainer}>
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
                    editable={!isGeneratingOtp}
                  />
                </View>

                <View style={styles.checkboxContainer}>
                  <Checkbox
                    checked={termsChecked}
                    onPress={() => {
                      if (!isGeneratingOtp) {
                        setTermsChecked(pre => !pre);
                      }
                    }}
                    label={'By checking here I accept the Terms & Condition'}
                    disabled={isGeneratingOtp}
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionSection}>
                <Button
                  disabled={isActionDisabled}
                  title={isGeneratingOtp ? 'Sending OTP...' : 'Continue'}
                  onPress={handleGenerateOtp}
                  loading={isGeneratingOtp}
                />

                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <CustomText
                    fontFamily={FontFamily.Light}
                    size={RFValue(12)}
                    color="rgba(255, 255, 255, 0.5)">
                    OR
                  </CustomText>
                  <View style={styles.dividerLine} />
                </View>

                <Button
                  title="Create New Account"
                  colors={['#4d4d85', '#3b3b6e']}
                  onPress={newRegistration}
                  disabled={isGeneratingOtp}
                />
              </View>
            </KeyboardAvoidingView>
          </ScrollView>
        </LinearGradient>

        {/* Loading Overlay */}
        <LoadingOverlay visible={isGeneratingOtp} message="Sending OTP..." />
      </Wrapper>
    );
  }

  // Loading Screen
  if (isloggedIn) {
    return (
      <Wrapper style={styles.wrapper}>
        <VipLoadingScreen
          callBack={() => {
            navigate('MainTabs');
          }}
        />
      </Wrapper>
    );
  }

  // OTP Verification Screen
  return (
    <Wrapper style={styles.wrapper}>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradientBackground}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}>
            {/* Header Section */}
            <View style={styles.headerSection}>
              <View style={styles.iconContainer}>
                <LinearGradient
                  colors={['#4facfeff', '#00f2fe']}
                  style={styles.iconGradient}>
                  <CustomText
                    fontFamily={FontFamily.Bold}
                    size={RFValue(24)}
                    color="#FFFFFF">
                    🔐
                  </CustomText>
                </LinearGradient>
              </View>
              <CustomText
                fontFamily={FontFamily.Bold}
                size={RFValue(20)}
                color="#FFFFFF"
                style={styles.title}>
                Verify Your Number
              </CustomText>
              <CustomText
                fontFamily={FontFamily.Light}
                size={RFValue(14)}
                color="rgba(255, 255, 255, 0.7)"
                style={styles.subtitle}>
                OTP sent to {countryCode.dial_code} {phoneNumber}
              </CustomText>
              <CustomText
                fontFamily={FontFamily.Light}
                size={RFValue(12)}
                color="rgba(255, 255, 255, 0.6)"
                style={styles.description}>
                Please type the verification code sent to your number.{' '}
              </CustomText>
              <PressableText
                onPress={() => !isVerifyingOtp && setIsOtpSent(pre => !pre)}
                text="Change number"
                disabled={isVerifyingOtp}
              />
            </View>

            {/* OTP Form Section */}
            <View style={styles.otpFormSection}>
              <CustomText
                fontFamily={FontFamily.Medium}
                size={RFValue(16)}
                color="#FFFFFF"
                style={styles.otpLabel}>
                Enter Verification Code
              </CustomText>

              <View style={styles.otpInputContainer}>
                <OtpInput
                  numberOfDigits={4}
                  onTextChange={text => {
                    setOtp(text);
                  }}
                  onFilled={text =>
                    !isVerifyingOtp && handleOtpVerification(text ? text : otp)
                  }
                  textInputProps={{
                    accessibilityLabel: 'One-Time Password',
                    editable: !isVerifyingOtp,
                  }}
                  autoFocus={!isVerifyingOtp}
                  type="numeric"
                  focusColor="#4facfe"
                  theme={{
                    containerStyle: styles.otpContainer,
                    pinCodeContainerStyle: [
                      styles.pinCodeContainer,
                      isVerifyingOtp && styles.disabledPinCodeContainer,
                    ],
                    pinCodeTextStyle: styles.pinCodeText,
                    focusStickStyle: styles.focusStick,
                    focusedPinCodeContainerStyle: styles.activePinCodeContainer,
                  }}
                />
              </View>

              <View style={styles.timerContainer}>
                <CountdownTimer
                  initialCountdown={10}
                  onComplete={() => setResendOtp(true)}
                  css={{textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)'}}
                />
              </View>

              <View style={styles.resendContainer}>
                <PressableText
                  disabled={!resendOtp || isResendingOtp || isVerifyingOtp}
                  onPress={onResendOtp}
                  text={isResendingOtp ? 'Resending...' : 'Resend OTP via SMS'}
                />
                {isResendingOtp && (
                  <ActivityIndicator
                    size="small"
                    color="#4facfe"
                    style={styles.resendLoader}
                  />
                )}
              </View>
            </View>

            {/* Action Button */}
            <View style={styles.actionSection}>
              <Button
                disabled={otp.length < 4 || isVerifyingOtp}
                title={isVerifyingOtp ? 'Verifying...' : 'Verify & Continue'}
                onPress={handleOtpVerification}
                loading={isVerifyingOtp}
              />
            </View>
          </KeyboardAvoidingView>
        </ScrollView>
      </LinearGradient>

      {/* Loading Overlay */}
      <LoadingOverlay visible={isVerifyingOtp} message="Verifying OTP..." />
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  wrapper: {flex: 1},
  gradientBackground: {
    width: deviceWidth,
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    minHeight: SCREEN_HEIGHT,
  },
  container: {
    flex: 1,
    paddingHorizontal: SCREEN_WIDTH * 0.1,
    paddingVertical: SCREEN_HEIGHT * 0.05,
    justifyContent: 'space-between',
  },
  headerSection: {
    alignItems: 'center',
    marginTop: SCREEN_HEIGHT * 0.08,
    marginBottom: SCREEN_HEIGHT * 0.04,
  },
  iconContainer: {
    marginBottom: RFValue(20),
  },
  iconGradient: {
    width: RFValue(80),
    height: RFValue(80),
    borderRadius: RFValue(40),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4facfe',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    textAlign: 'center',
    marginBottom: RFValue(8),
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: RFValue(8),
  },
  description: {
    textAlign: 'center',
    lineHeight: RFValue(18),
    paddingHorizontal: RFValue(20),
  },
  formSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: RFValue(20),
  },
  inputContainer: {
    width: '100%',
    marginBottom: RFValue(24),
  },
  checkboxContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: RFValue(10),
  },
  otpFormSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: RFValue(20),
  },
  otpLabel: {
    marginBottom: RFValue(24),
    textAlign: 'center',
  },
  otpInputContainer: {
    marginBottom: RFValue(24),
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: SCREEN_WIDTH * 0.7,
    maxWidth: 280,
  },
  pinCodeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: RFValue(12),
    width: RFValue(50),
    height: RFValue(60),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  disabledPinCodeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  activePinCodeContainer: {
    backgroundColor: 'rgba(79, 172, 254, 0.2)',
    borderColor: '#4facfe',
    shadowColor: '#4facfe',
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  pinCodeText: {
    fontFamily: FontFamily.Medium,
    color: '#FFFFFF',
    fontSize: RFValue(18),
  },
  focusStick: {
    backgroundColor: '#4facfe',
    width: 2,
    height: RFValue(20),
  },
  timerContainer: {
    marginBottom: RFValue(16),
  },
  resendContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  resendLoader: {
    marginLeft: RFValue(8),
  },
  actionSection: {
    paddingTop: RFValue(20),
    paddingBottom: RFValue(10),
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: RFValue(20),
    paddingHorizontal: RFValue(20),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: RFValue(10),
  },
  img: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  // Loading Overlay Styles
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    borderRadius: RFValue(16),
    padding: RFValue(24),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: RFValue(16),
    textAlign: 'center',
  },
});

export default SignIn;
