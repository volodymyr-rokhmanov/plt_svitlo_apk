import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, RefreshControl, SafeAreaView, StatusBar, Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Вставте ваше посилання на Raw JSON з GitHub:
const API_URL = 'https://githubusercontent.com';
const STORAGE_KEY = '@schedule_3_1';

// Налаштування відображення пушів, навіть коли додаток відкритий
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [schedule, setSchedule] = useState({ queue: '3.1', updatedAt: 'Завантаження...', hours: [] });
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    requestNotificationPermissions();
    loadCachedSchedule();
    fetchSchedule();
  }, []);

  // Запит дозволу на пуші для Android 13+
  const requestNotificationPermissions = async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('outages', {
        name: 'Графік відключень',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    await Notifications.requestPermissionsAsync();
  };

  // Планування пушів за 15 хвилин до кожного відключення
  const scheduleOutageAlerts = async (hoursList) => {
    // Спочатку скасовуємо старі заплановані сповіщення, щоб не було дублів при зміні графіка
    await Notifications.cancelAllScheduledNotificationsAsync();

    const now = new Date();

    for (const slot of hoursList) {
      if (slot.status !== 'off' || !slot.start) continue;

      const [hour, minute] = slot.start.split(':').map(Number);
      const triggerDate = new Date();
      triggerDate.setHours(hour, minute, 0, 0);
      
      // Віднімаємо 15 хвилин
      triggerDate.setMinutes(triggerDate.getMinutes() - 15);

      // Плануємо лише для майбутніх відключень сьогоднішнього дня
      if (triggerDate > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '⚡ Скоро відключення світла (Черга 3.1)',
            body: `За графіком вимкнення о ${slot.start} (${slot.time}). Зарядіть пристрої!`,
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
            channelId: 'outages',
          },
        });
      }
    }
  };

  const loadCachedSchedule = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) setSchedule(JSON.parse(saved));
    } catch (e) {
      console.log(e);
    }
  };

  const fetchSchedule = async () => {
    setRefreshing(true);
    try {
      // Додаємо timestamp, щоб GitHub Raw не віддавав закешовану стару версію
      const response = await fetch(`${API_URL}?t=${Date.now()}`);
      if (!response.ok) throw new Error('Fetch failed');
      const data = await response.json();

      setSchedule(data);
      setIsOffline(false);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      await scheduleOutageAlerts(data.hours);
    } catch (error) {
      setIsOffline(true);
    } finally {
      setRefreshing(false);
    }
  };

  const renderSlot = ({ item }) => {
    const isOff = item.status === 'off';
    return (
      <View style={[styles.card, isOff ? styles.cardOff : styles.cardOn]}>
        <Text style={styles.timeText}>{item.time}</Text>
        <View style={[styles.badge, isOff ? styles.badgeOff : styles.badgeOn]}>
          <Text style={styles.badgeText}>
            {isOff ? '🔴 Відключення' : '🟢 Світло є'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <View style={styles.header}>
        <Text style={styles.title}>Полтава • Черга {schedule.queue}</Text>
        <Text style={styles.subtitle}>
          Оновлено: {schedule.updatedAt} {isOffline ? '• Офлайн (з кешу)' : '• Пуші активні'}
        </Text>
      </View>

      <FlatList
        data={schedule.hours}
        keyExtractor={(item, idx) => `${item.time}-${idx}`}
        renderItem={renderSlot}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchSchedule} tintColor="#fff" />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  subtitle: { fontSize: 13, color: '#9E9E9E', marginTop: 4 },
  list: { padding: 16 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  cardOn: { backgroundColor: '#1B2E20', borderLeftWidth: 4, borderLeftColor: '#4CAF50' },
  cardOff: { backgroundColor: '#2E1B1B', borderLeftWidth: 4, borderLeftColor: '#F44336' },
  timeText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeOn: { backgroundColor: 'rgba(76, 175, 80, 0.2)' },
  badgeOff: { backgroundColor: 'rgba(244, 67, 54, 0.2)' },
  badgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '500' }
});
