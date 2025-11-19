'use client';

import {useEffect, useRef, useState} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Dimensions,
  RefreshControl,
  Image,
  StatusBar,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {
  TrophyIcon,
  SparklesIcon,
  ChartBarIcon,
} from 'react-native-heroicons/solid';
import CustomText from '../components/CustomText';
import {FontFamily} from '../constants/Fonts';
import Wrapper from '../layout/Wrapper';
import {RFValue} from 'react-native-responsive-fontsize';
import Avatar6 from '../assets/images/avatars/avatar-6.png';
import Crown from '../assets/images/Icons/crown.png';
import {selectLeaderboard} from '../redux/reducers/leaderboard/leaderboardSelectors';
import {useDispatch, useSelector} from 'react-redux';
import {getLeaderBoard} from '../api/game';
import {updateLeaderboard} from '../redux/reducers/leaderboard/leaderboardSlice';
import {avatars} from '../constants/Avatar';
import {SafeAreaView} from 'react-native-safe-area-context';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

// Mock data - replace with your actual data source

const AnimatedCard = ({children, delay = 0}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, delay]);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{translateY: slideAnim}],
      }}>
      {children}
    </Animated.View>
  );
};

const TopThreeCard = ({player, index}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const getCardColors = rank => {
    switch (rank) {
      case 1:
        return ['#FFD700', '#FFA500'];
      case 2:
        return ['#C0C0C0', '#A8A8A8'];
      case 3:
        return ['#CD7F32', '#B8860B'];
      default:
        return ['#4facfe', '#00f2fe'];
    }
  };

  const getRankText = rank => {
    switch (rank) {
      case 1:
        return '1st';
      case 2:
        return '2nd';
      case 3:
        return '3rd';
      default:
        return `${rank}th`;
    }
  };

  const getWinRateColor = winRate => {
    if (winRate >= 80) return '#012f03ff';
    if (winRate >= 60) return '#472a00ff';
    if (winRate >= 40) return '#523d00ff';
    return '#470500ff';
  };

  return (
    <AnimatedCard delay={index * 200}>
      <Animated.View style={{transform: [{scale: scaleAnim}]}}>
        <TouchableOpacity
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
          style={styles.topThreeCard}>
          <LinearGradient
            colors={getCardColors(player.rank)}
            style={styles.topThreeGradient}>
            {/* Decorative Elements */}
            <View style={styles.decorativeElements}>
              {player.rank === 1 && (
                <Image source={Crown} style={styles.crownDecor} />
              )}
              <TrophyIcon
                size={20}
                color="rgba(255, 255, 255, 0.15)"
                style={styles.trophyDecor}
              />
              <SparklesIcon
                size={16}
                color="rgba(46, 45, 45, 0.4)"
                style={styles.sparkleDecor1}
              />
              <SparklesIcon
                size={12}
                color="rgba(59, 57, 57, 0.3)"
                style={styles.sparkleDecor2}
              />
            </View>

            {/* Main Content */}
            <View style={styles.topThreeMainContent}>
              {/* Top Row - Rank and Avatar */}
              <View style={styles.topThreeTopRow}>
                <View style={styles.topThreeRank}>
                  <CustomText
                    size={18}
                    fontFamily={FontFamily.Bold}
                    color="#000000ff">
                    {getRankText(player.rank)}
                  </CustomText>
                </View>

                <View style={styles.topThreeAvatar}>
                  <Image source={Avatar6} style={styles.topThreeAvatarImage} />
                  {player.rank === 1 && (
                    <View style={styles.winnerBadge}>
                      <TrophyIcon size={8} color="#000000" />
                    </View>
                  )}
                </View>

                <View style={styles.topThreeScore}>
                  <CustomText
                    size={20}
                    fontFamily={FontFamily.Bold}
                    color="#000000ff">
                    ₹{player.score.toLocaleString()}
                  </CustomText>
                  <CustomText size={12} color="rgba(0, 0, 0, 0.9)">
                    Total Score
                  </CustomText>
                </View>
              </View>

              {/* Bottom Row - Player Info and Stats */}
              <View style={styles.topThreeBottomRow}>
                <View style={styles.topThreePlayerInfo}>
                  <CustomText
                    size={16}
                    fontFamily={FontFamily.Bold}
                    color="#000000ff"
                    numberOfLines={1}>
                    {player.username}
                  </CustomText>
                </View>

                <View style={styles.topThreeStats}>
                  <View style={styles.topThreeStatItem}>
                    <CustomText
                      size={14}
                      fontFamily={FontFamily.Bold}
                      color="#000000ff">
                      {player.gamesPlayed}
                    </CustomText>
                    <CustomText size={10} color="rgba(0, 0, 0, 0.8)">
                      Games
                    </CustomText>
                  </View>

                  <View style={styles.topThreeStatDivider} />

                  <View style={styles.topThreeStatItem}>
                    <CustomText
                      size={14}
                      fontFamily={FontFamily.Bold}
                      color="#000000ff">
                      {player.gamesWon}
                    </CustomText>
                    <CustomText size={10} color="rgba(0, 0, 0, 0.8)">
                      Won
                    </CustomText>
                  </View>

                  <View style={styles.topThreeStatDivider} />

                  <View style={styles.topThreeStatItem}>
                    <CustomText
                      size={14}
                      fontFamily={FontFamily.Bold}
                      color={getWinRateColor(player.winRate)}>
                      {typeof player.winRate === 'number'
                        ? Number(player.winRate.toFixed(2))
                        : Number(parseFloat(player.winRate).toFixed(2))}
                      %
                    </CustomText>
                    <CustomText size={10} color="rgba(0, 0, 0, 0.8)">
                      Win Rate
                    </CustomText>
                  </View>
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </AnimatedCard>
  );
};
const RegularLeaderboardItem = ({player, index}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const getWinRateColor = winRate => {
    if (winRate >= 80) return '#4CAF50';
    if (winRate >= 60) return '#FF9800';
    if (winRate >= 40) return '#FFC107';
    return '#F44336';
  };

  return (
    <AnimatedCard delay={(index + 3) * 100}>
      <Animated.View style={{transform: [{scale: scaleAnim}]}}>
        <TouchableOpacity
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
          style={styles.regularItem}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)']}
            style={styles.regularItemGradient}>
            {/* Rank */}
            <View style={styles.regularRank}>
              <LinearGradient
                colors={[
                  'rgba(255, 255, 255, 0.2)',
                  'rgba(255, 255, 255, 0.1)',
                ]}
                style={styles.regularRankBadge}>
                <CustomText
                  size={14}
                  fontFamily={FontFamily.Bold}
                  color="#FFFFFF">
                  {player.rank}
                </CustomText>
              </LinearGradient>
            </View>

            {/* Avatar */}
            <View style={styles.regularAvatar}>
              <Image
                source={avatars[player.avatarUrl || 1]}
                style={styles.regularAvatarImage}
              />
            </View>

            {/* Player Info */}
            <View style={styles.regularInfo}>
              <CustomText
                size={16}
                fontFamily={FontFamily.Bold}
                color="#FFFFFF"
                numberOfLines={1}>
                {player.username}
              </CustomText>
              <View style={styles.regularStats}>
                <CustomText size={12} color="rgba(255, 255, 255, 0.7)">
                  {player.gamesPlayed} games • {player.gamesWon} wins
                </CustomText>
                <CustomText
                  size={12}
                  fontFamily={FontFamily.Medium}
                  color={getWinRateColor(player.winRate)}>
                  {player.winRate}% win rate
                </CustomText>
              </View>
            </View>

            {/* Score */}
            <View style={styles.regularScore}>
              <CustomText
                size={16}
                fontFamily={FontFamily.Bold}
                color="#FFFFFF">
                {player.score.toLocaleString()}
              </CustomText>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </AnimatedCard>
  );
};

