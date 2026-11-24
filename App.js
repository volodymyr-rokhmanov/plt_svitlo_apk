import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, FlatList, RefreshControl, SafeAreaView, StatusBar 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Сюди підставте посилання на ваш JSON (наприклад, з GitHub Raw або вашого сервера)
const API_URL = 'https://githubusercontent.com';
const STORAGE_KEY = '@schedule_3_1';

// Тестові дані, поки ви не підключили реальний парсер
const MOCK_DATA = {
  updatedAt: '23.11, 08:30',
  queue: '3.1',
  hours: [
    { time: '00:00 - 02:00', status: 'on' },
    { time: '02:00 - 06:00', status: 'off' },
    { time: '06:00 - 08:00', status: 'on' },
    { time: '08:00 - 12:00', status: 'off' }, // Поточний слот
    { time: '12:00 - 14:00', status: 'on' },
    { time: '14:00 - 18:00', status: 'off' },
    { time: '18:00 - 20:00', status: 'on' },
    { time: '20:00 - 24:00', status: 'off' },
  ]
};

export default function App() {
  const [schedule, setSchedule] = useState(MOCK_DATA);
  const [refreshing, setRefreshing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Завантаження збереженого графіка при старті без інтернету
  useEffect(() => {
    loadCachedSchedule();
    fetchSchedule();
  }, []);

  const loadCachedSchedule = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) setSchedule(JSON.parse(saved));
    } catch (e) {
      console.log('Помилка читання кешу', e);
    }
  };

  const fetchSchedule = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Network error');
      const data = await response.json();
      
      setSchedule(data);
      setIsOffline(false);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      // Якщо світло вимкнули і інтернет зник — залишаємо дані з кешу
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
          Оновлено: {schedule.updatedAt} {isOffline ? '(Офлайн-режим)' : ''}
        </Text>
      </View>

      <FlatList
        data={schedule.hours}
        keyExtractor={(item) => item.time}
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
