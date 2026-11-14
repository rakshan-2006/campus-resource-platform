// src/app/admin/resources/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";

interface Department {
  id: number;
  code: string;
  name: string;
}

interface ResourceType {
  id: number;
  code: string;
  name: string;
  description: string | null;
}

interface Facility {
  id: number;
  code: string;
  name: string;
  description: string | null;
}

interface ResourceFacilityItem {
  facility_id: number;
  facility_name: string;
  facility_code: string;
  quantity: number;
}

interface ResourceItem {
  id: number;
  code: string;
  name: string;
  capacity: number;
  location: string | null;
  status: "AVAILABLE" | "MAINTENANCE" | "UNAVAILABLE";
  resource_type_id: number;
  resource_type_name: string;
  resource_type_code?: string;
  department_id: number;
  department_name: string;
  facilities: ResourceFacilityItem[];
  usage_count: number;
  profile?: any;
}

export default function AdminResourcesPage() {
  const [activeTab, setActiveTab] = useState<"resources" | "types" | "facilities">("resources");

  // Catalog state
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [types, setTypes] = useState<ResourceType[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Filters for resources tab
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Modals state
  const [resourceModalOpen, setResourceModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ResourceType | null>(null);
  const [facilityModalOpen, setFacilityModalOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);

  // Delete confirmation modal state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    kind: "resource" | "type" | "facility";
    id: number;
    name: string;
    loading: boolean;
    error: string | null;
  }>({
    open: false,
    kind: "resource",
    id: 0,
    name: "",
    loading: false,
    error: null,
  });

  // Resource Form State
  const [resForm, setResForm] = useState({
    code: "",
    name: "",
    capacity: 30,
    location: "",
    resource_type_id: 1,
    department_id: 1,
    status: "AVAILABLE" as "AVAILABLE" | "UNAVAILABLE",
    facilities: [] as Array<{ facility_id: number; quantity: number }>,
  });

  // Extended Profile State (MongoDB)
  const [enableProfile, setEnableProfile] = useState(false);
  const [profileExisting, setProfileExisting] = useState<any | null>(null);
  const [profileSpecs, setProfileSpecs] = useState<Record<string, any>>({
    computer_count: 30,
    cpu: "Intel Core i9-14900K",
    ram: "32 GB DDR5",
    gpu_model: "NVIDIA RTX 4070",
    os: "Ubuntu 24.04 LTS",
    network_speed_mbps: 1000,
    software: "Docker, Python 3.12, VS Code, PostgreSQL 16 Client",
    lab_assistant: "",
    stage_dimensions: "12m x 8m",
    acoustics_rt60: "1.2s",
    seating_type: "Tiered auditorium seats",
    projector_details: "4K Laser Projector",
    video_conferencing: "Cisco Webex Room Kit",
    microphones_count: 4,
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Type & Facility Form States
  const [typeForm, setTypeForm] = useState({ code: "", name: "", description: "" });
  const [facilityForm, setFacilityForm] = useState({ code: "", name: "", description: "" });
  const [simpleFormError, setSimpleFormError] = useState<string | null>(null);
  const [simpleFormSubmitting, setSimpleFormSubmitting] = useState(false);

  // Data fetchers
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setGlobalError(null);
    try {
      const [resRes, metaRes] = await Promise.all([
        fetch("/api/admin/resources"),
        fetch("/api/metadata"),
      ]);

      const resJson = await resRes.json();
      const metaJson = await metaRes.json();

      if (resRes.ok && resJson.data) {
        setResources(resJson.data);
      } else {
        setGlobalError(resJson.error?.message || "Failed to fetch resources");
      }

      if (metaRes.ok && metaJson.data) {
        setTypes(metaJson.data.resource_types || []);
        setFacilities(metaJson.data.facilities || []);
        setDepartments(metaJson.data.departments || []);
      }
    } catch {
      setGlobalError("Failed to connect to the institutional API service.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Handle open Resource Modal
  const openAddResource = () => {
    setEditingResource(null);
    setResForm({
      code: "",
      name: "",
      capacity: 40,
      location: "",
      resource_type_id: types[0]?.id || 1,
      department_id: departments[0]?.id || 1,
      status: "AVAILABLE",
      facilities: [],
    });
    setEnableProfile(false);
    setProfileExisting(null);
    setProfileMessage(null);
    setFormError(null);
    setResourceModalOpen(true);
  };

  const openEditResource = async (r: ResourceItem) => {
    setEditingResource(r);
    setResForm({
      code: r.code,
      name: r.name,
      capacity: r.capacity,
      location: r.location || "",
      resource_type_id: r.resource_type_id,
      department_id: r.department_id,
      status: r.status === "MAINTENANCE" ? "AVAILABLE" : r.status,
      facilities: (r.facilities || []).map((f) => ({ facility_id: f.facility_id, quantity: f.quantity })),
    });
    setFormError(null);
    setProfileMessage(null);
    setResourceModalOpen(true);

    // Fetch existing MongoDB extended profile
    setProfileLoading(true);
    try {
      const res = await fetch(`/api/admin/resource-profiles/${r.id}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setProfileExisting(json.data);
        setEnableProfile(true);
        const specs = json.data.specifications || {};
        setProfileSpecs((prev) => ({
          ...prev,
          ...specs,
          software: Array.isArray(specs.software) ? specs.software.join(", ") : specs.software || "",
        }));
      } else {
        setProfileExisting(null);
        setEnableProfile(false);
      }
    } catch {
      setProfileExisting(null);
    } finally {
      setProfileLoading(false);
    }
  };

  // Helper to format specs for current type
  const getCurrentTypeCode = () => {
    const t = types.find((type) => type.id === Number(resForm.resource_type_id));
    return t ? t.code : "OTHER";
  };

  // Save Resource & optionally Extended Profile
  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);
    setProfileMessage(null);

    try {
      const payload: any = {
        code: resForm.code.trim(),
        name: resForm.name.trim(),
        capacity: Number(resForm.capacity),
        location: resForm.location.trim() || null,
        resource_type_id: Number(resForm.resource_type_id),
        department_id: Number(resForm.department_id),
        status: resForm.status,
        facilities: resForm.facilities,
      };

      let resourceId = editingResource?.id;
      let pgSuccess = false;

      if (editingResource) {
        const patchRes = await fetch(`/api/admin/resources/${editingResource.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const patchJson = await patchRes.json();
        if (!patchRes.ok) {
          setFormError(patchJson.error?.message || "Failed to update resource");
          setFormSubmitting(false);
          return;
        }
        pgSuccess = true;
      } else {
        const postRes = await fetch("/api/admin/resources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const postJson = await postRes.json();
        if (!postRes.ok) {
          setFormError(postJson.error?.message || "Failed to create resource");
          setFormSubmitting(false);
          return;
        }
        resourceId = postJson.data.id;
        pgSuccess = true;
      }

      // Handle MongoDB Profile persistence explicitly
      if (pgSuccess && enableProfile && resourceId) {
        const currentCode = getCurrentTypeCode();
        const cleanSpecs: Record<string, any> = {};

        if (currentCode === "COMPUTER_LAB") {
          cleanSpecs.computer_count = Number(profileSpecs.computer_count) || 30;
          cleanSpecs.cpu = profileSpecs.cpu || "Intel Core i9";
          cleanSpecs.ram = profileSpecs.ram || "32 GB DDR5";
          cleanSpecs.gpu_model = profileSpecs.gpu_model || "";
          cleanSpecs.os = profileSpecs.os || "Ubuntu 24.04 LTS";
          cleanSpecs.network_speed_mbps = Number(profileSpecs.network_speed_mbps) || 1000;
          cleanSpecs.software = typeof profileSpecs.software === "string"
            ? profileSpecs.software.split(",").map((s) => s.trim()).filter(Boolean)
            : [];
          if (profileSpecs.lab_assistant) cleanSpecs.lab_assistant = profileSpecs.lab_assistant;
        } else if (currentCode === "AUDITORIUM") {
          cleanSpecs.stage_dimensions = profileSpecs.stage_dimensions || "16m x 10m";
          cleanSpecs.seating_type = profileSpecs.seating_type || "Tiered plush seats";
          cleanSpecs.acoustics_rt60 = profileSpecs.acoustics_rt60 || "1.1s";
          cleanSpecs.lighting_rig = profileSpecs.lighting_rig || "DMX Stage Rig";
          cleanSpecs.microphones_count = Number(profileSpecs.microphones_count) || 8;
        } else {
          cleanSpecs.projector_details = profileSpecs.projector_details || "4K Laser Projector";
          cleanSpecs.video_conferencing = profileSpecs.video_conferencing || "Cisco Webex Room Kit";
          cleanSpecs.microphones_count = Number(profileSpecs.microphones_count) || 2;
        }

        try {
          if (profileExisting) {
            const pRes = await fetch(`/api/admin/resource-profiles/${resourceId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ specifications: cleanSpecs }),
            });
            const pJson = await pRes.json();
            if (!pRes.ok) {
              setProfileMessage({
                type: "error",
                text: `PostgreSQL resource updated, but MongoDB profile update failed: ${pJson.error?.message}`,
              });
              setFormSubmitting(false);
              fetchAllData();
              return;
            }
          } else {
            const pRes = await fetch(`/api/admin/resource-profiles/${resourceId}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                resource_type: currentCode,
                specifications: cleanSpecs,
              }),
            });
            const pJson = await pRes.json();
            if (!pRes.ok) {
              setProfileMessage({
                type: "error",
                text: `PostgreSQL resource created, but MongoDB profile creation failed: ${pJson.error?.message}`,
              });
              setFormSubmitting(false);
              fetchAllData();
              return;
            }
          }
        } catch {
          setProfileMessage({
            type: "error",
            text: "PostgreSQL resource saved, but MongoDB connection failed. Please retry profile update.",
          });
          setFormSubmitting(false);
          fetchAllData();
          return;
        }
      }

      setResourceModalOpen(false);
      fetchAllData();
    } catch {
      setFormError("An unexpected client error occurred.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete extended profile independently
  const handleDeleteProfile = async () => {
    if (!editingResource || !profileExisting) return;
    if (!confirm("Are you sure you want to remove only the MongoDB extended specifications profile? The PostgreSQL resource will remain authoritative and intact.")) {
      return;
    }
    setProfileLoading(true);
    try {
      const res = await fetch(`/api/admin/resource-profiles/${editingResource.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (res.ok) {
        setProfileExisting(null);
        setEnableProfile(false);
        setProfileMessage({ type: "success", text: "MongoDB extended profile deleted successfully." });
      } else {
        setProfileMessage({ type: "error", text: json.error?.message || "Failed to delete profile" });
      }
    } catch {
      setProfileMessage({ type: "error", text: "Failed to connect to profile service." });
    } finally {
      setProfileLoading(false);
    }
  };

  // Delete confirmation action
  const executeDelete = async () => {
    setDeleteConfirm((prev) => ({ ...prev, loading: true, error: null }));
    const { kind, id } = deleteConfirm;
    let url = "";
    if (kind === "resource") url = `/api/admin/resources/${id}`;
    if (kind === "type") url = `/api/admin/resource-types/${id}`;
    if (kind === "facility") url = `/api/admin/facilities/${id}`;

    try {
      const res = await fetch(url, { method: "DELETE" });
      const json = await res.json();
      if (res.ok) {
        setDeleteConfirm((prev) => ({ ...prev, open: false, loading: false }));
        fetchAllData();
      } else {
        setDeleteConfirm((prev) => ({
          ...prev,
          loading: false,
          error: json.error?.message || "Deletion refused by database constraints.",
        }));
      }
    } catch {
      setDeleteConfirm((prev) => ({
        ...prev,
        loading: false,
        error: "Network error while attempting deletion.",
      }));
    }
  };

  // Facility assignment helpers inside Resource Form
  const addFacilityToResource = (facId: number) => {
    if (resForm.facilities.some((f) => f.facility_id === facId)) return;
    setResForm((prev) => ({
      ...prev,
      facilities: [...prev.facilities, { facility_id: facId, quantity: 1 }],
    }));
  };

  const removeFacilityFromResource = (facId: number) => {
    setResForm((prev) => ({
      ...prev,
      facilities: prev.facilities.filter((f) => f.facility_id !== facId),
    }));
  };

  const updateFacilityQuantity = (facId: number, qty: number) => {
    setResForm((prev) => ({
      ...prev,
      facilities: prev.facilities.map((f) =>
        f.facility_id === facId ? { ...f, quantity: Math.max(1, qty) } : f
      ),
    }));
  };

  // Types & Facilities Form Handlers
  const openAddType = () => {
    setEditingType(null);
    setTypeForm({ code: "", name: "", description: "" });
    setSimpleFormError(null);
    setTypeModalOpen(true);
  };

  const openEditType = (t: ResourceType) => {
    setEditingType(t);
    setTypeForm({ code: t.code, name: t.name, description: t.description || "" });
    setSimpleFormError(null);
    setTypeModalOpen(true);
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimpleFormSubmitting(true);
    setSimpleFormError(null);
    try {
      const url = editingType ? `/api/admin/resource-types/${editingType.id}` : "/api/admin/resource-types";
      const method = editingType ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(typeForm),
      });
      const json = await res.json();
      if (res.ok) {
        setTypeModalOpen(false);
        fetchAllData();
      } else {
        setSimpleFormError(json.error?.message || "Failed to save resource type");
      }
    } catch {
      setSimpleFormError("Network error occurred.");
    } finally {
      setSimpleFormSubmitting(false);
    }
  };

  const openAddFacility = () => {
    setEditingFacility(null);
    setFacilityForm({ code: "", name: "", description: "" });
    setSimpleFormError(null);
    setFacilityModalOpen(true);
  };

  const openEditFacility = (f: Facility) => {
    setEditingFacility(f);
    setFacilityForm({ code: f.code, name: f.name, description: f.description || "" });
    setSimpleFormError(null);
    setFacilityModalOpen(true);
  };

  const handleSaveFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimpleFormSubmitting(true);
    setSimpleFormError(null);
    try {
      const url = editingFacility ? `/api/admin/facilities/${editingFacility.id}` : "/api/admin/facilities";
      const method = editingFacility ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(facilityForm),
      });
      const json = await res.json();
      if (res.ok) {
        setFacilityModalOpen(false);
        fetchAllData();
      } else {
        setSimpleFormError(json.error?.message || "Failed to save facility");
      }
    } catch {
      setSimpleFormError("Network error occurred.");
    } finally {
      setSimpleFormSubmitting(false);
    }
  };

  // Filtered resources
  const filteredResources = resources.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.department_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !filterType || r.resource_type_id === Number(filterType);
    const matchesStatus = !filterStatus || r.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Resource & Inventory Administration</h1>
            <Badge variant="ADMIN">ADMIN ONLY</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative PostgreSQL resource catalog with polymorphic MongoDB extended specifications.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab("resources")}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              activeTab === "resources" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Resources ({resources.length})
          </button>
          <button
            onClick={() => setActiveTab("types")}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              activeTab === "types" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Resource Types ({types.length})
          </button>
          <button
            onClick={() => setActiveTab("facilities")}
            className={`px-3 py-1.5 rounded font-medium transition-colors ${
              activeTab === "facilities" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Facilities ({facilities.length})
          </button>
        </div>
      </div>

      {globalError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-xs">
          {globalError}
        </div>
      )}

      {/* TAB 1: RESOURCES */}
      {activeTab === "resources" && (
        <div className="space-y-4">
          {/* Action & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <Input
                placeholder="Search code, name, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-xs text-xs"
              />
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-44 text-xs"
              >
                <option value="">All Resource Types</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-36 text-xs"
              >
                <option value="">All Statuses</option>
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="UNAVAILABLE">UNAVAILABLE</option>
              </Select>
              {(searchQuery || filterType || filterStatus) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setFilterType("");
                    setFilterStatus("");
                  }}
                  className="text-xs"
                >
                  Reset
                </Button>
              )}
            </div>

            <Button onClick={openAddResource} size="sm" className="whitespace-nowrap">
              + Add Resource
            </Button>
          </div>

          {/* Resources Table */}
          <Table>
            <Thead>
              <Tr>
                <Th>Code</Th>
                <Th>Name & Location</Th>
                <Th>Type & Dept</Th>
                <Th>Capacity</Th>
                <Th>Status</Th>
                <Th>Assigned Facilities</Th>
                <Th>Bookings</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {loading ? (
                <Tr>
                  <Td colSpan={8} className="text-center py-8 text-xs text-slate-500">
                    Loading resources from database...
                  </Td>
                </Tr>
              ) : filteredResources.length === 0 ? (
                <Tr>
                  <Td colSpan={8} className="text-center py-8 text-xs text-slate-500">
                    No resources found matching current criteria.
                  </Td>
                </Tr>
              ) : (
                filteredResources.map((r) => (
                  <Tr key={r.id}>
                    <Td className="font-mono font-medium text-xs text-slate-900">{r.code}</Td>
                    <Td>
                      <div className="font-medium text-slate-900 text-xs">{r.name}</div>
                      <div className="text-[11px] text-slate-500">{r.location || "No location specified"}</div>
                    </Td>
                    <Td>
                      <div className="text-xs text-slate-900">{r.resource_type_name}</div>
                      <div className="text-[11px] text-slate-500">{r.department_name}</div>
                    </Td>
                    <Td className="text-xs font-mono">{r.capacity} seats</Td>
                    <Td>
                      <Badge status={r.status} />
                    </Td>
                    <Td className="max-w-xs">
                      {r.facilities && r.facilities.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {r.facilities.map((f) => (
                            <span
                              key={f.facility_id}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200"
                            >
                              {f.facility_name} <strong className="ml-1 text-slate-900">×{f.quantity}</strong>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">None</span>
                      )}
                    </Td>
                    <Td className="text-xs font-mono">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px]">
                        {r.usage_count}
                      </span>
                    </Td>
                    <Td className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => openEditResource(r)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() =>
                            setDeleteConfirm({
                              open: true,
                              kind: "resource",
                              id: r.id,
                              name: `${r.code} (${r.name})`,
                              loading: false,
                              error: null,
                            })
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </div>
      )}

      {/* TAB 2: RESOURCE TYPES */}
      {activeTab === "types" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500">
              Campus classification hierarchy for rooms, labs, auditoriums, and halls.
            </p>
            <Button onClick={openAddType} size="sm">
              + Add Resource Type
            </Button>
          </div>

          <Table>
            <Thead>
              <Tr>
                <Th>ID</Th>
                <Th>Code</Th>
                <Th>Name</Th>
                <Th>Description</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {types.map((t) => (
                <Tr key={t.id}>
                  <Td className="font-mono text-xs text-slate-500">#{t.id}</Td>
                  <Td className="font-mono font-medium text-xs text-slate-900">{t.code}</Td>
                  <Td className="font-medium text-xs text-slate-900">{t.name}</Td>
                  <Td className="text-xs text-slate-600 max-w-md">{t.description || "—"}</Td>
                  <Td className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => openEditType(t)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() =>
                          setDeleteConfirm({
                            open: true,
                            kind: "type",
                            id: t.id,
                            name: t.name,
                            loading: false,
                            error: null,
                          })
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      )}

      {/* TAB 3: FACILITIES */}
      {activeTab === "facilities" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs text-slate-500">
              Inventory equipment, technology, and acoustic facilities allocated to resources.
            </p>
            <Button onClick={openAddFacility} size="sm">
              + Add Facility Item
            </Button>
          </div>

          <Table>
            <Thead>
              <Tr>
                <Th>ID</Th>
                <Th>Code</Th>
                <Th>Name</Th>
                <Th>Description</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {facilities.map((f) => (
                <Tr key={f.id}>
                  <Td className="font-mono text-xs text-slate-500">#{f.id}</Td>
                  <Td className="font-mono font-medium text-xs text-slate-900">{f.code}</Td>
                  <Td className="font-medium text-xs text-slate-900">{f.name}</Td>
                  <Td className="text-xs text-slate-600 max-w-md">{f.description || "—"}</Td>
                  <Td className="text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => openEditFacility(f)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() =>
                          setDeleteConfirm({
                            open: true,
                            kind: "facility",
                            id: f.id,
                            name: f.name,
                            loading: false,
                            error: null,
                          })
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT RESOURCE WITH EXTENDED MONGO PROFILE */}
      {resourceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 overflow-y-auto p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-2xl my-8 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingResource ? `Edit Resource: ${editingResource.code}` : "Add New Campus Resource"}
                </h3>
                <p className="text-xs text-slate-500">
                  Relational catalog inventory with optional polymorphic MongoDB specifications.
                </p>
              </div>
              <button
                onClick={() => setResourceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveResource} className="p-6 space-y-5">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
                  {formError}
                </div>
              )}
              {profileMessage && (
                <div
                  className={`px-3 py-2 rounded text-xs border ${
                    profileMessage.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}
                >
                  {profileMessage.text}
                </div>
              )}

              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Resource Code"
                  required
                  placeholder="e.g. LAB-AI-1"
                  value={resForm.code}
                  onChange={(e) => setResForm({ ...resForm, code: e.target.value })}
                />
                <Input
                  label="Resource Name"
                  required
                  placeholder="e.g. Turing Artificial Intelligence Lab"
                  value={resForm.name}
                  onChange={(e) => setResForm({ ...resForm, name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Select
                  label="Resource Type"
                  required
                  value={resForm.resource_type_id}
                  onChange={(e) => setResForm({ ...resForm, resource_type_id: Number(e.target.value) })}
                >
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </Select>

                <Select
                  label="Department"
                  required
                  value={resForm.department_id}
                  onChange={(e) => setResForm({ ...resForm, department_id: Number(e.target.value) })}
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>

                <Input
                  label="Seating Capacity"
                  type="number"
                  required
                  min={1}
                  value={resForm.capacity}
                  onChange={(e) => setResForm({ ...resForm, capacity: Number(e.target.value) })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Physical Location"
                  placeholder="e.g. Academic Block 2, Floor 3"
                  value={resForm.location}
                  onChange={(e) => setResForm({ ...resForm, location: e.target.value })}
                />
                <Select
                  label="Operational Status"
                  required
                  value={resForm.status}
                  onChange={(e) => setResForm({ ...resForm, status: e.target.value as any })}
                  helperText="MAINTENANCE status cannot be set manually; it is managed by the maintenance trigger."
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="UNAVAILABLE">UNAVAILABLE</option>
                </Select>
              </div>

              {/* Facility Junction Assignments */}
              <div className="border border-slate-200 rounded-md p-3 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Allocated Facilities & Amenities
                  </label>
                  <Select
                    className="w-48 text-xs bg-white"
                    onChange={(e) => {
                      if (e.target.value) {
                        addFacilityToResource(Number(e.target.value));
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="">+ Assign facility item...</option>
                    {facilities
                      .filter((f) => !resForm.facilities.some((rf) => rf.facility_id === f.id))
                      .map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                  </Select>
                </div>

                {resForm.facilities.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No facility items allocated yet.</p>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    {resForm.facilities.map((rf) => {
                      const facItem = facilities.find((f) => f.id === rf.facility_id);
                      return (
                        <div
                          key={rf.facility_id}
                          className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-slate-200 text-xs"
                        >
                          <span className="font-medium text-slate-800">{facItem?.name || `Facility #${rf.facility_id}`}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-[11px]">Qty:</span>
                            <input
                              type="number"
                              min={1}
                              value={rf.quantity}
                              onChange={(e) => updateFacilityQuantity(rf.facility_id, Number(e.target.value))}
                              className="w-16 px-1.5 py-0.5 border border-slate-300 rounded text-center text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => removeFacilityFromResource(rf.facility_id)}
                              className="text-red-500 hover:text-red-700 font-bold px-1"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* EXTENDED SPECIFICATIONS SECTION (MONGODB) */}
              <div className="border border-indigo-200 rounded-md p-4 bg-indigo-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                        Extended Specifications (MongoDB)
                      </span>
                      {profileExisting ? (
                        <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-300">
                          Active Profile
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded">
                          No Profile
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Variable hardware/software profiles stored as semi-structured documents. Relational tables remain authoritative for reservations.
                    </p>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={enableProfile}
                      onChange={(e) => setEnableProfile(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    Enable Profile
                  </label>
                </div>

                {enableProfile && (
                  <div className="space-y-3 pt-2 border-t border-indigo-100">
                    {profileLoading ? (
                      <p className="text-xs text-slate-500 italic">Loading extended profile from MongoDB...</p>
                    ) : (
                      <>
                        {getCurrentTypeCode() === "COMPUTER_LAB" && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              <Input
                                label="Terminal Count"
                                type="number"
                                min={1}
                                value={profileSpecs.computer_count || 30}
                                onChange={(e) => setProfileSpecs({ ...profileSpecs, computer_count: Number(e.target.value) })}
                              />
                              <Input
                                label="CPU Specification"
                                value={profileSpecs.cpu || ""}
                                onChange={(e) => setProfileSpecs({ ...profileSpecs, cpu: e.target.value })}
                                placeholder="e.g. Intel i9-14900K"
                              />
                              <Input
                                label="RAM Capacity"
                                value={profileSpecs.ram || ""}
                                onChange={(e) => setProfileSpecs({ ...profileSpecs, ram: e.target.value })}
                                placeholder="e.g. 64 GB DDR5"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <Input
                                label="GPU Model"
                                value={profileSpecs.gpu_model || ""}
                                onChange={(e) => setProfileSpecs({ ...profileSpecs, gpu_model: e.target.value })}
                                placeholder="e.g. NVIDIA RTX 4080 16GB"
                              />
                              <Input
                                label="Installed Operating System"
                                value={profileSpecs.os || ""}
                                onChange={(e) => setProfileSpecs({ ...profileSpecs, os: e.target.value })}
                                placeholder="e.g. Ubuntu 24.04 LTS"
                              />
                            </div>
                            <Input
                              label="Software Packages (Comma-separated array)"
                              value={profileSpecs.software || ""}
                              onChange={(e) => setProfileSpecs({ ...profileSpecs, software: e.target.value })}
                              placeholder="Docker, Python 3.12, PyTorch, CUDA, VS Code"
                              helperText="Indexed with MongoDB multikey index for rapid capability queries."
                            />
                            <Input
                              label="Lab Assistant / Extension"
                              value={profileSpecs.lab_assistant || ""}
                              onChange={(e) => setProfileSpecs({ ...profileSpecs, lab_assistant: e.target.value })}
                              placeholder="e.g. John Doe (Ext 4101)"
                            />
                          </div>
                        )}

                        {getCurrentTypeCode() === "AUDITORIUM" && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              <Input
                                label="Stage Dimensions"
                                value={profileSpecs.stage_dimensions || ""}
                                onChange={(e) => setProfileSpecs({ ...profileSpecs, stage_dimensions: e.target.value })}
                                placeholder="e.g. 16m x 10m"
                              />
                              <Input
                                label="Acoustics RT60"
                                value={profileSpecs.acoustics_rt60 || ""}
                                onChange={(e) => setProfileSpecs({ ...profileSpecs, acoustics_rt60: e.target.value })}
                                placeholder="e.g. 1.1s"
                              />
                              <Input
                                label="Stage Microphones"
                                type="number"
                                value={profileSpecs.microphones_count || 8}
                                onChange={(e) => setProfileSpecs({ ...profileSpecs, microphones_count: Number(e.target.value) })}
                              />
                            </div>
                            <Input
                              label="Seating Type"
                              value={profileSpecs.seating_type || ""}
                              onChange={(e) => setProfileSpecs({ ...profileSpecs, seating_type: e.target.value })}
                              placeholder="Plush theatrical tiered seating"
                            />
                          </div>
                        )}

                        {getCurrentTypeCode() !== "COMPUTER_LAB" && getCurrentTypeCode() !== "AUDITORIUM" && (
                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              label="Projector Specs"
                              value={profileSpecs.projector_details || ""}
                              onChange={(e) => setProfileSpecs({ ...profileSpecs, projector_details: e.target.value })}
                              placeholder="4K Laser High-Lumen"
                            />
                            <Input
                              label="Video Conference Codec"
                              value={profileSpecs.video_conferencing || ""}
                              onChange={(e) => setProfileSpecs({ ...profileSpecs, video_conferencing: e.target.value })}
                              placeholder="Cisco Room Kit Pro"
                            />
                          </div>
                        )}

                        {editingResource && profileExisting && (
                          <div className="pt-2 flex justify-end">
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={handleDeleteProfile}
                              className="text-xs"
                            >
                              Delete Extended Profile Only
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setResourceModalOpen(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={formSubmitting}>
                  {editingResource ? "Save Changes" : "Create Resource"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT RESOURCE TYPE */}
      {typeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingType ? `Edit Resource Type: ${editingType.code}` : "Add Resource Type"}
              </h3>
              <button
                onClick={() => setTypeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveType} className="p-6 space-y-4">
              {simpleFormError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
                  {simpleFormError}
                </div>
              )}
              <Input
                label="Type Code (Uppercase)"
                required
                placeholder="e.g. MAKERSPACE"
                value={typeForm.code}
                onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value.toUpperCase() })}
              />
              <Input
                label="Display Name"
                required
                placeholder="e.g. Advanced Makerspace & Prototyping Lab"
                value={typeForm.name}
                onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
              />
              <Textarea
                label="Description"
                placeholder="Description of suitable academic usage..."
                value={typeForm.description}
                onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTypeModalOpen(false)}
                  disabled={simpleFormSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={simpleFormSubmitting}>
                  {editingType ? "Update Type" : "Create Type"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD / EDIT FACILITY */}
      {facilityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                {editingFacility ? `Edit Facility: ${editingFacility.code}` : "Add Facility Item"}
              </h3>
              <button
                onClick={() => setFacilityModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveFacility} className="p-6 space-y-4">
              {simpleFormError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
                  {simpleFormError}
                </div>
              )}
              <Input
                label="Facility Code"
                required
                placeholder="e.g. 3D_PRINTER"
                value={facilityForm.code}
                onChange={(e) => setFacilityForm({ ...facilityForm, code: e.target.value.toUpperCase() })}
              />
              <Input
                label="Facility Name"
                required
                placeholder="e.g. Industrial 3D Printer Station"
                value={facilityForm.name}
                onChange={(e) => setFacilityForm({ ...facilityForm, name: e.target.value })}
              />
              <Textarea
                label="Description"
                placeholder="Detailed hardware or equipment description..."
                value={facilityForm.description}
                onChange={(e) => setFacilityForm({ ...facilityForm, description: e.target.value })}
              />

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFacilityModalOpen(false)}
                  disabled={simpleFormSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={simpleFormSubmitting}>
                  {editingFacility ? "Update Facility" : "Create Facility"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE CONFIRMATION WITH EXPLICIT CONFLICT ERROR DISPLAY */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-red-50/50">
              <h3 className="font-bold text-red-900 text-sm">Confirm Deletion</h3>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-xs text-slate-700">
                Are you sure you want to permanently delete <strong>{deleteConfirm.name}</strong>?
              </p>
              <p className="text-[11px] text-slate-500">
                If this item is referenced by active bookings, requests, or junction assignments, PostgreSQL referential integrity will reject the operation with an actionable conflict message.
              </p>

              {deleteConfirm.error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded text-xs">
                  {deleteConfirm.error}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-3 bg-slate-50 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirm((prev) => ({ ...prev, open: false }))}
                disabled={deleteConfirm.loading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={executeDelete}
                isLoading={deleteConfirm.loading}
              >
                Delete Record
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
