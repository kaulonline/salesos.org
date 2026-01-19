import React, { useState, useEffect } from 'react';
import { User, Bell, Shield, CreditCard, LogOut, Camera } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';

export const Settings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
      return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-10">
                <Skeleton className="h-10 w-48" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                <div className="md:col-span-4">
                    <Skeleton className="h-[240px] rounded-[2rem] bg-white" />
                </div>
                <div className="md:col-span-8 space-y-6">
                    <Skeleton className="h-[400px] rounded-[2rem] bg-white" />
                    <Skeleton className="h-[200px] rounded-[2rem] bg-white" />
                </div>
            </div>
        </div>
      )
  }

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
       <div className="mb-10">
          <h1 className="text-4xl font-medium text-[#1A1A1A]">Settings</h1>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Settings Sidebar */}
          <div className="md:col-span-4">
             <div className="dash-card p-4">
                {[
                   { icon: User, label: "Profile", active: true },
                   { icon: Bell, label: "Notifications" },
                   { icon: Shield, label: "Security" },
                   { icon: CreditCard, label: "Billing & Plans" },
                ].map((item, i) => (
                   <div key={i} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${item.active ? 'bg-[#1A1A1A] text-white' : 'hover:bg-[#F8F8F6] text-[#666]'}`}>
                      <item.icon size={18} />
                      <span className="font-medium text-sm">{item.label}</span>
                   </div>
                ))}
                <hr className="my-4 border-gray-100" />
                <div className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-red-50 text-red-600 transition-colors">
                   <LogOut size={18} />
                   <span className="font-medium text-sm">Log Out</span>
                </div>
             </div>
          </div>

          {/* Settings Content */}
          <div className="md:col-span-8 space-y-6">
             {/* Profile Section */}
             <div className="dash-card p-8">
                <h3 className="text-xl font-medium mb-6">Profile Information</h3>
                
                <div className="flex items-center gap-6 mb-8">
                   <div className="relative group cursor-pointer">
                      <div className="w-24 h-24 rounded-full bg-[#EAD07D] flex items-center justify-center text-3xl font-bold text-[#1A1A1A]">V</div>
                      <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <Camera className="text-white" size={24} />
                      </div>
                   </div>
                   <div>
                      <h4 className="font-bold text-lg">Valentina</h4>
                      <p className="text-[#666] text-sm mb-2">Product Manager</p>
                      <button className="text-xs font-bold text-[#1A1A1A] underline">Change Avatar</button>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[#666] ml-1">First Name</label>
                      <input type="text" defaultValue="Valentina" className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm font-medium" />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[#666] ml-1">Last Name</label>
                      <input type="text" defaultValue="Doe" className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm font-medium" />
                   </div>
                   <div className="md:col-span-2 space-y-1.5">
                      <label className="text-xs font-medium text-[#666] ml-1">Email Address</label>
                      <input type="email" defaultValue="valentina@company.com" className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm font-medium" />
                   </div>
                   <div className="md:col-span-2 space-y-1.5">
                      <label className="text-xs font-medium text-[#666] ml-1">Bio</label>
                      <textarea rows={3} className="w-full px-4 py-3 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm font-medium" defaultValue="Product Manager with a passion for user-centric design." />
                   </div>
                </div>

                <div className="mt-8 flex justify-end">
                   <Button>Save Changes</Button>
                </div>
             </div>

             {/* Notifications */}
             <div className="dash-card p-8">
                <h3 className="text-xl font-medium mb-6">Notifications</h3>
                <div className="space-y-4">
                   {[
                      "Email me when a lead status changes",
                      "Email me about weekly performance reports",
                      "Push notifications for new messages",
                      "Desktop alerts for upcoming meetings"
                   ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-2">
                         <span className="text-sm font-medium text-[#1A1A1A]">{item}</span>
                         <div className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${i < 3 ? 'bg-[#EAD07D]' : 'bg-gray-200'}`}>
                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${i < 3 ? 'translate-x-6' : 'translate-x-0'}`}></div>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>
       </div>
    </div>
  );
};