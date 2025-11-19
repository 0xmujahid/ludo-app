import React, {useState, useEffect} from 'react';
import {Text, StyleSheet, View} from 'react-native';
import {RFValue} from 'react-native-responsive-fontsize';
import CustomText from './CustomText';

const CountdownTimer = ({
  initialCountdown = 30,
  onComplete,
  css = {},
  triggerKey,
}) => {
  const [countdown, setCountdown] = useState(initialCountdown);

  useEffect(() => {
    setCountdown(initialCountdown); // Reset on turn change
  }, [initialCountdown, triggerKey]);

  useEffect(() => {
    if (countdown <= 0) {
      onComplete?.();
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, onComplete]);

  const minutes = Math.floor(countdown / 60);
  const seconds = (countdown % 60).toString().padStart(2, '0');

  return (
    <View style={styles.container}>
      <CustomText css={{...styles.countdownText, ...css}}>
        {minutes}:{seconds}
      </CustomText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: RFValue(10),
  },
  countdownText: {
    fontSize: RFValue(10),
    fontWeight: 'bold',
  },
});

export default CountdownTimer;
