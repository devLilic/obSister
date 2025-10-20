import React from "react";

interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
}

export default function SelectInput({ label, children, ...props }: SelectInputProps) {
  return (
    <select
      {...props}
      aria-label={label}
      title={label}
      className={`w-full bg-gray-800 text-gray-100 rounded p-1 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 ${props.className ?? ""}`}
    >
      {children}
    </select>
  );
}
