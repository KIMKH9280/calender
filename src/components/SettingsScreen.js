import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useTheme,
  ACCENT_PRESETS,
  BACKGROUND_PRESETS,
  DOT_PRESETS,
  HOLIDAY_PRESETS,
} from '../context/ThemeContext';

function ColorSwatch({ color, selected, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.swatch,
        { backgroundColor: color },
        selected && styles.swatchSelected,
      ]}
    >
      {selected && <Text style={styles.swatchCheck}>✓</Text>}
    </TouchableOpacity>
  );
}

function Section({ title, children }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textDim }]}>{title}</Text>
      {children}
    </View>
  );
}

export function SettingsScreen({ onBack }) {
  const { colors, theme, setTheme } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.textDim + '30' }]}>
        <TouchableOpacity onPress={onBack}>
          <Text style={[styles.backBtn, { color: colors.accent }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Section title="Accent color (buttons, highlights)">
          <View style={styles.swatchRow}>
            {ACCENT_PRESETS.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setTheme({ accentId: p.id })}
                style={styles.swatchItem}
              >
                <ColorSwatch
                  color={p.color}
                  selected={theme.accentId === p.id}
                  onPress={() => setTheme({ accentId: p.id })}
                />
                <Text style={[styles.swatchLabel, { color: colors.text }]} numberOfLines={1}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        <Section title="Background style">
          <View style={styles.bgRow}>
            {BACKGROUND_PRESETS.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setTheme({ backgroundId: p.id })}
                style={[
                  styles.bgOption,
                  {
                    backgroundColor: p.card,
                    borderColor: theme.backgroundId === p.id ? colors.accent : 'transparent',
                    borderWidth: theme.backgroundId === p.id ? 2 : 0,
                  },
                ]}
              >
                <View style={[styles.bgPreview, { backgroundColor: p.bg }]} />
                <Text style={[styles.bgLabel, { color: p.text }]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        <Section title="Calendar dot indicator">
          <View style={styles.swatchRow}>
            {DOT_PRESETS.map((p) => {
              const dotColor = p.color ?? colors.accent;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setTheme({ dotId: p.id })}
                  style={styles.swatchItem}
                >
                  <ColorSwatch
                    color={dotColor}
                    selected={theme.dotId === p.id}
                    onPress={() => setTheme({ dotId: p.id })}
                  />
                  <Text style={[styles.swatchLabel, { color: colors.text }]} numberOfLines={1}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        <Section title="Weekend / holiday text color">
          <View style={styles.swatchRow}>
            {HOLIDAY_PRESETS.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setTheme({ holidayId: p.id })}
                style={styles.swatchItem}
              >
                <ColorSwatch
                  color={p.color}
                  selected={theme.holidayId === p.id}
                  onPress={() => setTheme({ holidayId: p.id })}
                />
                <Text style={[styles.swatchLabel, { color: colors.text }]}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        <View style={styles.footer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { fontSize: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  swatchItem: {
    alignItems: 'center',
    width: 64,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  swatchSelected: {
    borderWidth: 3,
    borderColor: '#fff',
  },
  swatchCheck: { color: '#fff', fontSize: 18, fontWeight: '700' },
  swatchLabel: { fontSize: 12, textAlign: 'center' },
  bgRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  bgOption: {
    width: 100,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 8,
  },
  bgPreview: {
    height: 40,
    borderRadius: 8,
    marginBottom: 8,
  },
  bgLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  footer: { height: 40 },
});
