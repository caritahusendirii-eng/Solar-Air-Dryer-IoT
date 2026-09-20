import React, { useState, useEffect, useMemo } from "react";
import { ref, onValue, set, remove } from "firebase/database";
import { database } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { IoPeopleOutline, IoTrashOutline, IoShieldCheckmarkOutline, IoEllipseSharp } from "react-icons/io5";
import toast from "react-hot-toast";

const ROLE_OPTIONS = [
  { value: "guess", label: "Guess", desc: "Dashboard only" },
  { value: "view_data", label: "View Data", desc: "Dashboard + Data" },
  { value: "eksekusi_data", label: "Eksekusi Data", desc: "Dashboard + Control + Data" },
  { value: "report_data", label: "Report Data", desc: "Dashboard + Data + Export" },
  { value: "admin", label: "Admin", desc: "Full Access" },
];

export default function ManagementPage() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState({});
  const [userAkses, setUserAkses] = useState({});
  const [presence, setPresence] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  // Listen to /users
  useEffect(() => {
    const usersRef = ref(database, "/users");
    const unsub = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        setUsers(snapshot.val());
      } else {
        setUsers({});
      }
    });
    return () => unsub();
  }, []);

  // Listen to /user_akses
  useEffect(() => {
    const aksesRef = ref(database, "/user_akses");
    const unsub = onValue(aksesRef, (snapshot) => {
      if (snapshot.exists()) {
        setUserAkses(snapshot.val());
      } else {
        setUserAkses({});
      }
    });
    return () => unsub();
  }, []);

  // Listen to /presence (online users)
  useEffect(() => {
    const presenceRef = ref(database, "/presence");
    const unsub = onValue(presenceRef, (snapshot) => {
      if (snapshot.exists()) {
        setPresence(snapshot.val());
      } else {
        setPresence({});
      }
    });
    return () => unsub();
  }, []);

  // Merge users and user_akses into a single list
  const userList = useMemo(() => {
    const list = [];
    Object.entries(users).forEach(([uid, userData]) => {
      const akses = userAkses[uid] || {};
      list.push({
        uid,
        email: userData.email || "N/A",
        displayName: userData.displayName || "-",
        role: akses.role || "guess",
        lastLogin: userData.lastLogin || null,
        isSelf: uid === currentUser?.uid,
      });
    });

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return list.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, userAkses, currentUser, searchQuery]);

  const handleRoleChange = async (uid, newRole) => {
    try {
      await set(ref(database, `user_akses/${uid}`), {
        role: newRole,
        updatedAt: Date.now(),
      });
      toast.success("Role berhasil diperbarui!");
    } catch (err) {
      console.error("Failed to update role:", err);
      toast.error("Gagal memperbarui role.");
    }
  };

  const handleDeleteAccess = async (uid, email) => {
    if (!window.confirm(`Hapus akses untuk ${email}? User akan kembali ke role 'guess'.`)) return;
    try {
      await remove(ref(database, `user_akses/${uid}`));
      toast.success("Akses berhasil dihapus. User kembali ke role 'guess'.");
    } catch (err) {
      console.error("Failed to delete access:", err);
      toast.error("Gagal menghapus akses.");
    }
  };

  const formatDate = (ts) => {
    if (!ts) return "-";
    const d = new Date(ts);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case "admin": return "role-badge admin";
      case "report_data": return "role-badge report";
      case "eksekusi_data": return "role-badge eksekusi";
      case "view_data": return "role-badge view";
      default: return "role-badge guess";
    }
  };

  return (
    <div className="management-card card">
      <div className="mgmt-header">
        <h3 className="sec-title">
          <IoPeopleOutline className="sec-icon" /> Access Management
        </h3>
        <div className="mgmt-search">
          <input
            type="text"
            placeholder="Cari user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mgmt-search-input"
          />
        </div>
      </div>

      <div className="mgmt-stats">
        <div className="mgmt-stat">
          <span className="mgmt-stat-val">{Object.keys(users).length}</span>
          <span className="mgmt-stat-label">Total Users</span>
        </div>
        <div className="mgmt-stat mgmt-stat-online">
          <span className="mgmt-stat-val mgmt-online-val">{Object.keys(presence).length}</span>
          <span className="mgmt-stat-label">Users Online</span>
        </div>
        <div className="mgmt-stat">
          <span className="mgmt-stat-val">
            {Object.values(userAkses).filter((a) => a.role === "admin").length}
          </span>
          <span className="mgmt-stat-label">Admins</span>
        </div>
        <div className="mgmt-stat">
          <span className="mgmt-stat-val">
            {Object.values(userAkses).filter((a) => a.role !== "admin" && a.role !== "guess").length}
          </span>
          <span className="mgmt-stat-label">Active Roles</span>
        </div>
      </div>

      <div className="mgmt-table-wrap">
        <table className="mgmt-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Status</th>
              <th>Current Role</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {userList.length === 0 && (
              <tr>
                <td colSpan={5} className="no-data">
                  Tidak ada user ditemukan.
                </td>
              </tr>
            )}
            {userList.map((u) => (
              <tr key={u.uid} className={u.isSelf ? "self-row" : ""}>
                <td>
                  <div className="mgmt-user-cell">
                    <div className="mgmt-avatar">
                      {u.email.charAt(0).toUpperCase()}
                    </div>
                    <div className="mgmt-user-info">
                      <span className="mgmt-user-email">{u.email}</span>
                      <span className="mgmt-user-name">
                        {u.displayName}
                        {u.isSelf && <span className="mgmt-you-badge">You</span>}
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`mgmt-status-badge ${presence[u.uid] ? "online" : "offline"}`}>
                    <IoEllipseSharp size={8} />
                    {presence[u.uid] ? "Online" : "Offline"}
                  </span>
                </td>
                <td>
                  <span className={getRoleBadgeClass(u.role)}>
                    <IoShieldCheckmarkOutline size={12} />
                    {ROLE_OPTIONS.find((r) => r.value === u.role)?.label || u.role}
                  </span>
                </td>
                <td className="mgmt-date">{formatDate(u.lastLogin)}</td>
                <td>
                  {u.isSelf ? (
                    <span className="mgmt-no-action">-</span>
                  ) : (
                    <div className="mgmt-actions">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.uid, e.target.value)}
                        className="mgmt-role-select"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      <button
                        className="mgmt-delete-btn"
                        onClick={() => handleDeleteAccess(u.uid, u.email)}
                        title="Reset to Guess"
                      >
                        <IoTrashOutline size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
