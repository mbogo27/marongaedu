import SettingsNav from "@/components/admin/SettingsNav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-teal-900">Settings</h1>
      <SettingsNav />
      {children}
    </div>
  );
}
