import React, {useEffect, useState} from 'react';
import {View, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import moment from 'moment';
import {ChevronLeftIcon} from 'react-native-heroicons/outline';
import Wrapper from '../layout/Wrapper';
import CustomText from '../components/CustomText';
import {FontFamily} from '../constants/Fonts';
import TransactionList from '../components/TransactionList';
import {useDispatch, useSelector} from 'react-redux';
import {getTransaction} from '../api/transaction';
import {deviceWidth} from '../constants/Scaling';
import {updateTransaction} from '../redux/reducers/transaction/transactionSlice';
import {selectTransaction} from '../redux/reducers/transaction/transactionSelectors';

const AllTransactionsScreen = () => {
  const navigation = useNavigation();
  const transactionInfo = useSelector(selectTransaction);
  const [transactionList, setTransactions] = useState(
    transactionInfo.transaction,
  );

  const dispatch = useDispatch();

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

  const fetchTransaction = async () => {
    await dispatch(
      getTransaction(
        data => {
          if (data.transactions) {
            dispatch(updateTransaction(data.transactions));
          }
        },
        () => {},
      ),
    );
  };

  useEffect(() => {
    fetchTransaction();
  }, []);

  useEffect(() => {
    if (transactionInfo.transaction !== transactionList) {
      setTransactions(transactionInfo.transaction);
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
        Order ID: {item.orderId || '—'}
      </CustomText>
      <CustomText size={14} css={styles.detailText}>
        Payment ID: {item.paymentId || '—'}
      </CustomText>
      <CustomText size={14} css={styles.detailText}>
        Currency: {item.cryptoCurrency || '—'}
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
            All Transactions
          </CustomText>
          <View style={{width: 24}} />
        </View>
        <TransactionList
          data={transactionList}
          filters={filters}
          renderDetails={renderDetails}
          emptyStateMessage="No transactions found"
        />
      </View>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: deviceWidth - 20,
    backgroundColor: '#1a1b3c',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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

export default AllTransactionsScreen;
