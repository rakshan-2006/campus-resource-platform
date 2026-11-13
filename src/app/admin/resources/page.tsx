import React from "react";
import { Badge } from "@/components/ui/badge";

export default function AdminResourcesPage() {
  return (
    <div className="bg-white border border-slate-200 rounded-md p-6 max-w-4xl mx-auto shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Admin: Resource & Inventory Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage campus resources, resource types, amenities, and MongoDB variable profiles.
          </p>
        </div>
        <Badge variant="ADMIN">OWNER: PERSON B</Badge>
      </div>

      <div className="bg-slate-50 border border-dashed border-slate-300 rounded-md p-8 text-center">
        <p className="text-sm font-medium text-slate-700">Module Reserved for Person B</p>
        <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto">
          Person B will implement resource creation, updates, deletions, and MongoDB extended specifications CRUD via assigned PR.
          Please refer to <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-800">docs/CONTRACT.md</code> for API contracts and MongoDB helpers.
        </p>
      </div>
    </div>
  );
}
