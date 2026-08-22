import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import { verifyAdminSession, isAdminAllowlisted } from "@/lib/adminAuth";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ adminPath: string }>;
}) {
  const { adminPath } = await params;

  if (adminPath !== process.env.ADMIN_SECRET_PATH) {
    notFound();
  }

  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}

export const revalidate = 0;
