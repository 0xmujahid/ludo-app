import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Clipboard,
  ActivityIndicator,
  Linking,
} from 'react-native';
import {
  ChevronLeftIcon,
  ClipboardIcon,
  ArrowTopRightOnSquareIcon,
} from 'react-native-heroicons/outline';
import Snackbar from 'react-native-snackbar';
import CustomText from '../components/CustomText';
import {FontFamily} from '../constants/Fonts';
import {deviceHeight} from '../constants/Scaling';
import {goBack} from '../utils/navigationUtils';
import {
  getSupportedCurrencies,
  getMinimumAmount,
  estimateDeposit,
  createDeposit,
  getCryptoTransactionStatus,
} from '../api/crypto';

const DEBOUNCE_DELAY = 400;

const CurrencyChip = ({label, subtitle, isActive, onPress}) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.currencyChip, isActive && styles.currencyChipActive]}>
    <CustomText
      size={16}
      fontFamily={FontFamily.Bold}
      css={isActive ? styles.currencyTextActive : styles.currencyText}>
      {label}
    </CustomText>
    {subtitle ? (
      <CustomText
        size={12}
        css={isActive ? styles.currencyTextActive : styles.currencyText}>
        {subtitle}
      </CustomText>
    ) : null}
  </TouchableOpacity>
);

const DetailRow = ({label, value, onCopy, onOpen}) => (
  <View style={styles.detailRow}>
    <View style={styles.detailTextContainer}>
      <CustomText size={12} css={styles.detailLabel}>
        {label}
      </CustomText>
      <CustomText size={16} fontFamily={FontFamily.Bold} css={styles.detailValue}>
        {value || '—'}
      </CustomText>
    </View>
    {onCopy ? (
      <TouchableOpacity style={styles.iconButton} onPress={onCopy}>
        <ClipboardIcon size={18} color="#fff" />
      </TouchableOpacity>
    ) : null}
    {onOpen ? (
      <TouchableOpacity style={styles.iconButton} onPress={onOpen}>
        <ArrowTopRightOnSquareIcon size={18} color="#fff" />
      </TouchableOpacity>
    ) : null}
  </View>
);

