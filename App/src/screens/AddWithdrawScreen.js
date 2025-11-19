import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import {
  CheckCircleIcon,
  XCircleIcon,
} from 'react-native-heroicons/outline';
import { ChevronLeftIcon } from 'react-native-heroicons/outline';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Snackbar from 'react-native-snackbar';
import CustomText from '../components/CustomText';
import { FontFamily } from '../constants/Fonts';
import { Image } from 'react-native-svg';
import { goBack } from '../utils/navigationUtils';
import { useDispatch } from 'react-redux';
import { addWithdraw } from '../api/wallet';
import { PaymentMethod } from '../types/payments';
import { deviceHeight } from '../constants/Scaling';
import { verifyUPI } from 'bhimupijs';


const PaymentOption = ({ icon, label, disabled, image }) => (
  <TouchableOpacity
    style={[styles.paymentOption, disabled && styles.disabledOption]}
    disabled={disabled}>
    {image ? (
      <Image
        source={image}
        style={styles.paymentOptionImage}
        resizeMode="contain"
      />
    ) : (
      <CustomText size={24}>{icon}</CustomText>
    )}
    <CustomText
      size={14}
      css={[styles.paymentLabel, disabled && styles.disabledLabel]}>
      {label}
    </CustomText>
    {disabled && (
      <View style={styles.comingSoonBadge}>
        <CustomText size={10} css={styles.comingSoonText}>
          Coming Soon
        </CustomText>
      </View>
    )}
  </TouchableOpacity>
);

const ProcessingAnimation = () => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <View style={styles.processingAnimationContainer}>
      <Animated.View style={[styles.processingCircle, animatedStyle]} />
    </View>
  );
};

