import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";

export default function SettingsScreen({ onLogout }) {
  const handleLogout = async () => {
    Alert.alert("Cerrar Sesión", "¿Estás seguro de que deseas cerrar sesión?", [
      { text: "Cancelar", onPress: () => {} },
      {
        text: "Cerrar Sesión",
        onPress: async () => {
          try {
            // Borrar credenciales guardadas
            await AsyncStorage.removeItem("userEmail");
            await AsyncStorage.removeItem("userPassword");
            
            await signOut(auth);
            onLogout();
          } catch (error) {
            Alert.alert("Error", error.message);
          }
        },
      },
    ]);
  };

  const currentUser = auth.currentUser;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Configuración</Text>

      <View style={styles.userCard}>
        <Text style={styles.userLabel}>Usuario Actual</Text>
        <Text style={styles.userName}>
          {currentUser?.displayName || "Usuario"}
        </Text>
        <Text style={styles.userEmail}>{currentUser?.email}</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>📱 Sobre la App</Text>
        <Text style={styles.infoText}>Versión 1.0</Text>
        <Text style={styles.infoText}>
          Gastos Compartidos - Sincronización en tiempo real
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>🤖 Bot Telegram</Text>
        <Text style={styles.infoText}>
          Recibirás un resumen automático el día 1 de cada mes a las 7 AM con el
          total de gastos.
        </Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>💾 Categorías</Text>
        <Text style={styles.infoText}>
          • Comida{"\n"}• Transporte{"\n"}• Bebé{"\n"}• Julinda{"\n"}• Vladimir
        </Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  userCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 5,
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  infoText: {
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
  },
  logoutButton: {
    backgroundColor: "#f44336",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 30,
    marginBottom: 30,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
