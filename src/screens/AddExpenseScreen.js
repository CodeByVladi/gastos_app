import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../config/firebase";

const CATEGORIES = ["Comida", "Chucherías", "Transporte", "Bebé", "Julinda", "Vladimir"];

export default function AddExpenseScreen({ onExpenseAdded }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Comida");
  const [loading, setLoading] = useState(false);

  const handleAddExpense = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Por favor ingresa una cantidad válida");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "No hay usuario autenticado");
        return;
      }

      await addDoc(collection(db, "expenses"), {
        amount: parseFloat(amount),
        category: selectedCategory,
        description: description,
        userId: user.uid,
        userName: user.displayName || "Usuario",
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
      });

      setAmount("");
      setDescription("");
      setSelectedCategory("Comida");
      Alert.alert("✅ Éxito", "Gasto registrado correctamente");
      onExpenseAdded();
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Agregar Gasto</Text>

      <TextInput
        style={styles.input}
        placeholder="Cantidad ($)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
        editable={!loading}
      />

      <TextInput
        style={styles.input}
        placeholder="Descripción (opcional)"
        value={description}
        onChangeText={setDescription}
        editable={!loading}
      />

      <Text style={styles.label}>Categoría:</Text>
      <View style={styles.categoryContainer}>
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryButton,
              selectedCategory === category && styles.categoryButtonActive,
            ]}
            onPress={() => setSelectedCategory(category)}
            disabled={loading}
          >
            <Text
              style={[
                styles.categoryButtonText,
                selectedCategory === category &&
                  styles.categoryButtonTextActive,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleAddExpense}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Guardar Gasto</Text>
        )}
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
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    marginBottom: 15,
    borderRadius: 8,
    backgroundColor: "#fff",
    fontSize: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
  },
  categoryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  categoryButton: {
    borderWidth: 2,
    borderColor: "#ddd",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  categoryButtonActive: {
    borderColor: "#4CAF50",
    backgroundColor: "#4CAF50",
  },
  categoryButtonText: {
    color: "#333",
    fontSize: 14,
    fontWeight: "500",
  },
  categoryButtonTextActive: {
    color: "#fff",
  },
  button: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
