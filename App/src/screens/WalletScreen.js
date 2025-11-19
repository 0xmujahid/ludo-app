import React from 'react';
import {View, StyleSheet, TouchableOpacity, Pressable} from 'react-native';
import {ChevronRightIcon} from 'react-native-heroicons/outline';
import CustomText from '../components/CustomText';
import {FontFamily} from '../constants/Fonts';
import {deviceWidth} from '../constants/Scaling';
import HeaderMainTab from './subViews/headerMainTab';
import Wrapper from '../layout/Wrapper';
import {selectWallet} from '../redux/reducers/wallet/walletSelectors';
import {useSelector} from 'react-redux';
import {navigate} from '../utils/navigationUtils';

export default function WalletScreen() {
  const wallet = useSelector(selectWallet);

  const handleOnCashAdd = () => {
    navigate('AddMoney');
  };

  return (
    <Wrapper>
      <View style={styles.container}>
        <HeaderMainTab />
        <CustomText size={28} fontFamily={FontFamily.Bold} css={styles.title}>
          Wallet
        </CustomText>

        <View style={styles.card}>
          {/* Total Balance Section */}
          <View style={styles.section}>
            <View>
              <CustomText size={14} css={styles.label}>
                Total Balance
              </CustomText>
              <View style={styles.amountContainer}>
                <CustomText size={32} fontFamily={FontFamily.Bold}>
                  Rs. {wallet.balance}
                </CustomText>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                navigate('AllTransactions');
              }}
              style={styles.transactionButton}>
              <CustomText size={14}>All Transaction</CustomText>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Deposit Section */}
          <View style={styles.section}>
            <View>
              <CustomText size={14} css={styles.label}>
                Deposit
              </CustomText>
              <View style={styles.amountContainer}>
                <CustomText size={32} fontFamily={FontFamily.Bold}>
                  Rs.
                </CustomText>
                <CustomText size={32} fontFamily={FontFamily.Bold}>
                  {wallet.balance}
                </CustomText>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleOnCashAdd}
              style={styles.addCashButton}>
              <CustomText size={14} css={styles.buttonText}>
                Add Cash
              </CustomText>
            </TouchableOpacity>
          </View>

          {/* Cashback Info */}
          <Pressable style={styles.infoRow}>
            <CustomText size={14} css={styles.cashbackText}>
              {/* +Rs. 10 Cashback */}
              No callBack
            </CustomText>
            <TouchableOpacity
              onPress={() => {
                navigate('AllDeposits');
              }}
              style={styles.viewAllButton}>
              <CustomText size={14} css={styles.viewAllText}>
                View All
              </CustomText>
              <ChevronRightIcon size={16} color="#fff" />
            </TouchableOpacity>
          </Pressable>

          <View style={styles.divider} />

          {/* Winnings Section */}
          <View style={styles.section}>
            <View>
              <CustomText size={14} css={styles.label}>
                Winnings
              </CustomText>
              <View style={styles.amountContainer}>
                <CustomText size={32} fontFamily={FontFamily.Bold}>
                  Rs.
                </CustomText>
                <CustomText size={32} fontFamily={FontFamily.Bold}>
                  {wallet.winningAmount}
                </CustomText>
              </View>
            </View>
            <TouchableOpacity
              style={styles.withdrawButton}
              onPress={() => {
                navigate('AddWithdraw');
              }}>
              <CustomText size={14} css={styles.buttonText}>
                Withdraw
              </CustomText>
            </TouchableOpacity>
          </View>

          {/* Rush Rewards Info */}
          <Pressable style={styles.infoRow}>
            <CustomText size={14} css={styles.rewardsText}>
              {/* +Rs. 0 VIP Rewards */}
              No rewards
            </CustomText>
            <TouchableOpacity
              onPress={() => {
                navigate('AllWithdrawals');
              }}
              style={styles.viewAllButton}>
              <CustomText size={14} css={styles.viewAllText}>
                Pay to use
              </CustomText>
              <ChevronRightIcon size={16} color="#fff" />
            </TouchableOpacity>
          </Pressable>
        </View>
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: '#1a1b3c',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    color: '#fff',
    marginTop: 20,
  },
  card: {
    backgroundColor: '#252850',
    borderRadius: 30,
    padding: 20,
    width: deviceWidth - 40,
  },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  label: {
    color: '#fff',
    opacity: 0.7,
    marginBottom: 5,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#ffffff20',
    marginVertical: 15,
  },
  transactionButton: {
    backgroundColor: '#ffffff20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addCashButton: {
    backgroundColor: '#02BF2B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  withdrawButton: {
    backgroundColor: '#FF8A00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontFamily: FontFamily.Bold,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    color: '#fff',
    opacity: 0.7,
  },
  cashbackText: {
    color: '#02BF2B',
  },
  rewardsText: {
    color: '#FF8A00',
  },
});
