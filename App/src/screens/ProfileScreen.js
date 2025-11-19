import React from 'react';
import {View, StyleSheet, Image, TouchableOpacity} from 'react-native';
import {PencilIcon, WalletIcon} from 'react-native-heroicons/outline';
import CustomText from '../components/CustomText';
import {FontFamily} from '../constants/Fonts';
import Wrapper from '../layout/Wrapper';
import {deviceWidth} from '../constants/Scaling';
import {selectWallet} from '../redux/reducers/wallet/walletSelectors';
import {selectUserInfo} from '../redux/reducers/app/appSelectors';
import {useSelector} from 'react-redux';
import {avatars} from '../constants/Avatar';

const ProfileScreen = ({navigation}) => {
  const userInfo = useSelector(selectUserInfo);
  const wallet = useSelector(selectWallet);

  return (
    <Wrapper>
      <View style={styles.container}>
        <View style={styles.profileContainer}>
          <View style={styles.avatarContainer}>
            <Image source={avatars[userInfo.avatarUrl]} style={styles.avatar} />
          </View>

          <CustomText size={14} css={styles.editPhotoText}>
            Edit Photo
          </CustomText>
        </View>

        <View style={styles.walletContainer}>
          <CustomText size={16} css={styles.walletText}>
            Wallet Balance
          </CustomText>
          <View style={styles.walletInfo}>
            <CustomText
              size={32}
              fontFamily={FontFamily.Bold}
              css={styles.walletAmount}>
              Rs. {wallet.balance}
            </CustomText>
            <TouchableOpacity style={styles.walletButton} onPress={() => navigation.navigate('MainTabs', { screen: 'Wallet' })}>
              <WalletIcon size={20} color="#fff" />
              <CustomText size={14} css={styles.walletButtonText}>
                Wallet
              </CustomText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.infoHeader}>
            <CustomText
              size={18}
              fontFamily={FontFamily.Bold}
              css={styles.infoTitle}>
              Vip Name : {userInfo.username}
            </CustomText>
            <TouchableOpacity>
              <PencilIcon size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <CustomText size={14} css={styles.infoText}>
            Rating: {userInfo.eloRating}
          </CustomText>
          <CustomText size={14} css={styles.infoText}>
            Ph. {userInfo.phoneNumber}
          </CustomText>
          <CustomText size={14} css={styles.kycText}>
            KYC : {userInfo.kycStatus.split('_').join(' ')}
          </CustomText>
          <CustomText size={14} css={styles.linkText}>
            TDS Certificate : N/A
          </CustomText>
          <CustomText size={14} css={styles.linkText}>
            Pan Card Verification : Not Done
          </CustomText>
        </View>
      </View>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    marginTop: 80,
  },
  avatarContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: '100%',
    marginBottom: 10,
  },
  profileContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 100,
  },
  editPhotoText: {
    color: '#fff',
  },
  walletContainer: {
    backgroundColor: 'black',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    width: deviceWidth - 60,
  },
  walletText: {
    color: '#fff',
    marginBottom: 10,
  },
  walletInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletAmount: {
    color: '#fff',
  },
  walletButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b3f6b',
    padding: 10,
    borderRadius: 8,
  },
  walletButtonText: {
    color: '#fff',
    marginLeft: 5,
  },
  infoContainer: {
    backgroundColor: '#252850',
    borderRadius: 16,
    padding: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoTitle: {
    color: '#fff',
  },
  infoText: {
    color: '#fff',
    marginBottom: 5,
  },
  kycText: {
    color: '#02BF2B',
    marginBottom: 5,
  },
  linkText: {
    color: '#ff3b7f',
    marginBottom: 5,
  },
});

export default ProfileScreen;
