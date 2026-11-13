"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Resource, ResourceType, Department } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/ui/table";
import { Layers, Search, Filter, ExternalLink } from "lucide-react";

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [types, setTypes] = useState<ResourceType[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedType, setSelectedType] = useState<string>("");
  const [minCapacity, setMinCapacity] = useState<string>("");
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    // Fetch metadata
    fetch("/api/metadata")
      .then((res) => res.json())
      .then((json) => {
        if (json.data) {
          setTypes(json.data.resource_types || []);
          setDepartments(json.data.departments || []);
        }
      });

    loadResources();
  }, []);

  const loadResources = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedType) params.set("type_id", selectedType);
    if (minCapacity) params.set("min_capacity", minCapacity);
    if (selectedDept) params.set("department_id", selectedDept);

    fetch(`/api/resources?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        setResources(json.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadResources();
  };

  const handleReset = () => {
    setSelectedType("");
    setMinCapacity("");
    setSelectedDept("");
    setSearchQuery("");
    fetch("/api/resources")
      .then((res) => res.json())
      .then((json) => setResources(json.data || []));
  };

  const filteredResources = resources.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.code.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.location.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight">Campus Resource Catalog</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Classrooms, computing laboratories, seminar halls, boardrooms, and auditoriums.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-500">
          Total Resources: {filteredResources.length}
        </div>
      </div>

      {/* Filter Toolbar */}
      <form onSubmit={handleFilterSubmit} className="bg-white border border-slate-200 rounded-md p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-semibold text-slate-700 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <span>Filters & Search</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Input
            label="Search Text"
            placeholder="Search code, name, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <Select
            label="Resource Type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="">All Resource Types</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>

          <Input
            label="Minimum Capacity"
            type="number"
            min="1"
            placeholder="e.g. 40"
            value={minCapacity}
            onChange={(e) => setMinCapacity(e.target.value)}
          />

          <Select
            label="Department"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={handleReset}>
            Reset Filters
          </Button>
          <Button type="submit" size="sm">
            Apply Filters
          </Button>
        </div>
      </form>

      {/* Resources Table */}
      <div className="bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono animate-pulse">
            Querying campus inventory from PostgreSQL...
          </div>
        ) : filteredResources.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No resources match the selected criteria.
          </div>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Room Code</Th>
                <Th>Resource Name</Th>
                <Th>Category Type</Th>
                <Th>Department</Th>
                <Th>Capacity</Th>
                <Th>Building / Location</Th>
                <Th>Installed Amenities</Th>
                <Th>Status</Th>
                <Th className="text-right">Details</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredResources.map((res) => (
                <Tr key={res.id}>
                  <Td className="font-mono text-xs font-bold text-blue-700">{res.code}</Td>
                  <Td className="font-semibold text-xs text-slate-900">{res.name}</Td>
                  <Td className="text-xs text-slate-600">{res.resource_type_name}</Td>
                  <Td className="text-xs text-slate-600">{res.department_name}</Td>
                  <Td className="text-xs font-mono font-medium">{res.capacity} seats</Td>
                  <Td className="text-xs text-slate-600">{res.location}</Td>
                  <Td className="text-xs">
                    {res.facilities && res.facilities.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {res.facilities.map((f: any) => (
                          <span
                            key={f.facility_id}
                            className="inline-flex items-center bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono"
                          >
                            {f.facility_name} ({f.quantity})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400">None</span>
                    )}
                  </Td>
                  <Td>
                    <Badge status={res.status} className="text-[10px] py-0 px-1" />
                  </Td>
                  <Td className="text-right">
                    <Link href={`/resources/${res.id}`}>
                      <Button size="sm" variant="outline" className="text-xs py-0.5 px-2 gap-1">
                        <span>Inspect</span>
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </Link>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  );
}
