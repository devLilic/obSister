import logo from "../assets/logo.png";

export default function Logo() {
  return (
    <div className="flex items-center gap-2">
      <img
        src={logo}
        alt="obSister Logo"
        className="w-10 h-10 object-contain rounded-md"
      />
      <span className="text-2xl font-bold text-blue-400 tracking-wide">
        OBSister
      </span>
    </div>
  );
}
