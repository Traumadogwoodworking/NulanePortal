import "@/styles/globals.css";
import { AdminShell } from "@components/layout/AdminShell";

export const metadata = {
  title: "Nulane Work Control",
  description: "Durable task, interview, decision, and progress control plane"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
