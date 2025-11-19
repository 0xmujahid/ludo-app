import React, {useEffect} from 'react';
import {View, StyleSheet, Platform} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {
  HomeIcon,
  TrophyIcon,
  UsersIcon,
  WalletIcon,
} from 'react-native-heroicons/outline';
import {
  HomeIcon as HomeIconSolid,
  TrophyIcon as TrophyIconSolid,
  UsersIcon as UsersIconSolid,
  WalletIcon as WalletIconSolid,
} from 'react-native-heroicons/solid';

import HomeScreen from '../screens/HomeScreen';
import {Shadow} from 'react-native-shadow-2';
import LinearGradient from 'react-native-linear-gradient';
import WalletScreen from '../screens/WalletScreen';
import ReferralScreen from '../screens/ReferralScreen';
import TournamentScreen from '../screens/TournamentScreen';
import {useIsFocused} from '@react-navigation/native';
import {playSound} from '../utils/soundUtils';

const Tab = createBottomTabNavigator();

export default function Navigation() {
  const isFocused = useIsFocused();
  useEffect(() => {
    if (isFocused) {
      playSound('background', -1);
    }
    return () => {
      playSound('background', 0, true);
    };
  }, [isFocused]);
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.6)',
        tabBarShowLabel: false,
        tabBarItemStyle: styles.tabBarItem,
        tabBarBackground: () => (
          <LinearGradient
            colors={['#000000ff', '#1C1E49']}
            style={styles.background}
            start={{x: 0, y: 0}}
            end={{x: 0, y: 1}}></LinearGradient>
        ),
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({focused, color}) =>
            focused ? (
              <Shadow
                offset={[0, 0]}
                distance={8}
                startColor={'#2E3262'}
                endColor={'#4F558E'}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    backgroundColor: '#2E3161',
                    borderRadius: 50,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <HomeIconSolid color={color} size={24} />
                </View>
              </Shadow>
            ) : (
              <HomeIcon color={color} size={24} />
            ),
        }}
      />
      <Tab.Screen
        name="Tournament"
        component={TournamentScreen}
        options={{
          tabBarIcon: ({focused, color}) =>
            focused ? (
              <Shadow
                offset={[0, 0]}
                distance={8}
                startColor={'#2E3262'}
                endColor={'#4F558E'}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    backgroundColor: '#2E3161',
                    borderRadius: 50,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <TrophyIconSolid color={color} size={24} />
                </View>
              </Shadow>
            ) : (
              <TrophyIcon color={color} size={24} />
            ),
        }}
      />
      <Tab.Screen
        name="Referral"
        component={ReferralScreen}
        options={{
          tabBarIcon: ({focused, color}) =>
            focused ? (
              <Shadow
                offset={[0, 0]}
                distance={8}
                startColor={'#2E3262'}
                endColor={'#4F558E'}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    backgroundColor: '#2E3161',
                    borderRadius: 50,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <UsersIconSolid color={color} size={24} />
                </View>
              </Shadow>
            ) : (
              <UsersIcon color={color} size={24} />
            ),
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          tabBarIcon: ({focused, color}) =>
            focused ? (
              <Shadow
                offset={[0, 0]}
                distance={8}
                startColor={'#2E3262'}
                endColor={'#4F558E'}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    backgroundColor: '#2E3161',
                    borderRadius: 50,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <WalletIconSolid color={color} size={24} />
                </View>
              </Shadow>
            ) : (
              <WalletIcon color={color} size={24} />
            ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    borderTopRightRadius: 30,
    borderTopLeftRadius: 30,
  },
  screen: {
    flex: 1,
    backgroundColor: '#0A0F2C',
  },
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 0 : 0,
    height: 60,
    borderTopRightRadius: 30,
    borderTopLeftRadius: 30,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 3,
  },
  tabBarItem: {
    height: 60,
    marginTop: 10,
    borderRadius: 30,
  },
});
