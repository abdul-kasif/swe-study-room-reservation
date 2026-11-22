import { useState } from "react";
import { StudentPortal } from "./components/StudentPortal";
import { AdminPortal } from "./components/AdminPortal";

type PortalTab = "student" | "admin";

export function App() {
  const [activeTab, setActiveTab] = useState<PortalTab>("student");

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "1.5rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #ddd",
          paddingBottom: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.5rem" }}>
          Study Room Reservation System
        </h1>
        <nav style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={() => setActiveTab("student")}
            style={{
              padding: "0.5rem 1rem",
              fontWeight: activeTab === "student" ? "bold" : "normal",
            }}
          >
            Student Portal
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("admin")}
            style={{
              padding: "0.5rem 1rem",
              fontWeight: activeTab === "admin" ? "bold" : "normal",
            }}
          >
            Admin Portal
          </button>
        </nav>
      </header>

      <main>
        {activeTab === "student" ? <StudentPortal /> : <AdminPortal />}
      </main>
    </div>
  );
}

export default App;