const AddMoneyScreen = () => {
  const [currencies, setCurrencies] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [amount, setAmount] = useState('');
  const [minAmount, setMinAmount] = useState(5);
  const [estimation, setEstimation] = useState(null);
  const [estimationError, setEstimationError] = useState(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [statusDetails, setStatusDetails] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef(null);
  const searchDebounceTimer = useRef(null);

  const showError = (message) => {
    Snackbar.show({
      text: message,
      duration: 3000,
      marginBottom: deviceHeight - 100,
      backgroundColor: 'black',
      fontFamily: FontFamily.Bold,
    });
  };

  const handleApiError = (error, fallbackMessage) => {
    const message =
      error?.response?.data?.message || error?.message || fallbackMessage;
    showError(message);
  };

  const loadCurrencies = async () => {
    setIsLoadingCurrencies(true);
    try {
      await getSupportedCurrencies(
        (payload) => {
          const list = Array.isArray(payload?.data) ? payload.data : [];
          setCurrencies(list);
          const defaultCurrency =
            list.find((item) => item.currency === 'USD')?.currency ||
            list[0]?.currency ||
            'USD';
          setSelectedCurrency(defaultCurrency);
        },
        (error) => handleApiError(error, 'Unable to fetch currencies'),
      );
    } finally {
      setIsLoadingCurrencies(false);
    }
  };

  useEffect(() => {
    loadCurrencies();
  }, []);

  useEffect(() => {
    if (!selectedCurrency) {
      return;
    }

    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    searchDebounceTimer.current = null;

    getMinimumAmount(
      selectedCurrency,
      (payload) => {
        const minimum = Number(payload?.data?.minAmount ?? 0);
        setMinAmount(isNaN(minimum) ? 0 : minimum);
      },
      (error) => handleApiError(error, 'Unable to load minimum amount'),
    );
  }, [selectedCurrency]);

  const scheduleEstimation = (numericAmount) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!numericAmount || Number.isNaN(numericAmount) || numericAmount < minAmount) {
      setEstimation(null);
      setEstimationError(null);
      setIsEstimating(false);
      return;
    }

    setIsEstimating(true);
    setEstimationError(null);

    debounceTimer.current = setTimeout(() => {
      estimateDeposit(
        {
          usdAmount: numericAmount,
          cryptoCurrency: selectedCurrency,
        },
        (payload) => {
          setEstimation(payload?.data ?? null);
          setIsEstimating(false);
        },
        (error) => {
          setIsEstimating(false);
          setEstimation(null);
          handleApiError(error, 'Unable to estimate purchase');
          setEstimationError(
            error?.response?.data?.message || 'Unable to estimate purchase',
          );
        },
      );
    }, DEBOUNCE_DELAY);
  };

  useEffect(() => {
    const numericAmount = Number(amount);
    if (!amount) {
      setEstimation(null);
      setEstimationError(null);
      return;
    }
    scheduleEstimation(numericAmount);
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [amount, selectedCurrency, minAmount]);

  useEffect(() => {
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    searchDebounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchText.trim().toLowerCase());
    }, 250);

    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, [searchText]);

  const handleCurrencySelect = (currency) => {
    setSelectedCurrency(currency);
    setPaymentDetails(null);
    setStatusDetails(null);
  };

  const handleAmountChange = (value) => {
    const sanitized = value.replace(/[^0-9.]/g, '');
    setAmount(sanitized);
    setPaymentDetails(null);
    setStatusDetails(null);
  };

  const amountIsValid = useMemo(() => {
    const numeric = Number(amount);
    return !Number.isNaN(numeric) && numeric >= minAmount;
  }, [amount, minAmount]);

  const handleCreateDeposit = async () => {
    const numericAmount = Number(amount);

    if (!amountIsValid) {
      showError(`Amount must be at least $${minAmount}`);
      return;
    }

    setIsCreating(true);
    setStatusDetails(null);

    await createDeposit(
      {
        usdAmount: numericAmount,
        cryptoCurrency: selectedCurrency,
      },
      (payload) => {
        setPaymentDetails(payload?.data ?? null);
        setIsCreating(false);
        Snackbar.show({
          text: 'Payment generated successfully',
          duration: 2000,
          backgroundColor: '#02BF2B',
          fontFamily: FontFamily.Bold,
        });
      },
      (error) => {
        setIsCreating(false);
        handleApiError(error, 'Failed to create payment');
      },
    );
  };

  const handleCopy = (value, label) => {
    if (!value) {
      return;
    }
    Clipboard.setString(value);
    Snackbar.show({
      text: `${label} copied to clipboard`,
      duration: 1500,
      backgroundColor: 'black',
      fontFamily: FontFamily.Medium,
    });
  };

  const handleOpenLink = (value) => {
    if (!value) {
      return;
    }
    const isHttp = typeof value === 'string' && value.startsWith('http');
    if (isHttp) {
      Linking.openURL(value).catch(() =>
        showError('Unable to open payment link'),
      );
    }
  };

  const handleRefreshStatus = async () => {
    if (!paymentDetails?.paymentId) {
      showError('No payment to refresh');
      return;
    }

    setStatusLoading(true);
    await getCryptoTransactionStatus(
      paymentDetails.paymentId,
      (payload) => {
        setStatusDetails(payload?.data ?? null);
        setStatusLoading(false);
      },
      (error) => {
        setStatusLoading(false);
        handleApiError(error, 'Unable to fetch payment status');
      },
    );
  };

  const formatStatus = (value, fallback = 'pending') => {
    if (!value) {
      return fallback;
    }
    const normalized = String(value);
    return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
  };

  const currentStatus = useMemo(() => {
    const status = statusDetails?.status || paymentDetails?.status;
    const paymentStatus = statusDetails?.paymentStatus || paymentDetails?.paymentStatus;
    return {
      status: formatStatus(status),
      paymentStatus: formatStatus(paymentStatus),
    };
  }, [paymentDetails, statusDetails]);

  const filteredCurrencies = useMemo(() => {
    if (!debouncedSearch) {
      return currencies;
    }

    return currencies.filter((item) => {
      const code = item.currency?.toLowerCase?.() || '';
      const name = item.details?.name?.toString?.().toLowerCase?.() || '';
      return code.includes(debouncedSearch) || name.includes(debouncedSearch);
    });
  }, [currencies, debouncedSearch]);

  const payAddress = paymentDetails?.payAddress;
  const payAmount = paymentDetails?.payAmount;
  const payCurrency = paymentDetails?.cryptoCurrency || estimation?.cryptoCurrency;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBack()}>
          <ChevronLeftIcon size={24} color="#fff" />
        </TouchableOpacity>
        <CustomText
          size={20}
          fontFamily={FontFamily.Bold}
          css={styles.headerTitle}>
          Add Funds
        </CustomText>
        <View style={{width: 24}} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <CustomText size={14} css={styles.sectionLabel}>
          Select Currency
        </CustomText>
        <TextInput
          style={styles.searchInput}
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search currency..."
          placeholderTextColor="#999"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.currencyList}>
          {isLoadingCurrencies ? (
            <ActivityIndicator color="#fff" />
          ) : filteredCurrencies.length > 0 ? (
            filteredCurrencies.map((item) => (
              <CurrencyChip
                key={item.currency}
                label={item.currency}
                subtitle={item.rate ? `${item.rate} tokens / unit` : undefined}
                isActive={selectedCurrency === item.currency}
                onPress={() => handleCurrencySelect(item.currency)}
              />
            ))
          ) : (
            <View style={styles.noCurrencyWrapper}>
              <CustomText size={14} css={styles.helperText}>
                No currency found
              </CustomText>
            </View>
          )}
        </ScrollView>

        <CustomText size={14} css={styles.sectionLabel}>
          Amount in USD
        </CustomText>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={handleAmountChange}
          keyboardType="decimal-pad"
          placeholder={`Minimum $${minAmount}`}
          placeholderTextColor="#999"
        />
        <CustomText size={12} css={styles.helperText}>
          Minimum amount: ${minAmount}
        </CustomText>

        {isEstimating ? (
          <View style={styles.estimationCard}>
            <ActivityIndicator color="#fff" />
            <CustomText size={14} css={styles.helperText}>
              Calculating best rate...
            </CustomText>
          </View>
        ) : estimation ? (
          <View style={styles.estimationCard}>
            <CustomText size={16} fontFamily={FontFamily.Bold} css={styles.detailValue}>
              {estimation.gameTokens} tokens
            </CustomText>
            <CustomText size={12} css={styles.helperText}>
              You will receive {estimation.gameTokens} tokens for ${estimation.usdAmount}
            </CustomText>
            <CustomText size={12} css={styles.helperText}>
              Pay {estimation.cryptoAmount} {selectedCurrency.toUpperCase()}
            </CustomText>
          </View>
        ) : estimationError ? (
          <CustomText size={12} css={styles.errorText}>
            {estimationError}
          </CustomText>
        ) : null}

        <TouchableOpacity
          style={[styles.primaryButton, (!amountIsValid || isCreating) && styles.disabledButton]}
          disabled={!amountIsValid || isCreating}
          onPress={handleCreateDeposit}>
          {isCreating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <CustomText size={16} fontFamily={FontFamily.Bold} css={styles.buttonText}>
              Generate Payment
            </CustomText>
          )}
        </TouchableOpacity>

        {paymentDetails ? (
          <View style={styles.paymentCard}>
            <CustomText size={16} fontFamily={FontFamily.Bold} css={styles.sectionTitle}>
              Payment Instructions
            </CustomText>
            <DetailRow
              label="Payment ID"
              value={paymentDetails.paymentId}
              onCopy={() => handleCopy(paymentDetails.paymentId, 'Payment ID')}
            />
            <DetailRow
              label="Order ID"
              value={paymentDetails.orderId}
              onCopy={() => handleCopy(paymentDetails.orderId, 'Order ID')}
            />
            <DetailRow
              label="Pay Amount"
              value={payAmount ? `${payAmount} ${payCurrency}` : '—'}
              onCopy={payAmount ? () => handleCopy(`${payAmount}`, 'Pay Amount') : undefined}
            />
            <DetailRow
              label="Pay Address"
              value={payAddress || 'Provided after redirect'}
              onCopy={payAddress ? () => handleCopy(payAddress, 'Pay Address') : undefined}
              onOpen={payAddress ? () => handleOpenLink(payAddress) : undefined}
            />
            <DetailRow
              label="Status"
              value={currentStatus.status || 'Pending'}
            />
            <DetailRow
              label="Payment Status"
              value={currentStatus.paymentStatus || 'Pending'}
            />
            {paymentDetails.expiresAt ? (
              <DetailRow
                label="Expires"
                value={new Date(paymentDetails.expiresAt).toLocaleString()}
              />
            ) : null}
            <TouchableOpacity
              style={[styles.secondaryButton, statusLoading && styles.disabledButton]}
              onPress={handleRefreshStatus}
              disabled={statusLoading}>
              {statusLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <CustomText size={14} fontFamily={FontFamily.Medium} css={styles.buttonText}>
                  Refresh Status
                </CustomText>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1b3c',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    color: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 120,
  },
  sectionLabel: {
    color: '#fff',
    marginBottom: 12,
  },
  currencyList: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  noCurrencyWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  currencyChip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3A3B5C',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 12,
    backgroundColor: '#252850',
  },
  currencyChipActive: {
    borderColor: '#ff3b7f',
    backgroundColor: '#ff3b7f33',
  },
  currencyText: {
    color: '#fff',
    textAlign: 'center',
  },
  currencyTextActive: {
    color: '#fff',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#252850',
    borderRadius: 8,
    color: '#fff',
    fontSize: 16,
    padding: 12,
  },
  searchInput: {
    backgroundColor: '#252850',
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  helperText: {
    color: '#b0b0b0',
    marginTop: 8,
  },
  errorText: {
    color: '#F44336',
    marginTop: 12,
  },
  estimationCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#252850',
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#ff3b7f',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  secondaryButton: {
    backgroundColor: '#3A3B5C',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
  },
  paymentCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#252850',
  },
  sectionTitle: {
    color: '#fff',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    color: '#b0b0b0',
    marginBottom: 4,
  },
  detailValue: {
    color: '#fff',
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3A3B5C',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AddMoneyScreen;