const LeaderboardScreen = () => {
  const dispatch = useDispatch();
  const leaderboardData = useSelector(selectLeaderboard);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLeaderBoard = async () => {
    await dispatch(
      getLeaderBoard(
        data => {
          if (data) {
            dispatch(updateLeaderboard(data));
          }
          setRefreshing(false);
        },
        () => {
          setRefreshing(false);
        },
      ),
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    fetchLeaderBoard();
  };

  const topThree = leaderboardData.slice(0, 3);
  const remaining = leaderboardData.slice(3);

  const renderRegularItem = ({item, index}) => (
    <RegularLeaderboardItem player={item} index={index} />
  );

  const ListHeader = () => (
    <SafeAreaView
      style={{
        flex: 1,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
      }}
      edges={['top', 'left', 'right']}>
      {/* Header */}
      <AnimatedCard>
        <View style={styles.headerContainer}>
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            style={styles.headerIcon}>
            <TrophyIcon size={32} color="#FFFFFF" />
          </LinearGradient>
          {/* <CustomText
            size={28}
            fontFamily={FontFamily.Bold}
            color="#FFFFFF"
            style={styles.headerTitle}>
            Leaderboard
          </CustomText> */}
          <CustomText
            size={14}
            color="rgba(255, 255, 255, 0.7)"
            style={styles.headerSubtitle}>
            Top players ranked by total score
          </CustomText>
        </View>
      </AnimatedCard>
      {/* Top 3 Cards */}
      <View style={styles.topThreeContainer}>
        {topThree.map((player, index) => (
          <TopThreeCard key={player.userId} player={player} index={index} />
        ))}
      </View>
      {/* Remaining Players Header */}
      {remaining.length > 0 && (
        <AnimatedCard delay={600}>
          <View style={styles.remainingHeader}>
            <CustomText size={18} fontFamily={FontFamily.Bold} color="#FFFFFF">
              Other Rankings
            </CustomText>
            <View style={styles.remainingHeaderLine} />
          </View>
        </AnimatedCard>
      )}
    </SafeAreaView>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <ChartBarIcon size={64} color="rgba(255, 255, 255, 0.3)" />
      <CustomText
        size={18}
        fontFamily={FontFamily.Medium}
        color="rgba(255, 255, 255, 0.7)">
        No leaderboard data available
      </CustomText>
      <CustomText
        size={14}
        color="rgba(255, 255, 255, 0.5)"
        style={styles.emptySubtext}>
        Play some games to see rankings
      </CustomText>
    </View>
  );

  return (
    <Wrapper>
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.container}>
        <FlatList
          data={remaining}
          renderItem={renderRegularItem}
          keyExtractor={item => item.userId}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            remaining.length === 0 ? renderEmptyComponent : null
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#4facfe"
            />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </LinearGradient>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: RFValue(20),
    paddingBottom: RFValue(100),
  },
  headerContainer: {
    alignItems: 'center',
    paddingVertical: RFValue(20),
  },
  headerIcon: {
    width: RFValue(80),
    height: RFValue(80),
    borderRadius: RFValue(40),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: RFValue(10),
    marginTop: RFValue(20),

    shadowColor: '#FFD700',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  headerTitle: {
    textAlign: 'center',
    marginBottom: RFValue(8),
    letterSpacing: 1,
  },
  headerSubtitle: {
    textAlign: 'center',
  },
  topThreeContainer: {
    marginBottom: RFValue(10),
  },
  topThreeMainContent: {
    zIndex: 1,
  },
  topThreeTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: RFValue(16),
  },
  topThreeBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topThreePlayerInfo: {
    flex: 1,
  },
  topThreeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: RFValue(12),
    paddingHorizontal: RFValue(12),
    paddingVertical: RFValue(8),
  },
  topThreeStatItem: {
    alignItems: 'center',
    minWidth: RFValue(40),
  },
  topThreeStatDivider: {
    width: 1,
    height: RFValue(20),
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: RFValue(8),
  },
  topThreeScore: {
    alignItems: 'flex-end',
  },
  topThreeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  topThreeRank: {
    marginRight: RFValue(16),
  },
  topThreeAvatar: {
    width: RFValue(60),
    height: RFValue(60),
    borderRadius: RFValue(30),
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    marginRight: RFValue(16),
    position: 'relative',
  },
  topThreeAvatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  winnerBadge: {
    position: 'absolute',
    top: -RFValue(4),
    right: -RFValue(4),
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: RFValue(12),
    padding: RFValue(4),
  },
  topThreeInfo: {
    flex: 1,
  },
  crownDecor: {
    position: 'absolute',
    objectFit: 'contain',
    top: RFValue(10),
    left: RFValue(20),
    width: RFValue(24),
    height: RFValue(24),
    opacity: 1,
  },

  topThreeCard: {
    marginBottom: RFValue(16),
    borderRadius: RFValue(20),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    // elevation: 12,
  },
  topThreeGradient: {
    padding: RFValue(20),
    minHeight: RFValue(120),
    position: 'relative',
  },
  decorativeElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  trophyDecor: {
    position: 'absolute',
    top: RFValue(15),
    right: RFValue(20),
    opacity: 1,
  },
  sparkleDecor1: {
    position: 'absolute',
    bottom: RFValue(20),
    left: RFValue(30),
    opacity: 1,
  },
  sparkleDecor2: {
    position: 'absolute',
    bottom: RFValue(30),
    right: RFValue(30),
    opacity: 1,
  },

  remainingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: RFValue(20),
  },
  remainingHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginLeft: RFValue(16),
  },
  regularItem: {
    borderRadius: RFValue(16),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    // elevation: 4,
  },
  regularItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: RFValue(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  regularRank: {
    marginRight: RFValue(16),
  },
  regularRankBadge: {
    width: RFValue(40),
    height: RFValue(40),
    borderRadius: RFValue(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  regularAvatar: {
    width: RFValue(50),
    height: RFValue(50),
    borderRadius: RFValue(25),
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    marginRight: RFValue(16),
  },
  regularAvatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  regularInfo: {
    flex: 1,
    marginRight: RFValue(12),
  },
  regularStats: {
    marginTop: RFValue(4),
  },
  regularScore: {
    alignItems: 'flex-end',
  },
  separator: {
    height: RFValue(12),
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: RFValue(60),
  },
  emptySubtext: {
    textAlign: 'center',
    marginTop: RFValue(8),
  },
});

export default LeaderboardScreen;
