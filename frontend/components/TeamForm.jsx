import { useState } from "react";

import { teamsAPI } from "../lib/api";
import toast from "react-hot-toast";

export default function TeamForm({ team, onClose, onSaved }) {
  const [name, setName] = useState(team?.name || "");
  const [description, setDescription] = useState(team?.description || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { name, description };
      if (team?._id) {
        await teamsAPI.update(team._id, payload);
        toast.success("Team updated");
      } else {
        await teamsAPI.create(payload);
        toast.success("Team created");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{team ? "Edit Team" : "Add Team"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Team Name</label>
            <input
              className="input w-full"
              placeholder="e.g. Product"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input
              className="input w-full"
              placeholder="Optional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="btn-primary w-full mt-2"
            disabled={loading}
          >
            {team ? "Update" : "Create Team"}
          </button>
        </form>
      </div>
    </div>
  );
}
