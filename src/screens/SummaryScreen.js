import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from "react-native";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";

const CATEGORIES = ["Comida", "Transporte", "Bebé", "Julinda", "Vladimir"];

export default function SummaryScreen() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryTotals, setCategoryTotals] = useState({});
  const [grandTotal, setGrandTotal] = useState(0);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      setLoading(true);

      // Obtener fecha del primer y último día del mes actual
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const q = query(
        collection(db, "expenses"),
        where("createdAt", ">=", firstDay.toISOString()),
        where("createdAt", "<=", lastDay.toISOString()),
      );

      const querySnapshot = await getDocs(q);
      const loadedExpenses = [];
      const totals = {};

      // Inicializar totales
      CATEGORIES.forEach((cat) => {
        totals[cat] = 0;
      });

      let total = 0;

      querySnapshot.forEach((doc) => {
        const expense = { ...doc.data(), id: doc.id };
        loadedExpenses.push(expense);

        const category = expense.category;
        totals[category] = (totals[category] || 0) + expense.amount;
        total += expense.amount;
      });

      setExpenses(loadedExpenses);
      setCategoryTotals(totals);
      setGrandTotal(total);
    } catch (error) {
      console.error("Error loading expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Resumen del Mes</Text>

      <View style={styles.summaryCard}>
        {CATEGORIES.map((category) => (
          <View key={category} style={styles.categoryRow}>
            <Text style={styles.categoryName}>{category}</Text>
            <Text style={styles.categoryAmount}>
              ${(categoryTotals[category] || 0).toFixed(2)}
            </Text>
          </View>
        ))}

        <View style={styles.divider} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalAmount}>${grandTotal.toFixed(2)}</Text>
        </View>
      </View>

      <Text style={styles.historyTitle}>Historial de Gastos</Text>

      {expenses.length === 0 ? (
        <Text style={styles.noExpenses}>
          No hay gastos registrados este mes
        </Text>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.expenseItem}>
              <View style={styles.expenseInfo}>
                <Text style={styles.expenseCategory}>{item.category}</Text>
                {item.description && (
                  <Text style={styles.expenseDescription}>
                    {item.description}
                  </Text>
                )}
                <Text style={styles.expenseUser}>{item.userName}</Text>
              </View>
              <Text style={styles.expenseAmount}>
                ${item.amount.toFixed(2)}
              </Text>
            </View>
          )}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  summaryCard: {
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
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  categoryName: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4CAF50",
  },
  divider: {
    height: 1,
    backgroundColor: "#ddd",
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  expenseItem: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseCategory: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  expenseDescription: {
    fontSize: 12,
    color: "#666",
    marginTop: 3,
  },
  expenseUser: {
    fontSize: 11,
    color: "#999",
    marginTop: 3,
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4CAF50",
    marginLeft: 10,
  },
  noExpenses: {
    textAlign: "center",
    color: "#999",
    fontSize: 14,
    marginTop: 20,
  },
});
