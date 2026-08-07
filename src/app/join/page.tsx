import { Suspense } from "react";
import { FacilityJoinClient } from "@/app/join/FacilityJoinClient";

export default function FacilityJoinPage() {
  return <Suspense fallback={null}><FacilityJoinClient /></Suspense>;
}
