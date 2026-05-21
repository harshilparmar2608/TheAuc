import { useState, useEffect } from "react";
import { Role } from "@/types";

export function useAuth() {
  const [role, setRole] = useState<Role>("none");
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Read from localStorage on mount
    const savedRole = localStorage.getItem("gjpl_role") as Role | null;
    const savedUsername = localStorage.getItem("gjpl_username");
    
    if (savedRole) {
      setRole(savedRole);
    }
    if (savedUsername) {
      setUsername(savedUsername);
    }
    setLoading(false);
  }, []);

  const login = (newRole: Role, newUsername?: string) => {
    setRole(newRole);
    localStorage.setItem("gjpl_role", newRole);
    
    if (newUsername) {
      setUsername(newUsername);
      localStorage.setItem("gjpl_username", newUsername);
    } else {
      setUsername(null);
      localStorage.removeItem("gjpl_username");
    }
  };

  const logout = () => {
    setRole("none");
    setUsername(null);
    localStorage.removeItem("gjpl_role");
    localStorage.removeItem("gjpl_username");
    localStorage.removeItem("gjpl_admin_auth"); // Cleanup old session storage if present
    sessionStorage.removeItem("gjpl_admin_auth");
  };

  return { role, username, loading, login, logout };
}
