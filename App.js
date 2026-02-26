import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./src/config/firebase";

import LoginScreen from "./src/screens/LoginScreen";
import AddExpenseScreen from "./src/screens/AddExpenseScreen";
import SummaryScreen from "./src/screens/SummaryScreen";
import SettingsScreen from "./src/screens/SettingsScreen";

const Tab = createBottomTabNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const handleExpenseAdded = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleLoginSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <NavigationContainer key={refreshKey}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === "AddExpense") {
              iconName = focused ? "add-circle" : "add-circle-outline";
            } else if (route.name === "Summary") {
              iconName = focused ? "bar-chart" : "bar-chart-outline";
            } else if (route.name === "Settings") {
              iconName = focused ? "settings" : "settings-outline";
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: "#4CAF50",
          tabBarInactiveTintColor: "#999",
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: "#ddd",
            backgroundColor: "#fff",
          },
        })}
      >
        <Tab.Screen
          name="AddExpense"
          options={{
            title: "Agregar",
            tabBarLabel: "Agregar",
          }}
        >
          {(props) => (
            <AddExpenseScreen {...props} onExpenseAdded={handleExpenseAdded} />
          )}
        </Tab.Screen>

        <Tab.Screen
          name="Summary"
          options={{
            title: "Resumen",
            tabBarLabel: "Resumen",
          }}
          key={refreshKey}
        >
          {(props) => <SummaryScreen {...props} key={refreshKey} />}
        </Tab.Screen>

        <Tab.Screen
          name="Settings"
          options={{
            title: "Configuración",
            tabBarLabel: "Configuración",
          }}
        >
          {(props) => <SettingsScreen {...props} onLogout={handleLogout} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
