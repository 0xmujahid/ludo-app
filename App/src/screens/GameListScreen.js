import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {
  ChevronLeftIcon,
  WalletIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UsersIcon,
  CurrencyRupeeIcon,
} from 'react-native-heroicons/outline';
import Animated, {
  FadeInUp,
  FadeOutDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import CustomText from '../components/CustomText';
import {FontFamily} from '../constants/Fonts';
import Wrapper from '../layout/Wrapper';
import {navigate} from '../utils/navigationUtils';
import {selectWallet} from '../redux/reducers/wallet/walletSelectors';
import {useDispatch, useSelector} from 'react-redux';
import {getActiveGame} from '../api/game';
import {getActiveConfig} from '../api/config';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const filters = ['All', '2', '4'];

const GameCard = React.memo(({game, index, onPress, config}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{scale: scale.value}],
    };
  });

  const onPressIn = useCallback(() => {
    scale.value = withSpring(0.95);
  }, []);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1);
  }, []);

  const calculatePize = useCallback(
    (playerCount, entryFee, twoPlayers, threePlayers, fourPlayers) => {
      const totalMoney = entryFee * playerCount;
      const tdsValue = totalMoney * (config.tds / 100);
      const feeValue = totalMoney * (config.fee / 100);
      const leftMoney = totalMoney - tdsValue - feeValue;

      const prizeMoney = {
        firstPrize: 0,
        secondPrize: 0,
        thirdPrize: 0,
        fourthPrize: 0,
      };
      if (playerCount == 2) {
        prizeMoney.firstPrize = twoPlayers.first.amount
          ? (leftMoney / 100) * twoPlayers.first.amount
          : 0;
        prizeMoney.secondPrize = twoPlayers.second.amount
          ? (leftMoney / 100) * twoPlayers.second.amount
          : 0;
      } else if (playerCount == 3 && threePlayers.first) {
        prizeMoney.firstPrize = threePlayers.first.amount
          ? (leftMoney / 100) * threePlayers.first.amount
          : 0;
        prizeMoney.secondPrize = threePlayers.second.amount
          ? (leftMoney / 100) * threePlayers.second.amount
          : 0;
        prizeMoney.thirdPrize = threePlayers.third.amount
          ? (leftMoney / 100) * threePlayers.third.amount
          : 0;
      } else {
        prizeMoney.firstPrize = fourPlayers.first.amount
          ? (leftMoney / 100) * fourPlayers.first.amount
          : 0;
        prizeMoney.secondPrize = fourPlayers.second.amount
          ? (leftMoney / 100) * fourPlayers.second.amount
          : 0;
        prizeMoney.thirdPrize = fourPlayers.third.amount
          ? (leftMoney / 100) * fourPlayers.third.amount
          : 0;
        prizeMoney.fourthPrize = fourPlayers.fourth.amount
          ? (leftMoney / 100) * fourPlayers.fourth.amount
          : 0;
      }

      return prizeMoney;
    },
    [config],
  );

  return (
    <AnimatedTouchable
      style={[
        styles.gameCard,
        animatedStyle,
        !game.isActive && styles.gameCardDisabled,
      ]}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
      key={game.id}
      onPress={onPress}
      disabled={!game.isActive}
      entering={FadeInUp.delay(index * 100)}
      exiting={FadeOutDown}>
      <View style={styles.gameHeader}>
        <CustomText
          size={18}
          fontFamily={FontFamily.Bold}
          css={styles.gameName}>
          {game.name}
        </CustomText>
        {game.isActive ? (
          <CheckCircleIcon size={24} color="#4CAF50" />
        ) : (
          <XCircleIcon size={24} color="#FF5252" />
        )}
      </View>
      <View style={styles.gameInfo}>
        <View style={styles.infoItem}>
          <CurrencyRupeeIcon size={20} color="#FFD700" />
          <CustomText size={14} css={styles.infoText}>
            First Prize: ₹
            {calculatePize(
              game.maxPlayers,
              game.entryFee,
              game.twoPlayers,
              game.threePlayers,
              game.fourPlayers,
            ).firstPrize.toFixed(2)}
          </CustomText>
        </View>
        {!!calculatePize(
          game.maxPlayers,
          game.entryFee,
          game.twoPlayers,
          game.threePlayers,
          game.fourPlayers,
        ).secondPrize && (
          <View style={styles.infoItem}>
            <CurrencyRupeeIcon size={20} color="#FFD700" />
            <CustomText size={14} css={styles.infoText}>
              Second Prize: ₹
              {calculatePize(
                game.maxPlayers,
                game.entryFee,
                game.twoPlayers,
                game.threePlayers,
                game.fourPlayers,
              ).secondPrize.toFixed(2)}
            </CustomText>
          </View>
        )}
        <View style={styles.infoItem}>
          <WalletIcon size={20} color="#4CAF50" />
          <CustomText size={14} css={styles.infoText}>
            Joining Fee: ₹{game.entryFee}
          </CustomText>
        </View>
        {!!game.timeLimit && (
          <View style={styles.infoItem}>
            <ClockIcon size={20} color="#2196F3" />
            <CustomText size={14} css={styles.infoText}>
              Time Limit: {game.timeLimit / 60} min
            </CustomText>
          </View>
        )}
        <View style={styles.infoItem}>
          <UsersIcon size={20} color="#9C27B0" />
          <CustomText size={14} css={styles.infoText}>
            {game.maxPlayers} Players
          </CustomText>
        </View>
      </View>
    </AnimatedTouchable>
  );
});

