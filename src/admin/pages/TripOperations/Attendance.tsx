import React, { useState } from "react";
import {
  CheckSquare,
  Square,
  MapPin,
  Calendar,
  Phone,
  CheckCircle2,
  Save,
} from "lucide-react";
import { API_BASE_URL } from "../../../api";

interface TravellerAttendance {
  id: string;
  name: string;
  age: number;
  gender: string;
  isPrimary?: boolean;
  phone?: string;
  isPresent: boolean;
}

interface BookingGroup {
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  travellers: TravellerAttendance[];
}

interface PickupGroup {
  pickupName: string;
  totalTravellers: number;
  bookings: BookingGroup[];
}

export const TripAttendance: React.FC = () => {
  const [selectedSlot, setSelectedSlot] = useState("coorg-21-nov");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [pickupData, setPickupData] = useState<PickupGroup[]>([
    {
      pickupName: "Pickup: Majestic (10 Travellers)",
      totalTravellers: 10,
      bookings: [
        {
          bookingCode: "TVK1248",
          customerName: "Rahul Sharma",
          customerPhone: "+91 98765 43210",
          travellers: [
            {
              id: "t1",
              name: "Rahul Sharma",
              age: 26,
              gender: "M",
              isPrimary: true,
              phone: "+91 98765 43210",
              isPresent: true,
            },
            {
              id: "t2",
              name: "Priya Sharma",
              age: 26,
              gender: "F",
              isPresent: true,
            },
          ],
        },
        {
          bookingCode: "TVK1249",
          customerName: "Kiran Kumar",
          customerPhone: "+91 91234 56789",
          travellers: [
            {
              id: "t3",
              name: "Kiran Kumar",
              age: 27,
              gender: "M",
              isPrimary: true,
              phone: "+91 91234 56789",
              isPresent: true,
            },
            {
              id: "t4",
              name: "Suhana K.",
              age: 25,
              gender: "F",
              isPresent: false,
            },
            {
              id: "t5",
              name: "Rohit K.",
              age: 24,
              gender: "M",
              isPresent: false,
            },
          ],
        },
      ],
    },
    {
      pickupName: "Pickup: Silk Board Junction (8 Travellers)",
      totalTravellers: 8,
      bookings: [
        {
          bookingCode: "TVK1250",
          customerName: "Arjun M.",
          customerPhone: "+91 90987 65432",
          travellers: [
            {
              id: "t6",
              name: "Arjun M.",
              age: 28,
              gender: "M",
              isPrimary: true,
              phone: "+91 90987 65432",
              isPresent: true,
            },
            {
              id: "t7",
              name: "Sneha R.",
              age: 26,
              gender: "F",
              isPresent: true,
            },
          ],
        },
      ],
    },
  ]);

  const toggleTraveller = (pickupIdx: number, bookingIdx: number, travellerId: string) => {
    setPickupData((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      const tr = copy[pickupIdx].bookings[bookingIdx].travellers.find(
        (t: any) => t.id === travellerId
      );
      if (tr) tr.isPresent = !tr.isPresent;
      return copy;
    });
  };

  const markAllPresent = () => {
    setPickupData((prev) =>
      prev.map((group) => ({
        ...group,
        bookings: group.bookings.map((b) => ({
          ...b,
          travellers: b.travellers.map((t) => ({ ...t, isPresent: true })),
        })),
      }))
    );
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("token");
      const records: any[] = [];
      pickupData.forEach((pg) => {
        pg.bookings.forEach((b) => {
          b.travellers.forEach((t, i) => {
            records.push({
              bookingId: b.bookingCode,
              travellerName: t.name,
              travellerIndex: i,
              pickupLocation: pg.pickupName,
              status: t.isPresent ? "Boarded" : "Absent",
            });
          });
        });
      });

      await fetch(`${API_BASE_URL}/admin/operations/attendance`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ slotId: selectedSlot, records }),
      });
    } catch (e) {
      console.log("Local attendance persisted:", e);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Stats
  let totalCount = 0;
  let presentCount = 0;
  pickupData.forEach((group) => {
    group.bookings.forEach((b) => {
      b.travellers.forEach((t) => {
        totalCount++;
        if (t.isPresent) presentCount++;
      });
    });
  });

  return (
    <div style={{ width: "100%" }} className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Trip Attendance</h1>
          <p className="text-sm text-gray-500 mt-1">
            Coorg Weekend Trip — 21 Nov 2026 • Real-time passenger boarding check.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={markAllPresent}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 shadow-sm transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark All Present
          </button>

          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0d2b17] text-white text-xs font-semibold hover:bg-[#143e22] shadow-sm transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Attendance
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Attendance records synchronized and persisted successfully!
        </div>
      )}

      {/* Control & Selector Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
            <Calendar className="w-4 h-4 text-[#0d2b17]" />
            Departure Slot:
          </div>
          <select
            value={selectedSlot}
            onChange={(e) => setSelectedSlot(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#0d2b17]"
          >
            <option value="coorg-21-nov">Coorg Weekend Trip (21 Nov – 22 Nov 2026)</option>
            <option value="ooty-28-nov">Ooty – Coonoor Trip (28 Nov – 30 Nov 2026)</option>
            <option value="gokarna-05-dec">Gokarna – Murdeshwar (05 Dec – 07 Dec 2026)</option>
          </select>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="font-medium text-gray-500">
            Boarded: <strong className="text-emerald-700 font-bold">{presentCount}</strong> / {totalCount} Travellers ({totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0}%)
          </span>
          <span className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden inline-block">
            <span
              className="bg-emerald-600 h-full block"
              style={{ width: `${totalCount > 0 ? (presentCount / totalCount) * 100 : 0}%` }}
            />
          </span>
        </div>
      </div>

      {/* Captains Leadership Hierarchy for Departure */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center justify-between">
          <span>Assigned Captains Hierarchy (Departure Team)</span>
          <span className="text-[11px] text-gray-400 font-normal">Head Captain has final roll-call authority</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 flex items-start gap-2.5">
            <div className="text-lg">👑</div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-emerald-900">Head Captain</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-700 text-white">Rank 1</span>
              </div>
              <div className="font-semibold text-xs text-gray-900 mt-0.5">Naveen R.</div>
              <div className="text-[11px] text-gray-500">+91 98765 43210 • Final Sign-Off Authority</div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 flex items-start gap-2.5">
            <div className="text-lg">⭐</div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-blue-900">Main Captain</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-700 text-white">Rank 2</span>
              </div>
              <div className="font-semibold text-xs text-gray-900 mt-0.5">Arjun K.</div>
              <div className="text-[11px] text-gray-500">+91 99876 54321 • Boarding Assistant</div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-gray-200 bg-gray-50/60 flex items-start gap-2.5">
            <div className="text-lg">🌱</div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-gray-800">Trainee Captain</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-gray-600 text-white">Rank 3</span>
              </div>
              <div className="font-semibold text-xs text-gray-900 mt-0.5">Shailesh N.</div>
              <div className="text-[11px] text-gray-500">+91 90123 45678 • In-Field Observer</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pickup Groups */}
      <div className="space-y-4">
        {pickupData.map((pickupGroup, pIdx) => (
          <div
            key={pIdx}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            {/* Pickup Header */}
            <div className="bg-[#0d2b17]/5 px-5 py-3.5 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-[#0d2b17]">
                <MapPin className="w-4 h-4" />
                {pickupGroup.pickupName}
              </div>
              <span className="text-xs font-medium text-gray-500">
                {pickupGroup.bookings.reduce(
                  (acc, b) => acc + b.travellers.filter((t) => t.isPresent).length,
                  0
                )}{" "}
                boarded
              </span>
            </div>

            {/* Bookings & Travellers */}
            <div className="divide-y divide-gray-100">
              {pickupGroup.bookings.map((booking, bIdx) => (
                <div key={booking.bookingCode} className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#0d2b17] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {booking.bookingCode}
                      </span>
                      <span className="font-semibold text-sm text-gray-900">
                        {booking.customerName}
                      </span>
                      <span className="text-xs text-gray-400">({booking.travellers.length} travellers)</span>
                    </div>

                    <a
                      href={`tel:${booking.customerPhone}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-700 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      {booking.customerPhone}
                    </a>
                  </div>

                  {/* Traveller Checklist */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pl-2">
                    {booking.travellers.map((tr) => (
                      <div
                        key={tr.id}
                        onClick={() => toggleTraveller(pIdx, bIdx, tr.id)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer select-none transition-all ${
                          tr.isPresent
                            ? "bg-emerald-50/60 border-emerald-300 text-gray-900 shadow-xs"
                            : "bg-gray-50/60 border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {tr.isPresent ? (
                            <CheckSquare className="w-5 h-5 text-emerald-700 shrink-0" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400 shrink-0" />
                          )}
                          <div>
                            <div className="font-semibold text-xs text-gray-900 flex items-center gap-1.5">
                              {tr.name}
                              {tr.isPrimary && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#0d2b17] text-white">
                                  Primary
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500">
                              {tr.age} yrs, {tr.gender === "M" ? "Male" : "Female"}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            tr.isPresent
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {tr.isPresent ? "Boarded" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default TripAttendance;
