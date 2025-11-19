import React, {useState, useCallback} from 'react';
import {View, StyleSheet, TouchableOpacity} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {ChevronDownIcon} from 'react-native-heroicons/outline';
import CustomText from './CustomText';
import {FontFamily} from '../constants/Fonts';

const ExpandableListItem = ({item, key, isExpanded, onToggle, renderDetails}) => {
  const statusLabel = (() => {
    const value = item?.status || item?.paymentStatus || 'unknown';
    if (typeof value !== 'string') {
      return String(value);
    }
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  })();

  const subtitle = (() => {
    if (item?.usdAmount) {
      const amount = Number(item.usdAmount);
      return isNaN(amount) ? `USD ${item.usdAmount}` : `$ ${amount.toFixed(2)}`;
    }
    if (item?.amount) {
      return `₹ ${item.amount}`;
    }
    if (item?.gameTokens) {
      return `${item.gameTokens} tokens`;
    }
    if (item?.payAmount) {
      return `${item.payAmount} ${item.cryptoCurrency || ''}`.trim();
    }
    return '';
  })();

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: withTiming(isExpanded ? 200 : 60, {
        duration: 300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
    };
  });

  const rotateStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          rotate: withTiming(isExpanded ? '180deg' : '0deg', {
            duration: 300,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }),
        },
      ],
    };
  });

  return (
    <Animated.View key={key} style={[styles.container, animatedStyle]}>
      <TouchableOpacity onPress={onToggle} style={styles.header}>
        <View>
          <CustomText size={16} fontFamily={FontFamily.Bold} css={styles.title}>
            {statusLabel}
          </CustomText>
          {subtitle ? (
            <CustomText size={14} css={styles.subtitle}>
              {subtitle}
            </CustomText>
          ) : null}
        </View>
        <Animated.View style={rotateStyle}>
          <ChevronDownIcon size={24} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
      {isExpanded && <View style={styles.details}>{renderDetails(item)}</View>}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#252850',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  title: {
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    color: '#B0B0B0',
  },
  details: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#3A3B5C',
  },
});

export default ExpandableListItem;
