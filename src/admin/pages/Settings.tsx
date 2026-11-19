import React, { useState } from "react";
import {
  Building2,
  Users,
  CreditCard,
  Bell,
  Compass,
  ShieldCheck,
  Save,
  CheckCircle2,
  Plus,
  Trash2,
} from "lucide-react";

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "company" | "admins" | "booking" | "notifications" | "captain"
  >("company");

  const [savedAlert, setSavedAlert] = useState(false);

  // Form states
  const [company, setCompany] = useState({
    name: "Traviska Experiences Pvt Ltd",
    brandName: "Traviska",
    tagline: "Travel. Explore. Experience.",
    supportEmail: "support@traviska.com",
    supportPhone: "+91 98765 43210",
    gstin: "29AABCU9603R1ZM",
    registeredAddress: "4th Floor, Indiranagar 100ft Road, Bengaluru, Karnataka 560038",
  });

  const [adminUsers, setAdminUsers] = useState([
    {
      id: "u1",
      name: "Operations Admin",
      email: "operations@traviska.com",
      role: "Operations Manager",
      status: "Active",
      lastLogin: "Today, 04:15 AM",
    },
    {
      id: "u2",
      name: "Rahul Verma",
      email: "rahul.ops@traviska.com",
      role: "Operations Manager",
      status: "Active",
      lastLogin: "Yesterday, 06:40 PM",
    },
    {
      id: "u3",
      name: "Megha S.",
      email: "megha.finance@traviska.com",
      role: "Finance Admin",
      status: "Active",
      lastLogin: "11 Nov 2026",
    },
  ]);

  const [bookingRules, setBookingRules] = useState({
    autoConfirmPaid: true,
    allowPartialPayments: true,
    minAdvancePercent: 30,
    cancellationWindowHours: 72,
    taxPercent: 5,
    convenienceFee: 0,
    requireTravellerDetails: true,
  });

  const [captainSettings, setCaptainSettings] = useState({
    enableCaptainPortal: true,
    allowDirectExpenseSubmission: true,
    maxExpenseWithoutReceipt: 500,
    dailyCaptainAllowance: 1500,
    emergencyHelpline: "+91 91123 45678",
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure company information, administrative access, booking policies and operations.
          </p>
        </div>
        {savedAlert && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-200">
            <CheckCircle2 className="w-4 h-4" />
            Changes saved successfully!
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 overflow-x-auto pb-px">
        {[
          { id: "company", label: "Company Profile", icon: Building2 },
          { id: "admins", label: "Admin Users & Roles", icon: Users },
          { id: "booking", label: "Booking & Payments", icon: CreditCard },
          { id: "captain", label: "Captain Portal Config", icon: Compass },
          { id: "notifications", label: "Notifications & Alerts", icon: Bell },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                isActive
                  ? "border-[#0d2b17] text-[#0d2b17]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        {activeTab === "company" && (
          <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Legal Company Name</label>
                <input
                  type="text"
                  value={company.name}
                  onChange={(e) => setCompany({ ...company, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d2b17]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Brand Name</label>
                <input
                  type="text"
                  value={company.brandName}
                  onChange={(e) => setCompany({ ...company, brandName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d2b17]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Customer Support Email</label>
                <input
                  type="email"
                  value={company.supportEmail}
                  onChange={(e) => setCompany({ ...company, supportEmail: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d2b17]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Helpline / WhatsApp</label>
                <input
                  type="text"
                  value={company.supportPhone}
                  onChange={(e) => setCompany({ ...company, supportPhone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d2b17]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">GSTIN Number</label>
                <input
                  type="text"
                  value={company.gstin}
                  onChange={(e) => setCompany({ ...company, gstin: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d2b17]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Brand Tagline</label>
                <input
                  type="text"
                  value={company.tagline}
                  onChange={(e) => setCompany({ ...company, tagline: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d2b17]"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Registered Address</label>
                <textarea
                  rows={3}
                  value={company.registeredAddress}
                  onChange={(e) => setCompany({ ...company, registeredAddress: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d2b17]"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0d2b17] text-white text-sm font-medium hover:bg-[#143e22] transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" />
                Save Company Profile
              </button>
            </div>
          </form>
        )}

        {activeTab === "admins" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Admin Personnel</h3>
                <p className="text-xs text-gray-500">Users authorized to access this administration workspace.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const name = prompt("Enter new admin name:");
                  const email = prompt("Enter admin email:");
                  if (name && email) {
                    setAdminUsers([
                      ...adminUsers,
                      {
                        id: "u" + (adminUsers.length + 1),
                        name,
                        email,
                        role: "Operations Executive",
                        status: "Active",
                        lastLogin: "Never",
                      },
                    ]);
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0d2b17] text-white text-xs font-medium hover:bg-[#143e22]"
              >
                <Plus className="w-4 h-4" />
                Add Admin User
              </button>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600 font-semibold uppercase">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last Active</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {adminUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                        <span className="text-xs text-gray-700">{user.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{user.lastLogin}</td>
                      <td className="px-4 py-3 text-right">
                        {user.role !== "Super Admin" && (
                          <button
                            onClick={() => setAdminUsers(adminUsers.filter((u) => u.id !== user.id))}
                            className="text-gray-400 hover:text-red-600 p-1"
                            title="Remove User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "booking" && (
          <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
            <div className="space-y-4">
              <div className="flex items-start justify-between p-4 rounded-lg border border-gray-200 bg-gray-50/50">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Auto-confirm Paid Bookings</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Instantly issue booking confirmation SMS/email when verified Razorpay webhook or manual full payment is received.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={bookingRules.autoConfirmPaid}
                  onChange={(e) => setBookingRules({ ...bookingRules, autoConfirmPaid: e.target.checked })}
                  className="w-4 h-4 text-[#0d2b17] rounded border-gray-300 focus:ring-[#0d2b17] mt-1"
                />
              </div>

              <div className="flex items-start justify-between p-4 rounded-lg border border-gray-200 bg-gray-50/50">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Mandate Individual Traveller Information</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Require full name, age and gender for each traveller before departure ticket generation.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={bookingRules.requireTravellerDetails}
                  onChange={(e) =>
                    setBookingRules({ ...bookingRules, requireTravellerDetails: e.target.checked })
                  }
                  className="w-4 h-4 text-[#0d2b17] rounded border-gray-300 focus:ring-[#0d2b17] mt-1"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                    Minimum Advance Booking Amount (%)
                  </label>
                  <input
                    type="number"
                    value={bookingRules.minAdvancePercent}
                    onChange={(e) =>
                      setBookingRules({ ...bookingRules, minAdvancePercent: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d2b17]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                    Cancellation Notice Window (Hours)
                  </label>
                  <input
                    type="number"
                    value={bookingRules.cancellationWindowHours}
                    onChange={(e) =>
                      setBookingRules({ ...bookingRules, cancellationWindowHours: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d2b17]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0d2b17] text-white text-sm font-medium hover:bg-[#143e22] transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" />
                Save Booking Policies
              </button>
            </div>
          </form>
        )}

        {activeTab === "captain" && (
          <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
            <div className="space-y-4">
              <div className="flex items-start justify-between p-4 rounded-lg border border-gray-200 bg-gray-50/50">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Captain Portal Access</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Allow captains to log into the mobile web portal via verified phone OTP to view assigned trips and mark attendance.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={captainSettings.enableCaptainPortal}
                  onChange={(e) =>
                    setCaptainSettings({ ...captainSettings, enableCaptainPortal: e.target.checked })
                  }
                  className="w-4 h-4 text-[#0d2b17] rounded border-gray-300 focus:ring-[#0d2b17] mt-1"
                />
              </div>

              <div className="flex items-start justify-between p-4 rounded-lg border border-gray-200 bg-gray-50/50">
                <div>
                  <div className="text-sm font-semibold text-gray-900">Allow Direct On-Trip Expense Logging</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Captains can record on-the-road toll, fuel and emergency medical receipts directly into the portal.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={captainSettings.allowDirectExpenseSubmission}
                  onChange={(e) =>
                    setCaptainSettings({
                      ...captainSettings,
                      allowDirectExpenseSubmission: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-[#0d2b17] rounded border-gray-300 focus:ring-[#0d2b17] mt-1"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                    Default Daily Captain Allowance (₹)
                  </label>
                  <input
                    type="number"
                    value={captainSettings.dailyCaptainAllowance}
                    onChange={(e) =>
                      setCaptainSettings({
                        ...captainSettings,
                        dailyCaptainAllowance: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d2b17]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                    Emergency Operations 24x7 Helpline
                  </label>
                  <input
                    type="text"
                    value={captainSettings.emergencyHelpline}
                    onChange={(e) =>
                      setCaptainSettings({ ...captainSettings, emergencyHelpline: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d2b17]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0d2b17] text-white text-sm font-medium hover:bg-[#143e22] transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" />
                Save Captain Settings
              </button>
            </div>
          </form>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-4 max-w-3xl">
            {[
              {
                title: "Customer Booking Confirmation Email & SMS",
                desc: "Send instant automated voucher link upon booking creation and payment capture.",
                defaultChecked: true,
              },
              {
                title: "Departure Reminder (T-24 Hours)",
                desc: "Send bus captain details, reporting pickup point GPS and packing list to all confirmed travellers.",
                defaultChecked: true,
              },
              {
                title: "Captain Assignment Notifications",
                desc: "Notify captains via SMS & WhatsApp when assigned to a new weekend departure slot.",
                defaultChecked: true,
              },
              {
                title: "Expense Claim Review Alerts",
                desc: "Email finance manager when a trip expense exceeds ₹2,000 for verification.",
                defaultChecked: false,
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between p-4 rounded-lg border border-gray-200 bg-gray-50/50"
              >
                <div>
                  <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                </div>
                <input
                  type="checkbox"
                  defaultChecked={item.defaultChecked}
                  className="w-4 h-4 text-[#0d2b17] rounded border-gray-300 focus:ring-[#0d2b17] mt-1"
                />
              </div>
            ))}
            <div className="pt-4 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0d2b17] text-white text-sm font-medium hover:bg-[#143e22] transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" />
                Save Notification Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default SettingsPage;