const SkeletonCard = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonHeader}>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonIcon} />
    </View>
    <View style={styles.skeletonInfo}>
      {[1, 2, 3, 4].map(item => (
        <View key={item} style={styles.skeletonInfoItem}>
          <View style={styles.skeletonIcon} />
          <View style={styles.skeletonText} />
        </View>
      ))}
    </View>
  </View>
);

const GameListScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const wallet = useSelector(selectWallet);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [config, setConfig] = useState({});
  const [games, setGames] = useState([]);

  const fetchGames = async () => {
    dispatch(
      getActiveGame(
        response => {
          setGames(response.data || []);
          console.log(response.data);
          setIsLoading(false);
        },
        () => {
          setIsLoading(false);
        },
      ),
    );
  };

  const fetchActiveConfig = async () => {
    setIsLoading(true);
    dispatch(
      getActiveConfig(
        response => {
          setConfig(response);
          fetchGames();
        },
        () => {},
      ),
    );
  };

  useEffect(() => {
    fetchActiveConfig();
  }, []);

  const filterGames = useCallback(() => {
    return games.filter(game => {
      if (activeFilter === 'All') {
        return game;
      } else {
        return game.maxPlayers == activeFilter;
      }
    });
  }, [games, activeFilter]);

  const renderGameCard = useCallback(
    ({item, index}) => (
      <GameCard
        game={item}
        config={config}
        key={item.id}
        index={index}
        onPress={() => {
          if (parseFloat(wallet.balance) >= parseFloat(item.entryFee)) {
            navigate('GameLobby', {gameType: item});
          } else {
            alert(
              'Insufficient balance, please top up your wallet to join the game.',
            );
          }
        }}
      />
    ),
    [wallet.balance, config],
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <FlatList
          data={[1, 2, 3, 4]}
          renderItem={() => <SkeletonCard />}
          keyExtractor={item => item.toString()}
          contentContainerStyle={styles.gameList}
        />
      );
    } else {
      return (
        <FlatList
          data={filterGames()}
          renderItem={renderGameCard}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.gameList}
        />
      );
    }
  };

  return (
    <Wrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ChevronLeftIcon size={24} color="#fff" />
          </TouchableOpacity>
          <CustomText
            size={20}
            fontFamily={FontFamily.Bold}
            css={styles.headerTitle}>
            Games
          </CustomText>
          <View style={styles.walletInfo}>
            <WalletIcon size={24} color="#FFD700" />
            <CustomText
              size={16}
              fontFamily={FontFamily.Bold}
              css={styles.walletAmount}>
              Rs. {wallet.balance}
            </CustomText>
          </View>
        </View>

        <View style={styles.filtersContainer}>
          {filters.map(filter => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                activeFilter === filter && styles.activeFilterButton,
              ]}
              onPress={() => setActiveFilter(filter)}>
              <CustomText
                size={14}
                fontFamily={FontFamily.Medium}
                css={[
                  styles.filterText,
                  activeFilter === filter && styles.activeFilterText,
                ]}>
                {filter} {filter !== 'All' ? 'Players' : ''}
              </CustomText>
            </TouchableOpacity>
          ))}
        </View>

        {renderContent()}
      </View>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#1a1b3c',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#252850',
  },
  headerTitle: {
    color: '#fff',
    textAlign: 'center',
    marginLeft: 50,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletAmount: {
    color: '#FFD700',
    marginLeft: 8,
  },
  filtersContainer: {
    display: 'flex',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#252850',
  },
  activeFilterButton: {
    backgroundColor: '#ff3b7f',
  },
  filterText: {
    color: '#fff',
  },
  activeFilterText: {
    color: '#fff',
  },
  gameList: {
    paddingHorizontal: 16,
  },
  gameCard: {
    backgroundColor: '#252850',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  gameCardDisabled: {
    backgroundColor: '#000112',
    opacity: 0.4,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gameName: {
    color: '#fff',
  },
  gameInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 8,
  },
  infoText: {
    color: '#fff',
    marginLeft: 8,
  },
  skeletonCard: {
    backgroundColor: '#252850',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  skeletonTitle: {
    width: '60%',
    height: 20,
    backgroundColor: '#3a3b5c',
    borderRadius: 4,
  },
  skeletonIcon: {
    width: 24,
    height: 24,
    backgroundColor: '#3a3b5c',
    borderRadius: 12,
  },
  skeletonInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skeletonInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    marginBottom: 8,
  },
  skeletonText: {
    width: '70%',
    height: 16,
    backgroundColor: '#3a3b5c',
    borderRadius: 4,
    marginLeft: 8,
  },
});

export default GameListScreen;
