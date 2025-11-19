import React from 'react';
import {SafeAreaView, StyleSheet, View} from 'react-native';
import {deviceHeight, deviceWidth} from '../constants/Scaling';

const Wrapper = ({children, style}) => {
  return (
    <View style={[styles.container]}>
      <SafeAreaView style={[styles.safeArea, {...style}]}>
        {children}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -99,
    backgroundColor: '#1a1b3c',
  },
  safeArea: {
    height: deviceHeight,
    width: deviceWidth,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Wrapper;
