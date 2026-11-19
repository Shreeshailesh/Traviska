import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Briefcase,
  Plus,
  Edit2,
  Trash2,
  UserPlus,
} from "lucide-react";
import { API_BASE_URL } from "../../api";
import { Modal } from "../../admin/ui/Modal";
import { getSuperAdminToken } from "../authHelper";

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  isSuspended?: boolean;
}

interface TeamData {
  _id: string;
  name: string;
  description: string;
  lead: { _id: string; name: string; email: string } | null;
  leadName: string;
  members: TeamMember[];
  membersCount: number;
}

export const SuperAdminTeams: React.FC = () => {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [allUsers, setAllUsers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Create / Edit Team Modal
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamData | null>(null);
  const [teamForm, setTeamForm] = useState({ name: "", description: "", leadId: "" });
  const [teamSubmitting, setTeamSubmitting] = useState(false);

  // Manage Members Modal
  const [activeTeamForMembers, setActiveTeamForMembers] = useState<TeamData | null>(null);
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState("");

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const token = getSuperAdminToken();
      const res = await axios.get(`${API_BASE_URL}/api/super-admin/teams`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.data.success) {
        setTeams(res.data.teams);
      }
    } catch (err) {
      console.error("Fetch teams error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const token = getSuperAdminToken();
      const res = await axios.get(`${API_BASE_URL}/api/super-admin/users?tab=active`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.data.success) {
        setAllUsers(res.data.users.filter((u: any) => u.type === "user"));
      }
    } catch (err) {
      console.error("Fetch users error:", err);
    }
  };

  useEffect(() => {
    fetchTeams();
    fetchAllUsers();
  }, []);

  const handleOpenCreate = () => {
    setEditingTeam(null);
    setTeamForm({ name: "", description: "", leadId: "" });
    setShowTeamModal(true);
  };

  const handleOpenEdit = (team: TeamData) => {
    setEditingTeam(team);
    setTeamForm({
      name: team.name,
      description: team.description || "",
      leadId: team.lead?._id || "",
    });
    setShowTeamModal(true);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeamSubmitting(true);
    try {
      const token = getSuperAdminToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      if (editingTeam) {
        await axios.put(
          `${API_BASE_URL}/api/super-admin/teams/${editingTeam._id}`,
          teamForm,
          { headers }
        );
      } else {
        await axios.post(
          `${API_BASE_URL}/api/super-admin/teams`,
          teamForm,
          { headers }
        );
      }

      setShowTeamModal(false);
      fetchTeams();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to save team.");
    } finally {
      setTeamSubmitting(false);
    }
  };

  const handleAddMember = async () => {
    if (!activeTeamForMembers || !selectedUserIdToAdd) return;
    try {
      const token = getSuperAdminToken();
      await axios.post(
        `${API_BASE_URL}/api/super-admin/teams/${activeTeamForMembers._id}/members`,
        { userId: selectedUserIdToAdd },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      setSelectedUserIdToAdd("");
      await fetchTeams();
      // Update local active team modal
      const updated = teams.find((t) => t._id === activeTeamForMembers._id);
      if (updated) setActiveTeamForMembers(updated);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to add member.");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!activeTeamForMembers) return;
    try {
      const token = getSuperAdminToken();
      await axios.delete(
        `${API_BASE_URL}/api/super-admin/teams/${activeTeamForMembers._id}/members/${userId}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      await fetchTeams();
      const updated = teams.find((t) => t._id === activeTeamForMembers._id);
      if (updated) setActiveTeamForMembers(updated);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to remove member.");
    }
  };

  const handleArchiveTeam = async (team: TeamData) => {
    if (team.membersCount > 0) {
      alert("Cannot archive a team with members. Please remove or transfer members first.");
      return;
    }
    if (!window.confirm(`Are you sure you want to archive team "${team.name}"?`)) return;

    try {
      const token = getSuperAdminToken();
      await axios.delete(`${API_BASE_URL}/api/super-admin/teams/${team._id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      fetchTeams();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to archive team.");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="sa-page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 800, margin: 0, color: "#0f172a" }}>Staff & Teams</h2>
          <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>
            Create teams, assign members and manage team structure.
          </p>
        </div>

        <button onClick={handleOpenCreate} className="sa-action-btn sa-action-btn-primary">
          <Plus size={16} />
          <span>Create Team</span>
        </button>
      </div>

      {/* Teams Grid */}
      <div className="sa-teams-grid">
        {loading ? (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "#94a3b8" }}>
            Loading teams...
          </div>
        ) : teams.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "#94a3b8" }}>
            No teams created yet. Click "Create Team" to set up your organization structure.
          </div>
        ) : (
          teams.map((team) => (
            <div key={team._id} className="sa-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "12px",
                        background: "#dcfce7",
                        color: "#166534",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Briefcase size={20} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "16px", fontWeight: 800, margin: 0, color: "#0f172a" }}>{team.name}</h3>
                      <div style={{ fontSize: "12px", color: "#64748b" }}>
                        Lead: <strong style={{ color: "#1e293b" }}>{team.leadName}</strong>
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#15803d",
                      background: "#f0fdf4",
                      border: "1px solid #bbf7d0",
                      padding: "3px 9px",
                      borderRadius: "6px",
                    }}
                  >
                    {team.membersCount} {team.membersCount === 1 ? "Member" : "Members"}
                  </span>
                </div>

                {team.description && (
                  <p style={{ fontSize: "12.5px", color: "#475569", marginBottom: "16px", lineHeight: "1.5" }}>
                    {team.description}
                  </p>
                )}

                {/* Member avatars list preview */}
                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "12px", marginBottom: "16px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>
                    Team Roster ({team.members.length})
                  </div>
                  {team.members.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {team.members.slice(0, 4).map((m) => (
                        <div
                          key={m._id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: "12px",
                            padding: "4px 0",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <div
                              style={{
                                width: "20px",
                                height: "20px",
                                borderRadius: "50%",
                                background: "#e2ece5",
                                color: "#0e3820",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "10px",
                                fontWeight: 700,
                              }}
                            >
                              {m.name.charAt(0)}
                            </div>
                            <span style={{ fontWeight: 600, color: "#1e293b" }}>{m.name}</span>
                          </div>
                          <span style={{ fontSize: "11px", color: "#64748b" }}>{m.role}</span>
                        </div>
                      ))}
                      {team.members.length > 4 && (
                        <div style={{ fontSize: "11px", color: "#15803d", fontWeight: 600 }}>
                          +{team.members.length - 4} more members
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>
                      No members assigned to this team yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "14px" }}>
                <button
                  onClick={() => {
                    setActiveTeamForMembers(team);
                    setSelectedUserIdToAdd("");
                  }}
                  className="sa-action-btn"
                  style={{ flex: 1, justifyContent: "center", padding: "8px 12px", fontSize: "12px" }}
                >
                  <UserPlus size={14} />
                  <span>Members</span>
                </button>
                <button
                  onClick={() => handleOpenEdit(team)}
                  className="sa-action-btn"
                  style={{ padding: "8px 12px" }}
                  title="Edit Team"
                >
                  <Edit2 size={14} />
                </button>
                {team.membersCount === 0 && (
                  <button
                    onClick={() => handleArchiveTeam(team)}
                    className="sa-action-btn"
                    style={{ padding: "8px 12px", color: "#ef4444" }}
                    title="Archive Empty Team"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create / Edit Team Modal */}
      <Modal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        title={editingTeam ? `Edit Team — ${editingTeam.name}` : "Create New Team"}
      >
        <form onSubmit={handleSaveTeam} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
              Team Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Operations Team, Sales Team"
              value={teamForm.name}
              onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
              Team Description
            </label>
            <textarea
              rows={3}
              placeholder="Responsibilities and purpose of this team..."
              value={teamForm.description}
              onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "12.5px", fontWeight: 700, color: "#334155", marginBottom: "5px" }}>
              Assign Team Lead (Optional)
            </label>
            <select
              value={teamForm.leadId}
              onChange={(e) => setTeamForm({ ...teamForm, leadId: e.target.value })}
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "13px",
              }}
            >
              <option value="">-- No Lead Assigned --</option>
              {allUsers.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
            <button
              type="button"
              onClick={() => setShowTeamModal(false)}
              className="sa-action-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={teamSubmitting}
              className="sa-action-btn sa-action-btn-primary"
            >
              {teamSubmitting ? "Saving..." : editingTeam ? "Save Changes" : "Create Team"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Manage Members Modal */}
      {activeTeamForMembers && (
        <Modal
          isOpen={Boolean(activeTeamForMembers)}
          onClose={() => setActiveTeamForMembers(null)}
          title={`Team Members — ${activeTeamForMembers.name}`}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Add Member Bar */}
            <div style={{ display: "flex", gap: "8px" }}>
              <select
                value={selectedUserIdToAdd}
                onChange={(e) => setSelectedUserIdToAdd(e.target.value)}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "13px",
                }}
              >
                <option value="">-- Select staff member to add / transfer --</option>
                {allUsers
                  .filter((u) => !activeTeamForMembers.members.some((m) => m._id === u._id))
                  .map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.email} • {u.role})
                    </option>
                  ))}
              </select>
              <button
                type="button"
                disabled={!selectedUserIdToAdd}
                onClick={handleAddMember}
                className="sa-action-btn sa-action-btn-primary"
                style={{ whiteSpace: "nowrap" }}
              >
                <Plus size={15} />
                <span>Add Member</span>
              </button>
            </div>

            {/* Current Members List */}
            <div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>
                Current Members ({activeTeamForMembers.members.length})
              </div>
              <div
                style={{
                  border: "1px solid #e2ece5",
                  borderRadius: "10px",
                  maxHeight: "260px",
                  overflowY: "auto",
                  background: "#ffffff",
                }}
              >
                {activeTeamForMembers.members.length === 0 ? (
                  <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                    No members in this team yet.
                  </div>
                ) : (
                  activeTeamForMembers.members.map((m) => (
                    <div
                      key={m._id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderBottom: "1px solid #f1f5f9",
                        fontSize: "13px",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{m.name}</div>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>
                          {m.email} • <span style={{ fontWeight: 600 }}>{m.role}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m._id)}
                        style={{
                          border: "none",
                          background: "#fee2e2",
                          color: "#ef4444",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "11px",
                          fontWeight: 600,
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setActiveTeamForMembers(null)}
                className="sa-action-btn sa-action-btn-primary"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
