"use client";

import { useEffect } from "react";

export default function GetAppRedirect() {
  useEffect(() => {
    window.location.replace("/#get-app");
  }, []);

  return null;
}
