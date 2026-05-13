import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/**
 * Reliable cross-platform dropdown that works inside Modals and ScrollViews.
 * Replaces @react-native-picker/picker which renders blank on iOS inside Modals.
 *
 * @param {Array}    options       - [{label: string, value: any}]
 * @param {any}      selectedValue - currently selected value
 * @param {Function} onValueChange - called with the new value
 * @param {string}   placeholder   - text shown when nothing is selected
 * @param {boolean}  hasError      - shows red border when true
 * @param {object}   style         - extra container style
 */
export default function SelectPicker({
  options = [],
  selectedValue,
  onValueChange,
  placeholder = 'Select an option...',
  hasError = false,
  style,
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => String(o.value) === String(selectedValue));

  return (
    <View style={[styles.container, hasError && styles.errorBorder, style]}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setOpen((prev) => !prev)}
        activeOpacity={0.7}
      >
        <Text style={[styles.triggerText, !selected && styles.placeholder]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#64748b" />
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdown}>
          <ScrollView nestedScrollEnabled bounces={false} style={{ maxHeight: 210 }}>
            {options.map((option) => {
              const isSelected = String(option.value) === String(selectedValue);
              return (
                <TouchableOpacity
                  key={String(option.value)}
                  style={[styles.option, isSelected && styles.selectedOption]}
                  onPress={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.optionText, isSelected && styles.selectedOptionText]} numberOfLines={2}>
                    {option.label}
                  </Text>
                  {isSelected && <Ionicons name="checkmark" size={16} color="#7c3aed" />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  errorBorder: {
    borderColor: '#ef4444',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    height: 50,
  },
  triggerText: {
    fontSize: 15,
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  placeholder: {
    color: '#94a3b8',
  },
  dropdown: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  selectedOption: {
    backgroundColor: '#f3f0ff',
  },
  optionText: {
    fontSize: 15,
    color: '#334155',
    flex: 1,
    marginRight: 8,
  },
  selectedOptionText: {
    color: '#7c3aed',
    fontWeight: '600',
  },
});
