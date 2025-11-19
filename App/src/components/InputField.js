import {useRef, useState} from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Dimensions,
  Animated,
  SafeAreaView,
} from 'react-native';
import {
  ChevronDownIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from 'react-native-heroicons/outline';
import LinearGradient from 'react-native-linear-gradient';
import CustomText from './CustomText';
import CountryCode from '../constants/CountryCodes.json';
import {RFValue} from 'react-native-responsive-fontsize';
import {FontFamily} from '../constants/Fonts';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

export default function InputField({
  id,
  type = 'text',
  label = '',
  placeholder = '',
  value = '',
  onChangeText,
  error = false,
  errorMessage = '',
  showErrorIcon = false,
  showErrorMessage = true,
  validate,
  setCountryCode,
  maxLength = '',
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [isCountryModalVisible, setIsCountryModalVisible] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(CountryCode[0]);
  const [localError, setLocalError] = useState(false);
  const [localErrorMessage, setLocalErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const inputRef = useRef(null);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const errorAnim = useRef(new Animated.Value(0)).current;

  const formatPhoneNumber = text => {
    const cleaned = text.replace(/\D/g, '');
    onChangeText(cleaned);
    validateInput(cleaned);
  };

  const validateInput = text => {
    if (validate) {
      const isValid = validate(text);
      setLocalError(!isValid);
      setLocalErrorMessage(isValid ? '' : 'Invalid input');

      // Animate error state
      Animated.spring(errorAnim, {
        toValue: isValid ? 0 : 1,
        useNativeDriver: false,
      }).start();
    }
  };

  const handleChangeText = text => {
    if (type === 'phone') {
      formatPhoneNumber(text);
    } else {
      onChangeText(text);
      validateInput(text);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(focusAnim, {
      toValue: 1,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(focusAnim, {
      toValue: 0,
      useNativeDriver: false,
    }).start();
  };

  const openCountryModal = () => {
    setIsCountryModalVisible(true);
  };

  const closeCountryModal = () => {
    setIsCountryModalVisible(false);
    setSearchQuery('');
  };

  const selectCountry = item => {
    setSelectedCountry(item);
    if (setCountryCode) {
      setCountryCode(item);
    }
    closeCountryModal();
  };

  // Filter countries based on search query
  const filteredCountries = CountryCode.filter(
    country =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.dial_code.includes(searchQuery) ||
      country.code.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const renderCountryItem = ({item, index}) => (
    <TouchableOpacity
      style={[
        styles.countryItem,
        index === filteredCountries.length - 1 && styles.lastCountryItem,
      ]}
      onPress={() => selectCountry(item)}
      activeOpacity={0.7}>
      <LinearGradient
        colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)']}
        style={styles.countryItemGradient}>
        <View style={styles.countryInfo}>
          <CustomText
            fontFamily={FontFamily.Medium}
            size={RFValue(14)}
            color="#FFFFFF">
            {item.name}
          </CustomText>
          <CustomText
            fontFamily={FontFamily.Light}
            size={RFValue(12)}
            color="rgba(255,255,255,0.7)">
            {item.code}
          </CustomText>
        </View>
        <View style={styles.dialCodeContainer}>
          <LinearGradient
            colors={['#4facfe', '#00f2fe']}
            style={styles.dialCodeBadge}>
            <CustomText
              fontFamily={FontFamily.Bold}
              size={RFValue(12)}
              color="#FFFFFF">
              {item.dial_code}
            </CustomText>
          </LinearGradient>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const showError = error || localError;
  const errorMessageToShow =
    showErrorMessage && (errorMessage || localErrorMessage);

  // Animated styles
  const focusedBorderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(79, 93, 163, 0.3)', '#4facfe'],
  });

  const errorBorderColor = errorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', '#ef4444'],
  });

  return (
    <View id={id} style={styles.container}>
      {label && (
        <View style={styles.labelContainer}>
          <CustomText
            fontFamily={FontFamily.Medium}
            size={RFValue(14)}
            color="#FFFFFF"
            style={styles.label}>
            {label}
          </CustomText>
        </View>
      )}

      <Animated.View
        style={[
          styles.inputContainer,
          {
            borderColor: showError ? errorBorderColor : focusedBorderColor,
          },
        ]}>
        {/* Single LinearGradient container for seamless appearance */}
        <LinearGradient
          colors={['rgba(42, 47, 79, 0.8)', 'rgba(42, 47, 79, 0.6)']}
          style={styles.inputGradient}>
          {type === 'phone' && (
            <TouchableOpacity
              style={styles.countryCodeButton}
              onPress={openCountryModal}
              activeOpacity={0.8}>
              <View style={styles.countryCodeContent}>
                <CustomText
                  fontFamily={FontFamily.Bold}
                  size={RFValue(14)}
                  color="#4facfe">
                  {selectedCountry.dial_code}
                </CustomText>
                <ChevronDownIcon
                  size={18}
                  color="#4facfe"
                  style={styles.chevronIcon}
                />
              </View>
              <View style={styles.separator} />
            </TouchableOpacity>
          )}

          <TextInput
            ref={inputRef}
            style={[styles.input, type === 'phone' && styles.phoneInput]}
            placeholder={placeholder}
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={value}
            onChangeText={handleChangeText}
            keyboardAppearance="dark"
            keyboardType={type === 'phone' ? 'numeric-pad' : 'default'}
            onFocus={handleFocus}
            onBlur={handleBlur}
            selectionColor="#4facfe"
            {...props}
          />

          {showError && showErrorIcon && (
            <Animated.View
              style={[styles.errorIconContainer, {opacity: errorAnim}]}>
              <LinearGradient
                colors={['#ef4444', '#dc2626']}
                style={styles.errorIconGradient}>
                <ExclamationCircleIcon size={16} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>
          )}
        </LinearGradient>
      </Animated.View>

      {showError && errorMessageToShow && (
        <Animated.View style={[styles.errorContainer, {opacity: errorAnim}]}>
          <CustomText
            fontFamily={FontFamily.Light}
            size={RFValue(12)}
            color="#ef4444"
            style={styles.errorText}>
            {errorMessageToShow}
          </CustomText>
        </Animated.View>
      )}

      {/* Fixed Modal */}
      <Modal
        visible={isCountryModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={closeCountryModal}
        presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafeArea}>
          <LinearGradient
            colors={['#1a1a2e', '#16213e']}
            style={styles.modalGradient}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <CustomText
                  fontFamily={FontFamily.Bold}
                  size={RFValue(20)}
                  color="#FFFFFF">
                  Select Country
                </CustomText>
                <CustomText
                  fontFamily={FontFamily.Light}
                  size={RFValue(14)}
                  color="rgba(255,255,255,0.7)">
                  Choose your country code
                </CustomText>
              </View>
              <TouchableOpacity
                onPress={closeCountryModal}
                style={styles.closeButton}
                activeOpacity={0.7}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                  style={styles.closeButtonGradient}>
                  <XMarkIcon size={24} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <LinearGradient
                colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                style={styles.searchGradient}>
                <MagnifyingGlassIcon
                  size={20}
                  color="rgba(255,255,255,0.7)"
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search countries..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  keyboardAppearance="dark"
                  selectionColor="#4facfe"
                  maxLength={maxLength}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery('')}
                    style={styles.clearSearchButton}>
                    <XMarkIcon size={16} color="rgba(255,255,255,0.7)" />
                  </TouchableOpacity>
                )}
              </LinearGradient>
            </View>

            {/* Countries List */}
            <FlatList
              data={filteredCountries}
              renderItem={renderCountryItem}
              keyExtractor={item => item.code}
              style={styles.countriesList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <CustomText
                    fontFamily={FontFamily.Light}
                    size={RFValue(16)}
                    color="rgba(255,255,255,0.7)">
                    No countries found
                  </CustomText>
                </View>
              }
            />
          </LinearGradient>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: RFValue(8),
  },
  labelContainer: {
    marginBottom: RFValue(8),
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    borderRadius: RFValue(14),
    borderWidth: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    backgroundColor: 'transparent',
  },
  inputGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: RFValue(56),
    borderRadius: RFValue(12), // Ensure this matches the container's border radius
  },
  countryCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryCodeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: RFValue(16),
    paddingVertical: RFValue(18),
  },
  separator: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: RFValue(4),
  },
  chevronIcon: {
    marginLeft: RFValue(8),
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: RFValue(16),
    fontFamily: FontFamily.Medium,
    paddingHorizontal: RFValue(16),
    paddingVertical: RFValue(18),
    borderWidth: 0,
    outline: 'none', // For web compatibility
  },
  phoneInput: {
    paddingLeft: RFValue(12),
  },
  errorIconContainer: {
    marginRight: RFValue(12),
    width: RFValue(28),
    height: RFValue(28),
    borderRadius: RFValue(14),
    overflow: 'hidden',
  },
  errorIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    marginTop: RFValue(6),
    paddingHorizontal: RFValue(4),
  },
  errorText: {
    textAlign: 'left',
  },
  modalSafeArea: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  modalGradient: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: RFValue(20),
    paddingVertical: RFValue(20),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitleContainer: {
    flex: 1,
  },
  closeButton: {
    width: RFValue(44),
    height: RFValue(44),
    borderRadius: RFValue(22),
    overflow: 'hidden',
  },
  closeButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: RFValue(20),
    paddingVertical: RFValue(16),
  },
  searchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RFValue(12),
    paddingHorizontal: RFValue(16),
    paddingVertical: RFValue(14),
  },
  searchIcon: {
    marginRight: RFValue(12),
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: RFValue(16),
    fontFamily: FontFamily.Medium,
  },
  clearSearchButton: {
    padding: RFValue(8),
  },
  countriesList: {
    flex: 1,
    paddingHorizontal: RFValue(20),
  },
  countryItem: {
    marginBottom: RFValue(8),
    borderRadius: RFValue(12),
    overflow: 'hidden',
  },
  lastCountryItem: {
    marginBottom: RFValue(20),
  },
  countryItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: RFValue(16),
    paddingVertical: RFValue(16),
  },
  countryInfo: {
    flex: 1,
  },
  dialCodeContainer: {
    marginLeft: RFValue(12),
  },
  dialCodeBadge: {
    paddingHorizontal: RFValue(12),
    paddingVertical: RFValue(6),
    borderRadius: RFValue(16),
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: RFValue(40),
  },
});
