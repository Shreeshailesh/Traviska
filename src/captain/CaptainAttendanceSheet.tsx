import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckSquare,
  Square,
  Phone,
  MapPin,
  Save,
  CheckCircle2,
  Calendar,
  Lock,
} from "lucide-react";
import { useCaptainAuth } from "./CaptainAuthContext";

export const CaptainAttendanceSheet: React.FC = () => {
  const { captain } = useCaptainAuth();
  const [activeTab, setActiveTab] = useState<"attendance" | "expenses">("attendance");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const isHead = captain?.role === "Head Captain";
  const isMain = captain?.role === "Main Captain";
  const isTrainee = captain?.role === "Trainee Captain";

  const [pickups, setPickups] = useState([
    {
      name: "Majestic Metro Gate 3",
      time: "10:00 PM",
      travellers: [
        { id: "t1", name: "Rahul Sharma", age: 26, isPrimary: true, phone: "+91 98765 43210", isPresent: true },
        { id: "t2", name: "Priya Sharma", age: 26, isPrimary: false, phone: "", isPresent: true },
        { id: "t3", name: "Kiran Kumar", age: 27, isPrimary: true, phone: "+91 91234 56789", isPresent: false },
        { id: "t4", name: "Suhana K.", age: 25, isPrimary: false, phone: "", isPresent: false },
      ],
    },
    {
      name: "Silk Board Junction",
      time: "10:30 PM",
      travellers: [
        { id: "t5", name: "Arjun M.", age: 28, isPrimary: true, phone: "+91 90987 65432", isPresent: true },
        { id: "t6", name: "Sneha R.", age: 26, isPrimary: false, phone: "", isPresent: true },
      ],
    },
    {
      name: "Electronic City Toll",
      time: "11:00 PM",
      travellers: [
        { id: "t7", name: "Vikram G.", age: 30, isPrimary: true, phone: "+91 97845 61230", isPresent: false },
        { id: "t8", name: "Pooja K.", age: 29, isPrimary: false, phone: "", isPresent: false },
      ],
    },
  ]);

  const toggleTraveller = (pIdx: number, tIdx: number) => {
    if (isTrainee) {
      alert("Trainee Captains have read-only access to the passenger roll-call list. Head and Main Captains manage boarding check-in.");
      return;
    }
    setPickups((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[pIdx].travellers[tIdx].isPresent = !copy[pIdx].travellers[tIdx].isPresent;
      return copy;
    });
  };

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  let totalCount = 0;
  let presentCount = 0;
  pickups.forEach((p) => {
    p.travellers.forEach((t) => {
      totalCount++;
      if (t.isPresent) presentCount++;
    });
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar className="w-3.5 h-3.5 text-emerald-700" />
          <span>21 Nov 2026 Departure</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mt-0.5">Coorg Weekend Trip</h1>
      </div>

      {/* Tabs (Matching Reference 12) */}
      <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-xl text-xs font-bold text-center">
        <button
          onClick={() => setActiveTab("attendance")}
          className={`py-2 rounded-lg transition-colors ${
            activeTab === "attendance" ? "bg-white text-[#0d2b17] shadow-xs" : "text-gray-500"
          }`}
        >
          Attendance ({presentCount}/{totalCount})
        </button>
        <Link
          to="/captain/expenses"
          className="py-2 rounded-lg text-gray-500 hover:text-gray-900 transition-colors"
        >
          Trip Expenses
        </Link>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Attendance checklist synchronized!
        </div>
      )}

      {/* Progress Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-xs space-y-1.5">
        <div className="flex justify-between text-xs font-medium text-gray-600">
          <span>Boarding Status</span>
          <span className="font-bold text-[#0d2b17]">
            {presentCount} of {totalCount} Boarded
          </span>
        </div>
        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-[#0d2b17] h-full transition-all duration-300"
            style={{ width: `${totalCount > 0 ? (presentCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Leadership Team on Departure */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-xs">
        <div className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-2">
          Departure Leadership Hierarchy
        </div>
        <div className="flex flex-col gap-1.5 text-xs">
          <div className="flex items-center justify-between p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-200">
            <span className="font-bold text-emerald-900 flex items-center gap-1.5">
              <span>👑 Head Captain:</span>
              <span className="font-semibold text-gray-900">Naveen R.</span>
            </span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded">
              Final Authority
            </span>
          </div>

          <div className="flex items-center justify-between p-1.5 rounded-lg bg-blue-50/70 border border-blue-200">
            <span className="font-bold text-blue-900 flex items-center gap-1.5">
              <span>⭐ Main Captain:</span>
              <span className="font-semibold text-gray-900">Arjun K.</span>
            </span>
            <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-1.5 py-0.2 rounded">
              Boarding Support
            </span>
          </div>

          <div className="flex items-center justify-between p-1.5 rounded-lg bg-gray-50 border border-gray-200">
            <span className="font-bold text-gray-800 flex items-center gap-1.5">
              <span>🌱 Trainee Captain:</span>
              <span className="font-semibold text-gray-700">Shailesh N.</span>
            </span>
            <span className="text-[10px] font-bold text-gray-600 bg-gray-200 px-1.5 py-0.2 rounded">
              View-Only Observer
            </span>
          </div>
        </div>
      </div>

      {/* Pickups and Traveller Checklists */}
      <div className="space-y-3">
        {pickups.map((pickup, pIdx) => (
          <div
            key={pickup.name}
            className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden"
          >
            {/* Pickup Header */}
            <div className="bg-emerald-50/60 px-4 py-2.5 border-b border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-[#0d2b17]">
                <MapPin className="w-3.5 h-3.5" />
                {pickup.name}
              </div>
              <span className="text-[11px] font-semibold text-gray-600">{pickup.time}</span>
            </div>

            {/* Travellers List */}
            <div className="divide-y divide-gray-100">
              {pickup.travellers.map((traveller, tIdx) => (
                <div
                  key={traveller.id}
                  onClick={() => toggleTraveller(pIdx, tIdx)}
                  className={`p-3.5 flex items-center justify-between cursor-pointer select-none transition-colors ${
                    traveller.isPresent ? "bg-emerald-50/30" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {traveller.isPresent ? (
                      <CheckSquare className="w-5 h-5 text-emerald-700 shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-300 shrink-0" />
                    )}

                    <div>
                      <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        {traveller.name}
                        {traveller.isPrimary && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#0d2b17] text-white">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500">{traveller.age} yrs</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {traveller.phone && (
                      <a
                        href={`tel:${traveller.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-emerald-100 text-gray-600 hover:text-emerald-800 transition-colors"
                        title="Call passenger"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        traveller.isPresent
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {traveller.isPresent ? "Boarded" : "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Save Button according to Hierarchy Permissions */}
      <div className="pt-2">
        {isHead ? (
          <button
            onClick={handleSave}
            className="w-full py-3.5 rounded-xl bg-[#0d2b17] text-white text-sm font-bold hover:bg-[#143e22] shadow-md flex items-center justify-center gap-2 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            👑 Finalize & Sync Attendance (Head Captain)
          </button>
        ) : isMain ? (
          <button
            onClick={handleSave}
            className="w-full py-3.5 rounded-xl bg-[#1e40af] text-white text-sm font-bold hover:bg-[#1d4ed8] shadow-md flex items-center justify-center gap-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            ⭐ Save Attendance Draft (Main Captain)
          </button>
        ) : (
          <div className="p-3.5 rounded-xl bg-gray-100 border border-gray-200 text-center text-xs text-gray-600 font-medium flex items-center justify-center gap-2">
            <Lock className="w-4 h-4 text-gray-500" />
            <span>🌱 Trainee Captain Mode: Read-Only Roll Call (Finalized by Head Captain)</span>
          </div>
        )}
      </div>
    </div>
  );
};
export default CaptainAttendanceSheet;
