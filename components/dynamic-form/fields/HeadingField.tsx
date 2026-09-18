"use client";

import React from "react";
import { FieldProps } from "./types";

export const HeadingField: React.FC<FieldProps> = ({ field }) => {
  return (
    <div className="pt-3 pb-1 border-b border-gray-200 col-span-full">
      <h3 className="text-base font-semibold text-gray-900 tracking-tight">
        {field.label}
      </h3>
    </div>
  );
};
