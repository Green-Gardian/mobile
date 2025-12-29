import { StyleSheet, View, Text, Dimensions } from 'react-native';
import BinMap from './BinMap';

const { width, height } = Dimensions.get('window');

export default function WorkAreasTab() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Driver Map</Text>
      </View>
      <BinMap height={height - 150} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderColor: '#eee',
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4c1d95',
  }
});
