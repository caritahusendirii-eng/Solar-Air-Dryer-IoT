import 'package:firebase_database/firebase_database.dart';

class FirebaseService {
  final DatabaseReference _db = FirebaseDatabase.instance.ref();

  Stream<DatabaseEvent> get sensorDataStream =>
      _db.child('sensor_data').onValue;

  Stream<DatabaseEvent> get blowersStream =>
      _db.child('blowers').onValue;

  Stream<DatabaseEvent> get historyStream =>
      _db.child('history').orderByChild('timestamp').limitToLast(1000).onValue;

  Stream<DatabaseEvent> get controlModeStream =>
      _db.child('control_mode').onValue;

  Future<void> setBlowerSpeed(String blowerId, int speed) async {
    await _db.child('blowers/$blowerId/speed').set(speed);
  }

  Future<void> setControlMode(String mode) async {
    await _db.child('control_mode').set(mode);
  }
}
