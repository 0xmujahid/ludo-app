import React, {useEffect, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {ChevronLeftIcon} from 'react-native-heroicons/outline';
import Wrapper from '../layout/Wrapper';
import CustomText from '../components/CustomText';
import {FontFamily} from '../constants/Fonts';
import TransactionList from '../components/TransactionList';
import {useDispatch, useSelector} from 'react-redux';
import {getTransaction} from '../api/transaction';
import {updateTransaction} from '../redux/reducers/transaction/transactionSlice';
import {selectTransaction} from '../redux/reducers/transaction/transactionSelectors';
import moment from 'moment';

const AllDepositsScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const transactionInfo = useSelector(selectTransaction);
  const [depositList, setDepositList] = useState(transactionInfo.transaction);

  const filters = [
    {
      tittle: 'All',
      value: 'all',
    },
    {
      tittle: 'Finished',
      value: 'finished',
    },
    {
      tittle: 'Pending',
      value: 'pending',
    },
    {
      tittle: 'Failed',
      value: 'failed',
    },
  ];

  const fetchDeposits = async () => {
    await getTransaction(
      data => {
        if (data.transactions) {
          dispatch(updateTransaction(data.transactions));
        }
      },
      () => {},
    );
  };

  useEffect(() => {
    fetchDeposits();
  }, []);

  useEffect(() => {
    if (transactionInfo.transaction !== depositList) {
      setDepositList(transactionInfo.transaction);
    }
  }, [transactionInfo.transaction]);

  const renderDetails = item => (
    <View>
      <CustomText size={14} css={styles.detailText}>
        Created: {moment(item.createdAt).format('hh:mm:ss DD/MM/yyyy')}
      </CustomText>
      <CustomText size={14} css={styles.detailText}>
        Status: {item.status || 'pending'}
      </CustomText>
      <CustomText size={14} css={styles.detailText}>
        Payment Status: {item.paymentStatus || 'pending'}
      </CustomText>
      <CustomText size={14} css={styles.detailText}>
        Pay Amount: {item.payAmount || item.cryptoAmount || '—'} {item.cryptoCurrency || ''}
      </CustomText>
      <CustomText size={14} css={styles.detailText}>
        Tokens Received: {item.gameTokens || 0}
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
            All Deposits
          </CustomText>
          <View style={{width: 24}} />
        </View>
        <TransactionList
          data={depositList}
          filters={filters}
          renderDetails={renderDetails}
          emptyStateMessage="No deposits found"
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

export default AllDepositsScreen;
