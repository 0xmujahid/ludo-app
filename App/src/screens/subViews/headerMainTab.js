import React, {useEffect} from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  View,
  TouchableOpacity,
} from 'react-native';
import {useSelector, useDispatch} from 'react-redux';
import {selectUserInfo} from '../../redux/reducers/app/appSelectors';
import {deviceHeight, deviceWidth} from '../../constants/Scaling';
import {Bars3Icon} from 'react-native-heroicons/outline';
import {WalletIcon} from 'react-native-heroicons/solid';
import {Shadow} from 'react-native-shadow-2';
import CustomText from '../../components/CustomText';
import {FontFamily} from '../../constants/Fonts';
import {avatars} from '../../constants/Avatar';
import {navigate} from '../../utils/navigationUtils';
import {selectWallet} from '../../redux/reducers/wallet/walletSelectors';
import {getWalletBalance} from '../../api/wallet';
import {updateWallet} from '../../redux/reducers/wallet/walletSlice';
import {getLeaderBoard} from '../../api/game';
import {updateLeaderboard} from '../../redux/reducers/leaderboard/leaderboardSlice';

const HeaderMainTab = () => {
  const dispatch = useDispatch();
  const userInfo = useSelector(selectUserInfo);
  const wallet = useSelector(selectWallet);

  const handlePressOnProfile = () => {
    navigate('Profile');
  };
  const handlePressOnMenu = () => {
    navigate('Menu');
  };
  const handlePressOnWallet = () => {
    navigate('Wallet');
  };

  const fetchWalletBalance = async () => {
    await dispatch(
      getWalletBalance(
        data => {
          if (data.balance) {
            dispatch(updateWallet(data));
          }
        },
        () => {},
      ),
    );
  };

  const fetchLeaderBoard = async () => {
    await dispatch(
      getLeaderBoard(
        data => {
          if (data) {
            dispatch(updateLeaderboard(data));
          }
        },
        () => {},
      ),
    );
  };

  useEffect(() => {
    const interval = setInterval(() => {
      fetchWalletBalance();
      fetchLeaderBoard();
    }, 1000 * 60);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.header}>
      <View style={styles.headerSubContainer}>
        <TouchableOpacity
          onPress={handlePressOnProfile}
          style={styles.profileIconContainer}>
          <View style={styles.profileIcon}>
            <Image source={avatars[userInfo.avatarUrl]} style={styles.avatar} />
          </View>
          <View>
            <CustomText size={18} fontFamily={FontFamily.Bold}>
              {userInfo.username}
            </CustomText>
          </View>
        </TouchableOpacity>
      </View>
      <View style={styles.headerSubContainer}>
        <TouchableOpacity
          onPress={handlePressOnWallet}
          style={styles.walletIconContainer}>
          <WalletIcon size={18} color={'#000000'} />
          <View style={styles.walletDivider} />
          <CustomText size={14} color={'black'} fontFamily={FontFamily.Bold}>
            Rs. {wallet.balance}
          </CustomText>
        </TouchableOpacity>
        <TouchableOpacity onPress={handlePressOnMenu}>
          <Shadow
            startColor="#1b1c41ff"
            endColor="#1A1B3C"
            distance={6}
            offset={[0, 0]}>
            <Animated.View style={styles.menuIcon}>
              <Bars3Icon size={24} color={'#FFFFFF'} />
            </Animated.View>
          </Shadow>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  walletDivider: {height: 18, borderWidth: 1, borderColor: '#000000'},
  header: {
    width: deviceWidth,
    height: deviceHeight * 0.1,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 24,
    paddingHorizontal: 10,
    paddingVertical: 20,
    flexDirection: 'row',
  },
  headerSubContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    gap: 14,
  },
  profileIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profileIcon: {
    width: 40,
    aspectRatio: 1,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  menuIcon: {
    padding: 8,
    borderRadius: 50,
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  walletIconContainer: {
    padding: 5,
    paddingBottom: 7,
    paddingTop: 7,
    backgroundColor: '#f9c80e',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 6,
  },
});
export default HeaderMainTab;
