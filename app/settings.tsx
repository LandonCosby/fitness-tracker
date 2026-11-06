import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';

import { FormSkeleton } from '@/components/ScreenSkeletons';
import IconButton from '@/components/IconButton';
import ModalScreen from '@/components/ModalScreen';
import SegmentedControl from '@/components/SegmentedControl';
import { Text, TextInput, View, useThemeColor } from '@/components/Themed';
import { Card, TextAction } from '@/components/ui';
import {
  MAX_WEEKLY_WORKOUT_GOAL,
  cmToFeetInches,
  feetInchesToCm,
  getProfile,
  setHeightCm,
  setSex,
  setWeeklyWorkoutGoal,
  type Profile,
  type Sex,
} from '@/db/profile';
import { useWeightUnit } from '@/hooks/useWeightUnit';

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

// Profile (for strength ranks) and the weekly workout goal (Home streak).
// Nutrition targets and the lb/kg unit live on the Nutrition tab (app/nutrition-goals.tsx).
export default function SettingsScreen() {
  const db = useSQLiteContext();
  const { unit } = useWeightUnit();
  const imperial = unit === 'lb';
  const [profile, setProfile] = useState<Profile | null>(null);
  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');
  const [cm, setCm] = useState('');
  const muted = useThemeColor({}, 'muted');

  useEffect(() => {
    let cancelled = false;
    getProfile(db).then((saved) => {
      if (cancelled) return;
      setProfile(saved);
      if (saved.heightCm) {
        const { feet: f, inches: i } = cmToFeetInches(saved.heightCm);
        setFeet(String(f));
        setInches(String(i));
        setCm(String(Math.round(saved.heightCm)));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  if (!profile)
    return (
      <ModalScreen title="Settings">
        <FormSkeleton fields={3} />
      </ModalScreen>
    );

  const saveImperial = (nextFeet: string, nextInches: string) => {
    const f = parseInt(nextFeet, 10);
    const i = parseInt(nextInches || '0', 10);
    const valid = Number.isFinite(f) && f >= 3 && f <= 8 && Number.isFinite(i) && i >= 0 && i < 12;
    setHeightCm(db, valid ? feetInchesToCm(f, i) : null);
  };

  const saveMetric = (next: string) => {
    const value = parseFloat(next.replace(',', '.'));
    setHeightCm(db, Number.isFinite(value) && value >= 100 && value <= 250 ? value : null);
  };

  const changeGoal = (goal: number) => {
    setProfile({ ...profile, weeklyWorkoutGoal: goal });
    setWeeklyWorkoutGoal(db, goal);
  };

  return (
    <ModalScreen title="Settings">
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <Text style={[styles.hint, { color: muted }]}>
            Used to rank your strength on the Progress tab. Body weight comes from your latest
            weigh-in.
          </Text>

          <Text style={[styles.label, { color: muted }]}>Sex</Text>
          <SegmentedControl
            options={SEX_OPTIONS}
            value={profile.sex}
            onChange={(sex) => {
              setProfile({ ...profile, sex });
              setSex(db, sex);
            }}
          />

          <Text style={[styles.label, { color: muted }]}>Height</Text>
          {imperial ? (
            <View style={styles.heightRow}>
              <TextInput
                style={styles.heightInput}
                value={feet}
                onChangeText={(text) => {
                  const clean = text.replace(/[^0-9]/g, '');
                  setFeet(clean);
                  saveImperial(clean, inches);
                }}
                keyboardType="number-pad"
                maxLength={1}
                placeholder="5"
                accessibilityLabel="Height, feet"
              />
              <Text style={[styles.heightUnit, { color: muted }]}>ft</Text>
              <TextInput
                style={styles.heightInput}
                value={inches}
                onChangeText={(text) => {
                  const clean = text.replace(/[^0-9]/g, '');
                  setInches(clean);
                  saveImperial(feet, clean);
                }}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="10"
                accessibilityLabel="Height, inches"
              />
              <Text style={[styles.heightUnit, { color: muted }]}>in</Text>
            </View>
          ) : (
            <View style={styles.heightRow}>
              <TextInput
                style={styles.heightInput}
                value={cm}
                onChangeText={(text) => {
                  const clean = text.replace(/[^0-9.,]/g, '');
                  setCm(clean);
                  saveMetric(clean);
                }}
                keyboardType="decimal-pad"
                maxLength={5}
                placeholder="178"
                accessibilityLabel="Height in centimeters"
              />
              <Text style={[styles.heightUnit, { color: muted }]}>cm</Text>
            </View>
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly workout goal</Text>
          <View style={styles.goalRow}>
            <IconButton
              ios="minus.circle.fill"
              material="remove_circle"
              label="Fewer workouts per week"
              color="tint"
              size={32}
              onPress={() => changeGoal(profile.weeklyWorkoutGoal - 1)}
              disabled={profile.weeklyWorkoutGoal <= 1}
            />
            <Text style={styles.goalValue} accessibilityLiveRegion="polite">
              {profile.weeklyWorkoutGoal}
              <Text style={[styles.goalUnit, { color: muted }]}> per week</Text>
            </Text>
            <IconButton
              ios="plus.circle.fill"
              material="add_circle"
              label="More workouts per week"
              color="tint"
              size={32}
              onPress={() => changeGoal(profile.weeklyWorkoutGoal + 1)}
              disabled={profile.weeklyWorkoutGoal >= MAX_WEEKLY_WORKOUT_GOAL}
            />
          </View>
          <Text style={[styles.hint, { color: muted }]}>
            Home shows how many weeks in a row you&apos;ve hit this (weeks run Monday to Sunday).
          </Text>
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrition goals & units</Text>
          <Text style={[styles.hint, { color: muted }]}>
            Calorie and macro targets and the lb/kg switch are on the Nutrition tab.
          </Text>
          <TextAction label="Open goals & units ›" onPress={() => router.replace('/nutrition-goals')} />
        </Card>

        {/* Use a light status bar on iOS to account for the black space above the modal */}
        <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
      </ScrollView>
    </ModalScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  heightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heightInput: {
    width: 72,
    textAlign: 'center',
    fontWeight: '700',
  },
  heightUnit: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  goalValue: {
    fontSize: 32,
    fontWeight: '800',
    minWidth: 130,
    textAlign: 'center',
  },
  goalUnit: {
    fontSize: 15,
    fontWeight: '600',
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
  },
});
