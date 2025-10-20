import React from "react";

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export default function TextInput({ label, ...props }: TextInputProps) {
  return (
    <input
      {...props}
      aria-label={label}
      title={label}
      placeholder={props.placeholder ?? label}
      className={`w-full bg-gray-800 text-gray-100 rounded p-1 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 ${props.className ?? ""}`}
    />
  );
}
