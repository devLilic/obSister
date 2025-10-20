import { useEffect, useState } from "react";

export default function Clock() {
  const [time, setTime] = useState(
    new Date().toLocaleTimeString("en-GB", { hour12: false })
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-4xl font-mono font-bold text-gray-100 tracking-widest select-none">
      {time}
    </div>
  );
}
