import React, {useEffect, useCallback} from 'react';
import {Image, StyleSheet, View, TouchableOpacity} from 'react-native';
import Wrapper from '../layout/Wrapper';
import {deviceWidth} from '../constants/Scaling';
import {useDispatch, useSelector} from 'react-redux';
import {TrophyIcon, SparklesIcon} from 'react-native-heroicons/solid';
import CustomText from '../components/CustomText';
import {FontFamily} from '../constants/Fonts';
import Crown from '../assets/images/Icons/crown.png';
import HeaderMainTab from './subViews/headerMainTab';
import HomeButton from './subViews/homeScreen/homeButton';
import {navigate} from '../utils/navigationUtils';
import {selectLeaderboard} from '../redux/reducers/leaderboard/leaderboardSelectors';
import {avatars} from '../constants/Avatar';
import {truncateString} from '../utils/common';

const HomeScreen = () => {
  const dispatch = useDispatch();
  const leaderboardList = useSelector(selectLeaderboard);
  const startGame = useCallback(mode => {
    navigate('GameListScreen', {mode});
  }, []);

  const navigateToLeaderboard = () => {
    navigate('Leaderboard');
  };

  const renderButtons = () => (
    <View style={styles.homeButtonsContainer}>
      <HomeButton
        title="Play"
        color="black"
        onPress={() => startGame('single')}
        lottieSource={require('../assets/animation/dice-animation-2.json')}
      />
      <HomeButton
        title="Create Custom"
        color="black"
        onPress={() => startGame('custom')}
        lottieSource={require('../assets/animation/gears.json')}
      />
    </View>
  );

  // Render function (not using useCallback here because it's simple)

  return (
    <Wrapper style={styles.wrapper}>
      <HeaderMainTab />
      <View style={styles.main}>
        <View style={styles.leaderboardContainer}>
          <CustomText
            css={{fontWeight: 700, textAlign: 'center'}}
            FontFamily={FontFamily.Bold}
            size={20}>
            LEADER BOARD
          </CustomText>
          <TouchableOpacity
            onPress={navigateToLeaderboard}
            activeOpacity={0.9}
            style={styles.leaderboard}>
            <View style={styles.leaderboardTop}>
              <View style={{alignItems: 'center'}}>
                <View style={{...styles.profileIcon, width: 45, marginTop: 25}}>
                  <Image
                    source={
                      avatars[
                        leaderboardList?.length && leaderboardList[1]
                          ? leaderboardList[1].avatarUrl
                          : 1
                      ]
                    }
                    style={styles.avatar}
                  />
                </View>
                <SparklesIcon
                  style={{position: 'absolute', top: '30%', left: -40}}
                  size={24}
                  color={'#FFFFFF'}
                />
                <CustomText size={12} fontFamily={FontFamily.Bold}>
                  2ⁿᵈ{' '}
                  {truncateString(
                    leaderboardList?.length && leaderboardList[1]
                      ? leaderboardList[1].username
                      : 'N/A',
                  )}
                </CustomText>
                <CustomText size={12}>
                  {leaderboardList?.length && leaderboardList[1]
                    ? leaderboardList[1].score
                    : 'N/A'}
                </CustomText>
              </View>
              <View style={{alignItems: 'center', position: 'relative'}}>
                <SparklesIcon
                  style={{position: 'absolute', top: 0, bottom: 0, left: -50}}
                  size={24}
                  color={'#FFFFFF'}
                />
                <SparklesIcon
                  style={{position: 'absolute', bottom: '30%', left: -40}}
                  size={24}
                  color={'#FFFFFF'}
                />
                <Image
                  source={Crown}
                  style={{
                    ...styles.avatar,
                    resizeMode: 'center',
                    position: 'absolute',
                    top: '-20%',
                    width: 95,
                  }}
                />
                <View style={{...styles.profileIcon, marginBottom: 20}}>
                  <Image
                    source={
                      avatars[
                        leaderboardList?.length && leaderboardList[0]
                          ? leaderboardList[0].avatarUrl
                          : 1
                      ]
                    }
                    style={styles.avatar}
                  />
                </View>
                <TrophyIcon
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: -6,
                  }}
                  size={24}
                  color={'#E5A335'}
                />
                <SparklesIcon
                  style={{position: 'absolute', top: 0, bottom: 0, right: -50}}
                  size={24}
                  color={'#FFFFFF'}
                />
                <SparklesIcon
                  style={{position: 'absolute', bottom: '30%', right: -40}}
                  size={24}
                  color={'#FFFFFF'}
                />
                <CustomText fontFamily={FontFamily.Bold} size={12}>
                  1ᵗʰ{' '}
                  {truncateString(
                    leaderboardList?.length && leaderboardList[0]
                      ? leaderboardList[0].username
                      : 'N/A',
                  )}
                </CustomText>
                <CustomText size={12}>
                  {leaderboardList?.length && leaderboardList[0]
                    ? leaderboardList[0].score
                    : 'N/A'}
                </CustomText>
              </View>
              <View style={{alignItems: 'center'}}>
                <View style={{...styles.profileIcon, width: 45, marginTop: 25}}>
                  <Image
                    source={
                      avatars[
                        leaderboardList?.length && leaderboardList[2]
                          ? leaderboardList[2].avatarUrl
                          : 1
                      ]
                    }
                    style={styles.avatar}
                  />
                </View>
                <SparklesIcon
                  style={{position: 'absolute', top: '30%', right: -40}}
                  size={24}
                  color={'#FFFFFF'}
                />
                <CustomText size={12} fontFamily={FontFamily.Bold}>
                  3ʳᵈ{' '}
                  {truncateString(
                    leaderboardList?.length && leaderboardList[2]
                      ? leaderboardList[2].username
                      : 'N/A'
                  )}
                </CustomText>
                <CustomText size={12}>
                  {leaderboardList?.length && leaderboardList[2]
                    ? leaderboardList[2].score
                    : 'N/A'}
                </CustomText>
              </View>
            </View>
            <View style={styles.leaderboardChart}>
              <View style={styles.chartRow}>
                <View style={styles.chartEntity}>
                  <CustomText>4ᵗʰ</CustomText>
                  <View style={styles.chartEntityContainer}>
                    <View style={{...styles.profileIcon, width: 25}}>
                      <Image
                        source={
                          avatars[
                            leaderboardList?.length && leaderboardList[3]
                              ? leaderboardList[3].avatarUrl
                              : 1
                          ]
                        }
                        style={styles.avatar}
                      />
                    </View>
                    <CustomText size={10}>
                      {truncateString(
                        leaderboardList?.length && leaderboardList[3]
                          ? leaderboardList[3].username
                          : 'N/A'
                      )}
                    </CustomText>
                    <CustomText size={10}>
                      {' '}
                      {leaderboardList?.length && leaderboardList[3]
                        ? leaderboardList[3].score
                        : 'N/A'}
                    </CustomText>
                  </View>
                </View>
                <View style={styles.chartEntity}>
                  <CustomText>5ᵗʰ</CustomText>
                  <View style={styles.chartEntityContainer}>
                    <View style={{...styles.profileIcon, width: 25}}>
                      <Image
                        source={
                          avatars[
                            leaderboardList?.length && leaderboardList[4]
                              ? leaderboardList[4].avatarUrl
                              : 1
                          ]
                        }
                        style={styles.avatar}
                      />
                    </View>
                    <CustomText size={10}>
                      {truncateString(
                        leaderboardList?.length && leaderboardList[4]
                          ? leaderboardList[4].username
                          : 'N/A'
                      )}
                    </CustomText>
                    <CustomText size={10}>
                      {' '}
                      {leaderboardList?.length && leaderboardList[4]
                        ? leaderboardList[4].score
                        : 'N/A'}
                    </CustomText>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.leaderboardChart}>
              <View style={styles.chartRow}>
                <View style={styles.chartEntity}>
                  <CustomText>6ᵗʰ</CustomText>
                  <View style={styles.chartEntityContainer}>
                    <View style={{...styles.profileIcon, width: 25}}>
                      <Image
                        source={
                          avatars[
                            leaderboardList?.length && leaderboardList[5]
                              ? leaderboardList[5].avatarUrl
                              : 1
                          ]
                        }
                        style={styles.avatar}
                      />
                    </View>
                    <CustomText size={10}>
                      {truncateString(
                        leaderboardList?.length && leaderboardList[5]
                          ? leaderboardList[5].username
                          : 'N/A'
                      )}
                    </CustomText>
                    <CustomText size={10}>
                      {' '}
                      {leaderboardList?.length && leaderboardList[5]
                        ? leaderboardList[5].score
                        : 'N/A'}
                    </CustomText>
                  </View>
                </View>
                <View style={styles.chartEntity}>
                  <CustomText>7ᵗʰ</CustomText>
                  <View style={styles.chartEntityContainer}>
                    <View style={{...styles.profileIcon, width: 25}}>
                      <Image
                        source={
                          avatars[
                            leaderboardList?.length && leaderboardList[6]
                              ? leaderboardList[6].avatarUrl
                              : 1
                          ]
                        }
                        style={styles.avatar}
                      />
                    </View>
                    <CustomText size={10}>
                      {truncateString(
                        leaderboardList?.length && leaderboardList[6]
                          ? leaderboardList[6].username
                          : 'N/A'
                      )}
                    </CustomText>
                    <CustomText size={10}>
                      {' '}
                      {leaderboardList?.length && leaderboardList[6]
                        ? leaderboardList[6].score
                        : 'N/A'}
                    </CustomText>
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      {renderButtons()}
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  main: {width: deviceWidth},
  wrapper: {
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  leaderboardContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: 8,
    marginTop: 40,
  },
  leaderboard: {
    marginHorizontal: 20,
    backgroundColor: '#2A2C62',
    borderRadius: 50,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  leaderboardTop: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    position: 'relative',
  },
  leaderboardChart: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  chartRow: {flexDirection: 'row', gap: 20, justifyContent: 'flex-start'},
  chartEntity: {gap: 4, flex: 1, flexDirection: 'row'},
  chartEntityContainer: {
    backgroundColor: '#1a1b3c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 150,
    gap: 8,
    paddingRight: 8,
    borderRadius: 50,
  },

  profileIcon: {
    width: 55,
    aspectRatio: 1,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },

  homeButtonsContainer: {
    width: deviceWidth - 40,
    marginTop: 20,
    gap: 16,
    padding: 20,
  },
});

export default HomeScreen;
