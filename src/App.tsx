import ObsStatus from "./components/ObsStatus";
import ProfileSwitcher from "./components/ProfileSwitcher";

export default function App() {
  return (
    <div className="h-screen flex items-center justify-center bg-gray-900 text-blue-400 text-3xl font-bold">
      <ObsStatus />
      <ProfileSwitcher/>
    </div>
  );
}