const AddWithdrawScreen = () => {
  console.log(FontFamily.Bold, "FontFamily.BoldFontFamily.BoldFontFamily.Bold")
  const dispatch = useDispatch();
  const [amount, setAmount] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [isUtrValid, setIsUtrValid] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmation, setIsConfirmation] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [validUpiId, setvalidUpiId] = useState(false);


  const verifyUpiDetailed = async () => {
    try {
      const response = await verifyUPI(upiId);
      if (!response.isQueryPatternValid) {
        setvalidUpiId(false);
      } else {
        setvalidUpiId(true);
      }
    } catch (error) {
      console.error('Error:', error.message);
    }
  }


  const handleSubmit = async () => {
    if (amount && validUpiId) {
      const payload = {
        amount,
        paymentMethod: PaymentMethod.MANUAL,
        utrNumber,
      };
      setIsProcessing(true);
      await dispatch(
        addWithdraw(payload, data => {
          setIsProcessing(false);
          setIsConfirmation(true);
        }),
        error => {
          setIsProcessing(false);
          Snackbar.show({
            text: 'Failed add wallet balance. Please try again later.',
            duration: 3000,
            marginBottom: deviceHeight - 100,
            backgroundColor: 'black',
            fontFamily: FontFamily.Bold,
          });
        },
      );
    }
  };


  if (isConfirmation) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => goBack()}>
            <ChevronLeftIcon size={24} color="#fff" />
          </TouchableOpacity>
          <CustomText
            size={20}
            fontFamily={FontFamily.Bold}
            css={styles.headerTitle}>
            Add Withdraw
          </CustomText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.confirmationContainer}>
          <CheckCircleIcon size={64} color="#4CAF50" />
          <CustomText
            size={24}
            fontFamily={FontFamily.Bold}
            css={styles.confirmationTitle}>
            Request Generated
          </CustomText>
          <CustomText size={16} css={styles.confirmationText}>
            Your wallet will be loaded with ₹{amount} in approximately 15
            minutes.
          </CustomText>
          <TouchableOpacity style={styles.button} onPress={() => goBack()}>
            <CustomText
              size={16}
              fontFamily={FontFamily.Medium}
              css={styles.buttonText}>
              Back to Wallet
            </CustomText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBack()}>
          <ChevronLeftIcon size={24} color="#fff" />
        </TouchableOpacity>
        <CustomText
          size={20}
          fontFamily={FontFamily.Bold}
          css={styles.headerTitle}>
          Add Withdraw
        </CustomText>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.upiContainer}>
          <CustomText size={16} css={styles.upiLabel}>
            UPI ID for Payment:
          </CustomText>
          <View style={styles.upiIdContainer}>
            <TextInput
              style={styles.input}
              value={upiId}
              onChangeText={setUpiId}
              placeholder="Enter Your Upi Id"
              keyboardType='default'
              placeholderTextColor="#999"
            />
            <View style={styles.upiCheckButton}>
              <TouchableOpacity
                style={[
                  styles.buttonCheckUpi,
                  upiId === "" && styles.disabledButton,
                ]}
                onPress={() => verifyUpiDetailed()}
                disabled={upiId === ""}>
                <CustomText
                  size={16}
                  fontFamily={FontFamily.Medium}
                  css={styles.buttonText}>
                  verify
                </CustomText>
              </TouchableOpacity>
              {validUpiId !== "" && validUpiId ? (
                <CheckCircleIcon size={20} color="#4CAF50" />
              ) : (
                <XCircleIcon size={20} color="#F44336" />
              )}
            </View>
          </View>
          {!validUpiId && (
            <CustomText size={12} css={styles.errorText}>
              Please enter a valid UPI Id and click on check to verify
            </CustomText>
          )}
        </View>
        <View style={styles.inputContainer}>
          <CustomText size={16} css={styles.inputLabel}>
            Amount (₹)
          </CustomText>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="Enter amount"
            placeholderTextColor="#999"
          />
        </View>
        <TouchableOpacity
          style={[
            styles.button,
            (!amount || !validUpiId) && styles.disabledButton,
          ]}
          onPress={() => handleSubmit()}
          disabled={!amount || !validUpiId}>
          <CustomText
            size={16}
            fontFamily={FontFamily.Medium}
            css={styles.buttonText}>
            Submit
          </CustomText>
        </TouchableOpacity>
      </ScrollView>
      {isProcessing && (
        <Animated.View
          style={styles.processingOverlay}
          entering={FadeIn}
          exiting={FadeOut}>
          <ProcessingAnimation />
          <CustomText
            size={18}
            fontFamily={FontFamily.Bold}
            css={styles.processingText}>
            Processing your request...
          </CustomText>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1b3c',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    color: '#fff',
  },
  content: {
    padding: 16,
  },
  paymentOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  paymentOption: {
    alignItems: 'center',
    backgroundColor: '#252850',
    borderRadius: 12,
    padding: 16,
    width: '30%',
  },
  disabledOption: {
    opacity: 0.5,
  },
  paymentLabel: {
    color: '#fff',
    marginTop: 8,
  },
  disabledLabel: {
    color: '#999',
  },
  comingSoonBadge: {
    backgroundColor: '#ff3b7f',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'absolute',
    top: -10,
    right: -10,
  },
  comingSoonText: {
    color: '#fff',
  },
  upiContainer: {
    marginBottom: 24,
  },
  upiCheckButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  upiLabel: {
    color: '#fff',
    marginBottom: 8,
  },
  upiIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#252850',
    borderRadius: 8,
    padding: 12,
  },
  upiId: {
    color: '#fff',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#fff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#252850',
    borderRadius: 8,
    color: '#fff',
    fontSize: 16,
    padding: 12,
  },
  invalidInput: {
    borderColor: '#F44336',
    borderWidth: 1,
  },
  validationIconContainer: {
    position: 'absolute',
    right: 12,
    top: 40,
  },
  errorText: {
    color: '#F44336',
    marginTop: 4,
  },
  buttonMessageUpi: {
    color: '#F44336',
    paddingRight: 10,
  },
  button: {
    backgroundColor: '#ff3b7f',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonCheckUpi: {
    backgroundColor: '#ff3b7f',
    borderRadius: 8,
    padding: 10,
    marginRight: 10,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 27, 60, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    marginTop: 16,
  },
  paymentOptionImage: {
    width: 40,
    height: 40,
    marginBottom: 8,
  },
  confirmationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  confirmationTitle: {
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  confirmationText: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
  },
  processingAnimationContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: '#ff3b7f',
    borderTopColor: 'transparent',
  },
});

export default AddWithdrawScreen;
