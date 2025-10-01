// Fallback for using MaterialIcons on Android and web.

import { Ionicons } from '@expo/vector-icons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'wrench.and.screwdriver': 'build',
  'message.circle': 'chat',
  'person.circle': 'person',
};

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
// Fallback mapping to Ionicons for better compatibility
const IONICONS_MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'paper-plane',
  'chevron.left.forwardslash.chevron.right': 'code-slash',
  'chevron.right': 'chevron-forward',
  'wrench.and.screwdriver': 'construct',
  'message.circle': 'chatbubble',
  'person.circle': 'person-circle',
};

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}) {
  // Try MaterialIcons first, fallback to Ionicons
  const materialIcon = MAPPING[name];
  const ionicon = IONICONS_MAPPING[name];
  
  if (materialIcon) {
    return <MaterialIcons color={color} size={size} name={materialIcon} style={style} />;
  }
  
  if (ionicon) {
    return <Ionicons color={color} size={size} name={ionicon} style={style} />;
  }
  
  // Ultimate fallback
  return <Ionicons color={color} size={size} name="help-circle" style={style} />;
}
