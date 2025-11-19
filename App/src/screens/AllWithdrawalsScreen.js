import React from 'react';
import {View, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {ChevronLeftIcon} from 'react-native-heroicons/outline';
import Wrapper from '../layout/Wrapper';
import CustomText from '../components/CustomText';
import {FontFamily} from '../constants/Fonts';
import TransactionList from '../components/TransactionList';

const AllWithdrawalsScreen = () => {
  const navigation = useNavigation();

  const withdrawals = [
    {
      id: 1,
      title: 'Bank Transfer',
      subtitle: '$200.00',
      status: 'Completed',
      date: '2023-06-01',
      method: 'Bank Transfer',
    },
    {
      id: 2,
      title: 'PayPal',
      subtitle: '$150.00',
      status: 'Pending',
      date: '2023-06-02',
      method: 'PayPal',
    },
    {
      id: 3,
      title: 'Crypto',
      subtitle: '$300.00',
      status: 'Failed',
      date: '2023-06-03',
      method: 'Bitcoin',
    },
    // Add more withdrawals as needed
  ];

  const filters = ['All', 'Completed', 'Pending', 'Failed'];

  const renderDetails = item => (
    <View>
      <CustomText size={14} css={styles.detailText}>
        Date: {item.date}
      </CustomText>
      <CustomText size={14} css={styles.detailText}>
        Status: {item.status}
      </CustomText>
      <CustomText size={14} css={styles.detailText}>
        Method: {item.method}
      </CustomText>
    </View>
  );

  return (
    <Wrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <ChevronLeftIcon
            size={24}
            color="#fff"
            onPress={() => navigation.goBack()}
          />
          <CustomText
            size={20}
            fontFamily={FontFamily.Bold}
            css={styles.headerTitle}>
            All Withdrawals
          </CustomText>
          <View style={{width: 24}} />
        </View>
        <TransactionList
          data={withdrawals}
          filters={filters}
          renderDetails={renderDetails}
          emptyStateMessage="No withdrawals found"
        />
      </View>
    </Wrapper>
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
  detailText: {
    color: '#fff',
    marginBottom: 4,
  },
});

export default AllWithdrawalsScreen;
