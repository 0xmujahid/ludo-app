import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {navigationRef} from '../utils/navigationUtils';
import SplashScreen from '../screens/SplashScreen';
import GettingStarted from '../screens/GettingStarted';
import SignIn from '../screens/SignIn';
import VipSetupScreen from '../screens/VipSetupScreen';
import TabNavigation from '../layout/MainTab';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsSupportScreen from '../screens/SettingsSupportScreen';
import GameListScreen from '../screens/GameListScreen';
import GameLobbyScreen from '../screens/GameLobbyScreen';
import AddMoneyScreen from '../screens/AddMoneyScreen';
import AllTransactionsScreen from '../screens/AllTransactionsScreen';
import AllDepositsScreen from '../screens/AllDepositsScreen';
import AllWithdrawalsScreen from '../screens/AllWithdrawalsScreen';
import AddWithdrawScreen from '../screens/AddWithdrawScreen';
import GameRoom from '../screens/GameRoom';
import LeaderboardScreen from '../screens/LeaderboardScreen';

const Stack = createNativeStackNavigator();

function Navigation() {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName="SplashScreen"
        screenOptions={() => ({
          headerShown: false,
        })}>
        <Stack.Screen name="SplashScreen" component={SplashScreen} />
        <Stack.Screen
          name="GettingStarted"
          options={{
            animation: 'fade',
          }}
          component={GettingStarted}
        />
        <Stack.Screen
          name="SignIn"
          options={{
            animation: 'fade',
          }}
          initialParams={{
            number: '',
            numberCode: {},
            optScreen: false,
          }}
          component={SignIn}
        />
        <Stack.Screen
          name="Registration"
          options={{
            animation: 'fade',
          }}
          component={VipSetupScreen}
        />
        <Stack.Screen
          name="MainTabs"
          options={{
            animation: 'fade',
          }}
          component={TabNavigation}
        />
        <Stack.Screen
          name="GameListScreen"
          options={{
            animation: 'fade',
          }}
          component={GameListScreen}
        />
        <Stack.Screen
          name="GameRoom"
          options={{
            animation: 'slide_from_bottom',
          }}
          initialParams={{
            gameId: '',
            roomCode: '',
            userId: '',
            gameType: {},
          }}
          component={GameRoom}
        />
        <Stack.Screen
          name="GameLobby"
          options={{
            animation: 'fade',
          }}
          initialParams={{
            gameType: {},
          }}
          component={GameLobbyScreen}
        />
        <Stack.Screen
          name="AddMoney"
          options={{
            animation: 'fade',
          }}
          component={AddMoneyScreen}
        />
        <Stack.Screen
          name="AddWithdraw"
          options={{
            animation: 'fade',
          }}
          component={AddWithdrawScreen}
        />
        <Stack.Screen
          name="AllTransactions"
          options={{
            animation: 'fade',
          }}
          component={AllTransactionsScreen}
        />
        <Stack.Screen
          name="AllDeposits"
          options={{
            animation: 'fade',
          }}
          component={AllDepositsScreen}
        />
        <Stack.Screen
          name="AllWithdrawals"
          options={{
            animation: 'fade',
          }}
          component={AllWithdrawalsScreen}
        />
        <Stack.Screen
          name="Profile"
          options={{
            animation: 'ios_from_left',
            headerShown: true,
            title: 'Profile',
            headerTitleAlign: 'center',
            headerStyle: {
              backgroundColor: '#23244d',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            headerBackVisible: true,
          }}
          component={ProfileScreen}
        />
        <Stack.Screen
          name="Menu"
          options={{
            animation: 'ios_from_right',
            headerShown: true,
            title: 'Setting & Support',
            headerTitleAlign: 'center',
            headerStyle: {
              backgroundColor: '#23244d',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: '600',
            },
            headerBackVisible: true,
          }}
          component={SettingsSupportScreen}
        />
        <Stack.Screen
          name="Leaderboard"
          options={{
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Leaderboard',
            headerTitleAlign: 'center',
            headerStyle: {
              backgroundColor: '#1a1a2e',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
              fontSize: 18,
            },
            headerBackVisible: true,
            headerBackTitleVisible: false,
          }}
          component={LeaderboardScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default Navigation;
