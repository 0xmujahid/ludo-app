import React, {useState, useCallback} from 'react';
import {View, StyleSheet, FlatList, TouchableOpacity} from 'react-native';
import ExpandableListItem from './ExpandableListItem';
import CustomText from './CustomText';
import {FontFamily} from '../constants/Fonts';
import {useDispatch} from 'react-redux';
import {getTransactionFilterList, getTransaction} from '../api/transaction';
import {updateTransaction} from '../redux/reducers/transaction/transactionSlice';
import {ScrollView} from 'react-native-gesture-handler';

const TransactionList = ({data, filters, renderDetails, emptyStateMessage}) => {
  const [expandedId, setExpandedId] = useState(null);
  const [activeFilters, setActiveFilters] = useState(['all']);
  const dispatch = useDispatch();

  const toggleItem = useCallback(
    id => {
      setExpandedId(expandedId === id ? null : id);
    },
    [expandedId],
  );

  const fetchTransaction = async () => {
    try {
      await getTransaction(
        response => {
          if (response.transactions) {
            dispatch(updateTransaction(response.transactions));
          }
        },
        () => {},
      );
    } catch (error) {
      console?.error('Failed to fetch transaction:', error);
    }
  };

  const fetchTransactionFilter = async payload => {
    try {
      await getTransactionFilterList(
        payload,
        response => {
          if (response.transactions) {
            dispatch(updateTransaction(response.transactions));
          }
        },
        () => {},
      );
    } catch (error) {
      console?.error('Failed to fetch transaction:', error);
    }
  };

  const toggleFilter = useCallback(filter => {
    if (filter === 'all') {
      fetchTransaction();
    } else {
      fetchTransactionFilter(filter);
    }
    setActiveFilters([filter]);
  }, []);

  const renderItem = useCallback(
    ({item}) => (
      <ExpandableListItem
        item={item}
        key={item.transactionId}
        isExpanded={expandedId === item.transactionId}
        onToggle={() => toggleItem(item.transactionId)}
        renderDetails={renderDetails}
      />
    ),
    [expandedId, toggleItem, renderDetails],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}>
        {filters.map(item => {
          return (
            <TouchableOpacity
              style={[
                styles.filterButton,
                activeFilters.includes(item.value) && styles.activeFilterButton,
              ]}
              onPress={() => toggleFilter(item.value)}>
              <CustomText
                size={14}
                fontFamily={FontFamily.Medium}
                css={[
                  styles.filterText,
                  activeFilters.includes(item.value) && styles.activeFilterText,
                ]}>
                {item.tittle}
              </CustomText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {data.length > 0 ? (
        <FlatList
          style={styles.filterListContainer}
          data={data}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyState}>
          <CustomText
            size={18}
            fontFamily={FontFamily.Bold}
            css={styles.emptyStateText}>
            {emptyStateMessage}
          </CustomText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    justifyContent: 'flex-start',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  filterListContainer: {
    paddingTop: 20,
    marginBottom: 20,
  },
  filterButton: {
    paddingHorizontal: 25,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    height: 30,
    overflow: 'scroll',
    backgroundColor: '#252850',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeFilterButton: {
    backgroundColor: '#ff3b7f',
  },
  filterText: {
    color: '#fff',
    textAlign: 'center',
  },
  activeFilterText: {
    color: '#fff',
  },
  listContainer: {
    paddingHorizontal: 0,
    display: 'flex',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#fff',
    textAlign: 'center',
  },
});

export default TransactionList;
