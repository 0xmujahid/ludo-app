import React from 'react';
import {Text, StyleSheet} from 'react-native';

import {RFValue} from 'react-native-responsive-fontsize';
import {FontFamily} from '../constants/Fonts';

const CustomText = ({children, css, fontFamily, size, color, ...props}) => {
  const styles = StyleSheet.create({
    text: {
      color: color ? color : 'white',
      fontSize: size ? size : RFValue(12),
      fontFamily: fontFamily ? fontFamily : FontFamily.Regular,
      ...css,
    },
  });

  return (
    <Text {...props} style={{...styles.text, ...css}}>
      {children}
    </Text>
  );
};

export default CustomText;
