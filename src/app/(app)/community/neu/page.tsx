import type { Metadata } from "next";

import { CreateCommunityForm } from "@/modules/core/components/community-forms";

export const metadata: Metadata = { title: "Community erstellen" };

export default function NewCommunityPage() {
  return (
    <>
      <h1 className="text-titel font-semibold">Community erstellen</h1>
      <div className="mt-8">
        <CreateCommunityForm />
      </div>
    </>
  );
}
