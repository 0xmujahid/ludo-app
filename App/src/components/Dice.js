import {
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Easing,
  Text,
} from 'react-native';

import LinearGradient from 'react-native-linear-gradient';
import {BackgroundImage} from '../utils/getIcons';
import Arrow from '../assets/images/arrow.png';
import LottieView from 'lottie-react-native';
import DiceRoll from '../assets/animation/diceroll.json';
import {playSound} from '../utils/soundUtils';
import React, {useMemo, useEffect, useRef, useState} from 'react';
import {avatars} from '../constants/Avatar';

const Dice = React.memo(
  ({
    color,
    rotate,
    player,
    playerDetail,
    currentTurn,
    diceValue,
    hasValidMoves,
    isGamePaused,
    onDiceRoll,
  }) => {
    const isDiceRolled = useMemo(() => diceValue > 0, [diceValue]);
    const isMyTurn = useMemo(
      () => playerDetail?.userId === currentTurn,
      [playerDetail, currentTurn],
    );

    const pileIcon = BackgroundImage.GetImage(color);
    const diceIcon = BackgroundImage.GetImage(diceValue);

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    const arrowAnim = useRef(new Animated.Value(0)).current;

    const [diceRolling, setDiceRolling] = useState(false);

    useEffect(() => {
      if (
        isMyTurn &&
        !isDiceRolled &&
        gameStatus === 'IN_PROGRESS' &&
        !isGamePaused
      ) {
        const animateArrow = () => {
          Animated.loop(
            Animated.sequence([
              Animated.timing(arrowAnim, {
                toValue: 10,
                duration: 600,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
              }),
              Animated.timing(arrowAnim, {
                toValue: -10,
                duration: 400,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
              }),
            ]),
          ).start();
        };
        animateArrow();
      } else {
        arrowAnim.stopAnimation();
        arrowAnim.setValue(0);
      }
    }, [isMyTurn, isDiceRolled, arrowAnim, isGamePaused]);

    const handleDicePress = async () => {
      if (!isMyTurn || isGamePaused || isDiceRolled || diceRolling) {
        console.log(
          'Cannot press dice: Not your turn, game paused, dice rolled, or already rolling',
        );
        return;
      }

      console.log('Dice pressed, calling onDiceRoll');

      playSound('dice_roll');
      setDiceRolling(true);

      await delay(800);

      onDiceRoll();
    };

    useEffect(() => {
      if (diceValue > 0) {
        setDiceRolling(false);
      }
    }, [diceValue]);

    return (
      <View style={[styles.flexRow, {transform: [{scaleX: rotate ? -1 : 1}]}]}>
        {/* Pile Icon (Player Indicator) */}
        <View style={styles.border1}>
          <LinearGradient
            style={styles.linearGradient}
            colors={
              playerDetail?.gradientColors || ['#0052be', '#5f9fcb', '#97c6c9']
            }
            start={{x: 0, y: 0.5}}
            end={{x: 1, y: 0.5}}>
            <View style={styles.pileContainer}>
              {/* Check if playerDetail exists before accessing avatar */}
              {playerDetail?.avatarIndex !== undefined && (
                <Image
                  source={avatars[playerDetail.avatarIndex % avatars.length]}
                  style={styles.avatarIcon}
                />
              )}
              {/* Fallback to pileIcon if no avatar */}
              {playerDetail?.avatarIndex === undefined && (
                <Image source={pileIcon} style={styles.pileIcon} />
              )}
            </View>
          </LinearGradient>
        </View>
        {/* Dice Area */}
        <View style={styles.border2}>
          <LinearGradient
            style={styles.diceGradient}
            colors={
              playerDetail?.diceGradientColors || [
                '#aac8ab',
                '#aac8ab',
                '#aac8ab',
              ]
            }
            start={{x: 0, y: 0.5}}
            end={{x: 1, y: 0.5}}>
            <View style={styles.diceContainer}>
              {/* Only show dice or rolling animation if it's this player's turn OR dice was just rolled */}
              {isMyTurn || isDiceRolled > 0 ? (
                <>
                  {diceRolling ? (
                    <LottieView
                      source={DiceRoll}
                      style={styles.rollingDice}
                      loop={false}
                      autoPlay
                      cacheComposition={true}
                      hardwareAccelerationAndroid
                    />
                  ) : (
                    <TouchableOpacity
                      disabled={!isMyTurn || isDiceRolled > 0 || isGamePaused}
                      activeOpacity={0.4}
                      onPress={handleDicePress}>
                      {/* Show dice value (0-6). 0 should show 1 perhaps, or an empty state */}
                      <Image
                        source={BackgroundImage.GetImage(
                          diceValue > 0 ? diceValue : 1,
                        )}
                        style={styles.dice}
                      />
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <Image
                  source={BackgroundImage.GetImage(1)}
                  style={[styles.dice, {opacity: 0.5}]}
                />
              )}
            </View>
          </LinearGradient>
        </View>
        {/* Turn Indicator Arrow */}
        {isMyTurn &&
        !isDiceRolled &&
        !isGamePaused &&
        gameStatus === 'IN_PROGRESS' ? (
          <Animated.View style={{transform: [{translateX: arrowAnim}]}}>
            <Image
              source={Arrow}
              style={{width: 50, height: 30, resizeMode: 'contain'}}
            />{' '}
            {/* Added resizeMode */}
          </Animated.View>
        ) : null}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  flexRow: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  pileIcon: {
    width: 35,
    height: 35,
    resizeMode: 'contain',
  },
  avatarIcon: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    resizeMode: 'cover',
    borderWidth: 1,
    borderColor: '#fff',
  },
  diceContainer: {
    backgroundColor: '#e8c0c1',
    borderWidth: 1,
    borderRadius: 5,
    width: 55,
    height: 55,
    paddingHorizontal: 8,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  pileContainer: {
    paddingHorizontal: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linearGradient: {
    padding: 1,
    borderWidth: 3,
    borderRightWidth: 0,
    borderColor: '#f0ce2c',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
  },
  dice: {
    height: 45,
    width: 45,
    resizeMode: 'contain',
  },
  rollingDice: {
    height: 80,
    width: 80,
    zIndex: 99,

    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{translateX: -40}, {translateY: -40}],
  },
  diceGradient: {
    borderWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#f0ce2c',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    overflow: 'hidden',
  },
  border1: {
    borderWidth: 3,
    borderRightWidth: 0,
    borderColor: '#f0ce2c',
    borderRadius: 10,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
  },
  border2: {
    borderWidth: 3,
    padding: 1,
    backgroundColor: '#aac8ab',
    borderRadius: 10,
    borderLeftWidth: 0,
    borderColor: '#f0ce2c',
    overflow: 'hidden',
  },
});

export default Dice;
