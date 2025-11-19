import React, {useState, useEffect} from 'react';
import {
  Animated,
  Image,
  StyleSheet,
  Platform,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Wrapper from '../layout/Wrapper';
import {deviceHeight, deviceWidth} from '../constants/Scaling';
import Logo from '../assets/images/logo.png';
import Button from '../components/Button';
import versionFromPack from '../../package.json';
import {checkAndRefreshToken, getAppVersion} from '../api/auth';
import {RFValue} from 'react-native-responsive-fontsize';
import {
  PERMISSIONS,
  request,
  check,
  openSettings,
  RESULTS,
} from 'react-native-permissions';
import Geolocation from 'react-native-geolocation-service';
import {useDispatch} from 'react-redux';
import {getWalletBalance} from '../api/wallet';
import {updateWallet} from '../redux/reducers/wallet/walletSlice';
import {getLeaderBoard} from '../api/game';
import {updateLeaderboard} from '../redux/reducers/leaderboard/leaderboardSlice';

const GOOGLE_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY'; // <-- Replace this

const bannedStates = ['assam', 'odisha', 'nagaland', 'sikkim'];

const GettingStarted = () => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [updateVersion, setUpdateVersion] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const [hideButton, setHideButton] = useState(false);

  const reverseGeocode = async (lat, lon) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=AIzaSyB-QrlE9CDQTebre7VbMyF4xkclfqEQ6QU`,
      );
      const data = await response.json();
      if (!data.results || data.results.length === 0) {
        throw new Error('No geocode results');
      }

      const stateComponent = data.results[0].address_components.find(
        component => component.types.includes('administrative_area_level_1'),
      );

      const state = stateComponent?.long_name?.toLowerCase();
      console.log('Detected State:', stateComponent);
      return state;
    } catch (error) {
      console.error('Google reverse geocoding failed:', error);
      return null;
    }
  };

  async function getUserLocation() {
    setIsLoading(true);
    try {
      let permissionType;
      if (Platform.OS === 'ios') {
        permissionType = PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;
      } else if (Platform.OS === 'android') {
        permissionType = PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
      } else {
        Alert.alert(
          'Unsupported Platform',
          'Location services are not available on this device.',
        );
        setIsLoading(false);
        return null;
      }

      let status = await check(permissionType);
      console.log('Location permission status:', status);

      if (status === RESULTS.DENIED) {
        Alert.alert(
          'Location Permission Required',
          'We need access to your location to provide core features. Please grant permission.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => setIsLoading(false),
            },
            {
              text: 'Grant Access',
              onPress: async () => {
                status = await request(permissionType);
                handlePermissionResult(status);
              },
            },
          ],
        );
        return null;
      } else if (status === RESULTS.BLOCKED) {
        Alert.alert(
          'Location Permission Blocked',
          'Location access is permanently denied. Please enable it in your device settings.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => setIsLoading(false),
            },
            {
              text: 'Open Settings',
              onPress: () => {
                openSettings();
                setIsLoading(false);
              },
            },
          ],
        );
        return null;
      } else if (status === RESULTS.UNAVAILABLE) {
        Alert.alert(
          'Location Unavailable',
          'Location services are not available on this device.',
        );
        setIsLoading(false);
        return null;
      } else if (status === RESULTS.GRANTED || status === RESULTS.LIMITED) {
        return await getCurrentLocationCoords();
      }
    } catch (err) {
      console.error('getUserLocation error:', err);
      Alert.alert(
        'Error',
        'An error occurred while checking location permission.',
      );
      setIsLoading(false);
      return null;
    }
  }

  const getCurrentLocationCoords = () => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        async position => {
          const {latitude, longitude} = position.coords;
          const userState = await reverseGeocode(latitude, latitude);

          if (bannedStates.includes(userState)) {
            Alert.alert(
              'Restricted Area',
              `Sorry, our services are not available in your state (${userState.toUpperCase()}).`,
            );
            setHideButton(true)
            setLocationGranted(false);
            setIsLoading(false);
            resolve(null);
            return;
          }
          setHideButton(false)
          setLocationGranted(true);
          setIsLoading(false);
          resolve(position.coords);
        },
        error => {
          console.warn('Geolocation error:', error.message);
          Alert.alert(
            'Location Error',
            `Could not get your location: ${error.message}`,
          );
          setIsLoading(false);
          setLocationGranted(false);
          reject(error);
        },
        {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
      );
    });
  };

  const handlePermissionResult = async status => {
    if (status === RESULTS.GRANTED || status === RESULTS.LIMITED) {
      const coords = await getCurrentLocationCoords();
      console.log('Coordinates after permission grant:', coords);
    } else {
      setIsLoading(false);
      setLocationGranted(false);
      Alert.alert(
        'Permission Error',
        'Location permission was not granted. Some features may not work.',
      );
    }
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

  const handleGettingStarted = async () => {
    setIsLoading(true);
    if (!locationGranted) {
      const coords = await getUserLocation();
      if (!coords) {
        setIsLoading(false);
        return;
      }
    }

    dispatch(
      checkAndRefreshToken(
        () => {
          fetchWalletBalance();
          fetchLeaderBoard();
          setIsLoading(false);
        },
        () => {
          setIsLoading(false);
        },
      ),
    );
  };

  const fetchAppVersion = async () => {
    await getUserLocation();

    await dispatch(
      getAppVersion(
        data => {
          if (versionFromPack.version !== data.version) {
            setUpdateVersion(true);
          }
        },
        () => {},
      ),
    );
  };

  useEffect(() => {
    fetchAppVersion();
  }, []);

  const LoadingOverlay = () => (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color="#FFFFFF" />
    </View>
  );

  return (
    <Wrapper style={styles.wrapper}>
      <Animated.View style={styles.imgContainer}>
        <Image source={Logo} style={styles.img} />
      </Animated.View>
     {!hideButton && <View style={styles.gettingStarted}>
        <Button
          disabled={isLoading || updateVersion || !locationGranted}
          title={`${
            updateVersion
              ? 'To Play Game Update the new Version from weblink'
              : 'Get Started'
          }`}
          onPress={handleGettingStarted}
        />
      </View>}
      {isLoading && <LoadingOverlay />}
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    justifyContent: 'flex-start',
  },
  imgContainer: {
    width: deviceWidth * 0.8,
    height: deviceHeight * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 150,
    alignSelf: 'center',
  },
  gettingStarted: {
    position: 'absolute',
    bottom: RFValue(80),
    width: '100%',
    alignItems: 'center',
  },
  img: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
});

export default GettingStarted;
