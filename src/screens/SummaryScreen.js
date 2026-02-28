import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../config/firebase";

const CATEGORIES = ["Comida", "Chucherías", "Casa", "Transporte", "Bebé", "Julinda", "Vladimir"];

const categoryEmojis = {
  "Comida": "🍽️",
  "Chucherías": "🍬",
  "Casa": "🏠",
  "Transporte": "🚗",
  "Bebé": "👶",
  "Julinda": "👩",
  "Vladimir": "👨"
};

export default function SummaryScreen() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryTotals, setCategoryTotals] = useState({});
  const [grandTotal, setGrandTotal] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedPerson, setSelectedPerson] = useState("Todos");
  const [showComparison, setShowComparison] = useState(false);
  const [previousMonthTotal, setPreviousMonthTotal] = useState(0);

  const loadComparisonData = useCallback(async () => {
    try {
      const previousMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1);
      const firstDay = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), 1);
      const lastDay = new Date(previousMonth.getFullYear(), previousMonth.getMonth() + 1, 0);

      const q = query(
        collection(db, "expenses"),
        where("createdAt", ">=", firstDay.toISOString()),
        where("createdAt", "<=", lastDay.toISOString()),
      );

      const querySnapshot = await getDocs(q);
      let total = 0;

      querySnapshot.forEach((doc) => {
        total += Number(doc.data().amount || 0);
      });

      setPreviousMonthTotal(total);
    } catch (_error) {
      console.error("Error loading comparison:", _error);
    }
  }, [selectedMonth]);

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);

      // Obtener rango del mes seleccionado
      const firstDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const lastDay = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);

      const q = query(
        collection(db, "expenses"),
        where("createdAt", ">=", firstDay.toISOString()),
        where("createdAt", "<=", lastDay.toISOString()),
      );

      const querySnapshot = await getDocs(q);
      const loadedExpenses = [];
      const totals = {};

      CATEGORIES.forEach((cat) => {
        totals[cat] = 0;
      });

      let total = 0;

      querySnapshot.forEach((doc) => {
        const expense = { id: doc.id, ...doc.data() };
        loadedExpenses.push(expense);

        if (totals.hasOwnProperty(expense.category)) {
          totals[expense.category] += Number(expense.amount || 0);
        }
        total += Number(expense.amount || 0);
      });

      // Aplicar filtros
      let filtered = loadedExpenses;
      if (selectedCategory !== "Todos") {
        filtered = filtered.filter(e => e.category === selectedCategory);
      }
      if (selectedPerson !== "Todos") {
        filtered = filtered.filter(e => e.userName === selectedPerson);
      }

      setExpenses(filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setCategoryTotals(totals);
      setGrandTotal(total);

      // Cargar datos de mes anterior para comparativa
      if (showComparison) {
        loadComparisonData();
      }
    } catch (_error) {
      console.error("Error loading expenses:", _error);
      Alert.alert("Error", "No se pudieron cargar los gastos");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedCategory, selectedPerson, showComparison, loadComparisonData]);

  useFocusEffect(
    useCallback(() => {
      // Resetear filtros al entrar a la pantalla
      setSelectedCategory("Todos");
      setSelectedPerson("Todos");
      loadExpenses();
    }, [loadExpenses])
  );

  const handleDeleteExpense = (expenseId) => {
    Alert.alert(
      "Eliminar gasto",
      "¿Estás seguro de que deseas eliminar este gasto?",
      [
        { text: "Cancelar", onPress: () => {} },
        {
          text: "Eliminar",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "expenses", expenseId));
              loadExpenses();
              Alert.alert("Éxito", "Gasto eliminado correctamente");
            } catch (_error) {
              Alert.alert("Error", "No se pudo eliminar el gasto");
            }
          },
        },
      ]
    );
  };

  const changeMonth = (offset) => {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() + offset);
    setSelectedMonth(newMonth);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  const monthName = selectedMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  const difference = grandTotal - previousMonthTotal;
  const percentChange = previousMonthTotal > 0 ? ((difference / previousMonthTotal) * 100).toFixed(1) : 0;

  return (
    <ScrollView style={styles.container}>
      {/* Selector de mes */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthButton}>
          <Text style={styles.monthButtonText}>◀</Text>
        </TouchableOpacity>
        <Text style={styles.monthText}>{monthName.toUpperCase()}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthButton}>
          <Text style={styles.monthButtonText}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* Total principal */}
      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>💰 TOTAL DEL MES</Text>
        <Text style={styles.totalAmount}>${grandTotal.toFixed(2)}</Text>
      </View>

      {/* Comparativa */}
      {showComparison && (
        <View style={[styles.comparisonCard, {borderLeftColor: difference > 0 ? "#FF6B6B" : "#4CAF50"}]}>
          <Text style={styles.comparisonTitle}>📊 Comparativa Mensual</Text>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Mes anterior:</Text>
            <Text style={styles.comparisonValue}>${previousMonthTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.comparisonRow}>
            <Text style={styles.comparisonLabel}>Este mes:</Text>
            <Text style={styles.comparisonValue}>${grandTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.comparisonRow}>
            <Text style={[styles.comparisonLabel, {color: difference > 0 ? "#FF6B6B" : "#4CAF50", fontWeight: "bold"}]}>
              {difference > 0 ? "▲" : "▼"} Variación:
            </Text>
            <Text style={[styles.comparisonValue, {color: difference > 0 ? "#FF6B6B" : "#4CAF50", fontWeight: "bold"}]}>
              ${Math.abs(difference).toFixed(2)} ({percentChange}%)
            </Text>
          </View>
        </View>
      )}

      {/* Botones de control */}
      <View style={styles.controlButtonsRow}>
        <TouchableOpacity 
          style={[styles.comparisonButton, {flex: 1, marginRight: 8}]}
          onPress={() => {
            setShowComparison(!showComparison);
            if (!showComparison) loadComparisonData();
          }}
        >
          <Text style={styles.comparisonButtonText}>
            {showComparison ? "🙈 Ocultar" : "📈 Comparar"}
          </Text>
        </TouchableOpacity>

        {(selectedCategory !== "Todos" || selectedPerson !== "Todos") && (
          <TouchableOpacity 
            style={[styles.comparisonButton, {flex: 1, backgroundColor: "#FF6B6B"}]}
            onPress={() => {
              setSelectedCategory("Todos");
              setSelectedPerson("Todos");
            }}
          >
            <Text style={styles.comparisonButtonText}>
              🔄 Limpiar Filtros
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Categoría</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterChip, selectedCategory === "Todos" && styles.filterChipActive]}
              onPress={() => setSelectedCategory("Todos")}
            >
              <Text style={[styles.filterChipText, selectedCategory === "Todos" && styles.filterChipTextActive]}>
                Todas
              </Text>
            </TouchableOpacity>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, selectedCategory === cat && styles.filterChipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.filterChipText, selectedCategory === cat && styles.filterChipTextActive]}>
                  {categoryEmojis[cat]} {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterLabel}>Registrado por</Text>
          <View style={styles.filterButtonsRow}>
            <TouchableOpacity
              style={[styles.filterButton, selectedPerson === "Todos" && styles.filterButtonActive]}
              onPress={() => setSelectedPerson("Todos")}
            >
              <Text style={[styles.filterButtonText, selectedPerson === "Todos" && styles.filterButtonTextActive]}>
                Todos
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedPerson === "Julinda" && styles.filterButtonActive]}
              onPress={() => setSelectedPerson("Julinda")}
            >
              <Text style={[styles.filterButtonText, selectedPerson === "Julinda" && styles.filterButtonTextActive]}>
                Julinda
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterButton, selectedPerson === "Vladimir" && styles.filterButtonActive]}
              onPress={() => setSelectedPerson("Vladimir")}
            >
              <Text style={[styles.filterButtonText, selectedPerson === "Vladimir" && styles.filterButtonTextActive]}>
                Vladimir
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Resumen por categoría */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>📋 Por Categoría</Text>
        {CATEGORIES.map((category) => {
          if (categoryTotals[category] === 0) return null;
          return (
            <View key={category} style={styles.categoryRow}>
              <Text style={styles.categoryName}>
                {categoryEmojis[category]} {category}
              </Text>
              <Text style={styles.categoryAmount}>
                ${categoryTotals[category].toFixed(2)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Lista de gastos */}
      <Text style={styles.listTitle}>📝 Gastos ({expenses.length})</Text>
      {expenses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay gastos para este período</Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.expenseItem}>
              <View style={styles.expenseInfo}>
                <Text style={styles.expenseCategory}>
                  {categoryEmojis[item.category]} {item.category}
                </Text>
                {item.description && (
                  <Text style={styles.expenseDescription}>{item.description}</Text>
                )}
                <Text style={styles.expenseUser}>
                  {item.userName} • {formatDate(item.createdAt)}
                </Text>
              </View>
              <View style={styles.expenseRight}>
                <Text style={styles.expenseAmount}>${item.amount.toFixed(2)}</Text>
                <TouchableOpacity
                  onPress={() => handleDeleteExpense(item.id)}
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: "#f5f5f5",
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  monthSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  monthButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#4CAF50",
    minWidth: 40,
    alignItems: "center",
  },
  monthButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  monthText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    textAlign: "center",
  },
  totalCard: {
    backgroundColor: "#4CAF50",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  totalLabel: {
    fontSize: 14,
    color: "#fff",
    opacity: 0.9,
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: "bold",
    color: "white",
  },
  comparisonCard: {
    backgroundColor: "white",
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  comparisonTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  comparisonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  comparisonLabel: {
    fontSize: 13,
    color: "#666",
  },
  comparisonValue: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#333",
  },
  controlButtonsRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  comparisonButton: {
    backgroundColor: "#2196F3",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: "center",
  },
  comparisonButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  filtersContainer: {
    marginBottom: 16,
  },
  filterGroup: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#666",
    marginBottom: 8,
  },
  filterScroll: {
    flexDirection: "row",
  },
  filterChip: {
    backgroundColor: "white",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  filterChipActive: {
    backgroundColor: "#4CAF50",
    borderColor: "#4CAF50",
  },
  filterChipText: {
    fontSize: 13,
    color: "#666",
  },
  filterChipTextActive: {
    color: "white",
    fontWeight: "bold",
  },
  filterButtonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  filterButtonActive: {
    backgroundColor: "#2196F3",
    borderColor: "#2196F3",
  },
  filterButtonText: {
    fontSize: 13,
    color: "#666",
  },
  filterButtonTextActive: {
    color: "white",
    fontWeight: "bold",
  },
  summaryCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  categoryName: {
    fontSize: 14,
    color: "#333",
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  listTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  emptyContainer: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  emptyText: {
    color: "#999",
    fontSize: 14,
  },
  expenseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseCategory: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  expenseDescription: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  expenseUser: {
    fontSize: 11,
    color: "#999",
    marginTop: 4,
  },
  expenseRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  expenseAmount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  deleteButton: {
    padding: 6,
    backgroundColor: "#ffebee",
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: 16,
  },
});
