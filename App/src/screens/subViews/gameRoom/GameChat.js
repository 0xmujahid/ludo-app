import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Keyboard,
  Animated,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

// Format timestamp for messages
const formatTimestamp = timestamp => {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Icons
const ICONS = {
  CLOSE: require('../../../assets/images/Icons/exit-icon.png'),
  SEND: require('../../../assets/images/Icons/play-icon.png'),
};

/**
 * Game Chat Component
 */
const GameChat = ({messages = [], players = [], onSendMessage, onClose}) => {
  const [inputMessage, setInputMessage] = useState('');
  const listRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Slide up animation on mount
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Handle close with animation
  const handleClose = () => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose && onClose();
    });
  };

  // Send message handler
  const handleSendMessage = () => {
    if (inputMessage.trim()) {
      onSendMessage && onSendMessage(inputMessage);
      setInputMessage('');
      Keyboard.dismiss();
    }
  };

  // Render a message item
  const renderMessage = ({item}) => {
    // Find the player who sent this message
    const player = players.find(
      p => p.userId === item.userId || p.id === item.userId,
    );
    const isSystem = item.system || !player;

    return (
      <View
        style={[
          styles.messageContainer,
          isSystem ? styles.systemMessage : null,
        ]}
        key={item.id}>
        {!isSystem && (
          <Text style={styles.username}>{player?.username || 'Unknown'}</Text>
        )}

        <Text
          style={[
            styles.messageText,
            isSystem ? styles.systemMessageText : null,
          ]}>
          {item.text || item.message}
        </Text>

        <Text style={styles.timestamp}>
          {formatTimestamp(item.timestamp || item.createdAt)}
        </Text>
      </View>
    );
  };

  // Transform animation for slide up
  const slideTransform = {
    transform: [
      {
        translateY: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [300, 0],
        }),
      },
    ],
    opacity: slideAnim,
  };

  return (
    <Animated.View style={[styles.container, slideTransform]}>
      {/* Chat Header */}
      <LinearGradient colors={['#4A148C', '#7B1FA2']} style={styles.header}>
        <Text style={styles.headerTitle}>Game Chat</Text>

        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeButton}
          activeOpacity={0.7}>
          <Image source={ICONS.CLOSE} style={styles.closeIcon} />
        </TouchableOpacity>
      </LinearGradient>

      {/* Messages List */}
      {messages.length > 0 ? (
        <FlatList
          ref={listRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          inverted={false}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({animated: true})
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No messages yet. Start the conversation!
          </Text>
        </View>
      )}

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          value={inputMessage}
          onChangeText={setInputMessage}
          multiline={false}
          onSubmitEditing={handleSendMessage}
          blurOnSubmit={false}
        />

        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSendMessage}
          activeOpacity={0.7}>
          <Image source={ICONS.SEND} style={styles.sendIcon} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    width: 16,
    height: 16,
    tintColor: '#FFFFFF',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    maxWidth: '85%',
    alignSelf: 'flex-start',
  },
  systemMessage: {
    backgroundColor: '#E8EAF6',
    alignSelf: 'center',
    maxWidth: '90%',
  },
  username: {
    color: '#673AB7',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 3,
  },
  messageText: {
    color: '#212121',
    fontSize: 15,
  },
  systemMessageText: {
    color: '#3F51B5',
    fontStyle: 'italic',
    textAlign: 'center',
    fontSize: 13,
  },
  timestamp: {
    color: '#9E9E9E',
    fontSize: 11,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sendButton: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: '#673AB7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  sendIcon: {
    width: 22,
    height: 22,
    tintColor: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    color: '#9E9E9E',
    textAlign: 'center',
    fontSize: 15,
  },
});

export default GameChat;
